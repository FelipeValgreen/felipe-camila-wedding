import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

export async function POST(request: Request) {
  const environmentBlock = getDatabaseWriteBlock();
  if (environmentBlock) return NextResponse.json(environmentBlock, { status: 409 });
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
    if (!profile || !profile.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    if (profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    const body = await request.json();
    const { guest_id, rsvp_id } = body;
    if (!guest_id || !rsvp_id) return NextResponse.json({ ok: false, error: 'Missing guest_id or rsvp_id' }, { status: 400 });
    const { data: result, error } = await supabase.rpc('reconcile_rsvp_to_guest', { p_rsvp_id: rsvp_id, p_guest_id: guest_id, p_actor: user.email });
    if (error) return NextResponse.json({ ok: false, error: `Transactional reconciliation failed: ${error.message}` }, { status: 500 });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
