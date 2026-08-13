'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Check, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import styles from './PlanningCopilot.module.css';

type CopilotProps = { currentPath: string };
type CopilotAction = {
  id: string;
  type: 'music.create' | 'timeline.create';
  label: string;
  description: string;
  payload: Record<string, any>;
  requiresConfirmation: true;
};
type Message = { role: 'assistant' | 'user'; text: string; meta?: string; action?: CopilotAction; actionState?: 'pending' | 'applied' | 'discarded' | 'error' };

const CHAT_KEY = 'fc-copilot-chat-v2';
const PREVIEW_MUSIC_KEY = 'fc-preview-music-actions-v1';
const PREVIEW_TIMELINE_KEY = 'fc-preview-timeline-actions-v1';

export default function PlanningCopilot({ currentPath }: CopilotProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Soy el Copiloto Operacional. Consulto las fuentes conectadas antes de responder y preparo cambios para que tú los confirmes.' },
  ]);

  const previewMode = typeof window !== 'undefined' && window.location.hostname !== 'gestion.felipeycami.cl';
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
    try {
      const stored = window.sessionStorage.getItem(CHAT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed.slice(-30));
      }
    } catch { /* optional persistence */ }
    return () => window.removeEventListener('fc-open-copilot', handler);
  }, []);

  useEffect(() => {
    try { window.sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-30))); } catch { /* optional */ }
  }, [messages]);

  async function submit(question = input) {
    const text = question.trim();
    if (!text || loading) return;
    const history = messages.filter((message) => !message.action || message.actionState !== 'pending').slice(-8).map(({ role, text }) => ({ role, text }));
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
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || payload?.error || 'No pude consultar el estado del evento.');
      const modeLabel = payload.mode === 'ai' ? `${payload.model} · fuentes consultadas ahora` : 'Modo seguro · respuesta grounded sin modelo externo';
      setMessages((current) => [...current, { role: 'assistant', text: payload.answer, meta: modeLabel, action: payload.action || undefined, actionState: payload.action ? 'pending' : undefined }]);
    } catch (error: any) {
      setMessages((current) => [...current, { role: 'assistant', text: error?.message || 'No pude responder en este momento.', meta: 'Copiloto no disponible' }]);
    } finally {
      setLoading(false);
    }
  }

  function updateActionState(actionId: string, state: Message['actionState'], text?: string) {
    setMessages((current) => current.map((message) => message.action?.id === actionId ? { ...message, actionState: state, ...(text ? { text: `${message.text}\n\n${text}` } : {}) } : message));
  }

  function savePreviewDraft(action: CopilotAction) {
    const key = action.type === 'music.create' ? PREVIEW_MUSIC_KEY : PREVIEW_TIMELINE_KEY;
    const eventName = action.type === 'music.create' ? 'fc-preview-music-action' : 'fc-preview-timeline-action';
    const draft = { id: `copilot-${Date.now()}`, ...action.payload, createdAt: new Date().toISOString(), source: 'copilot-preview' };
    try {
      const current = JSON.parse(window.localStorage.getItem(key) || '[]');
      const next = Array.isArray(current) ? [...current, draft] : [draft];
      window.localStorage.setItem(key, JSON.stringify(next.slice(-100)));
      window.dispatchEvent(new CustomEvent(eventName, { detail: draft }));
    } catch { /* local storage may be disabled */ }
  }

  async function applyAction(action: CopilotAction) {
    updateActionState(action.id, 'pending');
    if (previewMode) {
      savePreviewDraft(action);
      updateActionState(action.id, 'applied', `Confirmado como borrador local de Preview. ${action.type === 'music.create' ? 'Ya aparecerá en Música.' : 'Ya aparecerá en Cronograma.'}`);
      return;
    }
    try {
      const endpoint = action.type === 'music.create' ? '/api/music-source' : '/api/timeline-source';
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action.payload) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || payload?.error || 'No fue posible aplicar la acción.');
      updateActionState(action.id, 'applied', 'Acción aplicada y auditada correctamente.');
      window.dispatchEvent(new CustomEvent(action.type === 'music.create' ? 'fc-data-music-changed' : 'fc-data-timeline-changed'));
    } catch (error: any) {
      updateActionState(action.id, 'error', error?.message || 'No fue posible aplicar la acción.');
    }
  }

  const quickActions = ['¿Qué requiere atención ahora?', '¿Cuántos confirmados tenemos?', '¿Qué falta para cerrar las mesas?', 'Resume el presupuesto', '¿Qué falta en el cronograma?', '¿Qué decisiones faltan en música?'];

  return <>
    <button type="button" className={styles.fab} onClick={() => setOpen((value) => !value)} aria-label={open ? 'Cerrar copiloto' : 'Abrir copiloto'}>
      {open ? <X size={19}/> : <><Sparkles size={17}/><span>Copiloto</span></>}
    </button>
    {open && <aside className={styles.panel} aria-label="Copiloto operacional">
      <header className={styles.header}>
        <div className={styles.identity}><span><Bot size={18}/></span><div><strong>Copiloto operacional</strong><small>IA grounded · acciones con confirmación</small></div></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={17}/></button>
      </header>
      <div className={styles.context}><MessageCircle size={13}/><span>Contexto actual: <strong>{pageLabel}</strong></span><span>Grounding obligatorio</span></div>
      <div className={styles.messages}>
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`${styles.message} ${message.role === 'user' ? styles.user : styles.assistant}`}>
          <span className={styles.messageText}>{message.text}</span>
          {message.action && <div className={`${styles.actionCard} ${message.actionState === 'applied' ? styles.actionApplied : message.actionState === 'discarded' ? styles.actionDiscarded : message.actionState === 'error' ? styles.actionError : ''}`}>
            <span className={styles.actionKicker}>Acción propuesta</span><strong>{message.action.label}</strong><small>{message.action.description}</small>
            {message.actionState === 'pending' && <div><button type="button" onClick={() => updateActionState(message.action!.id, 'discarded')}>Descartar</button><button type="button" className={styles.confirmAction} onClick={() => applyAction(message.action!)}><Check size={12}/>Confirmar</button></div>}
            {message.actionState === 'applied' && <span className={styles.actionState}><Check size={11}/>Confirmada</span>}
            {message.actionState === 'discarded' && <span className={styles.actionState}>Descartada</span>}
            {message.actionState === 'error' && <span className={styles.actionState}>No se pudo aplicar</span>}
          </div>}
          {message.meta && <small className={styles.meta}>{message.meta}</small>}
        </div>)}
        {loading && <div className={styles.loading}><Loader2 size={18} className="animate-spin"/><span>Consultando RSVP, mesas, presupuesto y operación…</span></div>}
      </div>
      <div className={styles.quick}>{quickActions.map((action) => <button type="button" key={action} disabled={loading} onClick={() => submit(action)}>{action}</button>)}</div>
      <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ej. Agrega Dancing Queen de ABBA para la fiesta" disabled={loading}/>
        <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar">{loading ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}</button>
      </form>
      <footer className={styles.footer}><span>{previewMode ? 'Preview: cambios confirmados se guardan como borrador local.' : 'Propone; sólo modifica después de tu confirmación.'}</span><Link href="/dashboard/planning" onClick={() => setOpen(false)}>Abrir Planificación <ArrowRight size={12}/></Link></footer>
    </aside>}
  </>;
}
