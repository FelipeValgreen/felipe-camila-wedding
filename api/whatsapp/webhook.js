import crypto from 'crypto';
import {
    getWhatsAppSession,
    saveWhatsAppSession,
    claimWhatsAppMessage,
    markWhatsAppMessageStatus,
    getRSVPsByPhoneSanitized,
    getRSVPByPhoneAndName,
    getRSVPByLastWhatsAppMessageId,
    updateRSVPRecord,
    createRSVPRecord,
    createRSVPEvent
} from '../_lib/supabase-admin.js';
import { normalizePhone, normalizeName, validateRSVPInput, parseAttendanceCommand, parseDietaryCommand } from '../_lib/rsvp-service.js';
import { syncToGoogleSheets } from '../_lib/google-sheets.js';
import { sendWhatsAppMessage } from '../_lib/whatsapp-client.js';

export const config = {
    api: {
        bodyParser: false
    }
};

async function getRawBody(req) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);

    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

const FAQ_MAP = {
    'fecha': 'El matrimonio de Felipe y Camila se celebrará el viernes 23 de octubre de 2026.',
    'hora': 'La ceremonia comienza a las 17:50 hrs. Recomendamos llegar a las 17:25 hrs.',
    'ceremonia': 'La ceremonia religiosa será en el Santuario de la Divina Misericordia, Chicureo. Ubicación: https://maps.app.goo.gl/R8GLmxvNC2KLagVL9',
    'arboleda': 'La celebración será en Centro de Eventos Arboleda, Chicureo. Cóctel a las 18:30 hrs y cena a las 21:00 hrs. Ubicación: https://maps.app.goo.gl/kRdvXmbtHmYXUaB49',
    'dress code': 'El código de vestimenta es Black Tie (formal y elegante).',
    'novios': 'Nuestra lista de novios está en Paris (Código 21030724). Enlace: https://club.noviosparis.cl/home/couple-catalog/21030724'
};

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const mode = req.query ? req.query['hub.mode'] : null;
        const token = req.query ? req.query['hub.verify_token'] : null;
        const challenge = req.query ? req.query['hub.challenge'] : null;

        const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
        if (!expectedToken) {
            return res.status(500).send('VERIFY_TOKEN_NOT_CONFIGURED');
        }

        if (mode === 'subscribe' && token === expectedToken) {
            return res.status(200).send(challenge);
        } else {
            return res.status(403).send('Forbidden');
        }
    }

    if (req.method === 'POST') {
        const metaSecret = process.env.META_APP_SECRET;
        const signature = req.headers['x-hub-signature-256'];

        if (!metaSecret || !signature) {
            return res.status(401).json({ error: 'UNAUTHORIZED_WEBHOOK' });
        }

        const rawBuffer = await getRawBody(req);
        const expectedSig = 'sha256=' + crypto.createHmac('sha256', metaSecret).update(rawBuffer).digest('hex');

        try {
            const sigBuffer = Buffer.from(signature);
            const expBuffer = Buffer.from(expectedSig);
            if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
                return res.status(401).json({ error: 'INVALID_SIGNATURE' });
            }
        } catch (err) {
            return res.status(401).json({ error: 'INVALID_SIGNATURE' });
        }

        let body = {};
        try {
            body = JSON.parse(rawBuffer.toString('utf-8'));
        } catch (e) {
            return res.status(400).json({ error: 'MALFORMED_JSON' });
        }

        let hasErrors = false;
        if (body.object === 'whatsapp_business_account') {
            const entries = body.entry || [];
            for (const entry of entries) {
                const changes = entry.changes || [];
                for (const change of changes) {
                    const value = change.value || {};
                    const messages = value.messages || [];
                    for (const msg of messages) {
                        const msgId = msg.id;
                        const fromPhone = normalizePhone(msg.from);

                        if (msgId && fromPhone) {
                            const claimRes = await claimWhatsAppMessage(msgId, fromPhone);
                            if (claimRes.claimed) {
                                let msgText = '';
                                if (msg.interactive) {
                                    if (msg.interactive.button_reply) msgText = msg.interactive.button_reply.id;
                                    else if (msg.interactive.list_reply) msgText = msg.interactive.list_reply.id;
                                } else if (msg.text) {
                                    msgText = msg.text.body;
                                }
                                msgText = msgText.trim();

                                try {
                                    const result = await processPersistentWhatsAppFlow(fromPhone, msgText, msgId);
                                    await markWhatsAppMessageStatus(msgId, 'processed');
                                    if (result && result.finalize_completed_session) {
                                        await saveWhatsAppSession(fromPhone, 'IDLE', {}, msgId);
                                    }
                                } catch (flowErr) {
                                    hasErrors = true;
                                    console.error('WhatsApp flow error:', flowErr.message);
                                    try {
                                        await markWhatsAppMessageStatus(msgId, 'failed', flowErr.message);
                                    } catch (markErr) {
                                        console.error('Failed to mark message failed status:', markErr.message);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (hasErrors) {
            return res.status(500).json({ error: 'WEBHOOK_PROCESSING_FAILED' });
        }
        return res.status(200).json({ status: 'EVENT_RECEIVED' });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}

async function processPersistentWhatsAppFlow(phone, text, msgId) {
    let sessionRecord = await getWhatsAppSession(phone);
    let session = sessionRecord ? { state: sessionRecord.state, data: sessionRecord.session_data || {} } : { state: 'IDLE', data: {} };
    const lowerText = text.toLowerCase();

    for (const [key, answer] of Object.entries(FAQ_MAP)) {
        if (lowerText.includes(key)) {
            const sendRes = await sendWhatsAppMessage(phone, answer);
            if (!sendRes.ok) throw new Error(sendRes.error);
            return;
        }
    }

    if (lowerText === 'cancelar' || text === 'rsvp_cancel') {
        const sendRes = await sendWhatsAppMessage(phone, 'Operación cancelada. Puedes escribirnos nuevamente cuando desees.');
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'IDLE', {}, msgId);
        return;
    }

    if (lowerText === 'modificar' || text === 'rsvp_modify') {
        const rsvps = await getRSVPsByPhoneSanitized(phone); // returns id, first_name, last_name only
        if (!rsvps || rsvps.length === 0) {
            const sendRes = await sendWhatsAppMessage(phone, 'No encontramos una respuesta previa registrada para este número. Iniciemos una nueva confirmación.\n\nPor favor ingresa tu Nombre y Apellido:');
            if (!sendRes.ok) throw new Error(sendRes.error);
            await saveWhatsAppSession(phone, 'AWAITING_NAME', {}, msgId);
            return;
        }

        if (rsvps.length === 1) {
            const single = rsvps[0];
            session.data = { target_id: single.id, first_name: single.first_name, last_name: single.last_name };
            session.state = 'AWAITING_ATTENDANCE';
            const sendRes = await sendWhatsAppMessage(phone, 'Modificaremos la respuesta de ' + single.first_name + ' ' + single.last_name + '.\n\n¿Asistirás al matrimonio?', [
                { id: 'attendance_attending', title: 'Sí, asistiré' },
                { id: 'attendance_not_attending', title: 'No podré asistir' },
                { id: 'attendance_pending', title: 'Todavía no puedo' }
            ]);
            if (!sendRes.ok) throw new Error(sendRes.error);
            await saveWhatsAppSession(phone, 'AWAITING_ATTENDANCE', session.data, msgId);
            return;
        }

        // Sanitized candidates containing only id, first_name, last_name
        session.data = { candidates: rsvps.map(r => ({ id: r.id, first_name: r.first_name, last_name: r.last_name })) };
        session.state = 'AWAITING_SELECTION';

        let listText = 'Encontramos varios nombres registrados con este número. Responde con el número de la persona a modificar:\n\n';
        rsvps.forEach((r, idx) => {
            listText += (idx + 1) + '. ' + r.first_name + ' ' + r.last_name + '\n';
        });
        const sendRes = await sendWhatsAppMessage(phone, listText);
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_SELECTION', session.data, msgId);
        return;
    }

    if (session.state === 'AWAITING_SELECTION') {
        const choice = parseInt(text, 10);
        const candidates = session.data.candidates || [];
        if (isNaN(choice) || choice < 1 || choice > candidates.length) {
            const sendRes = await sendWhatsAppMessage(phone, 'Por favor responde únicamente con el número correspondiente a la persona que deseas modificar.');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return;
        }

        const selected = candidates[choice - 1];
        session.data = { target_id: selected.id, first_name: selected.first_name, last_name: selected.last_name };
        session.state = 'AWAITING_ATTENDANCE';
        const sendRes = await sendWhatsAppMessage(phone, 'Modificaremos la respuesta de ' + selected.first_name + ' ' + selected.last_name + '.\n\n¿Asistirás al matrimonio?', [
            { id: 'attendance_attending', title: 'Sí, asistiré' },
            { id: 'attendance_not_attending', title: 'No podré asistir' },
            { id: 'attendance_pending', title: 'Todavía no puedo' }
        ]);
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_ATTENDANCE', session.data, msgId);
        return;
    }

    if (session.state === 'IDLE') {
        session.state = 'AWAITING_NAME';
        const sendRes = await sendWhatsAppMessage(phone, '¡Hola! Este es el WhatsApp que Felipe y Cami habilitaron para mantener las confirmaciones del matrimonio ordenadas. Te ayudaremos a registrar tu respuesta. Toma menos de un minuto.\n\nPor favor, ingresa tu Nombre y Apellido:');
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_NAME', {}, msgId);
        return;
    }

    if (session.state === 'AWAITING_NAME') {
        const parts = text.split(' ');
        if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
            const sendRes = await sendWhatsAppMessage(phone, 'Por favor ingresa tu nombre y apellido completo (ejemplo: Camila Pérez):');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return;
        }
        session.data.first_name = parts[0];
        session.data.last_name = parts.slice(1).join(' ');
        session.state = 'AWAITING_ATTENDANCE';
        const sendRes = await sendWhatsAppMessage(phone, '¿Asistirás al matrimonio?', [
            { id: 'attendance_attending', title: 'Sí, asistiré' },
            { id: 'attendance_not_attending', title: 'No podré asistir' },
            { id: 'attendance_pending', title: 'Todavía no puedo' }
        ]);
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_ATTENDANCE', session.data, msgId);
        return;
    }

    if (session.state === 'AWAITING_ATTENDANCE') {
        const attStatus = parseAttendanceCommand(text);

        if (!attStatus) {
            const sendRes = await sendWhatsAppMessage(phone, 'Para ayudarte con tu confirmación, responde una de las opciones disponibles.');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return;
        }

        session.data.attendance_status = attStatus;

        if (attStatus === 'attending') {
            session.state = 'AWAITING_DIETARY';
            const sendRes = await sendWhatsAppMessage(phone, '¿Tienes alguna restricción alimentaria?\n1. Ninguna\n2. Vegetariano\n3. Vegano\n4. Celíaco / libre de gluten\n5. Alergias\n6. Otra');
            if (!sendRes.ok) throw new Error(sendRes.error);
            await saveWhatsAppSession(phone, 'AWAITING_DIETARY', session.data, msgId);
        } else {
            session.state = 'AWAITING_CONFIRMATION';
            const statusLabel = attStatus === 'not_attending' ? 'No podré asistir' : 'Todavía no puedo confirmar';
            const sendRes = await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:\n\nNombre: ' + session.data.first_name + ' ' + session.data.last_name + '\nAsistencia: ' + statusLabel + '\n\n¿Está correcto?', [
                { id: 'rsvp_confirm', title: 'CONFIRMAR' },
                { id: 'rsvp_cancel', title: 'CANCELAR' }
            ]);
            if (!sendRes.ok) throw new Error(sendRes.error);
            await saveWhatsAppSession(phone, 'AWAITING_CONFIRMATION', session.data, msgId);
        }
        return;
    }

    if (session.state === 'AWAITING_DIETARY') {
        const dietary = parseDietaryCommand(text);

        if (!dietary) {
            const sendRes = await sendWhatsAppMessage(phone, 'Para ayudarte con tu confirmación, responde una de las opciones disponibles.');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return;
        }

        session.data.dietary_type = dietary;

        if (dietary === 'Alergias' || dietary === 'Otra') {
            session.state = 'AWAITING_DIETARY_DETAIL';
            const sendRes = await sendWhatsAppMessage(phone, 'Escribe el detalle de tu restricción alimentaria (ej: alergia al maní):');
            if (!sendRes.ok) throw new Error(sendRes.error);
            await saveWhatsAppSession(phone, 'AWAITING_DIETARY_DETAIL', session.data, msgId);
            return;
        }

        session.state = 'AWAITING_CONFIRMATION';
        const sendRes = await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:\n\nNombre: ' + session.data.first_name + ' ' + session.data.last_name + '\nAsistencia: Sí, asistiré\nRestricción: ' + dietary + '\n\n¿Está correcto?', [
            { id: 'rsvp_confirm', title: 'CONFIRMAR' },
            { id: 'rsvp_cancel', title: 'CANCELAR' }
        ]);
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_CONFIRMATION', session.data, msgId);
        return;
    }

    if (session.state === 'AWAITING_DIETARY_DETAIL') {
        const detail = text.trim();
        if (detail.length < 2 || detail.toLowerCase() === 'alergias' || detail.toLowerCase() === 'otra') {
            const sendRes = await sendWhatsAppMessage(phone, 'Por favor especifica el detalle de tu restricción alimentaria:');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return;
        }

        session.data.dietary_detail = detail;
        session.state = 'AWAITING_CONFIRMATION';
        const sendRes = await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:\n\nNombre: ' + session.data.first_name + ' ' + session.data.last_name + '\nAsistencia: Sí, asistiré\nRestricción: ' + session.data.dietary_type + ' (' + session.data.dietary_detail + ')\n\n¿Está correcto?', [
            { id: 'rsvp_confirm', title: 'CONFIRMAR' },
            { id: 'rsvp_cancel', title: 'CANCELAR' }
        ]);
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_CONFIRMATION', session.data, msgId);
        return;
    }

    if (session.state === 'COMPLETED_PENDING_ACK') {
        const isSameMessage = session.data && session.data.source_message_id === msgId;
        if (isSameMessage) {
            const ackSent = Boolean(session.data.ack_sent);
            if (!ackSent) {
                const sendRes = await sendWhatsAppMessage(phone, 'Tu respuesta quedó registrada correctamente. No necesitas confirmarla nuevamente en la web. Si tus planes cambian, escribe MODIFICAR.');
                if (!sendRes.ok) throw new Error(sendRes.error);
                await saveWhatsAppSession(phone, 'COMPLETED_PENDING_ACK', { ...session.data, ack_sent: true }, msgId);
            }
            return { ok: true, finalize_completed_session: true };
        } else {
            session = { state: 'IDLE', data: {} };
        }
    }

    if (session.state === 'AWAITING_CONFIRMATION') {
        const isExplicitConfirm = (text === 'rsvp_confirm' || lowerText === 'confirmar');
        if (isExplicitConfirm) {
            const valRes = validateRSVPInput({
                first_name: session.data.first_name,
                last_name: session.data.last_name,
                phone: phone,
                attendance_status: session.data.attendance_status,
                dietary_type: session.data.dietary_type,
                dietary_detail: session.data.dietary_detail
            });

            if (!valRes.valid) {
                const sendRes = await sendWhatsAppMessage(phone, 'Datos de confirmación no válidos: ' + valRes.error);
                if (!sendRes.ok) throw new Error(sendRes.error);
                return;
            }

            let savedRecord = await getRSVPByLastWhatsAppMessageId(msgId);
            let isUpdateOperation = false;
            const fullNameNorm = valRes.data.full_name_normalized;

            if (savedRecord) {
                isUpdateOperation = true;
            } else if (session.data.target_id) {
                isUpdateOperation = true;
                savedRecord = await updateRSVPRecord(session.data.target_id, {
                    attendance_status: valRes.data.attendance_status,
                    dietary_type: valRes.data.dietary_type,
                    dietary_detail: valRes.data.dietary_detail,
                    last_whatsapp_message_id: msgId
                });
                if (savedRecord) await createRSVPEvent(session.data.target_id, 'updated', 'whatsapp');
            } else {
                const existing = await getRSVPByPhoneAndName(phone, fullNameNorm);
                if (existing) {
                    isUpdateOperation = true;
                    savedRecord = await updateRSVPRecord(existing.id, {
                        attendance_status: valRes.data.attendance_status,
                        dietary_type: valRes.data.dietary_type,
                        dietary_detail: valRes.data.dietary_detail,
                        last_whatsapp_message_id: msgId
                    });
                    if (savedRecord) await createRSVPEvent(existing.id, 'updated', 'whatsapp');
                } else {
                    isUpdateOperation = false;
                    savedRecord = await createRSVPRecord({
                        ...valRes.data,
                        source: 'whatsapp',
                        reconfirmation_status: 'not_started',
                        last_whatsapp_message_id: msgId
                    });
                    if (savedRecord) await createRSVPEvent(savedRecord.id, 'created', 'whatsapp');
                }
            }

            if (!savedRecord) {
                const sendRes = await sendWhatsAppMessage(phone, 'No pudimos registrar tu respuesta en este momento. Intenta nuevamente en unos minutos.');
                if (!sendRes.ok) throw new Error(sendRes.error);
                return;
            }

            const sheetRes = await syncToGoogleSheets(savedRecord, isUpdateOperation);
            if (sheetRes.synced) {
                await updateRSVPRecord(savedRecord.id, { sheet_sync_status: 'synced', sheet_row_number: sheetRes.sheet_row_number });
            } else {
                await updateRSVPRecord(savedRecord.id, { sheet_sync_status: 'failed' });
            }

            await saveWhatsAppSession(phone, 'COMPLETED_PENDING_ACK', { rsvp_id: savedRecord.id, ack_type: 'final_confirm', ack_sent: false, source_message_id: msgId }, msgId);
            const sendRes = await sendWhatsAppMessage(phone, 'Tu respuesta quedó registrada correctamente. No necesitas confirmarla nuevamente en la web. Si tus planes cambian, escribe MODIFICAR.');
            if (!sendRes.ok) throw new Error(sendRes.error);
            await saveWhatsAppSession(phone, 'COMPLETED_PENDING_ACK', { rsvp_id: savedRecord.id, ack_type: 'final_confirm', ack_sent: true, source_message_id: msgId }, msgId);
            return { ok: true, finalize_completed_session: true };

        } else {
            await saveWhatsAppSession(phone, 'IDLE', {}, msgId);
            const sendRes = await sendWhatsAppMessage(phone, 'Operación cancelada.');
            if (!sendRes.ok) throw new Error(sendRes.error);
        }
    }
}
