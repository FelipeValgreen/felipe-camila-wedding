import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock, getExternalSyncBlock } from '@/lib/environment-guard';

export const dynamic = 'force-dynamic';

type Check = { key:string; label:string; ok:boolean; detail:string; severity:'ok'|'warning'|'error' };

async function fetchSafe(origin:string,path:string,cookie:string){
  try{const response=await fetch(`${origin}${path}`,{headers:{cookie},cache:'no-store'});const payload=await response.json().catch(()=>null);return{ok:response.ok&&Boolean(payload?.ok),status:response.status,payload,error:payload?.message||payload?.error||null};}catch(error:any){return{ok:false,status:500,payload:null,error:error?.message||'FETCH_FAILED'};}
}

export async function GET(request:Request){
 try{
  const supabase=createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401});const{data:profile}=await supabase.from('admin_profiles').select('role, active').eq('id',user.id).single();if(!profile?.active)return NextResponse.json({ok:false,error:'FORBIDDEN'},{status:403});
  const cookie=request.headers.get('cookie')||'',origin=new URL(request.url).origin;
  const[confirmed,timeline,music,budget,documents,tables,guests,seating,issues,vendors,tasks,relations,relationMembers]=await Promise.all([
   fetchSafe(origin,'/api/confirmed-source',cookie),fetchSafe(origin,'/api/timeline-source',cookie),fetchSafe(origin,'/api/music-source',cookie),fetchSafe(origin,'/api/budget-source',cookie),fetchSafe(origin,'/api/documents-source',cookie),
   supabase.from('wedding_tables').select('id, table_number, capacity',{count:'exact'}),supabase.from('wedding_guests').select('id, attendance_status',{count:'exact'}).eq('guest_status','active'),supabase.from('seating_assignments').select('id',{count:'exact'}),supabase.from('management_issues').select('id,severity',{count:'exact'}).eq('status','open'),supabase.from('vendors').select('id',{count:'exact'}),supabase.from('event_tasks').select('id,status',{count:'exact'}),supabase.from('guest_relationship_groups').select('id,confidence',{count:'exact'}).eq('status','active'),supabase.from('guest_relationship_members').select('id',{count:'exact'})
  ]);
  const checks:Check[]=[];for(const[key,label,result]of [['confirmed','Confirmados + relaciones',confirmed],['timeline','Cronograma',timeline],['music','Música',music],['budget','Presupuesto',budget],['documents','Documentos',documents]] as any[]){checks.push({key,label,ok:result.ok,detail:result.ok?'Fuente respondió correctamente':String(result.error||`HTTP ${result.status}`),severity:result.ok?'ok':'error'});}
  const dbOk=[tables,guests,seating,issues,vendors,tasks,relations,relationMembers].every((result:any)=>!result.error);checks.push({key:'database',label:'Supabase canónico',ok:dbOk,detail:dbOk?'Entidades canónicas disponibles':'Una o más entidades no respondieron',severity:dbOk?'ok':'error'});
  const tableRows=tables.data||[],capacity=tableRows.reduce((sum:number,table:any)=>sum+Number(table.capacity||0),0),seen=new Set<number>(),duplicates:number[]=[];tableRows.forEach((table:any)=>{const n=Number(table.table_number);if(seen.has(n)&&!duplicates.includes(n))duplicates.push(n);seen.add(n);});const known=Number(confirmed.payload?.summary?.currentKnownAttending||0),operational=(guests.data||[]).filter((guest:any)=>guest.attendance_status==='attending').length,assigned=seating.count||0,missingMaster=Number(confirmed.payload?.summary?.currentKnownWithoutMaster||0);
  checks.push({key:'table_integrity',label:'Integridad de mesas',ok:duplicates.length===0,detail:duplicates.length?`Numeración duplicada: ${duplicates.join(', ')}`:`${tableRows.length} mesas · ${capacity} cupos`,severity:duplicates.length?'error':'ok'});
  checks.push({key:'capacity',label:'Capacidad vs confirmados',ok:Boolean(known)&&capacity>=known,detail:known?`${capacity} cupos para ${known} confirmados conocidos`:'Confirmados no disponibles',severity:!known?'warning':capacity>=known?'ok':'warning'});
  checks.push({key:'guest_reconciliation',label:'Conciliación de invitados',ok:missingMaster===0,detail:`${operational} fichas asistentes · ${missingMaster} confirmados pendientes de ficha`,severity:missingMaster?'warning':'ok'});
  checks.push({key:'seating',label:'Asignaciones persistidas',ok:assigned>0,detail:`${assigned} asignaciones reales; las propuestas IA son borradores`,severity:assigned>0?'ok':'warning'});
  checks.push({key:'relationships',label:'Relaciones canónicas',ok:(relations.count||0)>0,detail:`${relations.count||0} grupos · ${relationMembers.count||0} miembros`,severity:(relations.count||0)>0?'ok':'warning'});

  const environment=process.env.VERCEL_ENV||process.env.NODE_ENV||'unknown';
  const isProduction=environment==='production';
  const dbBlock=getDatabaseWriteBlock(),syncBlock=getExternalSyncBlock();
  const dbSafetyOk=isProduction?!dbBlock:Boolean(dbBlock);
  const syncSafetyOk=isProduction?!syncBlock:Boolean(syncBlock);
  checks.push({key:'write_safety',label:'Guard de base de datos',ok:dbSafetyOk,detail:isProduction?(dbBlock?'Producción está bloqueada inesperadamente':'Producción: escrituras habilitadas sólo para usuarios autorizados'):(dbBlock?'Preview/Development: escrituras a DB protegidas':'Advertencia: entorno no productivo podría escribir en DB'),severity:dbSafetyOk?'ok':'error'});
  checks.push({key:'sync_safety',label:'Guard de sincronización',ok:syncSafetyOk,detail:isProduction?(syncBlock?'Producción tiene sync externo bloqueado':'Producción: sincronización externa habilitada'):(syncBlock?'Preview/Development: sync externo protegido':'Advertencia: sync externo habilitado fuera de producción'),severity:syncSafetyOk?'ok':'error'});

  return NextResponse.json({ok:true,environment,checks,summary:{healthy:checks.filter(c=>c.severity==='ok').length,warnings:checks.filter(c=>c.severity==='warning').length,errors:checks.filter(c=>c.severity==='error').length,knownAttending:known,operationalGuests:operational,tables:tableRows.length,capacity,assigned,openIssues:issues.count||0,vendors:vendors.count||0,tasks:tasks.count||0,relationshipGroups:relations.count||0,relationshipMembers:relationMembers.count||0},fetchedAt:new Date().toISOString()});
 }catch(error:any){return NextResponse.json({ok:false,error:error?.message||'No fue posible revisar el sistema.'},{status:500});}
}
