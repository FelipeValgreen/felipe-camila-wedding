import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

export const dynamic='force-dynamic';

async function session(){const supabase=createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return{ok:false as const,response:NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401})};const{data:profile}=await supabase.from('admin_profiles').select('role, active').eq('id',user.id).single();if(!profile?.active)return{ok:false as const,response:NextResponse.json({ok:false,error:'FORBIDDEN'},{status:403})};return{ok:true as const,supabase,user,profile};}
function finite(value:any){return Number.isFinite(Number(value));}
function validElements(value:any){if(!Array.isArray(value))return false;return value.every(item=>item&&typeof item.id==='string'&&typeof item.kind==='string'&&typeof item.label==='string'&&finite(item.x)&&finite(item.y)&&finite(item.width)&&finite(item.height)&&finite(item.rotation)&&(!('xM'in item)||finite(item.xM))&&(!('yM'in item)||finite(item.yM))&&(!('widthM'in item)||finite(item.widthM))&&(!('heightM'in item)||finite(item.heightM)));}
function dimensions(body:any, before?:any){const width=Number(body?.spaceWidthM??before?.space_width_m??30);const height=Number(body?.spaceHeightM??before?.space_height_m??18);const grid=Number(body?.gridStepM??before?.grid_step_m??1);if(!Number.isFinite(width)||width<=0||width>500)throw new Error('SPACE_WIDTH_INVALID');if(!Number.isFinite(height)||height<=0||height>500)throw new Error('SPACE_HEIGHT_INVALID');if(!Number.isFinite(grid)||grid<=0||grid>25)throw new Error('GRID_STEP_INVALID');return{space_width_m:width,space_height_m:height,grid_step_m:grid,unit_system:'metric'};}

export async function GET(){try{const s=await session();if(!s.ok)return s.response;const{data,error}=await s.supabase.from('event_venue_layouts').select('*').eq('status','active').order('version',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return NextResponse.json({ok:true,layout:data||null,fetchedAt:new Date().toISOString()});}catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible leer el layout.'},{status:500});}}

export async function PATCH(request:Request){const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});try{const s=await session();if(!s.ok)return s.response;if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});const body=await request.json();if(!body?.id)return NextResponse.json({ok:false,error:'ID_REQUIRED'},{status:400});if('elements'in body&&!validElements(body.elements))return NextResponse.json({ok:false,error:'ELEMENTS_INVALID'},{status:400});const{data:before}=await s.supabase.from('event_venue_layouts').select('*').eq('id',body.id).single();if(!before)return NextResponse.json({ok:false,error:'NOT_FOUND'},{status:404});const updates:any={updated_at:new Date().toISOString()};for(const[key,db]of Object.entries({name:'name',venueName:'venue_name',status:'status',elements:'elements',referenceUrl:'reference_url',notes:'notes',templateKey:'template_key'}))if(key in body)updates[db]=body[key];if('version'in body)updates.version=Math.max(1,Number(body.version)||1);if('spaceWidthM'in body||'spaceHeightM'in body||'gridStepM'in body)Object.assign(updates,dimensions(body,before));const{data,error}=await s.supabase.from('event_venue_layouts').update(updates).eq('id',body.id).select().single();if(error)throw error;await s.supabase.from('audit_log').insert({entity_type:'event_venue_layouts',entity_id:body.id,action:'UPDATE_VENUE_LAYOUT',before_data:before,after_data:updates,actor:s.user.email,origin:'dashboard'});return NextResponse.json({ok:true,layout:data});}catch(error:any){const message=error?.message||'No fue posible guardar el layout.';return NextResponse.json({ok:false,error:message},{status:message.includes('_INVALID')?400:500});}}

export async function POST(request:Request){
  const block=getDatabaseWriteBlock();if(block)return NextResponse.json(block,{status:409});
  try{
    const s=await session();if(!s.ok)return s.response;
    if(s.profile.role==='viewer')return NextResponse.json({ok:false,error:'VIEWER_MUTATION_DENIED'},{status:403});
    const body=await request.json();
    if(!validElements(body?.elements))return NextResponse.json({ok:false,error:'ELEMENTS_INVALID'},{status:400});
    const dims=dimensions(body);
    const name=String(body.name||'Layout operativo').trim();
    const venueName=String(body.venueName||'Nuevo recinto').trim();
    if(!name)return NextResponse.json({ok:false,error:'NAME_REQUIRED'},{status:400});
    if(!venueName)return NextResponse.json({ok:false,error:'VENUE_NAME_REQUIRED'},{status:400});

    const{data,error}=await s.supabase.rpc('create_venue_layout_version',{
      p_name:name,
      p_venue_name:venueName,
      p_elements:body.elements,
      p_reference_url:body.referenceUrl||null,
      p_notes:body.notes||null,
      p_template_key:body.templateKey||null,
      p_space_width_m:dims.space_width_m,
      p_space_height_m:dims.space_height_m,
      p_grid_step_m:dims.grid_step_m,
    });
    if(error)throw error;
    return NextResponse.json({ok:true,layout:data});
  }catch(error:any){
    const message=error?.message||'No fue posible crear el layout.';
    const isValidation=['_INVALID','_REQUIRED'].some(token=>message.includes(token));
    const status=message.includes('FORBIDDEN')?403:isValidation?400:500;
    return NextResponse.json({ok:false,error:message},{status});
  }
}
