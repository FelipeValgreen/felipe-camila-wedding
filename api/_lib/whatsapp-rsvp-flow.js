import {
    getWhatsAppSession as defaultGetWhatsAppSession,
    saveWhatsAppSession as defaultSaveWhatsAppSession,
    getRSVPsByPhoneSanitized as defaultGetRSVPsByPhoneSanitized,
    getRSVPByPhoneAndName as defaultGetRSVPByPhoneAndName,
    getRSVPByLastWhatsAppMessageId as defaultGetRSVPByLastWhatsAppMessageId,
    updateRSVPRecord as defaultUpdateRSVPRecord,
    createRSVPRecord as defaultCreateRSVPRecord,
    createRSVPEvent as defaultCreateRSVPEvent
} from './supabase-admin.js';
import { validateRSVPInput, parseAttendanceCommand, parseDietaryCommand } from './rsvp-service.js';
import { syncToGoogleSheets as defaultSyncToGoogleSheets } from './google-sheets.js';
import { sendWhatsAppMessage as defaultSendWhatsAppMessage } from './whatsapp-client.js';

const FAQ_MAP = {
    'fecha': 'El matrimonio de Felipe y Camila se celebrará el viernes 23 de octubre de 2026.',
    'hora': 'La ceremonia comienza a las 17:50 hrs. Recomendamos llegar a las 17:25 hrs.',
    'ceremonia': 'La ceremonia religiosa será en el Santuario de la Divina Misericordia, Chicureo. Ubicación: https://maps.app.goo.gl/R8GLmxvNC2KLagVL9',
    'arboleda': 'La celebración será en Centro de Eventos Arboleda, Chicureo. Cóctel a las 18:30 hrs y cena a las 21:00 hrs. Ubicación: https://maps.app.goo.gl/kRdvXmbtHmYXUaB49',
    'dress code': 'El código de vestimenta es Black Tie (formal y elegante).',
    'novios': 'Nuestra lista de novios está en Paris (Código 21030724). Enlace: https://club.noviosparis.cl/home/couple-catalog/21030724'
};

