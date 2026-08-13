import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

export const dynamic = 'force-dynamic';

const MEMORY_TYPES = new Set(['fact','decision','preference','relationship','constraint','rejected_option','learning']);
const CONFIDENCE = new Set(['confirmed','probable','inferred']);

async function session(){
  const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return{ok:false as const,response:NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401})};
  const {data:profile}=await supabase.from('admin_profiles').select('role, active').eq('id',user.id).single();
  if(!profile?.active)return{ok:false as const,response:NextResponse.json({ok:false,error:'FORBIDDEN'},{status:403})};
  return{ok:true as const,supabase,user,profile};
}

export async function GET(request:Request){
  try{
    const s=await session();if(!s.ok)return s.response;
    const url=new URL(request.url),type=url.searchParams.get('type'),subjectType=url.searchParams.get('subject_type');
    let query=s.supabase.from('event_memory').select('*').eq('status','active').order('updated_at',{ascending:false}).limit(250);
    if(type)query=query.eq('memory_type',type);
    if(subjectType)query=query.eq('subject_type',subjectType);
    const {data,error}=await query;if(error)throw error;
    return NextResponse.json({ok:true,items:data||[],fetchedAt:new Date().toISOString()});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible leer la memoria.'},{status:500});}
}

export async function POST(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{
    const s=await session();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});
    const body=await request.json();const memoryType=String(body.memoryType||body.memory_type||'fact');const title=String(body.title||'').trim();
    if(!MEMORY_TYPES.has(memoryType))return NextResponse.json({ok:false,error:'MEMORY_TYPE_INVALID'},{status:400});
    if(!title)return NextResponse.json({ok:false,error:'TITLE_REQUIRED'},{status:400});
    const confidence=CONFIDENCE.has(String(body.confidence||''))?String(body.confidence):'confirmed';
    const payload={memory_type:memoryType,subject_type:String(body.subjectType||body.subject_type||'event'),subject_id:body.subjectId||body.subject_id||null,title,content:typeof body.content==='object'&&body.content!==null?body.content:{text:String(body.content||body.text||'')},confidence,source:String(body.source||'Copiloto'),source_ref:body.sourceRef||body.source_ref||null,status:'active',created_by:s.user.id,updated_at:new Date().toISOString()};
    const {data,error}=await s.supabase.from('event_memory').insert(payload).select().single();if(error)throw error;
    await s.supabase.from('audit_log').insert({entity_type:'event_memory',entity_id:data.id,action:'CREATE_MEMORY',after_data:{...payload,created_by:undefined},actor:s.user.email,origin:'copilot'});
    return NextResponse.json({ok:true,item:data});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible guardar la memoria.'},{status:500});}
}

export async function PATCH(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{
    const s=await session();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});
    const body=await request.json(),id=String(body.id||'');if(!id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});
    const {data:before}=await s.supabase.from('event_memory').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});
    const updates:Record<string,any>={updated_at:new Date().toISOString()};
    if('title'in body)updates.title=String(body.title||'').trim();if('content'in body)updates.content=body.content;if('confidence'in body&&CONFIDENCE.has(String(body.confidence)))updates.confidence=body.confidence;if('status'in body&&['active','superseded','archived'].includes(body.status))updates.status=body.status;
    const {data,error}=await s.supabase.from('event_memory').update(updates).eq('id',id).select().single();if(error)throw error;
    await s.supabase.from('audit_log').insert({entity_type:'event_memory',entity_id:id,action:'UPDATE_MEMORY',before_data:before,after_data:updates,actor:s.user.email,origin:'dashboard'});
    return NextResponse.json({ok:true,item:data});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible actualizar la memoria.'},{status:500});}
}

export async function DELETE(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{
    const s=await session();if(!s.ok)return s.response;if(s.profile.role!=='owner')return NextResponse.json({ok:false,error:'ONLY_OWNER_CAN_DELETE'},{status:403});
    const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});
    const {data:before}=await s.supabase.from('event_memory').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});
    const {data,error}=await s.supabase.from('event_memory').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;
    await s.supabase.from('audit_log').insert({entity_type:'event_memory',entity_id:id,action:'ARCHIVE_MEMORY',before_data:before,after_data:{status:'archived'},actor:s.user.email,origin:'dashboard'});
    return NextResponse.json({ok:true,item:data});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible archivar la memoria.'},{status:500});}
}
