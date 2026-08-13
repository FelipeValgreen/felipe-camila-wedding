'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import { Activity as ActivityIcon, Database, Globe2, Loader2, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import './activity-v2.css';

interface AuditItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data: unknown;
  after_data: unknown;
  actor: string | null;
  origin: string;
  created_at: string;
}

function friendlyAction(value:string){
  const labels:Record<string,string>={CREATE_TABLE:'Mesa creada',UPDATE_TABLE:'Mesa actualizada',DELETE_TABLE:'Mesa eliminada',ASSIGN_GUEST:'Invitado asignado',UNASSIGN_GUEST:'Invitado quitado de mesa',CREATE_GUEST:'Invitado creado',UPDATE_GUEST:'Ficha actualizada'};
  return labels[value]||value.replaceAll('_',' ').toLowerCase().replace(/^./,(char)=>char.toUpperCase());
}
function friendlyEntity(value:string){
  const labels:Record<string,string>={wedding_guests:'Invitados',wedding_tables:'Mesas',seating_assignments:'Distribución',rsvp_responses:'RSVP',rsvp_response_members:'RSVP',expenses:'Presupuesto',vendors:'Proveedores'};
  return labels[value]||value.replaceAll('_',' ');
}
function formatDate(value:string){
  try{return new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Santiago'}).format(new Date(value));}catch{return value;}
}
function summary(log:AuditItem){
  if(!log.after_data)return 'Sin detalle adicional.';
  if(typeof log.after_data==='object'&&log.after_data!==null){
    const data=log.after_data as Record<string,unknown>;
    const preferred=['name','first_name','concept','status','table_number','capacity','attendance_status'];
    const parts=preferred.filter((key)=>data[key]!==undefined&&data[key]!==null).slice(0,3).map((key)=>`${key.replaceAll('_',' ')}: ${String(data[key])}`);
    if(parts.length)return parts.join(' · ');
  }
  return 'Cambio registrado y disponible en auditoría.';
}

export default function ActivityPage(){
  const [logs,setLogs]=useState<AuditItem[]>([]);const [loading,setLoading]=useState(true);const [filterOrigin,setFilterOrigin]=useState('all');const [refreshing,setRefreshing]=useState(false);
  async function loadLogs(manual=false){if(manual)setRefreshing(true);setLoading(!manual);try{const supabase=createClient();const {data,error}=await supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;setLogs((data||[]) as AuditItem[]);}finally{setLoading(false);setRefreshing(false);}}
  useEffect(()=>{loadLogs();},[]);
  const origins=useMemo(()=>Array.from(new Set(logs.map((log)=>log.origin).filter(Boolean))),[logs]);
  const filtered=useMemo(()=>logs.filter((log)=>filterOrigin==='all'||log.origin===filterOrigin),[logs,filterOrigin]);
  const today=useMemo(()=>{const now=new Date();return logs.filter((log)=>{const d=new Date(log.created_at);return d.toDateString()===now.toDateString();}).length;},[logs]);

  return <DashboardLayout><div className="activity-v2">
    <section className="activity-v2__hero"><div><span className="activity-v2__eyebrow">Trazabilidad</span><h1>Actividad</h1><p>Una línea de tiempo legible de los cambios importantes. La auditoría técnica sigue existiendo, pero la interfaz prioriza entender qué pasó.</p></div><button type="button" onClick={()=>loadLogs(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing?'animate-spin':''}/>{refreshing?'Actualizando…':'Actualizar'}</button></section>
    <section className="activity-v2__metrics"><article><span>Eventos visibles</span><strong>{logs.length}</strong><small>últimos registros</small></article><article><span>Hoy</span><strong>{today}</strong><small>movimientos registrados</small></article><article><span>Orígenes</span><strong>{origins.length}</strong><small>fuentes de cambios</small></article><article><span>Auditoría</span><strong className="activity-v2__word">Activa</strong><small>trazabilidad disponible</small></article></section>
    <section className="activity-v2__toolbar"><div className="activity-v2__filters"><button className={filterOrigin==='all'?'is-active':''} onClick={()=>setFilterOrigin('all')}>Todos</button>{origins.map((origin)=><button key={origin} className={filterOrigin===origin?'is-active':''} onClick={()=>setFilterOrigin(origin)}>{origin}</button>)}</div><span><ShieldCheck size={14}/>Registro de auditoría</span></section>
    {loading?<div className="activity-v2__loading"><Loader2 className="animate-spin" size={20}/>Cargando actividad…</div>:<section className="activity-v2__timeline">{filtered.map((log)=>{
      const Icon=log.origin==='website'?Globe2:log.origin==='dashboard'?UserRound:log.origin==='system'||log.origin==='sheets'?Database:ActivityIcon;
      return <article key={log.id} className="activity-v2__event"><span className="activity-v2__icon"><Icon size={15}/></span><div className="activity-v2__event-main"><div className="activity-v2__event-top"><div><strong>{friendlyAction(log.action)}</strong><span>{friendlyEntity(log.entity_type)}</span></div><time>{formatDate(log.created_at)}</time></div><p>{summary(log)}</p><footer><span>{log.origin||'sistema'}</span><span>{log.actor||'Sistema'}</span></footer></div></article>;
    })}{!filtered.length&&<div className="activity-v2__empty">No hay actividad en este filtro.</div>}</section>}
  </div></DashboardLayout>;
}
