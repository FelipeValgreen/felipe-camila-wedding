'use client';

import React,{useCallback,useEffect,useMemo,useState}from'react';
import{AlertTriangle,ArrowLeft,CheckCircle2,Edit3,Loader2,Plus,Save,Search,UserCog,X}from'lucide-react';
import{createClient}from'@/lib/supabase-browser';
import styles from'./GuestQuickEditorDock.module.css';

type Guest={id:string;first_name:string;last_name:string;phone_e164:string|null;group_name:string;family_side:string;family_branch:string|null;guest_category:string;invitation_status:string;attendance_status:string;dietary_type:string|null;dietary_detail:string|null;reconfirmation_status:string;table_id:string|null;rsvp_id:string|null;guest_status:string;notes:string|null};
type Confirmed={summary:{currentKnownAttending:number;currentKnownWithoutMaster:number}};
type DraftState={overrides:Record<string,Guest>;deleted:string[]};
const KEY='fc-preview-guests-v1',OVERLAY_ID='guest-editor';
const EMPTY:Guest={id:'',first_name:'',last_name:'',phone_e164:null,group_name:'General',family_side:'Compartido',family_branch:null,guest_category:'Adulto',invitation_status:'not_sent',attendance_status:'pending',dietary_type:'Ninguna',dietary_detail:null,reconfirmation_status:'pending',table_id:null,rsvp_id:null,guest_status:'active',notes:null};
const BRANCHES=['Cami · Kalbhenn / Muga','Cami · Vargas / Riffka','Cami · Mamá','Cami · Papá','Felipe · Garay / Bustos','Felipe · Valverde / Espinoza','Felipe · Cerda / Escobedo','Felipe · Mamá','Felipe · Papá','Compartido · amigos','Compartido · trabajo','Por clasificar'];
function name(g:Guest){return`${g.first_name} ${g.last_name||''}`.trim()}
function readDrafts():DraftState{try{const parsed=JSON.parse(localStorage.getItem(KEY)||'null');return parsed?.overrides?parsed:{overrides:{},deleted:[]}}catch{return{overrides:{},deleted:[]}}}
function writeDrafts(value:DraftState){try{localStorage.setItem(KEY,JSON.stringify(value));dispatchEvent(new CustomEvent('fc-preview-guests-changed'))}catch{}}
function merge(base:Guest[],draft:DraftState){const map=new Map(base.filter(g=>!draft.deleted.includes(g.id)).map(g=>[g.id,g]));Object.values(draft.overrides).forEach(g=>{if(!draft.deleted.includes(g.id))map.set(g.id,g)});return Array.from(map.values()).sort((a,b)=>name(a).localeCompare(name(b),'es'))}

