import { NextRequest, NextResponse } from 'next/server';
import { processSyncOutbox } from '@/lib/sync-outbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || '';
  const authorization = request.headers.get('authorization') || '';

  if (cronSecret) {
    return authorization === `Bearer ${cronSecret}`;
  }

  // Vercel Cron uses this user agent. This fallback is only used when the
  // project has not configured CRON_SECRET; the operation remains idempotent
  // and accepts no user-controlled entity data.
  return (request.headers.get('user-agent') || '').startsWith('vercel-cron/');
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED_CRON_REQUEST' }, { status: 401 });
  }

  try {
    const result = await processSyncOutbox({ limit: 100 });
    return NextResponse.json({
      ...result,
      checked_at: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'SYNC_CRON_FAILED' },
      { status: 500 }
    );
  }
}
