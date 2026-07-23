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

  const saEmail = await getEnvVal('JwOVODGkkSW6ZY62');
  const saKey = await getEnvVal('fEgjSAksFUWsv8NL');
  const spreadsheetId = await getEnvVal('nOwry9xceJ90LLgb');
  const supabaseSecretKey = await getEnvVal('tIdPJeHjqlNaqtMn');
  const supabasePublishableKey = 'sb_publishable_fd17si3WzUC2EgAqCeczAg_Gy3HW-n-';
  const supabaseUrl = 'https://mwumnywbvjxekskfrlms.supabase.co';

  // 1. Write local .env.local
  const envContent = `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${supabasePublishableKey}
SUPABASE_SECRET_KEY=${supabaseSecretKey}
GOOGLE_SERVICE_ACCOUNT_EMAIL=${saEmail}
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="${saKey.replace(/\n/g, '\\n')}"
GOOGLE_SHEETS_SPREADSHEET_ID=${spreadsheetId}
`;

  fs.writeFileSync(path.join(process.cwd(), 'gestion', '.env.local'), envContent);
  console.log('gestion/.env.local WRITTEN SUCCESSFULLY');

  // 2. Add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY & NEXT_PUBLIC_SUPABASE_URL to Vercel Environment Variables
  const addEnvRes1 = await fetch(`https://api.vercel.com/v10/projects/prj_CnQR6nh0a1lwcHpN1F3vLq1IWNHT/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      value: supabasePublishableKey,
      type: 'plain',
      target: ['production', 'preview', 'development']
    })
  });

  const addEnvRes2 = await fetch(`https://api.vercel.com/v10/projects/prj_CnQR6nh0a1lwcHpN1F3vLq1IWNHT/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: supabaseUrl,
      type: 'plain',
      target: ['production', 'preview', 'development']
    })
  });

  console.log('VERCEL ENV PUSH:', addEnvRes1.status, addEnvRes2.status);
})();