export default function GuestQuickEditorDock(){
 const[open,setOpen]=useState(false),[guests,setGuests]=useState<Guest[]>([]),[confirmed,setConfirmed]=useState<Confirmed|null>(null),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[preview,setPreview]=useState(false),[search,setSearch]=useState(''),[editor,setEditor]=useState<Guest|null>(null),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
 useEffect(()=>setPreview(location.hostname!=='gestion.felipeycami.cl'),[]);
 useEffect(()=>{const close=(event:Event)=>{const id=(event as CustomEvent<string>).detail;if(id!==OVERLAY_ID){setOpen(false);setEditor(null)}};addEventListener('fc-management-overlay-open',close);return()=>removeEventListener('fc-management-overlay-open',close)},[]);
 const load=useCallback(async()=>{setLoading(true);setError(null);try{const supabase=createClient();const[g,c]=await Promise.all([supabase.from('wedding_guests').select('*').eq('guest_status','active').order('first_name'),fetch('/api/confirmed-source',{cache:'no-store'})]);const cp=await c.json().catch(()=>null);if(g.error)throw g.error;if(!c.ok||!cp?.ok)throw new Error(cp?.error||'No fue posible leer confirmados.');let next=(g.data||[])as Guest[];if(location.hostname!=='gestion.felipeycami.cl')next=merge(next,readDrafts());setGuests(next);setConfirmed(cp)}catch(err:any){setError(err?.message||'No fue posible cargar invitados.')}finally{setLoading(false)}},[]);
 useEffect(()=>{if(open)void load()},[open,load]);
 const filtered=useMemo(()=>{const q=search.toLowerCase().trim();return guests.filter(g=>!q||`${name(g)} ${g.group_name} ${g.family_side} ${g.family_branch||''} ${g.phone_e164||''}`.toLowerCase().includes(q)).slice(0,100)},[guests,search]);
 const attending=guests.filter(g=>g.attendance_status==='attending').length;
 function openDock(){if(open){setOpen(false);setEditor(null);return}dispatchEvent(new CustomEvent('fc-management-overlay-open',{detail:OVERLAY_ID}));setOpen(true)}
 function create(){setEditor({...EMPTY,id:`preview-guest-${Date.now()}`,attendance_status:'attending'});setError(null);setNotice(null)}
 function edit(g:Guest){setEditor({...g,family_branch:g.family_branch||null});setError(null);setNotice(null)}
 function localSave(g:Guest){const drafts=readDrafts();drafts.overrides[g.id]=g;drafts.deleted=drafts.deleted.filter(id=>id!==g.id);writeDrafts(drafts);setGuests(current=>merge(current.filter(item=>item.id!==g.id),{overrides:{[g.id]:g},deleted:[]}));setEditor(null);setNotice('Ficha guardada como borrador persistente de Preview.')}
 async function save(){if(!editor?.first_name.trim()){setError('El nombre es obligatorio.');return}if(preview){localSave(editor);return}setSaving(true);setError(null);try{const isNew=editor.id.startsWith('preview-guest-');const response=await fetch('/api/guests',{method:isNew?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...editor,id:isNew?undefined:editor.id})});const payload=await response.json();if(!response.ok||!payload?.ok)throw new Error(payload?.error||'No fue posible guardar.');setEditor(null);setNotice('Ficha actualizada y auditada.');await load()}catch(err:any){setError(err?.message||'No fue posible guardar.')}finally{setSaving(false)}}

 return<><button type="button" className={styles.fab} onClick={openDock}>{open?<X size={17}/>:<><UserCog size={16}/><span>Editar invitados</span></>}</button>{open&&<><button className={styles.backdrop} onClick={()=>{setOpen(false);setEditor(null)}} aria-label="Cerrar editor"/><aside className={styles.panel} aria-label="Editor de invitados">
  <header><div><span>Autogestión</span><strong>{editor?'Editar ficha':'Editor rápido de invitados'}</strong><small>{editor?name(editor)||'Nueva persona':`${guests.length} fichas · ${attending} asistentes operativos`}</small></div><button onClick={()=>{setOpen(false);setEditor(null)}} aria-label="Cerrar"><X size={18}/></button></header>
  {editor?<>
    {error&&<div className={styles.error}>{error}</div>}
    <div className={styles.editor}>
      <div className={styles.editorHead}><button className={styles.backButton} onClick={()=>{setEditor(null);setError(null)}}><ArrowLeft size={16}/>Volver a invitados</button><strong>{editor.id.startsWith('preview-guest-')?'Nueva ficha':name(editor)}</strong></div>
      <div className={styles.grid}><label><span>Nombre *</span><input value={editor.first_name} onChange={e=>setEditor({...editor,first_name:e.target.value})}/></label><label><span>Apellido</span><input value={editor.last_name} onChange={e=>setEditor({...editor,last_name:e.target.value})}/></label></div>
      <label><span>Teléfono</span><input value={editor.phone_e164||''} onChange={e=>setEditor({...editor,phone_e164:e.target.value||null})} placeholder="+56 9…"/></label>
      <div className={styles.grid}><label><span>Grupo general</span><input value={editor.group_name} onChange={e=>setEditor({...editor,group_name:e.target.value})}/></label><label><span>Lado familiar</span><select value={editor.family_side||'Compartido'} onChange={e=>setEditor({...editor,family_side:e.target.value})}><option>Felipe</option><option>Camila</option><option>Compartido</option><option>Por clasificar</option></select></label></div>
      <label><span>Rama / afinidad para mesas</span><input list="fc-family-branches" value={editor.family_branch||''} onChange={e=>setEditor({...editor,family_branch:e.target.value||null})} placeholder="Ej. Cami · Mamá"/><datalist id="fc-family-branches">{BRANCHES.map(branch=><option key={branch} value={branch}/>)}</datalist></label>
      <div className={styles.grid}><label><span>Asistencia</span><select value={editor.attendance_status} onChange={e=>setEditor({...editor,attendance_status:e.target.value})}><option value="attending">Asiste</option><option value="pending">Pendiente</option><option value="not_attending">No asiste</option></select></label><label><span>Categoría</span><select value={editor.guest_category} onChange={e=>setEditor({...editor,guest_category:e.target.value})}><option>Adulto</option><option>Niño</option><option>Proveedor-Staff</option><option>After 11</option></select></label></div>
      <div className={styles.grid}><label><span>Restricción</span><select value={editor.dietary_type||'Ninguna'} onChange={e=>setEditor({...editor,dietary_type:e.target.value})}><option>Ninguna</option><option>Vegetariano</option><option>Vegano</option><option>Celíaco / libre de gluten</option><option>Alergias</option><option>Otra</option></select></label><label><span>Detalle</span><input value={editor.dietary_detail||''} onChange={e=>setEditor({...editor,dietary_detail:e.target.value||null})}/></label></div>
      <label><span>Notas</span><textarea rows={4} value={editor.notes||''} onChange={e=>setEditor({...editor,notes:e.target.value||null})}/></label>
      <footer><button onClick={()=>{setEditor(null);setError(null)}}>Cancelar</button><button className={styles.primary} onClick={save} disabled={saving}>{saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}Guardar ficha</button></footer>
    </div>
  </>:<>
    {confirmed&&confirmed.summary.currentKnownWithoutMaster>0&&<div className={styles.warning}><AlertTriangle size={16}/><div><strong>{confirmed.summary.currentKnownWithoutMaster} confirmados aún no tienen ficha operativa</strong><span>Para enlazarlos a un RSVP existente usa Necesita atención. Crea una ficha nueva sólo cuando conozcas la identidad exacta.</span></div></div>}
    <div className={styles.toolbar}><label><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar persona, grupo o rama familiar…"/></label><button onClick={create}><Plus size={15}/>Nueva ficha</button></div>
    {error&&<div className={styles.error}>{error}</div>}{notice&&<div className={styles.notice}><CheckCircle2 size={14}/>{notice}</div>}
    {loading?<div className={styles.loading}><Loader2 size={20} className="animate-spin"/>Cargando fichas…</div>:<div className={styles.list}>{filtered.map(g=><button type="button" key={g.id} onClick={()=>edit(g)}><span className={styles.avatar}>{g.first_name[0]||'?'}</span><div><strong>{name(g)}</strong><span>{g.group_name||'Sin grupo'} · {g.family_branch||g.family_side||'Por clasificar'}</span><small>{g.attendance_status==='attending'?'Asiste':g.attendance_status==='not_attending'?'No asiste':'Pendiente'}{g.table_id?' · con mesa':' · sin mesa'}</small></div><Edit3 size={15}/></button>)}{!filtered.length&&<div className={styles.empty}>No hay coincidencias.</div>}</div>}
  </>}
 </aside></>}</>;
}
