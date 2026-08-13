import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

export const dynamic = 'force-dynamic';

async function auth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 }) };
  const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
  if (!profile?.active) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 }) };
  return { ok: true as const, supabase, user, profile };
}

function toItem(row:any,index=0){return{
  id:row.id,rowNumber:index+1,item:row.concept||'',projectedQuantity:row.quantity??'',confirmedQuantity:row.quantity??'',unitNet:row.unit_net===null?null:Number(row.unit_net),vat:'',projectedGross:row.projected_gross===null?null:Number(row.projected_gross),contractedAmount:row.contracted_amount===null?null:Number(row.contracted_amount),category:row.category||'',responsible:row.responsible||'',status:row.status||'',notes:row.notes||'',advance:Number(row.paid_amount||0),currency:row.currency||'CLP',dueDate:row.due_date||null,vendorId:row.vendor_id||null,sortOrder:row.sort_order||0,source:row.source||'dashboard'
};}

function numeric(value:any){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}

export async function GET(){
  try{const session=await auth();if(!session.ok)return session.response;const {data,error}=await session.supabase.from('event_budget_items').select('*').order('sort_order').order('created_at');if(error)throw error;const items=(data||[]).map(toItem);const totalBudget=items.reduce((s,i)=>s+Number(i.projectedGross||0),0);const paidOrPrepaid=items.reduce((s,i)=>s+Number(i.advance||0),0);return NextResponse.json({ok:true,source:'Supabase · event_budget_items',mirrorSource:'F&C Centro Comandos · PRESUPUESTO_IGLESIA',canonical:true,items,summary:{paidOrPrepaid,remaining:Math.max(0,totalBudget-paidOrPrepaid),totalBudget},fetchedAt:new Date().toISOString()});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible leer el presupuesto operativo.'},{status:500});}
}

export async function POST(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const session=await auth();if(!session.ok)return session.response;if(session.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();if(!body?.item)return NextResponse.json({ok:false,error:'El concepto es obligatorio.'},{status:400});const payload={concept:String(body.item).trim(),category:String(body.category||'General'),vendor_id:body.vendorId||null,responsible:body.responsible||null,status:String(body.status||'Pendiente'),currency:String(body.currency||'CLP'),quantity:numeric(body.projectedQuantity),unit_net:numeric(body.unitNet),projected_gross:numeric(body.projectedGross),contracted_amount:numeric(body.contractedAmount),paid_amount:numeric(body.advance)||0,due_date:body.dueDate||null,notes:body.notes||null,source:'dashboard',sort_order:Number(body.sortOrder||Date.now()%1000000)};const {data,error}=await session.supabase.from('event_budget_items').insert(payload).select().single();if(error)throw error;await session.supabase.from('audit_log').insert({entity_type:'event_budget_items',entity_id:data.id,action:'CREATE_BUDGET_ITEM',after_data:payload,actor:session.user.email,origin:'dashboard'});return NextResponse.json({ok:true,item:toItem(data)});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible crear el ítem.'},{status:500});}
}

export async function PATCH(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const session=await auth();if(!session.ok)return session.response;if(session.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();if(!body?.id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});const {data:before}=await session.supabase.from('event_budget_items').select('*').eq('id',body.id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const updates:Record<string,any>={};const direct:Record<string,string>={item:'concept',category:'category',vendorId:'vendor_id',responsible:'responsible',status:'status',currency:'currency',dueDate:'due_date',notes:'notes',sortOrder:'sort_order'};for(const [k,db]of Object.entries(direct))if(k in body)updates[db]=body[k]===''?null:body[k];const nums:Record<string,string>={projectedQuantity:'quantity',unitNet:'unit_net',projectedGross:'projected_gross',contractedAmount:'contracted_amount',advance:'paid_amount'};for(const [k,db]of Object.entries(nums))if(k in body)updates[db]=numeric(body[k]);updates.updated_at=new Date().toISOString();const {data,error}=await session.supabase.from('event_budget_items').update(updates).eq('id',body.id).select().single();if(error)throw error;await session.supabase.from('audit_log').insert({entity_type:'event_budget_items',entity_id:body.id,action:'UPDATE_BUDGET_ITEM',before_data:before,after_data:updates,actor:session.user.email,origin:'dashboard'});return NextResponse.json({ok:true,item:toItem(data)});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible actualizar el ítem.'},{status:500});}
}

export async function DELETE(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{const session=await auth();if(!session.ok)return session.response;if(session.profile.role!=='owner')return NextResponse.json({ok:false,error:'ONLY_OWNER_CAN_DELETE'},{status:403});const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});const {data:before}=await session.supabase.from('event_budget_items').select('*').eq('id',id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const {error}=await session.supabase.from('event_budget_items').delete().eq('id',id);if(error)throw error;await session.supabase.from('audit_log').insert({entity_type:'event_budget_items',entity_id:id,action:'DELETE_BUDGET_ITEM',before_data:before,actor:session.user.email,origin:'dashboard'});return NextResponse.json({ok:true,deleted:true});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible eliminar el ítem.'},{status:500});}
}
