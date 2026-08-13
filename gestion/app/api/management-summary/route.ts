import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function countQuery(query: any) {
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('active')
      .eq('id', user.id)
      .single();

    if (!profile?.active) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const [
      rsvpAttending,
      rsvpDeclined,
      rsvpPending,
      rsvpMatched,
      rsvpNeedsReview,
      rsvpUnmatched,
      rsvpResponses,
      sheetSynced,
      activeGuests,
      activeAttendingGuests,
      activeDeclinedGuests,
      activePendingGuests,
      openIssues,
    ] = await Promise.all([
      countQuery(supabase.from('rsvp_response_members').select('id', { count: 'exact', head: true }).eq('attendance_status', 'attending')),
      countQuery(supabase.from('rsvp_response_members').select('id', { count: 'exact', head: true }).eq('attendance_status', 'not_attending')),
      countQuery(supabase.from('rsvp_response_members').select('id', { count: 'exact', head: true }).eq('attendance_status', 'pending')),
      countQuery(supabase.from('rsvp_response_members').select('id', { count: 'exact', head: true }).eq('attendance_status', 'attending').eq('resolution_status', 'matched')),
      countQuery(supabase.from('rsvp_response_members').select('id', { count: 'exact', head: true }).eq('attendance_status', 'attending').eq('resolution_status', 'needs_review')),
      countQuery(supabase.from('rsvp_response_members').select('id', { count: 'exact', head: true }).eq('attendance_status', 'attending').eq('resolution_status', 'unmatched')),
      countQuery(supabase.from('rsvp_responses').select('id', { count: 'exact', head: true })),
      countQuery(supabase.from('rsvp_responses').select('id', { count: 'exact', head: true }).eq('sheet_sync_status', 'synced')),
      countQuery(supabase.from('wedding_guests').select('id', { count: 'exact', head: true }).eq('guest_status', 'active')),
      countQuery(supabase.from('wedding_guests').select('id', { count: 'exact', head: true }).eq('attendance_status', 'attending').eq('guest_status', 'active')),
      countQuery(supabase.from('wedding_guests').select('id', { count: 'exact', head: true }).eq('attendance_status', 'not_attending').eq('guest_status', 'active')),
      countQuery(supabase.from('wedding_guests').select('id', { count: 'exact', head: true }).eq('attendance_status', 'pending').eq('guest_status', 'active')),
      countQuery(supabase.from('management_issues').select('id', { count: 'exact', head: true }).is('resolved_at', null)),
    ]);

    const [{ data: latestMember }, { data: latestResponse }] = await Promise.all([
      supabase
        .from('rsvp_response_members')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('rsvp_responses')
        .select('created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      summary: {
        // These are people currently integrated through the RSVP/member pipeline.
        // Do not present them as a manually audited "official total" unless the
        // nominal list has also been reconciled into this pipeline.
        rsvpAttending,
        rsvpDeclined,
        rsvpPending,
        rsvpPeopleIntegrated: rsvpAttending + rsvpDeclined + rsvpPending,
        rsvpMatched,
        rsvpNeedsReview,
        rsvpUnmatched,
        reconciliationPending: rsvpNeedsReview + rsvpUnmatched,
        rsvpResponses,
        sheetSynced,
        sheetPending: Math.max(0, rsvpResponses - sheetSynced),
        activeGuests,
        activeAttendingGuests,
        activeDeclinedGuests,
        activePendingGuests,
        openIssues,
        lastRsvpUpdateAt: latestMember?.updated_at || latestResponse?.updated_at || null,
        lastResponseAt: latestResponse?.created_at || null,
        countSemantics: 'integrated_rsvp_people',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible cargar el resumen.' }, { status: 500 });
  }
}
