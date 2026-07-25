import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { processSyncOutbox } from '@/lib/sync-outbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('role, active')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.active || profile.role === 'viewer') {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const result = await processSyncOutbox({ limit: 100 });
    return NextResponse.json(result, { status: result.failed > 0 ? 207 : 200 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'SYNC_PROCESSING_FAILED' },
      { status: 500 }
    );
  }
}
