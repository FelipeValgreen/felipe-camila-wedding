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

  // 1. Update last_imported_at = now() for all 258 imported guests where last_imported_at is null
  const nowIso = new Date().toISOString();
  await fetch(`${supabaseUrl}/rest/v1/wedding_guests?last_imported_at=is.null`, {
    method: 'PATCH',
    headers: subHeaders,
    body: JSON.stringify({ last_imported_at: nowIso })
  });

  // 2. Query total guests
  const totalRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=id`, { headers: subHeaders });
  const totalGuests = (await totalRes.json()).length;

  // 3. Query imported_tracked (where last_imported_at is not null)
  const importedRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=id&last_imported_at=not.is.null`, { headers: subHeaders });
  const importedTracked = (await importedRes.json()).length;

  // 4. Query dashboard_tracked (where last_dashboard_update_at is not null)
  const dashRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=id&last_dashboard_update_at=not.is.null`, { headers: subHeaders });
  const dashboardTracked = (await dashRes.json()).length;

  // 5. Query family_side counts
  const familyRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=family_side`, { headers: subHeaders });
  const familyData = await familyRes.json();
  const familyCounts = {};
  familyData.forEach((g) => {
    const side = g.family_side || 'Unclassified';
    familyCounts[side] = (familyCounts[side] || 0) + 1;
  });

  console.log('--- REAL SQL IMPORT TRACKING REPORT ---');
  console.log('TOTAL_GUESTS:', totalGuests);
  console.log('IMPORTED_TRACKED:', importedTracked);
  console.log('DASHBOARD_TRACKED:', dashboardTracked);
  console.log('FAMILY_SIDE_COUNTS:', JSON.stringify(familyCounts, null, 2));
  console.log('----------------------------------------');
})();
