'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import styles from './SeatingIntelligenceDock.module.css';

type Guest = {
  id:string; first_name:string; last_name:string; group_name:string; family_side:string;
  guest_category:string; attendance_status:string; guest_status:string;
};
type Table = { id:string; table_number:number; name:string; capacity:number };
type Group = { groupId:string; groupName:string; linkType:string; confirmed:boolean; people:string[]; sourceNotes:string[] };
type Confirmed = { summary:{currentKnownAttending:number;currentKnownWithoutMaster:number}; groups:Group[] };
type Unit = { id:string; guests:Guest[]; hard:boolean; probable:boolean; label:string; affinity:string; reason:string };
type ProposedTable = { table:Table; units:Unit[]; guests:Guest[]; affinity:string; reasons:string[] };
type ScenarioKey = 'cohesion' | 'balanced' | 'social';
type Rules = { keepProbableTogether:boolean; allowFamilyMix:boolean; familyPriority:boolean };
type Score = { total:number; hard:number; probable:number; capacity:number; cohesion:number; mix:number };
type Scenario = { key:ScenarioKey; label:string; description:string; tables:ProposedTable[]; score:Score; unplaced:number };

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
function fullName(guest:Guest){return `${guest.first_name} ${guest.last_name || ''}`.trim();}
function surnameText(guest:Guest){return normalize(`${guest.first_name} ${guest.last_name}`);}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}

function affinityForGuest(guest:Guest){
  const text=surnameText(guest); const family=normalize(guest.family_side||''); const group=normalize(guest.group_name||'');
  if(family.includes('camila')){
    if(/kalbhenn|muga/.test(text)) return 'Cami · rama Kalbhenn / Muga';
    if(/vargas|riffka/.test(text)) return 'Cami · rama Vargas / Riffka';
    return 'Cami · familia';
  }
  if(family.includes('felipe')){
    if(/garay|bustos/.test(text)) return 'Felipe · Garay / Bustos';
    if(/valverde|espinoza/.test(text)) return 'Felipe · Valverde / Espinoza';
    if(/cerda|escobedo/.test(text)) return 'Felipe · Cerda / Escobedo';
    return 'Felipe · familia';
  }
  if(group.includes('amigos marcelo vargas')) return 'Amigos · Marcelo Vargas';
  if(group.includes('familia marcelo vargas')) return 'Familia · Marcelo Vargas';
  if(group.includes('t4ngible')) return 'Amigos / socios · T4ngible';
  if(group.includes('trabajo')) return 'Amigos / trabajo';
  return 'Amigos';
}

function affinityForGuests(guests:Guest[]){
  const counts=new Map<string,number>(); guests.forEach((guest)=>{const key=affinityForGuest(guest);counts.set(key,(counts.get(key)||0)+1);});
  return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0]||'Amigos';
}

const AFFINITY_ORDER=[
  'Cami · rama Kalbhenn / Muga','Cami · rama Vargas / Riffka','Cami · familia',
  'Felipe · Garay / Bustos','Felipe · Valverde / Espinoza','Felipe · Cerda / Escobedo','Felipe · familia',
  'Familia · Marcelo Vargas','Amigos · Marcelo Vargas','Amigos / socios · T4ngible','Amigos / trabajo','Amigos'
];

