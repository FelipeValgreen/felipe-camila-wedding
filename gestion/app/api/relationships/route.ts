import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

export const dynamic = 'force-dynamic';

async function session() {
  const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return{ok:false as const,response:NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401})};
  const{data:profile}=await supabase.from('admin_profiles').select('role, active').eq('id',user.id).single();
  if(!profile?.active)return{ok:false as const,response:NextResponse.json({ok:false,error:'FORBIDDEN'},{status:403})};
  return{ok:true as const,supabase,user,profile};
}
function blocked(){const block=getDatabaseWriteBlock();return block?NextResponse.json(block,{status:409}):null;}
function groupShape(row:any,members:any[]){return{id:row.id,externalKey:row.external_key||'',name:row.name,linkType:row.link_type,confidence:row.confidence,status:row.status,source:row.source,notes:row.notes||'',members:members.filter(member=>member.group_id===row.id).map(member=>({id:member.id,guestId:member.guest_id||null,personName:member.person_name,relation:member.relation||'',rsvpStatus:member.rsvp_status||'',sourceNote:member.source_note||''}))};}

export async function GET(){
 try{const s=await session();if(!s.ok)return s.response;const[g,m]=await Promise.all([s.supabase.from('guest_relationship_groups').select('*').eq('status','active').order('confidence').order('name'),s.supabase.from('guest_relationship_members').select('*').order('person_name')]);if(g.error)throw g.error;if(m.error)throw m.error;const groups=(g.data||[]).map(row=>groupShape(row,m.data||[]));return NextResponse.json({ok:true,groups,summary:{total:groups.length,confirmed:groups.filter(group=>group.confidence==='confirmed').length,probable:groups.filter(group=>group.confidence==='probable').length,members:groups.reduce((sum,group)=>sum+group.members.length,0)},fetchedAt:new Date().toISOString()});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible leer relaciones.'},{status:500});}
}

export async function POST(request:Request){
 const stop=blocked();if(stop)return stop;
 try{const s=await session();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();
  if(body.mode==='member'){
   if(!body.groupId||!String(body.personName||'').trim())return NextResponse.json({ok:false,error:'Grupo y persona son obligatorios.'},{status:400});
   const personName=String(body.personName).trim();const{data:guest}=await s.supabase.from('wedding_guests').select('id').ilike('full_name_normalized',personName.toLowerCase()).maybeSingle();
   const{data,error}=await s.supabase.from('guest_relationship_members').insert({group_id:body.groupId,guest_id:body.guestId||guest?.id||null,person_name:personName,relation:body.relation||null,rsvp_status:body.rsvpStatus||null,source_note:body.sourceNote||'Agregado desde Centro de Gestión'}).select().single();if(error)throw error;
   await s.supabase.from('audit_log').insert({entity_type:'guest_relationship_members',entity_id:data.id,action:'CREATE_RELATIONSHIP_MEMBER',after_data:data,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,member:data});
  }
  const name=String(body.name||'').trim();if(!name)return NextResponse.json({ok:false,error:'El nombre del grupo es obligatorio.'},{status:400});const{data:group,error}=await s.supabase.from('guest_relationship_groups').insert({external_key:body.externalKey||null,name,link_type:body.linkType||'Familia',confidence:body.confidence||'confirmed',source:body.source||'manual',notes:body.notes||null}).select().single();if(error)throw error;
  const members=Array.isArray(body.members)?body.members:[];if(members.length){const rows=members.filter((member:any)=>String(member.personName||'').trim()).map((member:any)=>({group_id:group.id,guest_id:member.guestId||null,person_name:String(member.personName).trim(),relation:member.relation||null,rsvp_status:member.rsvpStatus||null,source_note:member.sourceNote||'Agregado desde Centro de Gestión'}));if(rows.length){const{error:memberError}=await s.supabase.from('guest_relationship_members').insert(rows);if(memberError)throw memberError;}}
  await s.supabase.from('audit_log').insert({entity_type:'guest_relationship_groups',entity_id:group.id,action:'CREATE_RELATIONSHIP_GROUP',after_data:{...group,members},actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,group});
 }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible crear la relación.'},{status:500});}
}

export async function PATCH(request:Request){
 const stop=blocked();if(stop)return stop;
 try{const s=await session();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();
  if(body.mode==='member'){
   if(!body.id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});const{data:before}=await s.supabase.from('guest_relationship_members').select('*').eq('id',body.id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const updates:any={updated_at:new Date().toISOString()};for(const[key,db]of Object.entries({guestId:'guest_id',personName:'person_name',relation:'relation',rsvpStatus:'rsvp_status',sourceNote:'source_note'}))if(key in body)updates[db]=body[key]||null;const{data,error}=await s.supabase.from('guest_relationship_members').update(updates).eq('id',body.id).select().single();if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'guest_relationship_members',entity_id:body.id,action:'UPDATE_RELATIONSHIP_MEMBER',before_data:before,after_data:updates,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,member:data});
  }
  if(!body.id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});const{data:before}=await s.supabase.from('guest_relationship_groups').select('*').eq('id',body.id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const updates:any={updated_at:new Date().toISOString()};for(const[key,db]of Object.entries({name:'name',linkType:'link_type',confidence:'confidence',status:'status',source:'source',notes:'notes'}))if(key in body)updates[db]=body[key]||null;const{data,error}=await s.supabase.from('guest_relationship_groups').update(updates).eq('id',body.id).select().single();if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'guest_relationship_groups',entity_id:body.id,action:'UPDATE_RELATIONSHIP_GROUP',before_data:before,after_data:updates,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,group:data});
 }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible actualizar la relación.'},{status:500});}
}

export async function DELETE(request:Request){
 const stop=blocked();if(stop)return stop;
 try{const s=await session();if(!s.ok)return s.response;const params=new URL(request.url).searchParams;const id=params.get('id');const mode=params.get('mode')||'group';if(!id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});if(mode==='member'){if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const{data:before}=await s.supabase.from('guest_relationship_members').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const{error}=await s.supabase.from('guest_relationship_members').delete().eq('id',id);if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'guest_relationship_members',entity_id:id,action:'DELETE_RELATIONSHIP_MEMBER',before_data:before,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,deleted:true});}
  if(s.profile.role!=='owner')return NextResponse.json({ok:false,error:'ONLY_OWNER_CAN_DELETE'},{status:403});const{data:before}=await s.supabase.from('guest_relationship_groups').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const{error}=await s.supabase.from('guest_relationship_groups').delete().eq('id',id);if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'guest_relationship_groups',entity_id:id,action:'DELETE_RELATIONSHIP_GROUP',before_data:before,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,deleted:true});
 }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible eliminar la relación.'},{status:500});}
}
