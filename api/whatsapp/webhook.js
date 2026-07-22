import crypto from 'crypto';
import { validateRSVPInput, normalizePhone, normalizeName } from '../_lib/rsvp-service.js';
import { syncToGoogleSheets } from '../_lib/google-sheets.js';
import { sendWhatsAppMessage } from '../_lib/whatsapp-client.js';

const memorySessions = new Map();
const memoryRSVPs = new Map();
const processedMsgIds = new Set();

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
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'wedding_rsvp_verify_token_2026';

        if (mode === 'subscribe' && token === expectedToken) {
            return res.status(200).send(challenge);
        } else {
            return res.status(403).send('Forbidden');
        }
    }

    if (req.method === 'POST') {
        const metaSecret = process.env.META_APP_SECRET;
        const signature = req.headers['x-hub-signature-256'];

        if (metaSecret && signature) {
            const rawBody = JSON.stringify(req.body);
            const expectedSig = 'sha256=' + crypto.createHmac('sha256', metaSecret).update(rawBody).digest('hex');
            if (signature !== expectedSig) {
                return res.status(401).json({ error: 'INVALID_SIGNATURE' });
            }
        }

        const body = req.body || {};
        if (body.object === 'whatsapp_business_account') {
            const entries = body.entry || [];
            for (const entry of entries) {
                const changes = entry.changes || [];
                for (const change of changes) {
                    const value = change.value || {};
                    const messages = value.messages || [];
                    for (const msg of messages) {
                        const msgId = msg.id;
                        if (processedMsgIds.has(msgId)) continue;
                        processedMsgIds.add(msgId);

                        const fromPhone = normalizePhone(msg.from);
                        const msgText = (msg.text ? msg.text.body : (msg.interactive ? msg.interactive.button_reply.title : '')).trim();

                        if (fromPhone) {
                            await processWhatsAppFlow(fromPhone, msgText, msgId);
                        }
                    }
                }
            }
        }

        return res.status(200).json({ status: 'EVENT_RECEIVED' });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}

async function processWhatsAppFlow(phone, text, msgId) {
    let session = memorySessions.get(phone) || { state: 'IDLE', data: {} };
    const lowerText = text.toLowerCase();

    for (const [key, answer] of Object.entries(FAQ_MAP)) {
        if (lowerText.includes(key)) {
            await sendWhatsAppMessage(phone, answer);
            return;
        }
    }

    if (lowerText === 'modificar') {
        session.state = 'AWAITING_NAME';
        session.data = {};
        memorySessions.set(phone, session);
        await sendWhatsAppMessage(phone, 'Iniciemos la modificación de tu respuesta. Por favor ingresa tu Nombre y Apellido:');
        return;
    }

    if (lowerText === 'cancelar') {
        session.state = 'IDLE';
        session.data = {};
        memorySessions.set(phone, session);
        await sendWhatsAppMessage(phone, 'Operación cancelada. Puedes escribirnos nuevamente cuando desees.');
        return;
    }

    if (session.state === 'IDLE') {
        session.state = 'AWAITING_NAME';
        memorySessions.set(phone, session);
        await sendWhatsAppMessage(phone, '¡Hola! Este es el WhatsApp que Felipe y Cami habilitaron para mantener las confirmaciones del matrimonio ordenadas. Te ayudaremos a registrar tu respuesta. Toma menos de un minuto.

Por favor, ingresa tu Nombre y Apellido:');
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
        memorySessions.set(phone, session);

        await sendWhatsAppMessage(phone, '¿Asistirás al matrimonio?', [
            { id: 'attending', title: 'Sí, asistiré' },
            { id: 'not_attending', title: 'No podré asistir' },
            { id: 'pending', title: 'Todavía no puedo' }
        ]);
        return;
    }

    if (session.state === 'AWAITING_ATTENDANCE') {
        let attStatus = 'pending';
        if (lowerText.includes('sí') || lowerText.includes('si') || lowerText.includes('attending')) attStatus = 'attending';
        else if (lowerText.includes('no') || lowerText.includes('not_attending')) attStatus = 'not_attending';

        session.data.attendance_status = attStatus;

        if (attStatus === 'attending') {
            session.state = 'AWAITING_DIETARY';
            memorySessions.set(phone, session);
            await sendWhatsAppMessage(phone, '¿Tienes alguna restricción alimentaria?', [
                { id: 'none', title: 'Ninguna' },
                { id: 'veggie', title: 'Vegetariano' },
                { id: 'vegan', title: 'Vegano' }
            ]);
        } else {
            session.state = 'AWAITING_CONFIRMATION';
            memorySessions.set(phone, session);
            const statusLabel = attStatus === 'not_attending' ? 'No podré asistir' : 'Pendiente';
            await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:

Nombre: ' + session.data.first_name + ' ' + session.data.last_name + '
Asistencia: ' + statusLabel + '

¿Está correcto?', [
                { id: 'confirm', title: 'CONFIRMAR' },
                { id: 'cancel', title: 'CANCELAR' }
            ]);
        }
        return;
    }

    if (session.state === 'AWAITING_DIETARY') {
        session.data.dietary_type = text;
        session.state = 'AWAITING_CONFIRMATION';
        memorySessions.set(phone, session);

        await sendWhatsAppMessage(phone, 'Registraremos la siguiente respuesta:

Nombre: ' + session.data.first_name + ' ' + session.data.last_name + '
Asistencia: Sí, asistiré
Restricción: ' + text + '

¿Está correcto?', [
            { id: 'confirm', title: 'CONFIRMAR' },
            { id: 'cancel', title: 'CANCELAR' }
        ]);
        return;
    }

    if (session.state === 'AWAITING_CONFIRMATION') {
        if (lowerText.includes('confirmar') || lowerText.includes('confirm')) {
            const rsvpId = 'rsvp_wa_' + Date.now();
            const rsvpRecord = {
                id: rsvpId,
                first_name: session.data.first_name,
                last_name: session.data.last_name,
                full_name_normalized: normalizeName(session.data.first_name + ' ' + session.data.last_name),
                phone_e164: phone,
                attendance_status: session.data.attendance_status,
                dietary_type: session.data.dietary_type || null,
                source: 'whatsapp',
                created_at: new Date().toISOString()
            };

            await syncToGoogleSheets(rsvpRecord, false);
            memoryRSVPs.set(rsvpId, rsvpRecord);

            session.state = 'IDLE';
            session.data = {};
            memorySessions.set(phone, session);

            await sendWhatsAppMessage(phone, 'Tu respuesta quedó registrada correctamente. No necesitas confirmarla nuevamente en la web. Si tus planes cambian, escribe MODIFICAR.');
        } else {
            session.state = 'IDLE';
            session.data = {};
            memorySessions.set(phone, session);
            await sendWhatsAppMessage(phone, 'Operación cancelada.');
        }
    }
}
