'use client';

export const dynamic='force-dynamic';

import React,{useCallback,useEffect,useState}from'react';
import DashboardLayout from '@/components/DashboardLayout';
import{AlertTriangle,Bot,CheckCircle2,Database,HeartPulse,Loader2,RefreshCw,ShieldCheck,XCircle}from'lucide-react';
import'./system-v2.css';

type Check={key:string;label:string;ok:boolean;detail:string;severity:'ok'|'warning'|'error'};
type Health={ok:boolean;environment?:string;aiProvider?:string;checks:Check[];summary:{healthy:number;warnings:number;errors:number;knownAttending:number;operationalGuests:number;tables:number;capacity:number;assigned:number;openIssues:number;vendors:number;tasks:number;relationshipGroups:number;relationshipMembers:number;memoryItems?:number};fetchedAt:string};

export default function SystemPage(){
 const[data,setData]=useState<Health|null>(null),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState<string|null>(null);
 const load=useCallback(async(manual=false)=>{if(manual)setRefreshing(true);setError(null);try{const response=await fetch('/api/system-health',{cache:'no-store'});const payload=await response.json();if(!response.ok||!payload?.ok)throw new Error(payload?.error||'No fue posible revisar el sistema.');setData(payload);}catch(err:any){setError(err?.message||'No fue posible revisar el sistema.');}finally{setLoading(false);setRefreshing(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const aiProvider=data?.aiProvider||data?.checks.find(check=>check.key==='ai_provider')?.detail||'Motor operacional';
 const externalAI=Boolean(data?.aiProvider&&data.aiProvider!=='Motor operacional sin LLM externo');
 return<DashboardLayout><div className="system-v2">
  <section className="system-v2__hero"><div><span className="system-v2__eyebrow">Observabilidad</span><h1>Estado del sistema</h1><p>Chequeo operativo de fuentes, integridad, conciliación, seating, Copiloto y protecciones de escritura. Sirve para distinguir un dato pendiente de un error real de la aplicación.</p></div><button onClick={()=>load(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing?'animate-spin':''}/>{refreshing?'Revisando…':'Revisar ahora'}</button></section>
  {error&&<div className="system-v2__error"><XCircle size={16}/>{error}</div>}
  {loading?<div className="system-v2__loading"><Loader2 size={20} className="animate-spin"/>Ejecutando chequeos…</div>:data&&<>
   <section className="system-v2__summary"><article><span>Correctos</span><strong>{data.summary.healthy}</strong><small>checks saludables</small></article><article className={data.summary.warnings?'is-warning':''}><span>Advertencias</span><strong>{data.summary.warnings}</strong><small>requieren seguimiento</small></article><article className={data.summary.errors?'is-error':''}><span>Errores</span><strong>{data.summary.errors}</strong><small>requieren corrección</small></article><article><span>Última revisión</span><strong className="is-time">{new Date(data.fetchedAt).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</strong><small>datos consultados en vivo</small></article></section>
   <section className={`system-v2__ai ${externalAI?'is-external':'is-operational'}`}><span className="system-v2__ai-icon"><Bot size={20}/></span><div><span className="system-v2__eyebrow">Copiloto</span><strong>{aiProvider}</strong><small>{externalAI?'Modelo externo conectado. Sigue trabajando sobre las fuentes canónicas y toda mutación requiere confirmación.':'El motor operacional consulta datos reales, memoria y cambios del evento. Un modelo externo aún no está confirmado por este entorno, por lo que la interfaz no debe presentarlo como GPT.'}</small></div><b>{externalAI?'IA externa activa':'Motor operacional activo'}</b></section>
   <section className="system-v2__facts"><article><strong>{data.summary.knownAttending}</strong><span>confirmados conocidos</span></article><article><strong>{data.summary.operationalGuests}</strong><span>fichas asistentes</span></article><article><strong>{data.summary.tables}</strong><span>mesas reales</span></article><article><strong>{data.summary.capacity}</strong><span>cupos reales</span></article><article><strong>{data.summary.assigned}</strong><span>asignaciones persistidas</span></article><article><strong>{data.summary.memoryItems??0}</strong><span>memorias activas</span></article></section>
   <section className="system-v2__checks"><header><Database size={17}/><div><span className="system-v2__eyebrow">Diagnóstico</span><h2>Chequeos operativos</h2></div></header><div>{data.checks.map(check=>{const Icon=check.severity==='ok'?CheckCircle2:check.severity==='warning'?AlertTriangle:XCircle;return<article key={check.key} className={`is-${check.severity}`}><span><Icon size={15}/></span><div><strong>{check.label}</strong><small>{check.detail}</small></div><b>{check.severity==='ok'?'OK':check.severity==='warning'?'Revisar':'Error'}</b></article>;})}</div></section>
   <section className="system-v2__footer"><ShieldCheck size={16}/><div><strong>Principio de seguridad</strong><span>Los entornos de revisión pueden experimentar sin escribir datos reales. En producción, las acciones sensibles requieren usuario autorizado y el Copiloto prepara los cambios antes de ejecutarlos.</span></div><HeartPulse size={18}/></section>
  </>}
 </div></DashboardLayout>;
}