export async function processPersistentWhatsAppFlow(phone, text, msgId, dependencies = {}) {
    const getWhatsAppSession = dependencies.getWhatsAppSession || defaultGetWhatsAppSession;
    const saveWhatsAppSession = dependencies.saveWhatsAppSession || defaultSaveWhatsAppSession;
    const getRSVPsByPhoneSanitized = dependencies.getRSVPsByPhoneSanitized || defaultGetRSVPsByPhoneSanitized;
    const getRSVPByPhoneAndName = dependencies.getRSVPByPhoneAndName || defaultGetRSVPByPhoneAndName;
    const getRSVPByLastWhatsAppMessageId = dependencies.getRSVPByLastWhatsAppMessageId || defaultGetRSVPByLastWhatsAppMessageId;
    const updateRSVPRecord = dependencies.updateRSVPRecord || defaultUpdateRSVPRecord;
    const createRSVPRecord = dependencies.createRSVPRecord || defaultCreateRSVPRecord;
    const createRSVPEvent = dependencies.createRSVPEvent || defaultCreateRSVPEvent;
    const syncToGoogleSheets = dependencies.syncToGoogleSheets || defaultSyncToGoogleSheets;
    const sendWhatsAppMessage = dependencies.sendWhatsAppMessage || defaultSendWhatsAppMessage;

    let sessionRecord = await getWhatsAppSession(phone);
    let session = sessionRecord ? { state: sessionRecord.state, data: sessionRecord.session_data || {} } : { state: 'IDLE', data: {} };

    // 1. EARLY COMPLETED_PENDING_ACK NORMALIZATION (Before FAQ/CANCELAR/MODIFICAR/IDLE routing)
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
            // Genuinely new message -> Normalize session to IDLE and continue routing current message from start
            session = { state: 'IDLE', data: {} };
        }
    }

    const lowerText = text.toLowerCase();

    for (const [key, answer] of Object.entries(FAQ_MAP)) {
        if (lowerText.includes(key)) {
            const sendRes = await sendWhatsAppMessage(phone, answer);
            if (!sendRes.ok) throw new Error(sendRes.error);
            return { ok: true };
        }
    }

    if (lowerText === 'cancelar' || text === 'rsvp_cancel') {
        const sendRes = await sendWhatsAppMessage(phone, 'Operación cancelada. Puedes escribirnos nuevamente cuando desees.');
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'IDLE', {}, msgId);
        return { ok: true };
    }

    if (lowerText === 'modificar' || text === 'rsvp_modify') {
        const rsvps = await getRSVPsByPhoneSanitized(phone);
        if (!rsvps || rsvps.length === 0) {
            const sendRes = await sendWhatsAppMessage(phone, 'No encontramos una respuesta previa registrada para este número. Iniciemos una nueva confirmación.\n\nPor favor ingresa tu Nombre y Apellido:');
            if (!sendRes.ok) throw new Error(sendRes.error);
            await saveWhatsAppSession(phone, 'AWAITING_NAME', {}, msgId);
            return { ok: true };
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
            return { ok: true };
        }

        session.data = { candidates: rsvps.map(r => ({ id: r.id, first_name: r.first_name, last_name: r.last_name })) };
        session.state = 'AWAITING_SELECTION';

        let listText = 'Encontramos varios nombres registrados con este número. Responde con el número de la persona a modificar:\n\n';
        rsvps.forEach((r, idx) => {
            listText += (idx + 1) + '. ' + r.first_name + ' ' + r.last_name + '\n';
        });
        const sendRes = await sendWhatsAppMessage(phone, listText);
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_SELECTION', session.data, msgId);
        return { ok: true };
    }

    if (session.state === 'AWAITING_SELECTION') {
        const choice = parseInt(text, 10);
        const candidates = session.data.candidates || [];
        if (isNaN(choice) || choice < 1 || choice > candidates.length) {
            const sendRes = await sendWhatsAppMessage(phone, 'Por favor responde únicamente con el número correspondiente a la persona que deseas modificar.');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return { ok: true };
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
        return { ok: true };
    }

    if (session.state === 'IDLE') {
        session.state = 'AWAITING_NAME';
        const sendRes = await sendWhatsAppMessage(phone, '¡Hola! Este es el WhatsApp que Felipe y Cami habilitaron para mantener las confirmaciones del matrimonio ordenadas. Te ayudaremos a registrar tu respuesta. Toma menos de un minuto.\n\nPor favor, ingresa tu Nombre y Apellido:');
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_NAME', {}, msgId);
        return { ok: true };
    }

    if (session.state === 'AWAITING_NAME') {
        const parts = text.split(' ');
        if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
            const sendRes = await sendWhatsAppMessage(phone, 'Por favor ingresa tu nombre y apellido completo (ejemplo: Camila Pérez):');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return { ok: true };
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
        return { ok: true };
    }

    if (session.state === 'AWAITING_ATTENDANCE') {
        const attStatus = parseAttendanceCommand(text);

        if (!attStatus) {
            const sendRes = await sendWhatsAppMessage(phone, 'Para ayudarte con tu confirmación, responde una de las opciones disponibles.');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return { ok: true };
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
        return { ok: true };
    }

    if (session.state === 'AWAITING_DIETARY') {
        const dietary = parseDietaryCommand(text);

        if (!dietary) {
            const sendRes = await sendWhatsAppMessage(phone, 'Para ayudarte con tu confirmación, responde una de las opciones disponibles.');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return { ok: true };
        }

        session.data.dietary_type = dietary;

        if (dietary === 'Alergias' || dietary === 'Otra') {
            session.state = 'AWAITING_DIETARY_DETAIL';
            const sendRes = await sendWhatsAppMessage(phone, 'Escribe el detalle de tu restricción alimentaria (ej: alergia al maní):');
            if (!sendRes.ok) throw new Error(sendRes.error);
            await saveWhatsAppSession(phone, 'AWAITING_DIETARY_DETAIL', session.data, msgId);
            return { ok: true };
        }

        session.state = 'AWAITING_CONFIRMATION';
        const sendRes = await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:\n\nNombre: ' + session.data.first_name + ' ' + session.data.last_name + '\nAsistencia: Sí, asistiré\nRestricción: ' + dietary + '\n\n¿Está correcto?', [
            { id: 'rsvp_confirm', title: 'CONFIRMAR' },
            { id: 'rsvp_cancel', title: 'CANCELAR' }
        ]);
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_CONFIRMATION', session.data, msgId);
        return { ok: true };
    }

    if (session.state === 'AWAITING_DIETARY_DETAIL') {
        const detail = text.trim();
        if (detail.length < 2 || detail.toLowerCase() === 'alergias' || detail.toLowerCase() === 'otra') {
            const sendRes = await sendWhatsAppMessage(phone, 'Por favor especifica el detalle de tu restricción alimentaria:');
            if (!sendRes.ok) throw new Error(sendRes.error);
            return { ok: true };
        }

        session.data.dietary_detail = detail;
        session.state = 'AWAITING_CONFIRMATION';
        const sendRes = await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:\n\nNombre: ' + session.data.first_name + ' ' + session.data.last_name + '\nAsistencia: Sí, asistiré\nRestricción: ' + session.data.dietary_type + ' (' + session.data.dietary_detail + ')\n\n¿Está correcto?', [
            { id: 'rsvp_confirm', title: 'CONFIRMAR' },
            { id: 'rsvp_cancel', title: 'CANCELAR' }
        ]);
        if (!sendRes.ok) throw new Error(sendRes.error);
        await saveWhatsAppSession(phone, 'AWAITING_CONFIRMATION', session.data, msgId);
        return { ok: true };
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
                return { ok: true };
            }

            let savedRecord = await getRSVPByLastWhatsAppMessageId(msgId);
            let isUpdateOperation = false;
            let recoveredByMessageId = false;
            const fullNameNorm = valRes.data.full_name_normalized;

            if (savedRecord) {
                isUpdateOperation = true;
                recoveredByMessageId = true;
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
                return { ok: true };
            }

            // Sheet logic: if recovered by messageId and already synced with positive row number, skip Sheet sync
            const isAlreadySynced = recoveredByMessageId && savedRecord.sheet_sync_status === 'synced' && Number.isInteger(savedRecord.sheet_row_number) && savedRecord.sheet_row_number > 0;

            if (!isAlreadySynced) {
                const sheetRes = await syncToGoogleSheets(savedRecord, isUpdateOperation);
                if (sheetRes.synced) {
                    await updateRSVPRecord(savedRecord.id, { sheet_sync_status: 'synced', sheet_row_number: sheetRes.sheet_row_number });
                } else {
                    await updateRSVPRecord(savedRecord.id, { sheet_sync_status: 'failed' });
                }
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
            return { ok: true };
        }
    }

    return { ok: true };
}
