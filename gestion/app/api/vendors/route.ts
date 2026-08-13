import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

async function session() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok:false as const,response:NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401}) };
  const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
  if (!profile?.active) return { ok:false as const,response:NextResponse.json({ok:false,error:'FORBIDDEN'},{status:403}) };
  return { ok:true as const,supabase,user,profile };
}

export async function POST(request: Request) {
  const block=getDatabaseWriteBlock(); if(block) return NextResponse.json(block,{status:409});
  try {
    const s=await session(); if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});
    const body=await request.json();if(!String(body?.name||'').trim())return NextResponse.json({ok:false,error:'El nombre del proveedor es obligatorio.'},{status:400});
    const payload={name:String(body.name).trim(),category:String(body.category||'General'),contact_name:body.contact_name||null,phone:body.phone||null,email:body.email||null,status:String(body.status||'Evaluando'),notes:body.notes||null};
    const {data:vendor,error}=await s.supabase.from('vendors').insert(payload).select().single();if(error)throw error;
    await s.supabase.from('audit_log').insert({entity_type:'vendors',entity_id:vendor.id,action:'CREATE_VENDOR',after_data:payload,actor:s.user.email,origin:'dashboard'});
    await s.supabase.from('sync_outbox').insert({entity_type:'vendors',entity_id:vendor.id,operation:'INSERT',payload:vendor});
    return NextResponse.json({ok:true,vendor});
  } catch(err:any){return NextResponse.json({ok:false,error:err?.message||'No fue posible crear proveedor.'},{status:500});}
}

export async function PATCH(request: Request) {
  const block=getDatabaseWriteBlock(); if(block) return NextResponse.json(block,{status:409});
  try {
    const s=await session(); if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});
    const body=await request.json();const {id,...raw}=body;if(!id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});
    const allowed=['name','category','contact_name','phone','email','status','notes'];const updates:Record<string,any>={};for(const key of allowed)if(key in raw)updates[key]=raw[key]===''?null:raw[key];
    if('name' in updates&&!String(updates.name||'').trim())return NextResponse.json({ok:false,error:'El nombre no puede quedar vacío.'},{status:400});
    const {data:before}=await s.supabase.from('vendors').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});
    const {data:vendor,error}=await s.supabase.from('vendors').update(updates).eq('id',id).select().single();if(error)throw error;
    await s.supabase.from('audit_log').insert({entity_type:'vendors',entity_id:id,action:'UPDATE_VENDOR',before_data:before,after_data:updates,actor:s.user.email,origin:'dashboard'});
    await s.supabase.from('sync_outbox').insert({entity_type:'vendors',entity_id:id,operation:'UPDATE',payload:vendor});
    return NextResponse.json({ok:true,vendor});
  } catch(err:any){return NextResponse.json({ok:false,error:err?.message||'No fue posible actualizar proveedor.'},{status:500});}
}

export async function DELETE(request: Request) {
  const block=getDatabaseWriteBlock(); if(block) return NextResponse.json(block,{status:409});
  try {
    const s=await session(); if(!s.ok)return s.response;if(s.profile.role!=='owner')return NextResponse.json({ok:false,error:'ONLY_OWNER_CAN_DELETE'},{status:403});
    const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});
    const {data:before}=await s.supabase.from('vendors').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});
    const {error}=await s.supabase.from('vendors').delete().eq('id',id);if(error)throw error;
    await s.supabase.from('audit_log').insert({entity_type:'vendors',entity_id:id,action:'DELETE_VENDOR',before_data:before,actor:s.user.email,origin:'dashboard'});
    await s.supabase.from('sync_outbox').insert({entity_type:'vendors',entity_id:id,operation:'DELETE',payload:before});
    return NextResponse.json({ok:true,deleted:true});
  } catch(err:any){return NextResponse.json({ok:false,error:err?.message||'No fue posible eliminar proveedor.'},{status:500});}
}
