import crypto from 'crypto';
import {
    getWhatsAppSession,
    saveWhatsAppSession,
    isMessageProcessed,
    getRSVPsByPhone,
    getRSVPByPhoneAndName,
    updateRSVPRecord,
    createRSVPRecord,
    createRSVPEvent
} from '../_lib/supabase-admin.js';
import { normalizePhone, normalizeName, validateRSVPInput } from '../_lib/rsvp-service.js';
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
                            const processed = await isMessageProcessed(msgId, fromPhone);
                            if (!processed) {
                                let msgText = '';
                                if (msg.interactive) {
                                    if (msg.interactive.button_reply) msgText = msg.interactive.button_reply.id;
                                    else if (msg.interactive.list_reply) msgText = msg.interactive.list_reply.id;
                                } else if (msg.text) {
                                    msgText = msg.text.body;
                                }
                                msgText = msgText.trim();
                                await processPersistentWhatsAppFlow(fromPhone, msgText, msgId);
                            }
                        }
                    }
                }
            }
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
            await sendWhatsAppMessage(phone, answer);
            return;
        }
    }

    if (lowerText === 'cancelar' || text === 'rsvp_cancel') {
        await saveWhatsAppSession(phone, 'IDLE', {}, msgId);
        await sendWhatsAppMessage(phone, 'Operación cancelada. Puedes escribirnos nuevamente cuando desees.');
        return;
    }

    if (lowerText === 'modificar' || text === 'rsvp_modify') {
        const rsvps = await getRSVPsByPhone(phone);
        if (!rsvps || rsvps.length === 0) {
            await saveWhatsAppSession(phone, 'AWAITING_NAME', {}, msgId);
            await sendWhatsAppMessage(phone, 'No encontramos una respuesta previa registrada para este número. Iniciemos una nueva confirmación.\n\nPor favor ingresa tu Nombre y Apellido:');
            return;
        }

        if (rsvps.length === 1) {
            const single = rsvps[0];
            session.data = { target_id: single.id, first_name: single.first_name, last_name: single.last_name };
            session.state = 'AWAITING_ATTENDANCE';
            await saveWhatsAppSession(phone, 'AWAITING_ATTENDANCE', session.data, msgId);
            await sendWhatsAppMessage(phone, 'Modificaremos la respuesta de ' + single.first_name + ' ' + single.last_name + '.\n\n¿Asistirás al matrimonio?', [
                { id: 'attendance_attending', title: 'Sí, asistiré' },
                { id: 'attendance_not_attending', title: 'No podré asistir' },
                { id: 'attendance_pending', title: 'Todavía no puedo' }
            ]);
            return;
        }

        session.data = { candidates: rsvps };
        session.state = 'AWAITING_SELECTION';
        await saveWhatsAppSession(phone, 'AWAITING_SELECTION', session.data, msgId);

        let listText = 'Encontramos varios nombres registrados con este número. Responde con el número de la persona a modificar:\n\n';
        rsvps.forEach((r, idx) => {
            listText += (idx + 1) + '. ' + r.first_name + ' ' + r.last_name + '\n';
        });
        await sendWhatsAppMessage(phone, listText);
        return;
    }

    if (session.state === 'AWAITING_SELECTION') {
        const choice = parseInt(text, 10);
        const candidates = session.data.candidates || [];
        if (isNaN(choice) || choice < 1 || choice > candidates.length) {
            await sendWhatsAppMessage(phone, 'Por favor responde únicamente con el número correspondiente a la persona que deseas modificar.');
            return;
        }

        const selected = candidates[choice - 1];
        session.data = { target_id: selected.id, first_name: selected.first_name, last_name: selected.last_name };
        session.state = 'AWAITING_ATTENDANCE';
        await saveWhatsAppSession(phone, 'AWAITING_ATTENDANCE', session.data, msgId);
        await sendWhatsAppMessage(phone, 'Modificaremos la respuesta de ' + selected.first_name + ' ' + selected.last_name + '.\n\n¿Asistirás al matrimonio?', [
            { id: 'attendance_attending', title: 'Sí, asistiré' },
            { id: 'attendance_not_attending', title: 'No podré asistir' },
            { id: 'attendance_pending', title: 'Todavía no puedo' }
        ]);
        return;
    }

    if (session.state === 'IDLE') {
        session.state = 'AWAITING_NAME';
        await saveWhatsAppSession(phone, 'AWAITING_NAME', {}, msgId);
        await sendWhatsAppMessage(phone, '¡Hola! Este es el WhatsApp que Felipe y Cami habilitaron para mantener las confirmaciones del matrimonio ordenadas. Te ayudaremos a registrar tu respuesta. Toma menos de un minuto.\n\nPor favor, ingresa tu Nombre y Apellido:');
        return;
    }

    if (session.state === 'AWAITING_NAME') {
        const parts = text.split(' ');
        if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
            await sendWhatsAppMessage(phone, 'Por favor ingresa tu nombre y apellido completo (ejemplo: Camila Pérez):');
            return;
        }
        session.data.first_name = parts[0];
        session.data.last_name = parts.slice(1).join(' ');
        session.state = 'AWAITING_ATTENDANCE';
        await saveWhatsAppSession(phone, 'AWAITING_ATTENDANCE', session.data, msgId);

        await sendWhatsAppMessage(phone, '¿Asistirás al matrimonio?', [
            { id: 'attendance_attending', title: 'Sí, asistiré' },
            { id: 'attendance_not_attending', title: 'No podré asistir' },
            { id: 'attendance_pending', title: 'Todavía no puedo' }
        ]);
        return;
    }

    if (session.state === 'AWAITING_ATTENDANCE') {
        let attStatus = null;
        if (text === 'attendance_attending' || lowerText.includes('sí, asistiré') || lowerText.includes('si, asistire')) attStatus = 'attending';
        else if (text === 'attendance_not_attending' || lowerText.includes('no podré asistir') || lowerText.includes('no podre asistir')) attStatus = 'not_attending';
        else if (text === 'attendance_pending' || lowerText.includes('todavía no puedo') || lowerText.includes('todavia no puedo')) attStatus = 'pending';

        if (!attStatus) {
            await sendWhatsAppMessage(phone, 'Para ayudarte con tu confirmación, responde una de las opciones disponibles.');
            return;
        }

        session.data.attendance_status = attStatus;

        if (attStatus === 'attending') {
            session.state = 'AWAITING_DIETARY';
            await saveWhatsAppSession(phone, 'AWAITING_DIETARY', session.data, msgId);
            await sendWhatsAppMessage(phone, '¿Tienes alguna restricción alimentaria?\n1. Ninguna\n2. Vegetariano\n3. Vegano\n4. Celíaco / libre de gluten\n5. Alergias\n6. Otra');
        } else {
            session.state = 'AWAITING_CONFIRMATION';
            await saveWhatsAppSession(phone, 'AWAITING_CONFIRMATION', session.data, msgId);
            const statusLabel = attStatus === 'not_attending' ? 'No podré asistir' : 'Todavía no puedo confirmar';
            await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:\n\nNombre: ' + session.data.first_name + ' ' + session.data.last_name + '\nAsistencia: ' + statusLabel + '\n\n¿Está correcto?', [
                { id: 'rsvp_confirm', title: 'CONFIRMAR' },
                { id: 'rsvp_cancel', title: 'CANCELAR' }
            ]);
        }
        return;
    }

    if (session.state === 'AWAITING_DIETARY') {
        let dietary = null;
        if (text === 'dietary_none' || text === '1' || lowerText.includes('ninguna')) dietary = 'Ninguna';
        else if (text === 'dietary_vegetarian' || text === '2' || lowerText.includes('vegetariano')) dietary = 'Vegetariano';
        else if (text === 'dietary_vegan' || text === '3' || lowerText.includes('vegano')) dietary = 'Vegano';
        else if (text === 'dietary_gluten_free' || text === '4' || lowerText.includes('celíaco') || lowerText.includes('celiaco')) dietary = 'Celíaco / libre de gluten';
        else if (text === 'dietary_allergies' || text === '5' || lowerText.includes('alergias')) dietary = 'Alergias';
        else if (text === 'dietary_other' || text === '6' || lowerText.includes('otra')) dietary = 'Otra';

        if (!dietary) {
            await sendWhatsAppMessage(phone, 'Para ayudarte con tu confirmación, responde una de las opciones disponibles.');
            return;
        }

        session.data.dietary_type = dietary;

        if (dietary === 'Alergias' || dietary === 'Otra') {
            session.state = 'AWAITING_DIETARY_DETAIL';
            await saveWhatsAppSession(phone, 'AWAITING_DIETARY_DETAIL', session.data, msgId);
            await sendWhatsAppMessage(phone, 'Escribe el detalle de tu restricción alimentaria (ej: alergia al maní):');
            return;
        }

        session.state = 'AWAITING_CONFIRMATION';
        await saveWhatsAppSession(phone, 'AWAITING_CONFIRMATION', session.data, msgId);
        await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:\n\nNombre: ' + session.data.first_name + ' ' + session.data.last_name + '\nAsistencia: Sí, asistiré\nRestricción: ' + dietary + '\n\n¿Está correcto?', [
            { id: 'rsvp_confirm', title: 'CONFIRMAR' },
            { id: 'rsvp_cancel', title: 'CANCELAR' }
        ]);
        return;
    }

    if (session.state === 'AWAITING_DIETARY_DETAIL') {
        const detail = text.trim();
        if (detail.length < 2 || detail.toLowerCase() === 'alergias' || detail.toLowerCase() === 'otra') {
            await sendWhatsAppMessage(phone, 'Por favor especifica el detalle de tu restricción alimentaria:');
            return;
        }

        session.data.dietary_detail = detail;
        session.state = 'AWAITING_CONFIRMATION';
        await saveWhatsAppSession(phone, 'AWAITING_CONFIRMATION', session.data, msgId);

        await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:\n\nNombre: ' + session.data.first_name + ' ' + session.data.last_name + '\nAsistencia: Sí, asistiré\nRestricción: ' + session.data.dietary_type + ' (' + session.data.dietary_detail + ')\n\n¿Está correcto?', [
            { id: 'rsvp_confirm', title: 'CONFIRMAR' },
            { id: 'rsvp_cancel', title: 'CANCELAR' }
        ]);
        return;
    }

    if (session.state === 'AWAITING_CONFIRMATION') {
        if (text === 'rsvp_confirm' || lowerText.includes('confirmar')) {
            try {
                // Server validation call before save
                const valRes = validateRSVPInput({
                    first_name: session.data.first_name,
                    last_name: session.data.last_name,
                    phone: phone,
                    attendance_status: session.data.attendance_status,
                    dietary_type: session.data.dietary_type,
                    dietary_detail: session.data.dietary_detail
                });

                if (!valRes.valid) {
                    await sendWhatsAppMessage(phone, 'Datos de confirmación no válidos: ' + valRes.error);
                    return;
                }

                let savedRecord = null;
                const fullNameNorm = valRes.data.full_name_normalized;

                if (session.data.target_id) {
                    savedRecord = await updateRSVPRecord(session.data.target_id, {
                        attendance_status: valRes.data.attendance_status,
                        dietary_type: valRes.data.dietary_type,
                        dietary_detail: valRes.data.dietary_detail
                    });
                    if (savedRecord) await createRSVPEvent(session.data.target_id, 'updated', 'whatsapp');
                } else {
                    const existing = await getRSVPByPhoneAndName(phone, fullNameNorm);
                    if (existing) {
                        savedRecord = await updateRSVPRecord(existing.id, {
                            attendance_status: valRes.data.attendance_status,
                            dietary_type: valRes.data.dietary_type,
                            dietary_detail: valRes.data.dietary_detail
                        });
                        if (savedRecord) await createRSVPEvent(existing.id, 'updated', 'whatsapp');
                    } else {
                        savedRecord = await createRSVPRecord({
                            ...valRes.data,
                            source: 'whatsapp',
                            reconfirmation_status: 'not_started'
                        });
                        if (savedRecord) await createRSVPEvent(savedRecord.id, 'created', 'whatsapp');
                    }
                }

                if (!savedRecord) {
                    await sendWhatsAppMessage(phone, 'No pudimos registrar tu respuesta en este momento. Intenta nuevamente en unos minutos.');
                    return;
                }

                const sheetRes = await syncToGoogleSheets(savedRecord, Boolean(session.data.target_id));
                if (sheetRes.synced) {
                    await updateRSVPRecord(savedRecord.id, { sheet_sync_status: 'synced', sheet_row_number: sheetRes.sheet_row_number });
                } else {
                    await updateRSVPRecord(savedRecord.id, { sheet_sync_status: 'failed' });
                }

                await saveWhatsAppSession(phone, 'IDLE', {}, msgId);
                await sendWhatsAppMessage(phone, 'Tu respuesta quedó registrada correctamente. No necesitas confirmarla nuevamente en la web. Si tus planes cambian, escribe MODIFICAR.');

            } catch (err) {
                console.error('WhatsApp confirmation save error:', err.message);
                await sendWhatsAppMessage(phone, 'No pudimos registrar tu respuesta en este momento. Intenta nuevamente en unos minutos.');
            }
        } else {
            await saveWhatsAppSession(phone, 'IDLE', {}, msgId);
            await sendWhatsAppMessage(phone, 'Operación cancelada.');
        }
    }
}
