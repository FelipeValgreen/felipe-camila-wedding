'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import styles from './PlanningCopilot.module.css';

type CopilotProps = { currentPath: string };
type Message = { role: 'assistant' | 'user'; text: string; meta?: string };

export default function PlanningCopilot({ currentPath }: CopilotProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Soy el Copiloto Operacional. Consulto las fuentes conectadas antes de responder y no ejecuto cambios sin confirmación.' },
  ]);

  const pageLabel = useMemo(() => {
    if (currentPath.includes('/guests')) return 'Invitados';
    if (currentPath.includes('/tables')) return 'Mesas';
    if (currentPath.includes('/venue')) return 'Salón';
    if (currentPath.includes('/finance')) return 'Presupuesto';
    if (currentPath.includes('/timeline')) return 'Cronograma';
    if (currentPath.includes('/music')) return 'Música';
    if (currentPath.includes('/documents')) return 'Documentos';
    if (currentPath.includes('/planning')) return 'Planificación';
    if (currentPath.includes('/issues')) return 'Necesita atención';
    return 'Inicio';
  }, [currentPath]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('fc-open-copilot', handler);
    return () => window.removeEventListener('fc-open-copilot', handler);
  }, []);

  async function submit(question = input) {
    const text = question.trim();
    if (!text || loading) return;
    const history = messages.slice(-8).map(({ role, text }) => ({ role, text }));
    setMessages((current) => [...current, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, currentPath, history }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        const message = payload?.message || payload?.error || 'No pude consultar el estado del evento.';
        throw new Error(message);
      }
      setMessages((current) => [...current, { role: 'assistant', text: payload.answer, meta: `${payload.model} · datos consultados ahora` }]);
    } catch (error: any) {
      setMessages((current) => [...current, { role: 'assistant', text: error?.message || 'No pude responder en este momento.', meta: 'Copiloto no disponible' }]);
    } finally {
      setLoading(false);
    }
  }

  const quickActions = ['¿Qué requiere atención ahora?', '¿Cuántos confirmados tenemos?', '¿Qué falta para cerrar las mesas?', 'Resume el presupuesto', '¿Qué falta en el cronograma?', '¿Qué decisiones faltan en música?'];

  return <>
    <button type="button" className={styles.fab} onClick={() => setOpen((value) => !value)} aria-label={open ? 'Cerrar copiloto' : 'Abrir copiloto'}>
      {open ? <X size={19}/> : <><Sparkles size={17}/><span>Copiloto</span></>}
    </button>
    {open && <aside className={styles.panel} aria-label="Copiloto operacional">
      <header className={styles.header}>
        <div className={styles.identity}><span><Bot size={18}/></span><div><strong>Copiloto operacional</strong><small>IA real · fuentes conectadas · solo lectura</small></div></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={17}/></button>
      </header>
      <div className={styles.context}><MessageCircle size={13}/><span>Contexto actual: <strong>{pageLabel}</strong></span><span>Grounding obligatorio</span></div>
      <div className={styles.messages}>
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`${styles.message} ${message.role === 'user' ? styles.user : styles.assistant}`}><span>{message.text}</span>{message.meta && <small>{message.meta}</small>}</div>)}
        {loading && <div className={styles.loading}><Loader2 size={18} className="animate-spin"/><span>Consultando RSVP, mesas, presupuesto y operación…</span></div>}
      </div>
      <div className={styles.quick}>{quickActions.map((action) => <button type="button" key={action} disabled={loading} onClick={() => submit(action)}>{action}</button>)}</div>
      <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pregunta por cualquier dato del evento…" disabled={loading}/>
        <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar">{loading ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}</button>
      </form>
      <footer className={styles.footer}><span>Propone; no modifica datos sin confirmación.</span><Link href="/dashboard/planning" onClick={() => setOpen(false)}>Abrir Planificación <ArrowRight size={12}/></Link></footer>
    </aside>}
  </>;
}
