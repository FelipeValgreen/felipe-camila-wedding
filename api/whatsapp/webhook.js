import crypto from 'crypto';
import {
    normalizePhone
} from '../_lib/rsvp-service.js';
import {
    claimWhatsAppMessage,
    markWhatsAppMessageStatus,
    saveWhatsAppSession
} from '../_lib/supabase-admin.js';
import { processPersistentWhatsAppFlow } from '../_lib/whatsapp-rsvp-flow.js';

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
