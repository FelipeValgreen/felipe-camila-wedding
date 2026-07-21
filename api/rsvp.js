// Serverless Endpoint: RSVP Unified V2 (Phase B)
// Path: api/rsvp.js
// Status: BACKEND PERSISTENCE UNDER CONSTRUCTION (HTTP 501 NOT IMPLEMENTED)

export default async function handler(req, res) {
    // Identity & Security: Do not accept freely editable guest_id as authorization.
    const tokenSession = req.headers['x-invitation-session'];
    const idempotencyKey = req.headers['idempotency-key'];

    if (req.method === 'GET') {
        const { i: token, name, phone } = req.query;

        if (token) {
            // Token lookup stub
            return res.status(501).json({
                error: 'NOT_IMPLEMENTED',
                message: 'Supabase dev backend persistence not connected yet.'
            });
        }

        if (name && phone) {
            return res.status(501).json({
                error: 'NOT_IMPLEMENTED',
                message: 'Guest matching backend pending integration.'
            });
        }

        return res.status(400).json({ error: 'INVALID_PARAMETERS' });
    }

    if (req.method === 'POST') {
        // Reject missing idempotency key without fallback to Date.now()
        if (!idempotencyKey) {
            return res.status(400).json({
                error: 'MISSING_IDEMPOTENCY_KEY',
                message: 'A client-generated idempotency-key header is required.'
            });
        }

        if (!tokenSession) {
            return res.status(401).json({
                error: 'UNAUTHORIZED_SESSION',
                message: 'An authorized invitation session header is required.'
            });
        }

        // Return 501 until real Supabase transaction succeeds
        return res.status(501).json({
            error: 'NOT_IMPLEMENTED',
            message: 'RSVP database persistence is not implemented yet. Simulated confirmation is rejected.'
        });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
