import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent.startsWith('vercel-cron/')) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  if (!privateKey) {
    return NextResponse.json({ ok: false, error: 'GOOGLE_KEY_MISSING' }, { status: 500 });
  }

  const workerToken = crypto
    .createHmac('sha256', privateKey)
    .update('felipeycami-canonical-sync-v1')
    .digest('hex');
  const tokenHash = crypto.createHash('sha256').update(workerToken).digest('hex');

  let configuredProjectRef = 'unknown';
  try {
    configuredProjectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname.split('.')[0] || 'unknown';
  } catch {
    configuredProjectRef = 'invalid';
  }

  return NextResponse.json({
    ok: true,
    token_hash: tokenHash,
    configured_project_ref: configuredProjectRef
  });
}
