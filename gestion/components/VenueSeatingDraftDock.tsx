'use client';

import React,{useEffect,useMemo,useState}from'react';
import{Armchair,CheckCircle2,Eye,EyeOff,RefreshCw,Users,X}from'lucide-react';
import{createPortal}from'react-dom';
import styles from'./VenueSeatingDraftDock.module.css';

type DraftPerson={name:string;virtual:boolean;source:string};
type DraftTable={tableNumber:number;tableName:string;capacity:number;virtualTable:boolean;affinity:string;people:DraftPerson[];reasons:string[]};
type SeatingDraft={savedAt:string;scenario:string;relationshipSource?:string;tables:DraftTable[]};
const KEY='fc-preview-seating-proposal-v2',PANEL_ID='venue-seating';
const POSITIONS=[[23,23],[45,22],[70,23],[23,48],[48,47],[73,48],[25,73],[50,73],[75,73],[86,66],[85,35],[12,70]];
function label(key:string){return key==='cohesion'?'Cohesión familiar':key==='social'?'Mezcla social':'Equilibrada';}
function readDraft():SeatingDraft|null{try{const parsed=JSON.parse(window.localStorage.getItem(KEY)||'null');return parsed?.tables?parsed:null;}catch{return null;}}

export default function VenueSeatingDraftDock(){
 const[draft,setDraft]=useState<SeatingDraft|null>(null),[open,setOpen]=useState(false),[showGhosts,setShowGhosts]=useState(true),[canvas,setCanvas]=useState<HTMLElement|null>(null);
 useEffect(()=>{const load=()=>setDraft(readDraft());load();window.addEventListener('fc-preview-seating-draft-changed',load);window.addEventListener('storage',load);return()=>{window.removeEventListener('fc-preview-seating-draft-changed',load);window.removeEventListener('storage',load);};},[]);
 useEffect(()=>{const close=(event:Event)=>{if((event as CustomEvent<string>).detail!==PANEL_ID)setOpen(false)};addEventListener('fc-workspace-panel-open',close);addEventListener('fc-management-overlay-open',close);return()=>{removeEventListener('fc-workspace-panel-open',close);removeEventListener('fc-management-overlay-open',close)}},[]);
 useEffect(()=>{let stop=false;const locate=()=>{if(stop)return;const found=document.querySelector<HTMLElement>('.venue-v2__canvas');if(found){setCanvas(found);return;}window.setTimeout(locate,100);};locate();return()=>{stop=true;};},[]);
 const stats=useMemo(()=>{const tables=draft?.tables||[];return{people:tables.reduce((sum,t)=>sum+t.people.length,0),tables:tables.length,virtual:tables.filter(t=>t.virtualTable).length,known:tables.filter(t=>!t.virtualTable).length};},[draft]);
 const overlay=canvas&&draft&&showGhosts?<div className={styles.overlay}>{draft.tables.filter(table=>table.virtualTable).map((table,index)=>{const pos=POSITIONS[index%POSITIONS.length];return <div key={table.tableNumber} className={styles.ghost} style={{left:`${pos[0]}%`,top:`${pos[1]}%`}}><strong>Mesa {table.tableNumber}</strong><span>{table.affinity||'Propuesta'}</span><small>{table.people.length}/{table.capacity}</small></div>;})}</div>:null;
 function toggle(){setOpen(current=>{const next=!current;if(next){dispatchEvent(new CustomEvent('fc-workspace-panel-open',{detail:PANEL_ID}));dispatchEvent(new CustomEvent('fc-management-overlay-open',{detail:PANEL_ID}));}return next})}
 return <>{overlay&&canvas?createPortal(overlay,canvas):null}<button type="button" className={styles.fab} onClick={toggle}>{open?<X size={17}/>:<><Armchair size={16}/><span>Seating</span>{draft&&<b>{stats.people}</b>}</>}</button>{open&&<aside className={styles.panel}>
  <header><div><span>Mesas → Salón</span><strong>Borrador de distribución</strong><small>{draft?`${label(draft.scenario)} · guardado ${new Date(draft.savedAt).toLocaleString('es-CL')}`:'Todavía no hay un escenario guardado'}</small></div><button type="button" onClick={()=>setOpen(false)}><X size={16}/></button></header>
  {!draft?<div className={styles.empty}><Armchair size={22}/><strong>Guarda primero una propuesta en Mesas → IA de mesas.</strong><span>Luego aparecerán aquí la composición social, las mesas adicionales necesarias y el detalle de personas.</span><a href="/dashboard/tables">Abrir Mesas</a></div>:<>
   <section className={styles.metrics}><div><strong>{stats.people}</strong><span>personas planificadas</span></div><div><strong>{stats.known}</strong><span>mesas actuales</span></div><div><strong>{stats.virtual}</strong><span>mesas adicionales</span></div></section>
   <div className={styles.toolbar}><button type="button" onClick={()=>setShowGhosts(v=>!v)}>{showGhosts?<EyeOff size={12}/>:<Eye size={12}/>} {showGhosts?'Ocultar mesas propuestas':'Mostrar mesas propuestas'}</button><button type="button" onClick={()=>setDraft(readDraft())}><RefreshCw size={12}/>Recargar</button></div>
   <div className={styles.note}><CheckCircle2 size={14}/><span>Las mesas punteadas del plano son capacidad propuesta, no mesas persistidas. Puedes mover el resto del montaje sin alterar la distribución social.</span></div>
   <div className={styles.list}>{draft.tables.map(table=><article key={table.tableNumber} className={table.virtualTable?styles.virtual:''}><header><div><span>{table.virtualTable?'Mesa adicional propuesta':'Mesa existente'}</span><strong>Mesa {table.tableNumber} · {table.affinity||'Sin afinidad dominante'}</strong></div><small>{table.people.length}/{table.capacity}</small></header><div>{table.people.map(person=><span key={person.name} className={person.virtual?styles.pending:''}>{person.name}{person.virtual?' · pendiente ficha':''}</span>)}</div></article>)}</div>
   <footer><Users size={14}/><span>El salón representa ubicación física; Mesas mantiene la lógica social. Ambas capas quedan conectadas por este borrador mientras concilias las fichas operativas.</span></footer>
  </>}
 </aside>}</>;
}
