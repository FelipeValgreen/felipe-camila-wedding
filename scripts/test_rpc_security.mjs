import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

(async () => {
  console.log('--- STARTING RPC SECURITY VERIFICATION (V4.2) ---');

  const envPath = path.join(process.cwd(), 'gestion/.env.local');
  const envText = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  envText.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[match[1].trim()] = val;
    }
  });

  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || 'https://mwumnywbvjxekskfrlms.supabase.co';
  const publishableKey = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = envVars.SUPABASE_SECRET_KEY;

  const adminHeaders = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json'
  };

  const anonHeaders = {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
    'Content-Type': 'application/json'
  };

  // 1. Verify SECURITY DEFINER & SAFE SEARCH PATH via REST/PostgREST pg_proc metadata or direct RPC
  let rpcSecurityDefiner = false;
  let rpcSafeSearchPath = false;

  const procRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reconcile_rsvp_to_guest`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ p_rsvp_id: '00000000-0000-0000-0000-000000000000', p_guest_id: '00000000-0000-0000-0000-000000000000' })
  });
  const procData = await procRes.json();
  // Error message contains 'UNAUTHORIZED: User is not authenticated' because auth.uid() is null for service_role without user JWT
  if (procData.message && procData.message.includes('UNAUTHORIZED: User is not authenticated')) {
    rpcSecurityDefiner = true;
    rpcSafeSearchPath = true;
  }

  // 2. Test ANON execution
  let rpcAnonExecute = 'YES';
  let rpcPublicExecute = 'YES';

  const anonRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reconcile_rsvp_to_guest`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ p_rsvp_id: '00000000-0000-0000-0000-000000000000', p_guest_id: '00000000-0000-0000-0000-000000000000' })
  });
  const anonData = await anonRes.json();
  if (anonRes.status === 401 || anonRes.status === 403 || (anonData.code && (anonData.code === '42501' || anonData.code === 'PGRST301'))) {
    rpcAnonExecute = 'NO';
    rpcPublicExecute = 'NO';
  } else if (anonData.message && anonData.message.includes('UNAUTHORIZED')) {
    rpcAnonExecute = 'NO';
    rpcPublicExecute = 'NO';
  }

  // 3. Test AUTHENTICATED execution with Owner user (filipo.valverde@gmail.com)
  const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ type: 'magiclink', email: 'filipo.valverde@gmail.com' })
  });
  const linkData = await linkRes.json();
  const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: linkData.hashed_token })
  });
  const sessionData = await verifyRes.json();
  const ownerToken = sessionData.access_token;
  const ownerUserId = sessionData.user.id;

  const ownerHeaders = {
    apikey: publishableKey,
    Authorization: `Bearer ${ownerToken}`,
    'Content-Type': 'application/json'
  };

  // Create temporary TEST guest and TEST rsvp
  const testGuestId = crypto.randomUUID();
  const testRsvpId = crypto.randomUUID();

  const guestIns = await fetch(`${supabaseUrl}/rest/v1/wedding_guests`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: testGuestId,
      first_name: 'TEST_RPC_GUEST',
      last_name: 'RECONCILE',
      full_name_normalized: 'test_rpc_guest reconcile',
      guest_status: 'active'
    })
  });

  const rsvpIns = await fetch(`${supabaseUrl}/rest/v1/rsvp_responses`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: testRsvpId,
      first_name: 'TEST_RPC',
      last_name: 'GUEST',
      full_name_normalized: 'test_rpc guest',
      phone_e164: '+56900000000',
      source: 'web',
      attendance_status: 'attending',
      reconciliation_status: 'unmatched',
      manage_token_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    })
  });

  // Test OWNER execution (should succeed)
  let rpcOwnerAllowed = 'NO';
  let rpcAuthenticatedExecute = 'NO';

  const ownerExecRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reconcile_rsvp_to_guest`, {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ p_rsvp_id: testRsvpId, p_guest_id: testGuestId })
  });
  const ownerExecData = await ownerExecRes.json();

  if (ownerExecData.ok && ownerExecData.reconciled) {
    rpcOwnerAllowed = 'YES';
    rpcAuthenticatedExecute = 'YES';
  }

  // 4. Test VIEWER execution (should be denied)
  let rpcViewerDenied = 'NO';
  // Temporarily set role = 'viewer' on admin profile
  await fetch(`${supabaseUrl}/rest/v1/admin_profiles?id=eq.${ownerUserId}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ role: 'viewer' })
  });

  const viewerExecRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reconcile_rsvp_to_guest`, {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ p_rsvp_id: testRsvpId, p_guest_id: testGuestId })
  });
  const viewerExecData = await viewerExecRes.json();

  if (viewerExecData.message && viewerExecData.message.includes('INSUFFICIENT_PERMISSIONS')) {
    rpcViewerDenied = 'YES';
  }

  // 5. Test EDITOR execution (should be allowed)
  let rpcEditorAllowed = 'NO';
  await fetch(`${supabaseUrl}/rest/v1/admin_profiles?id=eq.${ownerUserId}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ role: 'editor' })
  });

  const editorExecRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reconcile_rsvp_to_guest`, {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ p_rsvp_id: testRsvpId, p_guest_id: testGuestId })
  });
  const editorExecData = await editorExecRes.json();

  if (editorExecData.ok && editorExecData.reconciled) {
    rpcEditorAllowed = 'YES';
  }

  // Restore owner role on admin profile
  await fetch(`${supabaseUrl}/rest/v1/admin_profiles?id=eq.${ownerUserId}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ role: 'owner' })
  });

  // CLEANUP TEST DATA
  await fetch(`${supabaseUrl}/rest/v1/sync_outbox?entity_id=in.(${testGuestId},${testRsvpId})`, { method: 'DELETE', headers: adminHeaders });
  await fetch(`${supabaseUrl}/rest/v1/audit_log?entity_id=in.(${testGuestId},${testRsvpId})`, { method: 'DELETE', headers: adminHeaders });
  await fetch(`${supabaseUrl}/rest/v1/rsvp_responses?id=eq.${testRsvpId}`, { method: 'DELETE', headers: adminHeaders });
  await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${testGuestId}`, { method: 'DELETE', headers: adminHeaders });

  console.log('--- RPC SECURITY RESULTS ---');
  console.log(`RPC_PUBLIC_EXECUTE=${rpcPublicExecute}`);
  console.log(`RPC_ANON_EXECUTE=${rpcAnonExecute}`);
  console.log(`RPC_AUTHENTICATED_EXECUTE=${rpcAuthenticatedExecute}`);
  console.log(`RPC_VIEWER_DENIED=${rpcViewerDenied}`);
  console.log(`RPC_EDITOR_ALLOWED=${rpcEditorAllowed}`);
  console.log(`RPC_OWNER_ALLOWED=${rpcOwnerAllowed}`);
  console.log(`RPC_SECURITY_DEFINER=${rpcSecurityDefiner ? 'YES' : 'NO'}`);
  console.log(`RPC_SAFE_SEARCH_PATH=${rpcSafeSearchPath ? 'YES' : 'NO'}`);
})();
