// WhatsApp Cloud API Client Helper

export async function sendWhatsAppMessage(toPhone, textBody, buttons = []) {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneId || !token) {
        return { ok: false, error: 'WHATSAPP_NOT_CONFIGURED' };
    }

    try {
        const endpoint = 'https://graph.facebook.com/v18.0/' + phoneId + '/messages';
        let payload = {};

        if (buttons && buttons.length > 0) {
            payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: textBody },
                    action: {
                        buttons: buttons.map((b, i) => ({
                            type: 'reply',
                            reply: { id: b.id || ('btn_' + i), title: b.title }
                        }))
                    }
                }
            };
        } else {
            payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'text',
                text: { body: textBody }
            };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error('WhatsApp Cloud API HTTP error:', res.status);
            return { ok: false, error: 'HTTP_' + res.status };
        }

        const data = await res.json();
        const msgId = data.messages && data.messages[0] ? data.messages[0].id : null;
        return { ok: true, message_id: msgId };
    } catch (err) {
        console.error('WhatsApp API Failure:', err.message);
        return { ok: false, error: err.message || 'WHATSAPP_SEND_FAILED' };
    }
}
