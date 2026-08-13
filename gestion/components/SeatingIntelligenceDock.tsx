'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { AlertTriangle, BrainCircuit, CheckCircle2, ChevronRight, Loader2, RefreshCw, Sparkles, Users, X } from 'lucide-react';
import styles from './SeatingIntelligenceDock.module.css';

type Guest = { id:string; first_name:string; last_name:string; group_name:string; family_side:string; guest_category:string; attendance_status:string; guest_status:string };
type Table = { id:string; table_number:number; name:string; capacity:number };
type Group = { groupId:string; groupName:string; linkType:string; confirmed:boolean; people:string[]; sourceNotes:string[] };
type Confirmed = { summary:{currentKnownAttending:number;currentKnownWithoutMaster:number}; groups:Group[] };
type Unit = { id:string; guests:Guest[]; hard:boolean; probable:boolean; label:string; affinity:string; reason:string };
type ProposedTable = { table:Table; units:Unit[]; guests:Guest[]; affinity:string; reasons:string[] };

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
function fullName(guest:Guest){return `${guest.first_name} ${guest.last_name || ''}`.trim();}
function surnameText(guest:Guest){return normalize(`${guest.first_name} ${guest.last_name}`);}

function affinityForGuest(guest:Guest){
  const text=surnameText(guest); const family=normalize(guest.family_side||''); const group=normalize(guest.group_name||'');
  if(family.includes('camila')){
    if(/kalbhenn|muga/.test(text)) return 'Cami · Kalbhenn / Muga';
    if(/vargas|riffka/.test(text)) return 'Cami · Vargas / Riffka';
    return 'Cami · Familia';
  }
  if(family.includes('felipe')){
    if(/garay|bustos/.test(text)) return 'Felipe · Garay / Bustos';
    if(/valverde|espinoza/.test(text)) return 'Felipe · Valverde / Espinoza';
    if(/cerda|escobedo/.test(text)) return 'Felipe · Cerda / Escobedo';
    return 'Felipe · Familia';
  }
  if(group.includes('amigos marcelo vargas')) return 'Amigos · Marcelo Vargas';
  if(group.includes('familia marcelo vargas')) return 'Familia · Marcelo Vargas';
  if(group.includes('t4ngible')) return 'Amigos / socios · T4ngible';
  return 'Amigos';
}

function affinityForGuests(guests:Guest[]){
  const counts=new Map<string,number>(); guests.forEach((guest)=>{const key=affinityForGuest(guest);counts.set(key,(counts.get(key)||0)+1);});
  return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0]||'Amigos';
}

const AFFINITY_ORDER=['Cami · Kalbhenn / Muga','Cami · Vargas / Riffka','Cami · Familia','Felipe · Garay / Bustos','Felipe · Valverde / Espinoza','Felipe · Cerda / Escobedo','Felipe · Familia','Familia · Marcelo Vargas','Amigos · Marcelo Vargas','Amigos / socios · T4ngible','Amigos'];

function buildUnits(guests:Guest[],groups:Group[]){
  const guestByName=new Map(guests.map((guest)=>[normalize(fullName(guest)),guest])); const used=new Set<string>(); const units:Unit[]=[];
  groups.filter((group)=>group.confirmed).forEach((group)=>{
    const members=group.people.map((name)=>guestByName.get(normalize(name))).filter(Boolean) as Guest[];
    const available=members.filter((guest)=>!used.has(guest.id)); if(available.length<2)return;
    available.forEach((guest)=>used.add(guest.id));
    units.push({id:`hard-${group.groupId}`,guests:available,hard:true,probable:false,label:group.groupName,affinity:affinityForGuests(available),reason:'Relación conocida en GRUPOS_MESA · mantener juntos'});
  });
  groups.filter((group)=>!group.confirmed).forEach((group)=>{
    const members=group.people.map((name)=>guestByName.get(normalize(name))).filter(Boolean) as Guest[];
    const available=members.filter((guest)=>!used.has(guest.id)); if(available.length<2)return;
    available.forEach((guest)=>used.add(guest.id));
    units.push({id:`soft-${group.groupId}`,guests:available,hard:false,probable:true,label:group.groupName,affinity:affinityForGuests(available),reason:'Vínculo probable · sugerencia, no restricción'});
  });
  guests.filter((guest)=>!used.has(guest.id)).forEach((guest)=>units.push({id:`guest-${guest.id}`,guests:[guest],hard:false,probable:false,label:fullName(guest),affinity:affinityForGuest(guest),reason:'Afinidad por lado familiar / grupo operativo'}));
  return units;
}

function propose(tables:Table[],units:Unit[]):ProposedTable[]{
  const result=tables.slice().sort((a,b)=>a.table_number-b.table_number).map((table)=>({table,units:[] as Unit[],guests:[] as Guest[],affinity:'',reasons:[] as string[]}));
  const ordered=units.slice().sort((a,b)=>{
    const ai=AFFINITY_ORDER.indexOf(a.affinity);const bi=AFFINITY_ORDER.indexOf(b.affinity);
    if(ai!==bi)return (ai<0?999:ai)-(bi<0?999:bi); if(a.hard!==b.hard)return a.hard?-1:1; return b.guests.length-a.guests.length;
  });
  ordered.forEach((unit)=>{
    const same=result.filter((candidate)=>candidate.affinity===unit.affinity&&candidate.guests.length+unit.guests.length<=candidate.table.capacity).sort((a,b)=>(a.table.capacity-a.guests.length)-(b.table.capacity-b.guests.length));
    const empty=result.filter((candidate)=>candidate.guests.length===0&&unit.guests.length<=candidate.table.capacity);
    const any=result.filter((candidate)=>candidate.guests.length+unit.guests.length<=candidate.table.capacity).sort((a,b)=>(a.table.capacity-a.guests.length)-(b.table.capacity-b.guests.length));
    const target=same[0]||empty[0]||any[0]; if(!target)return;
    target.units.push(unit); target.guests.push(...unit.guests); if(!target.affinity)target.affinity=unit.affinity;
    if(unit.hard&&!target.reasons.includes('Respeta vínculos confirmados'))target.reasons.push('Respeta vínculos confirmados');
    if(unit.probable&&!target.reasons.includes('Agrupa vínculos probables como sugerencia'))target.reasons.push('Agrupa vínculos probables como sugerencia');
    if(!target.reasons.includes(`Afinidad: ${unit.affinity}`))target.reasons.push(`Afinidad: ${unit.affinity}`);
  });
  return result;
}

