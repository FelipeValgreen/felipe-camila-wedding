export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: 'GALLERY_UNAVAILABLE' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mwumnywbvjxekskfrlms.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_fd17si3WzUC2EgAqCeczAg_Gy3HW-n-';

    try {
        let page = parseInt(req.query.page || '0', 10);
        let limit = parseInt(req.query.limit || '100', 10);

        if (isNaN(page) || page < 0) page = 0;
        if (isNaN(limit) || limit < 1) limit = 100;
        if (limit > 100) limit = 100;

        const offset = page * limit;
        const endpoint = `${SUPABASE_URL}/rest/v1/guest_photos?select=url,created_at&order=created_at.asc&offset=${offset}&limit=${limit}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const isRefresh = Boolean(req.query.refresh || req.query._t);
        const fetchOptions = {
            headers: {
                'apikey': SUPABASE_PUBLISHABLE_KEY,
                'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
            },
            signal: controller.signal
        };
        if (isRefresh) {
            fetchOptions.cache = 'no-store';
        }

        const response = await fetch(endpoint, fetchOptions);

        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.status(502).json({ error: 'GALLERY_UNAVAILABLE' });
        }

        const rawData = await response.json();

        const BLOCKED_PHOTO_FILES = new Set([
            'guest_803abb01-f60a-4136-82de-0621ac183099.jpeg',
            'guest_07940307-055c-4529-9b89-f74b41537849.jpeg',
            'guest_239b82c0-b11c-4716-8b1b-ca59ef005ff0.jpeg'
        ]);

        const visibleData = rawData.filter(item => {
            const fileName = (item.url || '').split('/').pop()?.split('?')[0] || '';
            return !BLOCKED_PHOTO_FILES.has(fileName);
        });

        const NORMALIZED_MAP = {
            'guest_f33f9d8e-cf41-422a-ba6b-54cf9dc03335.jpeg': '/images/normalized/shared_4_v3_1600w.jpg',
            'guest_ebd87dd9-bdc1-47d3-987b-808c490c95b9.jpeg': '/images/normalized/shared_5_v3_1600w.jpg',
            'guest_6d2582da-998a-49ee-a36c-c91a8c987208.jpeg': '/images/normalized/shared_6_v3_1600w.jpg'
        };

        const items = visibleData.map(item => {
            const createdAt = item.created_at || '';
            let category = 'historia';
            let alt = 'Recuerdo de nuestra historia';

            if (createdAt >= '2026-03-28') {
                category = 'civil';
                alt = 'Recuerdo de nuestro matrimonio civil';
            }

            const fileName = (item.url || '').split('/').pop()?.split('?')[0] || '';
            const normalizedSrc = NORMALIZED_MAP[fileName] || item.url;

            return {
                src: normalizedSrc,
                category: category,
                alt: alt,
                rotation: 0
            };
        });

        const has_more = rawData.length === limit;

        if (isRefresh) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        } else {
            res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        }

        return res.status(200).json({
            items: items,
            page: page,
            has_more: has_more
        });

    } catch (err) {
        return res.status(500).json({ error: 'GALLERY_UNAVAILABLE' });
    }
}