function buildUnits(guests:Guest[],groups:Group[],rules:Rules){
  const guestByName=new Map(guests.map((guest)=>[normalize(fullName(guest)),guest])); const used=new Set<string>(); const units:Unit[]=[];
  groups.filter((group)=>group.confirmed).forEach((group)=>{
    const members=group.people.map((name)=>guestByName.get(normalize(name))).filter(Boolean) as Guest[];
    const available=members.filter((guest)=>!used.has(guest.id)); if(available.length<2)return;
    available.forEach((guest)=>used.add(guest.id));
    units.push({id:`hard-${group.groupId}`,guests:available,hard:true,probable:false,label:group.groupName,affinity:affinityForGuests(available),reason:'Relación conocida en GRUPOS_MESA · mantener juntos'});
  });
  if(rules.keepProbableTogether){
    groups.filter((group)=>!group.confirmed).forEach((group)=>{
      const members=group.people.map((name)=>guestByName.get(normalize(name))).filter(Boolean) as Guest[];
      const available=members.filter((guest)=>!used.has(guest.id)); if(available.length<2)return;
      available.forEach((guest)=>used.add(guest.id));
      units.push({id:`soft-${group.groupId}`,guests:available,hard:false,probable:true,label:group.groupName,affinity:affinityForGuests(available),reason:'Vínculo probable · sugerencia, no restricción'});
    });
  }
  guests.filter((guest)=>!used.has(guest.id)).forEach((guest)=>units.push({id:`guest-${guest.id}`,guests:[guest],hard:false,probable:false,label:fullName(guest),affinity:affinityForGuest(guest),reason:'Afinidad por lado familiar / grupo operativo'}));
  return units;
}

function emptyTables(tables:Table[]):ProposedTable[]{return tables.slice().sort((a,b)=>a.table_number-b.table_number).map((table)=>({table,units:[],guests:[],affinity:'',reasons:[]}));}
function remaining(candidate:ProposedTable){return candidate.table.capacity-candidate.guests.length;}
function addUnit(target:ProposedTable,unit:Unit){
  target.units.push(unit);target.guests.push(...unit.guests);if(!target.affinity)target.affinity=unit.affinity;
  if(unit.hard&&!target.reasons.includes('Respeta vínculos confirmados'))target.reasons.push('Respeta vínculos confirmados');
  if(unit.probable&&!target.reasons.includes('Conserva un vínculo probable'))target.reasons.push('Conserva un vínculo probable');
  if(!target.reasons.includes(`Afinidad: ${unit.affinity}`))target.reasons.push(`Afinidad: ${unit.affinity}`);
}

function orderUnits(units:Unit[],familyPriority:boolean){
  return units.slice().sort((a,b)=>{
    if(a.hard!==b.hard)return a.hard?-1:1;
    if(a.probable!==b.probable)return a.probable?-1:1;
    if(familyPriority){const ai=AFFINITY_ORDER.indexOf(a.affinity),bi=AFFINITY_ORDER.indexOf(b.affinity);if(ai!==bi)return (ai<0?999:ai)-(bi<0?999:bi);}
    return b.guests.length-a.guests.length;
  });
}

function placeCohesion(tables:Table[],units:Unit[],rules:Rules){
  const result=emptyTables(tables); const unplaced:Unit[]=[];
  orderUnits(units,rules.familyPriority).forEach((unit)=>{
    const same=result.filter((candidate)=>candidate.affinity===unit.affinity&&remaining(candidate)>=unit.guests.length).sort((a,b)=>remaining(a)-remaining(b));
    const empty=result.filter((candidate)=>!candidate.guests.length&&remaining(candidate)>=unit.guests.length);
    const compatible=result.filter((candidate)=>remaining(candidate)>=unit.guests.length&&(rules.allowFamilyMix||!candidate.affinity||candidate.affinity===unit.affinity)).sort((a,b)=>remaining(a)-remaining(b));
    const any=result.filter((candidate)=>remaining(candidate)>=unit.guests.length).sort((a,b)=>remaining(a)-remaining(b));
    const target=same[0]||empty[0]||compatible[0]||any[0]; if(!target){unplaced.push(unit);return;} addUnit(target,unit);
  });
  return {tables:result,unplaced};
}

function placeBalanced(tables:Table[],units:Unit[],rules:Rules){
  const result=emptyTables(tables); const unplaced:Unit[]=[];
  orderUnits(units,rules.familyPriority).forEach((unit)=>{
    const candidates=result.filter((candidate)=>remaining(candidate)>=unit.guests.length);
    if(!candidates.length){unplaced.push(unit);return;}
    const ranked=candidates.map((candidate)=>{
      const same=candidate.affinity===unit.affinity?4:0;
      const empty=candidate.guests.length===0?2:0;
      const utilization=(candidate.guests.length/candidate.table.capacity)*2;
      const familyMixPenalty=(!rules.allowFamilyMix&&candidate.affinity&&candidate.affinity!==unit.affinity)?-6:0;
      return {candidate,rank:same+empty+utilization+familyMixPenalty};
    }).sort((a,b)=>b.rank-a.rank||remaining(a.candidate)-remaining(b.candidate));
    addUnit(ranked[0].candidate,unit);
  });
  return {tables:result,unplaced};
}

