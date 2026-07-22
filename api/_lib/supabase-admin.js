export async function supabaseRequest(path, options = {}) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error('SUPABASE_NOT_CONFIGURED');
    }

    const url = supabaseUrl + '/rest/v1/' + path;
    const headers = {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation',
        ...(options.headers || {})
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            const err = new Error('SUPABASE_ERROR_' + response.status);
            err.status = response.status;
            err.detail = errText;
            throw err;
        }

        if (response.status === 204) return null;
        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

export async function createRSVPRecord(data) {
    const res = await supabaseRequest('rsvp_responses', {
        method: 'POST',
        body: data
    });
    return res && res[0] ? res[0] : null;
}

export async function getRSVPById(id) {
    const res = await supabaseRequest('rsvp_responses?id=eq.' + id + '&select=*');
    return res && res[0] ? res[0] : null;
}

export async function getRSVPByPhoneAndName(phone, fullNameNormalized) {
    const res = await supabaseRequest('rsvp_responses?phone_e164=eq.' + encodeURIComponent(phone) + '&full_name_normalized=eq.' + encodeURIComponent(fullNameNormalized) + '&select=*');
    return res && res[0] ? res[0] : null;
}

export async function getRSVPsByPhone(phone) {
    return await supabaseRequest('rsvp_responses?phone_e164=eq.' + encodeURIComponent(phone) + '&select=*');
}

export async function updateRSVPRecord(id, updates) {
    const res = await supabaseRequest('rsvp_responses?id=eq.' + id, {
        method: 'PATCH',
        body: updates
    });
    return res && res[0] ? res[0] : null;
}

export async function createRSVPEvent(rsvpId, eventType, source) {
    return await supabaseRequest('rsvp_events', {
        method: 'POST',
        body: { rsvp_id: rsvpId, event_type: eventType, source }
    });
}

export async function getWhatsAppSession(phone) {
    const res = await supabaseRequest('whatsapp_sessions?phone_e164=eq.' + encodeURIComponent(phone) + '&select=*');
    return res && res[0] ? res[0] : null;
}

export async function saveWhatsAppSession(phone, state, sessionData, lastMsgId) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return await supabaseRequest('whatsapp_sessions', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: {
            phone_e164: phone,
            state,
            session_data: sessionData,
            last_message_id: lastMsgId,
            expires_at: expiresAt
        }
    });
}

export async function isMessageProcessed(msgId, phone) {
    try {
        const res = await supabaseRequest('whatsapp_processed_messages?message_id=eq.' + encodeURIComponent(msgId) + '&select=*');
        if (res && res.length > 0) return true;

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseRequest('whatsapp_processed_messages', {
            method: 'POST',
            body: { message_id: msgId, phone_e164: phone, expires_at: expiresAt }
        });
        return false;
    } catch (err) {
        if (err.status === 409) return true;
        throw err;
    }
}
