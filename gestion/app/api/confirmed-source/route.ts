import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function formatPrivateKey(key: string) { return key.replace(/\\n/g, '\n'); }
function normalizeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

async function googleAccessToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now })).toString('base64url');
  const unsigned = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(formatPrivateKey(privateKey), 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }), cache: 'no-store' });
  if (!response.ok) throw new Error(`GOOGLE_OAUTH_FAILED_${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('GOOGLE_OAUTH_TOKEN_MISSING');
  return payload.access_token as string;
}

async function readRange(spreadsheetId: string, token: string, range: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_READ_FAILED_${response.status}`);
  const payload = await response.json();
  return (payload.values || []) as string[][];
}

const VALID_ATTENDANCE = new Set(['Asiste', 'No asiste']);

type MasterRecord = { masterId:string; name:string; masterGroup:string; masterCategory:string; masterDietary:string; masterOrigin:string; masterStatus:string; masterConfirmationSource:string; masterAssignedTable:string; masterObservations:string; };

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('active').eq('id', user.id).single();
    if (!profile?.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    if (!spreadsheetId || !serviceAccountEmail || !serviceAccountKey) throw new Error('GOOGLE_SHEETS_NOT_CONFIGURED');

    const token = await googleAccessToken(serviceAccountEmail, serviceAccountKey);
    const [confirmedRows, groupRows, masterRows, membersResult] = await Promise.all([
      readRange(spreadsheetId, token, 'CONFIRMADOS_ACTUALES!A1:J200'),
      readRange(spreadsheetId, token, 'GRUPOS_MESA!A1:H200'),
      readRange(spreadsheetId, token, 'BD_MAESTRA_INVITADOS!A1:N400'),
      supabase.from('rsvp_response_members').select('id, rsvp_id, display_name, guest_id, resolution_status, attendance_status, dietary_type, dietary_detail, updated_at').order('updated_at', { ascending: true }),
    ]);
    if (membersResult.error) throw membersResult.error;

    const dataQuality: Array<{ code: string; message: string; row?: number }> = [];
    const header = confirmedRows[0] || [];
    const looksLikeHeader = String(header[1] || '').trim() === 'Asistencia' && String(header[4] || '').trim() === 'Estado de ficha';
    if (looksLikeHeader && header[0] && normalizeName(header[0]) !== 'nombre') dataQuality.push({ code: 'CONFIRMED_HEADER_NAME_OVERWRITE', message: `La celda A1 contiene “${header[0]}” en lugar del encabezado Nombre. Esa persona se recupera desde Supabase para no perderla.`, row: 1 });

    const masterRecords = masterRows.slice(1).filter((row) => String(row[1] || '').trim()).map((row):MasterRecord => ({
      masterId:String(row[0]||''), name:String(row[1]||'').trim(), masterGroup:String(row[2]||''), masterCategory:String(row[3]||''), masterDietary:String(row[4]||''), masterOrigin:String(row[5]||''), masterStatus:String(row[6]||''), masterConfirmationSource:String(row[7]||''), masterAssignedTable:String(row[11]||''), masterObservations:String(row[12]||''),
    }));
    const masterByName = new Map<string,MasterRecord>();
    const masterDuplicates = new Map<string,number>();
    masterRecords.forEach((record) => { const key=normalizeName(record.name); masterDuplicates.set(key,(masterDuplicates.get(key)||0)+1); if(!masterByName.has(key)) masterByName.set(key,record); });
    const duplicateMasterNames = Array.from(masterDuplicates.entries()).filter(([,count])=>count>1).map(([key])=>masterByName.get(key)?.name||key);
    if (duplicateMasterNames.length) dataQuality.push({ code:'MASTER_DUPLICATE_NAMES', message:`BD_MAESTRA_INVITADOS contiene ${duplicateMasterNames.length} nombre(s) duplicados. La afinidad de mesas no debe depender sólo del nombre en esos casos.` });
    const enrich = (name:string) => masterByName.get(normalizeName(name)) || null;

    const people = confirmedRows.map((row, index) => ({ row, rowNumber: index + 1 })).filter(({ row }) => Boolean(String(row[0] || '').trim()) && VALID_ATTENDANCE.has(String(row[1] || '').trim())).map(({ row, rowNumber }) => {
      const name=String(row[0]||'').trim(); const master=enrich(name);
      return { rowNumber, name, attendance:String(row[1]||'').trim(), dietaryType:row[2]||'', dietaryDetail:row[3]||'', recordStatus:row[4]||'', guestId:row[5]||null, rsvpId:row[6]||null, confirmedAt:row[7]||null, syncStatus:row[8]||'', phone:row[9]||'', source:'confirmed_sheet' as const, ...(master||{}) };
    });

    confirmedRows.forEach((row, index) => { if (index === 0 && looksLikeHeader) return; const name=String(row[0]||'').trim(); const attendance=String(row[1]||'').trim(); if(!name&&VALID_ATTENDANCE.has(attendance)) dataQuality.push({code:'CONFIRMED_EMPTY_NAME',message:`Hay una fila marcada “${attendance}” sin nombre. No se cuenta hasta identificar a la persona.`,row:index+1}); });

    const attending = people.filter((person) => person.attendance === 'Asiste');
    const declined = people.filter((person) => person.attendance === 'No asiste');
    const sheetAttendingNames = new Set(attending.map((person) => normalizeName(person.name)));
    const sheetDeclinedNames = new Set(declined.map((person) => normalizeName(person.name)));

    const members = membersResult.data || [];
    const incomingAttending = members.filter((member) => member.attendance_status === 'attending' && member.display_name && !sheetAttendingNames.has(normalizeName(member.display_name))).map((member) => {
      const name=member.display_name||''; const master=enrich(name);
      return { id:member.id,rsvpId:member.rsvp_id,name,guestId:member.guest_id||null,resolutionStatus:member.resolution_status||'unmatched',dietaryType:member.dietary_type||'',dietaryDetail:member.dietary_detail||'',updatedAt:member.updated_at||null,source:'supabase_pending_sheet' as const,...(master||{}) };
    });
    const incomingDeclined = members.filter((member) => member.attendance_status === 'not_attending' && member.display_name && !sheetDeclinedNames.has(normalizeName(member.display_name))).map((member) => {
      const name=member.display_name||''; const master=enrich(name);
      return { id:member.id,rsvpId:member.rsvp_id,name,guestId:member.guest_id||null,resolutionStatus:member.resolution_status||'unmatched',updatedAt:member.updated_at||null,source:'supabase_pending_sheet' as const,...(master||{}) };
    });

    const missingMasterMetadata=[...attending,...incomingAttending].filter((person:any)=>!person.masterId).map((person:any)=>person.name);
    if(missingMasterMetadata.length) dataQuality.push({code:'CONFIRMED_NOT_IN_MASTER_LIST',message:`${missingMasterMetadata.length} asistente(s) confirmado(s) no tienen coincidencia exacta en BD_MAESTRA_INVITADOS. Se pueden gestionar, pero su grupo familiar/social requiere validación.`});

    const associated = attending.filter((person) => person.recordStatus === 'Ficha asociada');
    const withoutMasterRecord = attending.filter((person) => person.recordStatus === 'Sin ficha maestra');
    const dietary = attending.filter((person) => person.dietaryType && person.dietaryType !== 'Ninguna');
    const incomingAssociated = incomingAttending.filter((person) => Boolean(person.guestId));
    const incomingWithoutMaster = incomingAttending.filter((person) => !person.guestId);
    const incomingDietary = incomingAttending.filter((person) => person.dietaryType && person.dietaryType !== 'Ninguna');
    const latestSheet = attending[attending.length - 1] || null;
    const latestIncoming = incomingAttending[incomingAttending.length - 1] || null;

    const groupMembers = groupRows.slice(1).filter((row) => row[0] && row[2]).map((row, index) => ({ rowNumber:index+2,groupId:row[0]||'',groupName:row[1]||'',person:row[2]||'',linkType:row[3]||'',relation:row[4]||'',rsvpStatus:row[5]||'',tableAssigned:row[6]||'',sourceNote:row[7]||'' }));
    const grouped = Array.from(groupMembers.reduce((map, member) => { const current=map.get(member.groupId)||{groupId:member.groupId,groupName:member.groupName,linkType:member.linkType,confirmed:member.linkType!=='Por validar',people:[] as string[],sourceNotes:[] as string[]};current.people.push(member.person);if(member.sourceNote&&!current.sourceNotes.includes(member.sourceNote))current.sourceNotes.push(member.sourceNote);if(member.linkType==='Por validar')current.confirmed=false;map.set(member.groupId,current);return map; },new Map<string,{groupId:string;groupName:string;linkType:string;confirmed:boolean;people:string[];sourceNotes:string[]}>()).values());

    const masterGroupCounts = [...attending,...incomingAttending].reduce((map:any,person:any)=>{const key=person.masterGroup||'Sin clasificar';map[key]=(map[key]||0)+1;return map;},{} as Record<string,number>);

    return NextResponse.json({
      ok:true,
      source:'F&C Centro Comandos · CONFIRMADOS_ACTUALES',liveSource:'Supabase · rsvp_response_members',groupsSource:'F&C Centro Comandos · GRUPOS_MESA',masterSource:'F&C Centro Comandos · BD_MAESTRA_INVITADOS',
      summary:{attending:attending.length,declined:declined.length,currentKnownAttending:attending.length+incomingAttending.length,currentKnownDeclined:declined.length+incomingDeclined.length,incomingAttending:incomingAttending.length,incomingDeclined:incomingDeclined.length,totalResponsesPeople:people.length,associated:associated.length,currentKnownAssociated:associated.length+incomingAssociated.length,withoutMasterRecord:withoutMasterRecord.length,currentKnownWithoutMaster:withoutMasterRecord.length+incomingWithoutMaster.length,dietary:dietary.length,currentKnownDietary:dietary.length+incomingDietary.length,latestConfirmationName:latestIncoming?.name||latestSheet?.name||null,latestConfirmationAt:latestIncoming?.updatedAt||latestSheet?.confirmedAt||null,dataQualityIssues:dataQuality.length,masterMetadataMatched:attending.length+incomingAttending.length-missingMasterMetadata.length,masterMetadataMissing:missingMasterMetadata.length},
      people,incomingAttending,incomingDeclined,groups:grouped,masterGroupCounts,dataQuality,fetchedAt:new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok:false,error:error?.message||'No fue posible leer confirmados y grupos.' }, { status:500 });
  }
}
