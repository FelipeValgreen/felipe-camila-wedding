import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const felipePassword = process.env.FELIPE_ADMIN_PASSWORD || process.env.ADMIN_TEMP_PASSWORD;
const camilaPassword = process.env.CAMILA_ADMIN_PASSWORD || process.env.ADMIN_TEMP_PASSWORD;

if (!felipePassword || felipePassword.length < 10 || !camilaPassword || camilaPassword.length < 10) {
  console.error('FELIPE_ADMIN_PASSWORD and CAMILA_ADMIN_PASSWORD are required and must contain at least 10 characters.');
  process.exit(1);
}

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('Missing gestion/.env.local. Run this script from the gestion directory.');
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return [key, value];
    }),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in gestion/.env.local.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const authorizedAccounts = [
  { email: 'filipo.valverde@gmail.com', password: felipePassword },
  { email: 'cavargask@gmail.com', password: camilaPassword },
];

const { data, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error(`Unable to list users: ${listError.message}`);
  process.exit(1);
}

for (const account of authorizedAccounts) {
  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === account.email);

  if (!user) {
    console.error(`Authorized user not found: ${account.email}`);
    process.exit(1);
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: account.password,
    email_confirm: true,
  });

  if (error) {
    console.error(`Unable to update ${account.email}: ${error.message}`);
    process.exit(1);
  }

  console.log(`PASSWORD_CONFIGURED=${account.email}`);
}

console.log('ADMIN_PASSWORD_BOOTSTRAP=PASS');
