import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { operationalSheetMode, readSheetRange } from '@/lib/google-sheets-server';

export const dynamic = 'force-dynamic';

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });

    const { data: profile } = await supabase.from('admin_profiles').select('active').eq('id', user.id).single();
    if (!profile?.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const [confirmedRows, groupRows, membersResult] = await Promise.all([
      readSheetRange('CONFIRMADOS_ACTUALES!A1:J200'),
      readSheetRange('GRUPOS_MESA!A1:H200'),
      supabase
        .from('rsvp_response_members')
        .select('id, rsvp_id, display_name, guest_id, resolution_status, attendance_status, dietary_type, dietary_detail, updated_at')
        .order('updated_at', { ascending: true }),
    ]);

    if (membersResult.error) throw membersResult.error;

    const people = confirmedRows.slice(1).map((row, index) => ({
      rowNumber: index + 2,
      name: row[0] || '',
      attendance: row[1] || '',
      dietaryType: row[2] || '',
      dietaryDetail: row[3] || '',
      recordStatus: row[4] || '',
      guestId: row[5] || null,
      rsvpId: row[6] || null,
      confirmedAt: row[7] || null,
      syncStatus: row[8] || '',
      phone: row[9] || '',
      source: 'confirmed_sheet' as const,
    })).filter((person) => person.name);

    const attending = people.filter((person) => person.attendance === 'Asiste');
    const declined = people.filter((person) => person.attendance === 'No asiste');
    const sheetAttendingNames = new Set(attending.map((person) => normalizeName(person.name)));
    const sheetDeclinedNames = new Set(declined.map((person) => normalizeName(person.name)));

    const incomingAttending = (membersResult.data || [])
      .filter((member) => member.attendance_status === 'attending' && !sheetAttendingNames.has(normalizeName(member.display_name || '')))
      .map((member) => ({
        id: member.id,
        rsvpId: member.rsvp_id,
        name: member.display_name || '',
        guestId: member.guest_id || null,
        resolutionStatus: member.resolution_status || 'unmatched',
        dietaryType: member.dietary_type || '',
        dietaryDetail: member.dietary_detail || '',
        updatedAt: member.updated_at || null,
        source: 'supabase_pending_sheet' as const,
      }));

    const incomingDeclined = (membersResult.data || [])
      .filter((member) => member.attendance_status === 'not_attending' && !sheetDeclinedNames.has(normalizeName(member.display_name || '')))
      .map((member) => ({
        id: member.id,
        rsvpId: member.rsvp_id,
        name: member.display_name || '',
        guestId: member.guest_id || null,
        resolutionStatus: member.resolution_status || 'unmatched',
        updatedAt: member.updated_at || null,
        source: 'supabase_pending_sheet' as const,
      }));

    const associated = attending.filter((person) => person.recordStatus === 'Ficha asociada');
    const withoutMasterRecord = attending.filter((person) => person.recordStatus === 'Sin ficha maestra');
    const dietary = attending.filter((person) => person.dietaryType && person.dietaryType !== 'Ninguna');
    const incomingAssociated = incomingAttending.filter((person) => Boolean(person.guestId));
    const incomingWithoutMaster = incomingAttending.filter((person) => !person.guestId);
    const incomingDietary = incomingAttending.filter((person) => person.dietaryType && person.dietaryType !== 'Ninguna');
    const latestSheet = attending[attending.length - 1] || null;
    const latestIncoming = incomingAttending[incomingAttending.length - 1] || null;

    const groupMembers = groupRows.slice(1).map((row, index) => ({
      rowNumber: index + 2,
      groupId: row[0] || '',
      groupName: row[1] || '',
      person: row[2] || '',
      linkType: row[3] || '',
      relation: row[4] || '',
      rsvpStatus: row[5] || '',
      tableAssigned: row[6] || '',
      sourceNote: row[7] || '',
    })).filter((row) => row.groupId && row.person);

    const grouped = Array.from(groupMembers.reduce((map, member) => {
      const current = map.get(member.groupId) || {
        groupId: member.groupId,
        groupName: member.groupName,
        linkType: member.linkType,
        confirmed: member.linkType !== 'Por validar',
        people: [] as string[],
        sourceNotes: [] as string[],
      };
      current.people.push(member.person);
      if (member.sourceNote && !current.sourceNotes.includes(member.sourceNote)) current.sourceNotes.push(member.sourceNote);
      if (member.linkType === 'Por validar') current.confirmed = false;
      map.set(member.groupId, current);
      return map;
    }, new Map<string, { groupId: string; groupName: string; linkType: string; confirmed: boolean; people: string[]; sourceNotes: string[] }>()).values());

    const suffix = operationalSheetMode() === 'staging' ? ' — STAGING' : '';
    return NextResponse.json({
      ok: true,
      mode: operationalSheetMode(),
      source: `F&C Centro Comandos${suffix} · CONFIRMADOS_ACTUALES`,
      liveSource: 'Supabase · rsvp_response_members',
      groupsSource: `F&C Centro Comandos${suffix} · GRUPOS_MESA`,
      summary: {
        attending: attending.length,
        declined: declined.length,
        currentKnownAttending: attending.length + incomingAttending.length,
        currentKnownDeclined: declined.length + incomingDeclined.length,
        incomingAttending: incomingAttending.length,
        incomingDeclined: incomingDeclined.length,
        totalResponsesPeople: people.length,
        associated: associated.length,
        currentKnownAssociated: associated.length + incomingAssociated.length,
        withoutMasterRecord: withoutMasterRecord.length,
        currentKnownWithoutMaster: withoutMasterRecord.length + incomingWithoutMaster.length,
        dietary: dietary.length,
        currentKnownDietary: dietary.length + incomingDietary.length,
        latestConfirmationName: latestIncoming?.name || latestSheet?.name || null,
        latestConfirmationAt: latestIncoming?.updatedAt || latestSheet?.confirmedAt || null,
      },
      people,
      incomingAttending,
      incomingDeclined,
      groupMembers,
      groups: grouped,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer confirmados y grupos.' }, { status: 500 });
  }
}
