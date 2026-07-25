import { getSupabaseServerKey, supabaseRequest } from '../_lib/supabase-admin.js';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    }

    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'] || '';
    const tokenQuery = req.query?.token || '';

    const isAuthorized = cronSecret && (
        authHeader === `Bearer ${cronSecret}` || tokenQuery === cronSecret
    );

    if (!isAuthorized) {
        return res.status(401).json({ ok: false, error: 'UNAUTHORIZED_CRON_REQUEST' });
    }

    try {
        const checkedAt = new Date().toISOString();
        const nowMs = Date.now();

        // 1. Fetch all rsvp_responses
        const rsvpResponses = await supabaseRequest('rsvp_responses?select=*&order=created_at.desc');
        const responses = Array.isArray(rsvpResponses) ? rsvpResponses : [];

        // 2. Fetch all wedding_guests
        const weddingGuests = await supabaseRequest('wedding_guests?select=id,rsvp_id,attendance_status&guest_status=eq.active');
        const guests = Array.isArray(weddingGuests) ? weddingGuests : [];

        // 3. Fetch rsvp_events
        const rsvpEvents = await supabaseRequest('rsvp_events?select=rsvp_id,event_type');
        const events = Array.isArray(rsvpEvents) ? rsvpEvents : [];

        const createdEventRsvpIds = new Set(events.filter(e => e.event_type === 'created').map(e => e.rsvp_id));
        const guestMapById = new Map(guests.map(g => [g.id, g]));

        let matched = 0;
        let unmatched = 0;
        let ambiguous = 0;
        let conflicts = 0;
        let sheetSyncFailed = 0;
        let missingEvent = 0;
        let attendanceMismatches = 0;
        let unhandledOver10m = 0;
        let responsesLast24h = 0;
        let autoReconciledThisRun = 0;

        for (const rsvp of responses) {
            const createdAtMs = new Date(rsvp.created_at).getTime();
            if (nowMs - createdAtMs <= 24 * 60 * 60 * 1000) {
                responsesLast24h++;
            }

            if (!createdEventRsvpIds.has(rsvp.id)) {
                missingEvent++;
            }

            if (rsvp.sheet_sync_status === 'failed') {
                sheetSyncFailed++;
            }

            const status = rsvp.reconciliation_status;
            if (status === 'matched') {
                matched++;
                if (rsvp.guest_id) {
                    const linkedGuest = guestMapById.get(rsvp.guest_id);
                    if (linkedGuest && linkedGuest.attendance_status !== rsvp.attendance_status) {
                        attendanceMismatches++;
                    }
                }
            } else if (status === 'ambiguous') {
                ambiguous++;
            } else if (status === 'conflict') {
                conflicts++;
            } else {
                unmatched++;
                if (nowMs - createdAtMs > 10 * 60 * 1000) {
                    unhandledOver10m++;
                }

                // Attempt auto-reconciliation on unmatched responses
                try {
                    const reconRes = await supabaseRequest('rpc/reconcile_rsvp_system', {
                        method: 'POST',
                        body: { p_rsvp_id: rsvp.id }
                    });
                    if (reconRes && reconRes.reconciliation_status === 'matched') {
                        autoReconciledThisRun++;
                        unmatched--;
                        matched++;
                    }
                } catch (reconErr) {
                    console.error('Cron auto-reconciliation error:', reconErr.message);
                }
            }
        }

        // Insert audit log summary
        try {
            await supabaseRequest('audit_log', {
                method: 'POST',
                body: {
                    entity_type: 'rsvp_health_cron',
                    entity_id: '00000000-0000-0000-0000-000000000000',
                    action: 'CRON_HEALTH_CHECK',
                    actor: 'cron_system',
                    origin: 'cron',
                    after_data: {
                        checked_at: checkedAt,
                        responses_total: responses.length,
                        responses_last_24h: responsesLast24h,
                        matched,
                        unmatched,
                        ambiguous,
                        conflicts,
                        sheet_sync_failed: sheetSyncFailed,
                        missing_event: missingEvent,
                        attendance_mismatches: attendanceMismatches,
                        unhandled_over_10m: unhandledOver10m,
                        auto_reconciled_this_run: autoReconciledThisRun
                    }
                }
            });
        } catch (auditErr) {
            console.error('Audit log write error in health cron:', auditErr.message);
        }

        return res.status(200).json({
            ok: true,
            metrics: {
                checked_at: checkedAt,
                responses_total: responses.length,
                responses_last_24h: responsesLast24h,
                matched,
                unmatched,
                ambiguous,
                conflicts,
                sheet_sync_failed: sheetSyncFailed,
                missing_event: missingEvent,
                attendance_mismatches: attendanceMismatches,
                unhandled_over_10m: unhandledOver10m,
                auto_reconciled_this_run: autoReconciledThisRun
            }
        });

    } catch (err) {
        console.error('Error in /api/cron/rsvp-health:', err);
        return res.status(500).json({ ok: false, error: 'CRON_HEALTH_CHECK_FAILED' });
    }
}
