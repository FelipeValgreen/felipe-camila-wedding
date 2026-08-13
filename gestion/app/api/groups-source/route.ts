import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deleteSheetRow, operationalSheetMode, readSheetRange, writeSheetRange } from '@/lib/google-sheets-server';

export const dynamic = 'force-dynamic';

async function authorize(write = false) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'UNAUTHORIZED' };
  const { data: profile } = await supabase.from('admin_profiles').select('active, role').eq('id', user.id).single();
  if (!profile?.active) return { ok: false as const, status: 403, error: 'FORBIDDEN' };
  if (write && profile.role === 'viewer') return { ok: false as const, status: 403, error: 'VIEWER_MUTATION_DENIED' };
  return { ok: true as const, user, profile };
}

function groupRow(body: any) {
  return [
    String(body.groupId || '').trim(),
    String(body.groupName || '').trim(),
    String(body.person || '').trim(),
    String(body.linkType || 'Por validar').trim(),
    String(body.relation || '').trim(),
    String(body.rsvpStatus || 'Confirmado').trim(),
    String(body.tableAssigned || '').trim(),
    String(body.sourceNote || '').trim(),
  ];
}

async function readGroups() {
  const rows = await readSheetRange('GRUPOS_MESA!A1:H300');
  const members = rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    groupId: row[0] || '',
    groupName: row[1] || '',
    person: row[2] || '',
    linkType: row[3] || '',
    relation: row[4] || '',
    rsvpStatus: row[5] || '',
    tableAssigned: row[6] || '',
    sourceNote: row[7] || '',
  })).filter((item) => item.groupId || item.person);

  const groups = Array.from(members.reduce((map, member) => {
    const current = map.get(member.groupId) || {
      groupId: member.groupId,
      groupName: member.groupName,
      confirmed: member.linkType !== 'Por validar',
      linkType: member.linkType,
      members: [] as typeof members,
    };
    current.members.push(member);
    if (member.linkType === 'Por validar') current.confirmed = false;
    map.set(member.groupId, current);
    return map;
  }, new Map<string, {groupId:string;groupName:string;confirmed:boolean;linkType:string;members:typeof members}>()).values());

  return { members, groups };
}

export async function GET() {
  try {
    const auth = await authorize(false);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const data = await readGroups();
    return NextResponse.json({
      ok: true,
      mode: operationalSheetMode(),
      source: `F&C Centro Comandos${operationalSheetMode()==='staging'?' — STAGING':''} · GRUPOS_MESA`,
      ...data,
      summary: {
        groups: data.groups.length,
        confirmedGroups: data.groups.filter((item) => item.confirmed).length,
        probableGroups: data.groups.filter((item) => !item.confirmed).length,
        members: data.members.length,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error:any) {
    return NextResponse.json({ ok:false, error:error?.message||'No fue posible leer los grupos.' },{status:500});
  }
}

export async function POST(request:Request){
  try{
    const auth=await authorize(true);if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();if(!String(body.groupId||'').trim()||!String(body.person||'').trim())return NextResponse.json({ok:false,error:'GROUP_ID_AND_PERSON_REQUIRED'},{status:400});
    const data=await readGroups();const rowNumber=data.members.length?Math.max(...data.members.map((item)=>item.rowNumber))+1:2;
    await writeSheetRange(`GRUPOS_MESA!A${rowNumber}:H${rowNumber}`,[groupRow(body)]);
    return NextResponse.json({ok:true,rowNumber,mode:operationalSheetMode()});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible agregar la relación.'},{status:500});}
}

export async function PATCH(request:Request){
  try{
    const auth=await authorize(true);if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();const rowNumber=Number(body.rowNumber);if(!Number.isInteger(rowNumber)||rowNumber<2||rowNumber>300)return NextResponse.json({ok:false,error:'GROUP_ROW_INVALID'},{status:400});
    if(!String(body.groupId||'').trim()||!String(body.person||'').trim())return NextResponse.json({ok:false,error:'GROUP_ID_AND_PERSON_REQUIRED'},{status:400});
    await writeSheetRange(`GRUPOS_MESA!A${rowNumber}:H${rowNumber}`,[groupRow(body)]);
    return NextResponse.json({ok:true,rowNumber,mode:operationalSheetMode()});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible actualizar la relación.'},{status:500});}
}

export async function DELETE(request:Request){
  try{
    const auth=await authorize(true);if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
    const rowNumber=Number(new URL(request.url).searchParams.get('rowNumber'));if(!Number.isInteger(rowNumber)||rowNumber<2||rowNumber>300)return NextResponse.json({ok:false,error:'GROUP_ROW_INVALID'},{status:400});
    await deleteSheetRow('GRUPOS_MESA',rowNumber);
    return NextResponse.json({ok:true,mode:operationalSheetMode()});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible eliminar la relación.'},{status:500});}
}