function placeSocial(tables:Table[],units:Unit[],rules:Rules){
  const result=emptyTables(tables); const unplaced:Unit[]=[];
  orderUnits(units,false).forEach((unit)=>{
    const candidates=result.filter((candidate)=>remaining(candidate)>=unit.guests.length);
    if(!candidates.length){unplaced.push(unit);return;}
    const ranked=candidates.map((candidate)=>{
      const affinities=new Set<string>(candidate.guests.map((guest)=>affinityForGuest(guest)));
      const diversity=affinities.has(unit.affinity)?0:4;
      const hardAffinity=unit.hard&&candidate.affinity===unit.affinity?4:0;
      const load=(candidate.guests.length/candidate.table.capacity)*-2;
      return {candidate,rank:diversity+hardAffinity+load};
    }).sort((a,b)=>b.rank-a.rank||a.candidate.guests.length-b.candidate.guests.length);
    addUnit(ranked[0].candidate,unit);
  });
  result.forEach((table)=>{if(table.guests.length)table.reasons.push('Escenario de mayor mezcla social');});
  return {tables:result,unplaced};
}

function groupPreserved(group:Group,tables:ProposedTable[]){
  const names=new Set(group.people.map(normalize));
  const locations=tables.filter((table)=>table.guests.some((guest)=>names.has(normalize(fullName(guest))))).length;
  const present=tables.reduce((sum,table)=>sum+table.guests.filter((guest)=>names.has(normalize(fullName(guest)))).length,0);
  return present<2||locations<=1;
}

function scoreScenario(tables:ProposedTable[],groups:Group[],guests:Guest[],unplaced:number):Score{
  const hardGroups=groups.filter((group)=>group.confirmed); const probable=groups.filter((group)=>!group.confirmed);
  const hardPreserved=hardGroups.filter((group)=>groupPreserved(group,tables)).length;
  const probablePreserved=probable.filter((group)=>groupPreserved(group,tables)).length;
  const capacity=tables.reduce((sum,table)=>sum+table.table.capacity,0); const seated=tables.reduce((sum,table)=>sum+table.guests.length,0);
  const utilization=capacity?seated/capacity:0;
  const cohesionValues=tables.filter((table)=>table.guests.length>1).map((table)=>{const counts=new Map<string,number>();table.guests.forEach((guest)=>{const key=affinityForGuest(guest);counts.set(key,(counts.get(key)||0)+1);});const max=Math.max(...counts.values());return max/table.guests.length;});
  const cohesion=cohesionValues.length?cohesionValues.reduce((a,b)=>a+b,0)/cohesionValues.length:1;
  const mixValues=tables.filter((table)=>table.guests.length>1).map((table)=>new Set<string>(table.guests.map((guest)=>affinityForGuest(guest))).size);
  const mix=mixValues.length?clamp((mixValues.reduce((a,b)=>a+b,0)/mixValues.length-1)/3,0,1):0;
  const hardScore=hardGroups.length?hardPreserved/hardGroups.length:1; const probableScore=probable.length?probablePreserved/probable.length:1;
  const placementPenalty=guests.length?unplaced/guests.length:0;
  const total=Math.round(clamp((hardScore*.36+probableScore*.12+utilization*.18+cohesion*.18+mix*.16-placementPenalty*.5)*100,0,100));
  return {total,hard:Math.round(hardScore*100),probable:Math.round(probableScore*100),capacity:Math.round(utilization*100),cohesion:Math.round(cohesion*100),mix:Math.round(mix*100)};
}

