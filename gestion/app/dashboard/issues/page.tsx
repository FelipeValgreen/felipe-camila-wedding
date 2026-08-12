'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import './issues-v2.css';

type MemberStatus = 'unmatched' | 'candidate' | 'matched' | 'needs_review' | 'ignored';
type Filter = 'rsvp' | 'critical' | 'sync' | 'all';

interface RsvpMember {
  id: string;
  display_name: string;
  guest_id: string | null;
  resolution_status: MemberStatus;
  attendance_status: string;
  dietary_type: string | null;
  dietary_detail: string | null;
  notes: string | null;
}
interface RsvpSummary {
  rsvp_id: string;
  response_name: string;
  phone_e164: string;
  attendance_status: string;
  dietary_type: string | null;
  dietary_detail: string | null;
  reconciliation_status: string;
  sheet_sync_status: string;
  created_at: string;
  member_count: number;
  matched_member_count: number;
  pending_member_count: number;
  members: RsvpMember[] | null;
}
interface ManagementIssue {
  id: string;
  issue_type: string;
  entity_type: string;
  entity_id: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'resolved' | 'ignored';
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
interface GuestOption {
  id: string;
  first_name: string;
  last_name: string;
  group_name: string;
  attendance_status: string;
  rsvp_id: string | null;
  guest_status: string;
}

const ISSUE_LABELS: Record<string,string> = {
  unmatched_rsvp: 'Sin vincular', joint_rsvp: 'Respuesta conjunta', malformed_match: 'Conciliación inválida', sheet_sync_failed: 'Fallo de Sheets',
};

function fullGuestName(guest: GuestOption) { return `${guest.first_name} ${guest.last_name || ''}`.trim(); }
function formatDate(value: string) {
  try { return new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Santiago'}).format(new Date(value)); }
  catch { return 'Reciente'; }
}

export default function IssuesPage() {
  const [issues,setIssues] = useState<ManagementIssue[]>([]);
  const [summaries,setSummaries] = useState<RsvpSummary[]>([]);
  const [guests,setGuests] = useState<GuestOption[]>([]);
  const [loading,setLoading] = useState(true);
  const [busyKey,setBusyKey] = useState<string|null>(null);
  const [message,setMessage] = useState<{type:'success'|'error'|'info';text:string}|null>(null);
  const [filter,setFilter] = useState<Filter>('rsvp');
  const [search,setSearch] = useState('');
  const [selectedGuestByMember,setSelectedGuestByMember] = useState<Record<string,string>>({});
  const [newMemberByRsvp,setNewMemberByRsvp] = useState<Record<string,string>>({});
  const [previewMode,setPreviewMode] = useState(false);

  useEffect(()=>setPreviewMode(window.location.hostname !== 'gestion.felipeycami.cl'),[]);

  const loadData = useCallback(async()=>{
    setLoading(true);
    try{
      const supabase=createClient();
      const [issuesResult,summaryResult,guestsResult]=await Promise.all([
        supabase.from('management_issues').select('*').eq('status','open').order('created_at',{ascending:false}),
        supabase.from('rsvp_management_summary').select('*').order('created_at',{ascending:false}),
        supabase.from('wedding_guests').select('id, first_name, last_name, group_name, attendance_status, rsvp_id, guest_status').eq('guest_status','active').order('first_name',{ascending:true}),
      ]);
      const errors=[issuesResult.error,summaryResult.error,guestsResult.error].filter(Boolean);
      if(errors.length) throw new Error(errors.map((error)=>error?.message).join(' · '));
      setIssues((issuesResult.data||[]) as ManagementIssue[]);setSummaries((summaryResult.data||[]) as RsvpSummary[]);setGuests((guestsResult.data||[]) as GuestOption[]);
    }catch(error:any){setMessage({type:'error',text:error?.message||'No fue posible cargar las incidencias.'});}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{loadData();},[loadData]);

  const summaryByRsvp=useMemo(()=>new Map(summaries.map((item)=>[item.rsvp_id,item])),[summaries]);
  const counts=useMemo(()=>({
    open:issues.length,
    critical:issues.filter((item)=>item.severity==='critical').length,
    joint:issues.filter((item)=>item.issue_type==='joint_rsvp').length,
    unmatched:issues.filter((item)=>item.issue_type==='unmatched_rsvp').length,
    sync:issues.filter((item)=>item.issue_type==='sheet_sync_failed').length,
    people:summaries.reduce((sum,item)=>sum+Number(item.pending_member_count||0),0),
  }),[issues,summaries]);

  const visibleIssues=useMemo(()=>{
    const term=search.toLowerCase().trim();
    return issues.filter((issue)=>{
      if(filter==='critical'&&issue.severity!=='critical') return false;
      if(filter==='sync'&&issue.issue_type!=='sheet_sync_failed') return false;
      if(filter==='rsvp'&&issue.issue_type==='sheet_sync_failed') return false;
      const summary=summaryByRsvp.get(issue.entity_id);
      return !term||`${issue.title} ${issue.description||''} ${summary?.response_name||''}`.toLowerCase().includes(term);
    });
  },[issues,filter,search,summaryByRsvp]);

  function updateMemberLocally(member:RsvpMember,guestId:string){
    setSummaries((current)=>current.map((summary)=>{
      if(!(summary.members||[]).some((item)=>item.id===member.id)) return summary;
      const nextMembers=(summary.members||[]).map((item)=>item.id===member.id?{...item,guest_id:guestId,resolution_status:'matched' as MemberStatus}:item);
      const matched=nextMembers.filter((item)=>item.resolution_status==='matched').length;
      return {...summary,members:nextMembers,matched_member_count:matched,pending_member_count:Math.max(0,nextMembers.length-matched),reconciliation_status:matched===nextMembers.length?(nextMembers.length>1?'split_matched':'matched'):'partially_matched'};
    }));
  }

  async function refreshIssues(){
    setBusyKey('refresh');setMessage(null);
    if(previewMode){await loadData();setBusyKey(null);setMessage({type:'info',text:'Preview recargado desde los datos reales. No se ejecutó ninguna mutación.'});return;}
    try{const supabase=createClient();const {error}=await supabase.rpc('refresh_management_issues');if(error)throw error;await loadData();setMessage({type:'success',text:'Incidencias actualizadas.'});}
    catch(error:any){setMessage({type:'error',text:error?.message||'No fue posible actualizar las incidencias.'});}
    finally{setBusyKey(null);}
  }

  async function resolveMember(member:RsvpMember){
    const guestId=selectedGuestByMember[member.id];if(!guestId){setMessage({type:'error',text:`Selecciona la ficha correspondiente a ${member.display_name}.`});return;}
    const guest=guests.find((item)=>item.id===guestId);
    if(previewMode){updateMemberLocally(member,guestId);setMessage({type:'info',text:`Preview: ${member.display_name} quedó vinculado/a a ${guest?fullGuestName(guest):'la ficha seleccionada'}. Producción permanece intacta.`});return;}
    setBusyKey(member.id);setMessage(null);
    try{const supabase=createClient();const {error}=await supabase.rpc('resolve_rsvp_member',{p_member_id:member.id,p_guest_id:guestId,p_note:'Vinculado manualmente desde la Bandeja de Incidencias.'});if(error)throw error;await refreshIssues();setMessage({type:'success',text:`${member.display_name} quedó vinculado/a.`});}
    catch(error:any){setMessage({type:'error',text:error?.message||'No fue posible vincular a la persona.'});}
    finally{setBusyKey(null);}
  }

  async function createGuestAndResolve(member:RsvpMember){
    const normalized=member.display_name.trim().replace(/\s+/g,' ');const parts=normalized.split(' ');const firstName=parts.shift()||normalized;const lastName=parts.join(' ');
    if(previewMode){const id=`preview-guest-${Date.now()}`;setGuests((current)=>[...current,{id,first_name:firstName,last_name:lastName,group_name:'Por clasificar',attendance_status:member.attendance_status,rsvp_id:null,guest_status:'active'}]);updateMemberLocally(member,id);setMessage({type:'info',text:`Preview: se creó y vinculó la ficha de ${member.display_name}. Producción no fue modificada.`});return;}
    setBusyKey(`create-${member.id}`);setMessage(null);
    try{
      const response=await fetch('/api/guests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first_name:firstName,last_name:lastName,group_name:'Por clasificar',family_side:'Por clasificar',guest_category:'Adulto',attendance_status:member.attendance_status,dietary_type:member.dietary_type||'Ninguna',dietary_detail:member.dietary_detail,notes:'Ficha creada desde RSVP. Revisar grupo y contacto.'})});
      const payload=await response.json();if(!response.ok||!payload.ok||!payload.guest?.id)throw new Error(payload.error||'No fue posible crear la ficha.');
      const supabase=createClient();const {error}=await supabase.rpc('resolve_rsvp_member',{p_member_id:member.id,p_guest_id:payload.guest.id,p_note:'Ficha creada y vinculada desde Incidencias.'});if(error)throw error;await refreshIssues();setMessage({type:'success',text:`Se creó y vinculó la ficha de ${member.display_name}.`});
    }catch(error:any){setMessage({type:'error',text:error?.message||'No fue posible crear y vincular la ficha.'});}
    finally{setBusyKey(null);}
  }

  async function addMember(summary:RsvpSummary){
    const displayName=(newMemberByRsvp[summary.rsvp_id]||'').trim();if(!displayName){setMessage({type:'error',text:'Escribe el nombre de la persona que falta.'});return;}
    if(previewMode){const member:RsvpMember={id:`preview-member-${Date.now()}`,display_name:displayName,guest_id:null,resolution_status:'unmatched',attendance_status:summary.attendance_status,dietary_type:summary.dietary_type,dietary_detail:summary.dietary_detail,notes:'Agregado en Preview'};setSummaries((current)=>current.map((item)=>item.rsvp_id===summary.rsvp_id?{...item,members:[...(item.members||[]),member],member_count:item.member_count+1,pending_member_count:item.pending_member_count+1}:item));setNewMemberByRsvp((current)=>({...current,[summary.rsvp_id]:''}));setMessage({type:'info',text:`Preview: ${displayName} fue agregado a la respuesta. Producción permanece intacta.`});return;}
    setBusyKey(`add-${summary.rsvp_id}`);setMessage(null);
    try{const supabase=createClient();const {error}=await supabase.rpc('add_rsvp_member',{p_rsvp_id:summary.rsvp_id,p_display_name:displayName,p_guest_id:null,p_attendance_status:summary.attendance_status,p_dietary_type:summary.dietary_type,p_dietary_detail:summary.dietary_detail,p_note:'Integrante agregado manualmente desde Incidencias.'});if(error)throw error;setNewMemberByRsvp((current)=>({...current,[summary.rsvp_id]:''}));await refreshIssues();setMessage({type:'success',text:`${displayName} fue agregado.`});}
    catch(error:any){setMessage({type:'error',text:error?.message||'No fue posible agregar a la persona.'});}
    finally{setBusyKey(null);}
  }

  async function closeIssue(issue:ManagementIssue){
    if(previewMode){setIssues((current)=>current.filter((item)=>item.id!==issue.id));setMessage({type:'info',text:'Preview: incidencia cerrada localmente. Producción permanece intacta.'});return;}
    setBusyKey(`issue-${issue.id}`);setMessage(null);
    try{const supabase=createClient();const {error}=await supabase.from('management_issues').update({status:'resolved',resolved_at:new Date().toISOString(),resolution_note:'Incidencia revisada desde dashboard.'}).eq('id',issue.id);if(error)throw error;await loadData();setMessage({type:'success',text:'Incidencia marcada como revisada.'});}
    catch(error:any){setMessage({type:'error',text:error?.message||'No fue posible cerrar la incidencia.'});}
    finally{setBusyKey(null);}
  }

  const guestOptions=useMemo(()=>guests.filter((guest)=>guest.guest_status==='active').sort((a,b)=>fullGuestName(a).localeCompare(fullGuestName(b),'es')),[guests]);

  return <DashboardLayout><div className="issues-v2">
    <section className="issues-v2__hero"><div><span className="issues-v2__eyebrow">Control de calidad</span><h1>Necesita atención</h1><p>Convierte respuestas ambiguas y personas sin ficha en datos operativos antes de cerrar mesas, catering o entregables.</p></div><div className="issues-v2__actions">{previewMode&&<span className="issues-v2__preview">Preview · cambios locales</span>}<button type="button" onClick={refreshIssues} disabled={busyKey==='refresh'}><RefreshCw size={14} className={busyKey==='refresh'?'animate-spin':''}/>Actualizar revisión</button></div></section>

    {message&&<div className={`issues-v2__message issues-v2__message--${message.type}`}>{message.type==='success'?<CheckCircle2 size={16}/>:message.type==='error'?<XCircle size={16}/>:<AlertTriangle size={16}/>}<span>{message.text}</span></div>}

    <section className="issues-v2__summary">
      <article className="is-primary"><span>Personas por resolver</span><strong>{counts.people}</strong><small>integrantes RSVP todavía sin ficha segura</small></article>
      <article><span>Incidencias abiertas</span><strong>{counts.open}</strong><small>todos los tipos</small></article>
      <article><span>Respuestas conjuntas</span><strong>{counts.joint}</strong><small>requieren separación por persona</small></article>
      <article><span>Sin vincular</span><strong>{counts.unmatched}</strong><small>sin relación a ficha maestra</small></article>
      <article><span>Críticas</span><strong>{counts.critical}</strong><small>prioridad alta</small></article>
    </section>

    <section className="issues-v2__toolbar"><div className="issues-v2__filters">{([['rsvp','RSVP'],['critical','Críticas'],['sync','Sincronización'],['all','Todas']] as Array<[Filter,string]>).map(([key,label])=><button key={key} type="button" onClick={()=>setFilter(key)} className={filter===key?'is-active':''}>{label}</button>)}</div><label className="issues-v2__search"><Search size={14}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Buscar respuesta o incidencia…"/></label></section>

    {loading?<div className="issues-v2__loading"><Loader2 className="animate-spin" size={20}/><span>Cargando incidencias…</span></div>:visibleIssues.length===0?<div className="issues-v2__empty"><CheckCircle2 size={26}/><strong>No hay incidencias en esta vista.</strong></div>:<section className="issues-v2__list">{visibleIssues.map((issue)=>{
      const summary=summaryByRsvp.get(issue.entity_id);const members=summary?.members||[];const dataIssue=issue.issue_type!=='sheet_sync_failed';
      return <article key={issue.id} className={`issues-v2__card is-${issue.severity}`}>
        <header><div className="issues-v2__card-heading"><span className="issues-v2__alert"><AlertTriangle size={17}/></span><div><div className="issues-v2__badges"><span className={`is-${issue.severity}`}>{issue.severity}</span><span>{ISSUE_LABELS[issue.issue_type]||issue.issue_type}</span></div><h2>{issue.title}</h2><p>{issue.description}</p>{summary&&<small>Respuesta de {summary.response_name} · {summary.member_count} persona(s) · {formatDate(summary.created_at)}</small>}</div></div>{dataIssue&&summary?.pending_member_count===0&&<button type="button" className="issues-v2__review" onClick={()=>closeIssue(issue)}>Marcar revisada</button>}</header>
        {summary&&dataIssue&&<div className="issues-v2__members">{members.map((member)=>{
          const linked=member.guest_id?guests.find((guest)=>guest.id===member.guest_id):null;const resolved=member.resolution_status==='matched';
          return <div key={member.id} className={`issues-v2__member ${resolved?'is-resolved':''}`}><div className="issues-v2__member-copy"><span className="issues-v2__member-avatar"><Users size={14}/></span><div><strong>{member.display_name}</strong><small>{linked?`Vinculada a ${fullGuestName(linked)} · ${linked.group_name}`:member.notes||'Pendiente de identificar en la lista maestra.'}</small></div><span className="issues-v2__member-status">{resolved?'Conciliada':'Pendiente'}</span></div>{!resolved&&<div className="issues-v2__resolve"><select value={selectedGuestByMember[member.id]||''} onChange={(event)=>setSelectedGuestByMember((current)=>({...current,[member.id]:event.target.value}))}><option value="">Seleccionar ficha existente…</option>{guestOptions.map((guest)=><option key={guest.id} value={guest.id}>{fullGuestName(guest)} — {guest.group_name}</option>)}</select><button type="button" className="is-primary" onClick={()=>resolveMember(member)} disabled={busyKey===member.id}><Link2 size={12}/>Vincular</button><button type="button" onClick={()=>createGuestAndResolve(member)} disabled={busyKey===`create-${member.id}`}><UserPlus size={12}/>Crear ficha</button></div>}</div>;
        })}<div className="issues-v2__add"><input value={newMemberByRsvp[summary.rsvp_id]||''} onChange={(event)=>setNewMemberByRsvp((current)=>({...current,[summary.rsvp_id]:event.target.value}))} placeholder="¿La respuesta incluye otra persona? Escribe su nombre"/><button type="button" onClick={()=>addMember(summary)}><Plus size={12}/>Agregar persona</button></div></div>}
        {issue.issue_type==='sheet_sync_failed'&&<div className="issues-v2__sync-note">La incidencia se cerrará cuando el registro vuelva a sincronizarse correctamente. No se fuerza una escritura masiva desde esta pantalla.</div>}
      </article>;
    })}</section>}

    <footer className="issues-v2__footer"><Link href="/dashboard/guests">Volver a Invitados <ArrowRight size={13}/></Link><Link href="/dashboard/tables">Continuar a Mesas <ArrowRight size={13}/></Link></footer>
  </div></DashboardLayout>;
}
