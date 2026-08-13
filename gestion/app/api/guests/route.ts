import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { validateAndNormalizePhone } from '@/lib/phone';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

const ALLOWED_GUEST_FIELDS = [
  'first_name','last_name','full_name_normalized','phone_e164','group_name','family_side','family_branch','guest_category','invitation_status','attendance_status','dietary_type','dietary_detail','reconfirmation_status','guest_status','notes'
];

async function checkAdminAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, status: 401, error: 'UNAUTHORIZED' };
  const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
  if (!profile || !profile.active) return { authorized: false, status: 403, error: 'FORBIDDEN' };
  return { authorized: true, user, profile };
}
function writeBlock(){const block=getDatabaseWriteBlock();return block?NextResponse.json(block,{status:409}):null;}

export async function POST(request: Request) {
  const blocked=writeBlock();if(blocked)return blocked;
  try {
    const supabase = createClient();
    const auth = await checkAdminAuth(supabase);
    if (!auth.authorized) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    if (auth.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    const body = await request.json();
    if (!body.first_name || typeof body.first_name !== 'string') return NextResponse.json({ ok: false, error: 'El nombre es obligatorio.' }, { status: 400 });
    const phoneRes = validateAndNormalizePhone(body.phone_e164);
    if (!phoneRes.valid) return NextResponse.json({ ok: false, error: phoneRes.error }, { status: 400 });
    const firstName = body.first_name.trim(); const lastName = (body.last_name || '').trim();
    const insertData: Record<string, any> = {
      first_name:firstName,last_name:lastName,full_name_normalized:`${firstName} ${lastName}`.trim().toLowerCase(),phone_e164:phoneRes.normalized,
      group_name:(body.group_name||'General').trim(),family_side:body.family_side||'Compartido',family_branch:(body.family_branch||'').trim()||null,guest_category:body.guest_category||'Adulto',invitation_status:body.invitation_status||'not_sent',attendance_status:body.attendance_status||'pending',dietary_type:body.dietary_type||'Ninguna',dietary_detail:(body.dietary_detail||'').trim()||null,reconfirmation_status:body.reconfirmation_status||'pending',guest_status:body.guest_status||'active',notes:(body.notes||'').trim()||null,last_dashboard_update_at:new Date().toISOString()
    };
    const { data: guest, error: insertErr } = await supabase.from('wedding_guests').insert(insertData).select().single();
    if (insertErr || !guest) return NextResponse.json({ ok:false,error:`Error insertando invitado: ${insertErr?.message||'Error desconocido'}`},{status:500});
    const warnings:string[]=[];
    const {error:auditErr}=await supabase.from('audit_log').insert({entity_type:'wedding_guests',entity_id:guest.id,action:'CREATE_GUEST',after_data:insertData,actor:auth.user.email,origin:'dashboard'});if(auditErr)warnings.push('AUDIT_INSERT_FAILED');
    const {error:outboxErr}=await supabase.from('sync_outbox').insert({entity_type:'wedding_guests',entity_id:guest.id,operation:'INSERT',payload:guest});if(outboxErr)warnings.push('OUTBOX_INSERT_FAILED');
    return NextResponse.json({ok:true,guest,warnings});
  } catch(err:any){return NextResponse.json({ok:false,error:err.message},{status:500});}
}

export async function PATCH(request: Request) {
  const blocked=writeBlock();if(blocked)return blocked;
  try {
    const supabase=createClient();const auth=await checkAdminAuth(supabase);
    if(!auth.authorized)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
    if(auth.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});
    const body=await request.json();const{id,...rawUpdates}=body;if(!id||typeof id!=='string')return NextResponse.json({ok:false,error:'ID de invitado inválido o faltante.'},{status:400});
    const{data:beforeGuest}=await supabase.from('wedding_guests').select('*').eq('id',id).single();if(!beforeGuest)return NextResponse.json({ok:false,error:'Invitado no encontrado.'},{status:404});
    const updates:Record<string,any>={};for(const key of ALLOWED_GUEST_FIELDS)if(key in rawUpdates)updates[key]=rawUpdates[key];
    if('phone_e164'in updates){const phoneRes=validateAndNormalizePhone(updates.phone_e164);if(!phoneRes.valid)return NextResponse.json({ok:false,error:phoneRes.error},{status:400});updates.phone_e164=phoneRes.normalized;}
    if('family_branch'in updates)updates.family_branch=String(updates.family_branch||'').trim()||null;
    const firstName=updates.first_name!==undefined?updates.first_name.trim():beforeGuest.first_name;const lastName=updates.last_name!==undefined?(updates.last_name||'').trim():(beforeGuest.last_name||'');
    updates.first_name=firstName;updates.last_name=lastName;updates.full_name_normalized=`${firstName} ${lastName}`.trim().toLowerCase();updates.last_dashboard_update_at=new Date().toISOString();
    const{data:guest,error:updateErr}=await supabase.from('wedding_guests').update(updates).eq('id',id).select().single();if(updateErr||!guest)return NextResponse.json({ok:false,error:`Error actualizando invitado: ${updateErr?.message||'Error desconocido'}`},{status:500});
    const warnings:string[]=[];const{error:auditErr}=await supabase.from('audit_log').insert({entity_type:'wedding_guests',entity_id:id,action:'UPDATE_GUEST',before_data:beforeGuest,after_data:updates,actor:auth.user.email,origin:'dashboard'});if(auditErr)warnings.push('AUDIT_INSERT_FAILED');const{error:outboxErr}=await supabase.from('sync_outbox').insert({entity_type:'wedding_guests',entity_id:id,operation:'UPDATE',payload:guest});if(outboxErr)warnings.push('OUTBOX_INSERT_FAILED');
    return NextResponse.json({ok:true,guest,warnings});
  } catch(err:any){return NextResponse.json({ok:false,error:err.message},{status:500});}
}

export async function DELETE(request: Request) {
  const blocked=writeBlock();if(blocked)return blocked;
  try {
    const supabase=createClient();const auth=await checkAdminAuth(supabase);if(!auth.authorized)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});if(auth.profile.role!=='owner')return NextResponse.json({ok:false,error:'ONLY_OWNER_CAN_DELETE_GUESTS'},{status:403});
    const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({ok:false,error:'ID de invitado faltante.'},{status:400});const{data:beforeGuest}=await supabase.from('wedding_guests').select('*').eq('id',id).single();if(!beforeGuest)return NextResponse.json({ok:false,error:'Invitado no encontrado.'},{status:404});
    const{error:deleteErr}=await supabase.from('wedding_guests').delete().eq('id',id);if(deleteErr)return NextResponse.json({ok:false,error:`Error eliminando invitado: ${deleteErr.message}`},{status:500});
    const warnings:string[]=[];const{error:auditErr}=await supabase.from('audit_log').insert({entity_type:'wedding_guests',entity_id:id,action:'DELETE_GUEST',before_data:beforeGuest,actor:auth.user.email,origin:'dashboard'});if(auditErr)warnings.push('AUDIT_INSERT_FAILED');const{error:outboxErr}=await supabase.from('sync_outbox').insert({entity_type:'wedding_guests',entity_id:id,operation:'DELETE',payload:beforeGuest});if(outboxErr)warnings.push('OUTBOX_INSERT_FAILED');
    return NextResponse.json({ok:true,deleted:true,warnings});
  } catch(err:any){return NextResponse.json({ok:false,error:err.message},{status:500});}
}
