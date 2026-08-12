import { NextRequest, NextResponse } from 'next/server';
import { getExternalSyncBlock } from '@/lib/environment-guard';
import { processSyncOutbox } from '@/lib/sync-outbox';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store'
};

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || '';
  const authorization = request.headers.get('authorization') || '';

  if (cronSecret) {
    return authorization === `Bearer ${cronSecret}`;
  }

  return (request.headers.get('user-agent') || '').startsWith('vercel-cron/');
}

export async function GET(request: NextRequest) {
  const nonce = request.nextUrl.searchParams.get('nonce') || null;

  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED_CRON_REQUEST', nonce },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const environmentBlock = getExternalSyncBlock();
  if (environmentBlock) {
    return NextResponse.json(
      { ...environmentBlock, nonce },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const result = await processSyncOutbox({ limit: 100 });
    return NextResponse.json(
      {
        ...result,
        nonce,
        checked_at: new Date().toISOString()
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'SYNC_CRON_FAILED', nonce },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
