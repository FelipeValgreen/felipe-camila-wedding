import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

async function auth(){
  const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return{ok:false as const,response:NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401})};
  const {data:profile}=await supabase.from('admin_profiles').select('role, active').eq('id',user.id).single();
  if(!profile?.active)return{ok:false as const,response:NextResponse.json({ok:false,error:'FORBIDDEN'},{status:403})};
  return{ok:true as const,supabase,user,profile};
}

export async function GET(){
  try{const s=await auth();if(!s.ok)return s.response;const {data,error}=await s.supabase.from('event_budget_payments').select('*, event_budget_items(id, concept, category)').order('paid_at',{ascending:false}).order('created_at',{ascending:false});if(error)throw error;return NextResponse.json({ok:true,payments:data||[]});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible leer pagos.'},{status:500});}
}

export async function POST(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const s=await auth();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();const amount=Number(body.amount);if(!body?.budget_item_id||!Number.isFinite(amount)||amount<0)return NextResponse.json({ok:false,error:'ITEM_AND_VALID_AMOUNT_REQUIRED'},{status:400});const payload={budget_item_id:body.budget_item_id,amount,currency:String(body.currency||'CLP'),paid_at:body.paid_at||new Date().toISOString().slice(0,10),payment_method:body.payment_method||null,status:String(body.status||'Pagado'),reference:body.reference||null,notes:body.notes||null};const {data,error}=await s.supabase.from('event_budget_payments').insert(payload).select().single();if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'event_budget_payments',entity_id:data.id,action:'CREATE_BUDGET_PAYMENT',after_data:payload,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,payment:data});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible registrar el pago.'},{status:500});}
}

export async function PATCH(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const s=await auth();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();if(!body?.id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});const {data:before}=await s.supabase.from('event_budget_payments').select('*').eq('id',body.id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const allowed=['budget_item_id','amount','currency','paid_at','payment_method','status','reference','notes'];const updates:Record<string,any>={};for(const key of allowed)if(key in body)updates[key]=body[key]===''?null:body[key];if('amount'in updates){const amount=Number(updates.amount);if(!Number.isFinite(amount)||amount<0)return NextResponse.json({ok:false,error:'INVALID_AMOUNT'},{status:400});updates.amount=amount;}updates.updated_at=new Date().toISOString();const {data,error}=await s.supabase.from('event_budget_payments').update(updates).eq('id',body.id).select().single();if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'event_budget_payments',entity_id:body.id,action:'UPDATE_BUDGET_PAYMENT',before_data:before,after_data:updates,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,payment:data});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible actualizar el pago.'},{status:500});}
}

export async function DELETE(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const s=await auth();if(!s.ok)return s.response;if(s.profile.role!=='owner')return NextResponse.json({ok:false,error:'ONLY_OWNER_CAN_DELETE'},{status:403});const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});const {data:before}=await s.supabase.from('event_budget_payments').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const {error}=await s.supabase.from('event_budget_payments').delete().eq('id',id);if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'event_budget_payments',entity_id:id,action:'DELETE_BUDGET_PAYMENT',before_data:before,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,deleted:true});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible eliminar el pago.'},{status:500});}
}
