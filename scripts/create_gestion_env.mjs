import fs from 'fs';
import path from 'path';
import os from 'os';

(async () => {
  const authFile = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
  const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  const token = authData.token;

  const res = await fetch(`https://api.vercel.com/v9/projects/prj_CnQR6nh0a1lwcHpN1F3vLq1IWNHT/env`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const envs = data.envs || [];

  let pubKey = '';
  let secretKey = '';
  let saEmail = '';
  let saKey = '';
  let sheetId = '';

  envs.forEach((e) => {
    if (e.key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' || e.key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') pubKey = e.value;
    if (e.key === 'SUPABASE_SECRET_KEY') secretKey = e.value;
    if (e.key === 'GOOGLE_SERVICE_ACCOUNT_EMAIL') saEmail = e.value;
    if (e.key === 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') saKey = e.value;
    if (e.key === 'GOOGLE_SHEETS_SPREADSHEET_ID') sheetId = e.value;
  });

  const supabaseUrl = 'https://mwumnywbvjxekskfrlms.supabase.co';

  const envContent = `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${pubKey}
SUPABASE_SECRET_KEY=${secretKey}
GOOGLE_SERVICE_ACCOUNT_EMAIL=${saEmail}
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="${saKey.replace(/\n/g, '\\n')}"
GOOGLE_SHEETS_SPREADSHEET_ID=${sheetId}
`;

  fs.writeFileSync(path.join(process.cwd(), 'gestion', '.env.local'), envContent);
  console.log('gestion/.env.local WRITTEN SUCCESSFULLY');
  console.log('PUB_KEY_PRESENT:', Boolean(pubKey));
})();