export default function SeatingIntelligenceDock(){
  const [open,setOpen]=useState(false);const [loading,setLoading]=useState(false);const [guests,setGuests]=useState<Guest[]>([]);const [tables,setTables]=useState<Table[]>([]);const [official,setOfficial]=useState<Confirmed|null>(null);const [proposal,setProposal]=useState<ProposedTable[]>([]);const [error,setError]=useState<string|null>(null);const [expanded,setExpanded]=useState<number|null>(null);
  const load=useCallback(async()=>{setLoading(true);setError(null);try{const supabase=createClient();const [g,t,o]=await Promise.all([supabase.from('wedding_guests').select('id, first_name, last_name, group_name, family_side, guest_category, attendance_status, guest_status').eq('attendance_status','attending').eq('guest_status','active').order('first_name'),supabase.from('wedding_tables').select('id, table_number, name, capacity').order('table_number'),fetch('/api/confirmed-source',{cache:'no-store'})]);const op=await o.json();if(g.error||t.error)throw new Error(g.error?.message||t.error?.message||'No fue posible leer invitados/mesas.');if(!o.ok||!op?.ok)throw new Error(op?.error||'No fue posible leer relaciones.');const gg=(g.data||[]) as Guest[],tt=(t.data||[]) as Table[];setGuests(gg);setTables(tt);setOfficial(op);setProposal(propose(tt,buildUnits(gg,op.groups||[])));}catch(err:any){setError(err?.message||'No fue posible construir la propuesta.');}finally{setLoading(false);}},[]);
  useEffect(()=>{if(open&&!official&&!loading)void load();},[open,official,loading,load]);
  const metrics=useMemo(()=>{const hard=(official?.groups||[]).filter((group)=>group.confirmed).length;const probable=(official?.groups||[]).filter((group)=>!group.confirmed).length;const proposed=proposal.reduce((sum,item)=>sum+item.guests.length,0);return{hard,probable,proposed,missing:official?.summary.currentKnownWithoutMaster||0,known:official?.summary.currentKnownAttending||0};},[official,proposal]);

  return <><button type="button" className={styles.fab} onClick={()=>setOpen((value)=>!value)}>{open?<X size={17}/>:<><BrainCircuit size={16}/><span>IA de mesas</span></>}</button>{open&&<aside className={styles.panel}>
    <header><div><span>Seating Intelligence</span><strong>Propuesta por vínculos y familia</strong><small>Propuesta reversible · no escribe en producción</small></div><button type="button" onClick={()=>setOpen(false)}><X size={16}/></button></header>
    {loading?<div className={styles.loading}><Loader2 className="animate-spin" size={20}/>Leyendo Supabase + GRUPOS_MESA…</div>:error?<div className={styles.error}><AlertTriangle size={15}/>{error}</div>:<>
      <section className={styles.metrics}><div><strong>{metrics.known}</strong><span>confirmados conocidos</span></div><div><strong>{guests.length}</strong><span>listos para sentar</span></div><div><strong>{metrics.missing}</strong><span>pendientes de ficha</span></div></section>
      <div className={styles.policy}><CheckCircle2 size={14}/><div><strong>{metrics.hard} grupos conocidos = regla fuerte</strong><span>{metrics.probable} grupos probables = sugerencia. Apellidos/lado familiar sólo generan afinidad, nunca parentescos inventados.</span></div></div>
      <div className={styles.toolbar}><button type="button" onClick={load}><RefreshCw size={12}/>Recalcular</button><span>{metrics.proposed}/{guests.length} personas incluidas</span></div>
      <div className={styles.tables}>{proposal.map((item)=>{const remaining=item.table.capacity-item.guests.length;return <article key={item.table.id} className={item.guests.length?styles.hasGuests:''}><button type="button" className={styles.tableHead} onClick={()=>setExpanded(expanded===item.table.table_number?null:item.table.table_number)}><div><span>Mesa {item.table.table_number}</span><strong>{item.affinity||'Disponible'}</strong><small>{item.guests.length}/{item.table.capacity} · {remaining} cupos libres</small></div><ChevronRight size={15}/></button>{expanded===item.table.table_number&&<div className={styles.details}><div className={styles.reasons}>{item.reasons.map((reason)=><span key={reason}><Sparkles size={10}/>{reason}</span>)}</div><div className={styles.people}>{item.units.map((unit)=><div key={unit.id} className={unit.hard?styles.hard:unit.probable?styles.probable:''}><strong>{unit.label}</strong><span>{unit.guests.map(fullName).join(' · ')}</span><small>{unit.reason}</small></div>)}</div></div>}</article>})}</div>
      <footer><Users size={14}/><div><strong>Próximo paso seguro</strong><span>Cuando el staging esté habilitado, “Aplicar propuesta” escribirá asignaciones sólo después de una confirmación explícita. Mientras tanto puedes usar esta propuesta para revisar la lógica sin tocar producción.</span></div></footer>
    </>}
  </aside>}</>;
}
