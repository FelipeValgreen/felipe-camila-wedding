export function getSupabaseServerKey(env = process.env) {
    return env.SUPABASE_SECRET_KEY
        || env.SUPABASE_SERVICE_ROLE_KEY
        || null;
}

export function buildSupabaseHeaders(key, options = {}) {
    if (!key) {
        throw new Error('SUPABASE_NOT_CONFIGURED');
    }

    const customHeaders = { ...(options.headers || {}) };

    delete customHeaders.apikey;
    delete customHeaders.Authorization;
    delete customHeaders.authorization;

    const headers = {
        ...customHeaders,
        apikey: key,
        'Content-Type': 'application/json',
        Prefer: options.prefer || 'return=representation'
    };

    if (!key.startsWith('sb_secret_')) {
        headers.Authorization = 'Bearer ' + key;
    }

    return headers;
}

export function sanitizeSupabaseError(error) {
    return {
        code: error?.message || 'SUPABASE_REQUEST_FAILED',
        status: error?.status || 500
    };
}

export async function supabaseRequest(path, options = {}) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = getSupabaseServerKey();

    if (!supabaseUrl || !serviceKey) {
        throw new Error('SUPABASE_NOT_CONFIGURED');
    }

    const url = supabaseUrl + '/rest/v1/' + path;
    const headers = buildSupabaseHeaders(serviceKey, options);

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

export function isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid.trim());
}

export async function createRSVPRecord(data) {
    const res = await supabaseRequest('rsvp_responses', {
        method: 'POST',
        body: data
    });
    return res && res[0] ? res[0] : null;
}

export async function getRSVPById(id) {
    if (!isValidUUID(id)) return null;
    const res = await supabaseRequest('rsvp_responses?id=eq.' + encodeURIComponent(id) + '&select=*');
    return res && res[0] ? res[0] : null;
}

export async function getRSVPByLastWhatsAppMessageId(msgId) {
    if (!msgId) return null;
    const res = await supabaseRequest('rsvp_responses?last_whatsapp_message_id=eq.' + encodeURIComponent(msgId) + '&select=*');
    return res && res[0] ? res[0] : null;
}

export async function getRSVPByPhoneAndName(phone, fullNameNormalized) {
    const res = await supabaseRequest('rsvp_responses?phone_e164=eq.' + encodeURIComponent(phone) + '&full_name_normalized=eq.' + encodeURIComponent(fullNameNormalized) + '&select=*');
    return res && res[0] ? res[0] : null;
}

export async function getRSVPsByPhoneSanitized(phone) {
    return await supabaseRequest('rsvp_responses?phone_e164=eq.' + encodeURIComponent(phone) + '&select=id,first_name,last_name');
}

export async function updateRSVPRecord(id, updates) {
    if (!isValidUUID(id)) return null;
    const res = await supabaseRequest('rsvp_responses?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        body: updates
    });
    return res && res[0] ? res[0] : null;
}

export async function createRSVPEvent(rsvpId, eventType, source) {
    if (!isValidUUID(rsvpId)) return null;
    try {
        return await supabaseRequest('rsvp_events', {
            method: 'POST',
            body: { rsvp_id: rsvpId, event_type: eventType, source }
        });
    } catch (err) {
        console.error('Non-critical event log failure:', err.message);
        return null;
    }
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

export async function claimWhatsAppMessage(msgId, phone) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
        const res = await supabaseRequest('whatsapp_processed_messages', {
            method: 'POST',
            prefer: 'return=representation',
            body: { message_id: msgId, phone_e164: phone, status: 'processing', expires_at: expiresAt }
        });
        return { claimed: true, record: res ? res[0] : null };
    } catch (err) {
        if (err.status === 409 || (err.detail && err.detail.includes('duplicate'))) {
            const existing = await supabaseRequest('whatsapp_processed_messages?message_id=eq.' + encodeURIComponent(msgId) + '&select=*');
            const rec = existing && existing[0] ? existing[0] : null;
            if (!rec) return { claimed: false, status: 'unknown' };

            if (rec.status === 'processed') {
                return { claimed: false, status: 'processed' };
            }

            // Allow atomic reclaim if stuck in processing for > 30 seconds
            const now = Date.now();
            const startedAtMs = rec.started_at ? new Date(rec.started_at).getTime() : 0;
            const isStaleProcessing = (rec.status === 'processing' && (now - startedAtMs > 30000));

            if (rec.status === 'failed') {
                const patchUrl = 'whatsapp_processed_messages?message_id=eq.' + encodeURIComponent(msgId) + '&status=eq.failed';
                const updated = await supabaseRequest(patchUrl, {
                    method: 'PATCH',
                    prefer: 'return=representation',
                    body: { status: 'processing', started_at: new Date().toISOString(), last_error_code: null }
                });

                if (updated && updated.length === 1) {
                    return { claimed: true, retry: true, record: updated[0] };
                } else {
                    return { claimed: false, status: 'processing' };
                }
            }

            if (isStaleProcessing) {
                const patchUrl = 'whatsapp_processed_messages?message_id=eq.' + encodeURIComponent(msgId) + '&status=eq.processing&started_at=eq.' + encodeURIComponent(rec.started_at);
                const updated = await supabaseRequest(patchUrl, {
                    method: 'PATCH',
                    prefer: 'return=representation',
                    body: { status: 'processing', started_at: new Date().toISOString(), last_error_code: null }
                });

                if (updated && updated.length === 1) {
                    return { claimed: true, retry: true, record: updated[0] };
                } else {
                    return { claimed: false, status: 'processing' };
                }
            }

            if (rec.status === 'processing') {
                return { claimed: false, status: 'processing' };
            }
        }
        throw err;
    }
}

export async function markWhatsAppMessageStatus(msgId, status, errorCode = null) {
    const updates = { status, last_error_code: errorCode };
    if (status === 'processed') updates.processed_at = new Date().toISOString();
    return await supabaseRequest('whatsapp_processed_messages?message_id=eq.' + encodeURIComponent(msgId), {
        method: 'PATCH',
        body: updates
    });
}
