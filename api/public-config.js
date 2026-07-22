export default function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const number = process.env.WEDDING_WHATSAPP_NUMBER || null;

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
        wedding_whatsapp_number: number
    });
}