function buildScenarios(tables:Table[],guests:Guest[],groups:Group[],rules:Rules):Scenario[]{
  const units=buildUnits(guests,groups,rules);
  const builders:[ScenarioKey,string,string,(t:Table[],u:Unit[],r:Rules)=>{tables:ProposedTable[];unplaced:Unit[]}][]=[
    ['cohesion','A · Cohesión familiar','Prioriza parejas, grupos conocidos y ramas familiares homogéneas.',placeCohesion],
    ['balanced','B · Equilibrada','Mantiene vínculos y busca mesas completas sin aislar ramas innecesariamente.',placeBalanced],
    ['social','C · Mezcla social','Conserva vínculos fuertes pero mezcla afinidades para una mesa más social.',placeSocial],
  ];
  return builders.map(([key,label,description,builder])=>{const built=builder(tables,units,rules);const unplaced=built.unplaced.reduce((sum,unit)=>sum+unit.guests.length,0);return{key,label,description,tables:built.tables,unplaced,score:scoreScenario(built.tables,groups,guests,unplaced)};});
}

export default function SeatingIntelligenceDock(){
  const [open,setOpen]=useState(false);const [loading,setLoading]=useState(false);const [guests,setGuests]=useState<Guest[]>([]);const [tables,setTables]=useState<Table[]>([]);const [official,setOfficial]=useState<Confirmed|null>(null);const [error,setError]=useState<string|null>(null);const [expanded,setExpanded]=useState<number|null>(null);const [active,setActive]=useState<ScenarioKey>('balanced');const [rulesOpen,setRulesOpen]=useState(false);
  const [rules,setRules]=useState<Rules>({keepProbableTogether:true,allowFamilyMix:true,familyPriority:true});
  const load=useCallback(async()=>{setLoading(true);setError(null);try{const supabase=createClient();const [g,t,o]=await Promise.all([supabase.from('wedding_guests').select('id, first_name, last_name, group_name, family_side, guest_category, attendance_status, guest_status').eq('attendance_status','attending').eq('guest_status','active').order('first_name'),supabase.from('wedding_tables').select('id, table_number, name, capacity').order('table_number'),fetch('/api/confirmed-source',{cache:'no-store'})]);const op=await o.json();if(g.error||t.error)throw new Error(g.error?.message||t.error?.message||'No fue posible leer invitados/mesas.');if(!o.ok||!op?.ok)throw new Error(op?.error||'No fue posible leer relaciones.');setGuests((g.data||[]) as Guest[]);setTables((t.data||[]) as Table[]);setOfficial(op);}catch(err:any){setError(err?.message||'No fue posible construir la propuesta.');}finally{setLoading(false);}},[]);
  useEffect(()=>{if(open&&!official&&!loading)void load();},[open,official,loading,load]);
  const scenarios=useMemo(()=>buildScenarios(tables,guests,official?.groups||[],rules),[tables,guests,official,rules]);
  const scenario=scenarios.find((item)=>item.key===active)||scenarios[0];
  const metrics=useMemo(()=>{const hard=(official?.groups||[]).filter((group)=>group.confirmed).length;const probable=(official?.groups||[]).filter((group)=>!group.confirmed).length;return{hard,probable,missing:official?.summary.currentKnownWithoutMaster||0,known:official?.summary.currentKnownAttending||0};},[official]);

  return <><button type="button" className={styles.fab} onClick={()=>setOpen((value)=>!value)}>{open?<X size={17}/>:<><BrainCircuit size={16}/><span>IA de mesas</span></>}</button>{open&&<aside className={styles.panel}>
    <header><div><span>Seating Intelligence v2</span><strong>3 escenarios comparables</strong><small>Hechos + reglas + heurísticas visibles · no escribe en producción</small></div><button type="button" onClick={()=>setOpen(false)}><X size={16}/></button></header>
    {loading?<div className={styles.loading}><Loader2 className="animate-spin" size={20}/>Leyendo Supabase + GRUPOS_MESA…</div>:error?<div className={styles.error}><AlertTriangle size={15}/>{error}</div>:<>
      <section className={styles.metrics}><div><strong>{metrics.known}</strong><span>confirmados conocidos</span></div><div><strong>{guests.length}</strong><span>listos para sentar</span></div><div><strong>{metrics.missing}</strong><span>pendientes de ficha</span></div></section>
      <div className={styles.policy}><CheckCircle2 size={14}/><div><strong>{metrics.hard} grupos conocidos = regla fuerte</strong><span>{metrics.probable} vínculos probables permanecen como sugerencia. Nunca se inventa parentesco desde un apellido.</span></div></div>
      <div className={styles.scenarioTabs}>{scenarios.map((item)=><button type="button" key={item.key} onClick={()=>{setActive(item.key);setExpanded(null);}} className={active===item.key?styles.activeScenario:''}><span>{item.label}</span><strong>{item.score.total}</strong></button>)}</div>
      {scenario&&<>
        <div className={styles.scenarioIntro}><div><span>Escenario activo</span><strong>{scenario.label}</strong><small>{scenario.description}</small></div><button type="button" onClick={()=>setRulesOpen((value)=>!value)}><SlidersHorizontal size={12}/>Reglas</button></div>
        {rulesOpen&&<div className={styles.rules}>
          <label><input type="checkbox" checked={rules.keepProbableTogether} onChange={(e)=>setRules((current)=>({...current,keepProbableTogether:e.target.checked}))}/><span><strong>Intentar mantener vínculos probables</strong><small>No los convierte en relación confirmada.</small></span></label>
          <label><input type="checkbox" checked={rules.familyPriority} onChange={(e)=>setRules((current)=>({...current,familyPriority:e.target.checked}))}/><span><strong>Priorizar ramas familiares</strong><small>Kalbhenn/Muga, Vargas/Riffka, Garay/Bustos, Valverde/Espinoza y otras afinidades conocidas.</small></span></label>
          <label><input type="checkbox" checked={rules.allowFamilyMix} onChange={(e)=>setRules((current)=>({...current,allowFamilyMix:e.target.checked}))}/><span><strong>Permitir mezcla entre ramas</strong><small>Si se desactiva, el sistema evita mezclar mientras haya capacidad.</small></span></label>
        </div>}
        <section className={styles.score}><div><Gauge size={14}/><strong>Score {scenario.score.total}/100</strong></div><span>Vínculos {scenario.score.hard}%</span><span>Probables {scenario.score.probable}%</span><span>Ocupación {scenario.score.capacity}%</span><span>Cohesión {scenario.score.cohesion}%</span><span>Mezcla {scenario.score.mix}%</span>{scenario.unplaced>0&&<span className={styles.scoreWarning}>{scenario.unplaced} sin ubicar</span>}</section>
        <div className={styles.toolbar}><button type="button" onClick={load}><RefreshCw size={12}/>Recalcular</button><span>{scenario.tables.reduce((sum,item)=>sum+item.guests.length,0)}/{guests.length} personas incluidas</span></div>
        <div className={styles.tables}>{scenario.tables.map((item)=>{const free=item.table.capacity-item.guests.length;return <article key={item.table.id} className={item.guests.length?styles.hasGuests:''}><button type="button" className={styles.tableHead} onClick={()=>setExpanded(expanded===item.table.table_number?null:item.table.table_number)}><div><span>Mesa {item.table.table_number}</span><strong>{item.affinity||'Disponible'}</strong><small>{item.guests.length}/{item.table.capacity} · {free} cupos libres</small></div><ChevronRight size={15}/></button>{expanded===item.table.table_number&&<div className={styles.details}><div className={styles.reasons}>{item.reasons.map((reason)=><span key={reason}><Sparkles size={10}/>{reason}</span>)}</div><div className={styles.people}>{item.units.map((unit)=><div key={unit.id} className={unit.hard?styles.hard:unit.probable?styles.probable:''}><strong>{unit.label}</strong><span>{unit.guests.map(fullName).join(' · ')}</span><small>{unit.reason}</small></div>)}</div></div>}</article>})}</div>
      </>}
      <footer><Users size={14}/><div><strong>Revisión humana antes de aplicar</strong><span>Esta versión compara escenarios y explica cada mesa. “Aplicar propuesta” se habilitará únicamente sobre staging o producción con confirmación explícita y rollback; Preview no escribe datos reales.</span></div></footer>
    </>}
  </aside>}</>;
}
