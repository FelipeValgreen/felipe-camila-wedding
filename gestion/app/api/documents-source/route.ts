import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

export const dynamic = 'force-dynamic';

async function auth(){
  const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return{ok:false as const,response:NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401})};
  const {data:profile}=await supabase.from('admin_profiles').select('role, active').eq('id',user.id).single();
  if(!profile?.active)return{ok:false as const,response:NextResponse.json({ok:false,error:'FORBIDDEN'},{status:403})};
  return{ok:true as const,supabase,user,profile};
}
function toItem(row:any,index=0){return{id:row.id,rowNumber:index+1,category:row.category||'General',title:row.title||'Documento sin título',url:row.url||'',type:row.document_type||'Documento',status:row.status||'Referencia',source:row.source||'Drive',notes:row.notes||'',updated:(row.updated_at||row.created_at||'').slice(0,10)};}

export async function GET(){
  try{const s=await auth();if(!s.ok)return s.response;const {data,error}=await s.supabase.from('event_documents').select('*').order('updated_at',{ascending:false});if(error)throw error;const items=(data||[]).map(toItem);return NextResponse.json({ok:true,source:'Supabase · event_documents',mirrorSource:'F&C Centro Comandos · DOCUMENTOS',canonical:true,items,summary:{total:items.length,active:items.filter(i=>i.status.toLowerCase()==='activo').length,reference:items.filter(i=>i.status.toLowerCase()==='referencia').length,categories:new Set(items.map(i=>i.category)).size},fetchedAt:new Date().toISOString()});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible leer el registro documental.'},{status:500});}
}

export async function POST(request:NextRequest){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const s=await auth();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();const title=String(body.title||'').trim();const url=String(body.url||'').trim();if(!title)return NextResponse.json({ok:false,error:'TITLE_REQUIRED'},{status:400});if(url&&!/^https?:\/\//i.test(url))return NextResponse.json({ok:false,error:'INVALID_URL'},{status:400});const payload={category:String(body.category||'General'),title,url:url||null,document_type:String(body.type||'Documento'),status:String(body.status||'Activo'),source:String(body.source||'Drive'),notes:body.notes||null};const {data,error}=await s.supabase.from('event_documents').insert(payload).select().single();if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'event_documents',entity_id:data.id,action:'CREATE_DOCUMENT',after_data:payload,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,item:toItem(data)});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible agregar el documento.'},{status:500});}
}

export async function PATCH(request:NextRequest){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const s=await auth();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();if(!body?.id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});const {data:before}=await s.supabase.from('event_documents').select('*').eq('id',body.id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const map:Record<string,string>={category:'category',title:'title',url:'url',type:'document_type',status:'status',source:'source',notes:'notes'};const updates:Record<string,any>={};for(const[k,db]of Object.entries(map))if(k in body)updates[db]=body[k]===''?null:body[k];if('url'in updates&&updates.url&&!/^https?:\/\//i.test(String(updates.url)))return NextResponse.json({ok:false,error:'INVALID_URL'},{status:400});updates.updated_at=new Date().toISOString();const {data,error}=await s.supabase.from('event_documents').update(updates).eq('id',body.id).select().single();if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'event_documents',entity_id:body.id,action:'UPDATE_DOCUMENT',before_data:before,after_data:updates,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,item:toItem(data)});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible actualizar el documento.'},{status:500});}
}

export async function DELETE(request:NextRequest){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const s=await auth();if(!s.ok)return s.response;if(s.profile.role!=='owner')return NextResponse.json({ok:false,error:'ONLY_OWNER_CAN_DELETE'},{status:403});const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});const {data:before}=await s.supabase.from('event_documents').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const {error}=await s.supabase.from('event_documents').delete().eq('id',id);if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'event_documents',entity_id:id,action:'DELETE_DOCUMENT',before_data:before,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,deleted:true});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible eliminar el documento.'},{status:500});}
}
