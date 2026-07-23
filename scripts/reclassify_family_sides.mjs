import fs from 'fs';
import path from 'path';
import os from 'os';

(async () => {
    const authFile = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
    const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    const token = authData.token;

    async function getEnvVal(eid) {
        const res = await fetch(`https://api.vercel.com/v9/projects/prj_CnQR6nh0a1lwcHpN1F3vLq1IWNHT/env/${eid}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        return (d.value || '').trim();
    }

    const supabaseKey = await getEnvVal('tIdPJeHjqlNaqtMn');
    const supabaseUrl = 'https://mwumnywbvjxekskfrlms.supabase.co';

    const subHeaders = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
    };

    // 1. Fetch all wedding_guests
    const res = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=*`, { headers: subHeaders });
    const guests = await res.json();

    let legacyCount = 0;
    const allowedSides = ['Felipe', 'Camila', 'Compartido', 'Por clasificar'];

    for (const g of guests) {
        if (!allowedSides.includes(g.family_side)) {
            legacyCount++;
            let newSide = 'Por clasificar';
            const gLower = (g.group_name || '').toLowerCase();
            if (gLower.includes('felipe') || gLower.includes('novio')) newSide = 'Felipe';
            else if (gLower.includes('cami') || gLower.includes('camila') || gLower.includes('novia')) newSide = 'Camila';
            else if (gLower.includes('compartido') || gLower.includes('amigos comun')) newSide = 'Compartido';

            await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${g.id}`, {
                method: 'PATCH',
                headers: subHeaders,
                body: JSON.stringify({ family_side: newSide })
            });
        }
    }

    // Verify after update
    const verifyRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=*`, { headers: subHeaders });
    const verifyGuests = await verifyRes.json();
    const remainingLegacy = verifyGuests.filter(g => !allowedSides.includes(g.family_side)).length;

    console.log('--- FAMILY SIDE RECLASSIFICATION ---');
    console.log('LEGACY_COUNT_CLEANED:', legacyCount);
    console.log('LEGACY_FAMILY_SIDE_VALUES:', remainingLegacy);
    console.log('IMPORTED_TRACKED:', verifyGuests.length);
    console.log('------------------------------------');
})();
