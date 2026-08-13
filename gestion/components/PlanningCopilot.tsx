'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import styles from './PlanningCopilot.module.css';

type CopilotProps = { currentPath: string };
type Message = { role: 'assistant' | 'user'; text: string; toolsUsed?: string[] };

const STARTER: Message = {
  role: 'assistant',
  text: 'Soy el Copiloto Operacional. Consulto las fuentes conectadas antes de responder datos del matrimonio. Esta versión es de solo lectura: puedo analizar, detectar contradicciones y proponer acciones, pero no modificar datos sin un flujo de confirmación.',
};

export default function PlanningCopilot({ currentPath }: CopilotProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([STARTER]);

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

  async function submit(question = input) {
    const text = question.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: 'user', text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPath,
          messages: nextMessages.map((message) => ({ role: message.role, content: message.text })),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        const code = payload?.error || 'No fue posible consultar al Copiloto.';
        if (code === 'AI_GATEWAY_NOT_CONFIGURED') {
          throw new Error('El motor de IA todavía no tiene credenciales de AI Gateway disponibles en este deployment.');
        }
        throw new Error(code);
      }
      setMessages((current) => [...current, {
        role: 'assistant',
        text: payload.message,
        toolsUsed: Array.isArray(payload.toolsUsed) ? payload.toolsUsed : [],
      }]);
    } catch (error: any) {
      setMessages((current) => [...current, {
        role: 'assistant',
        text: `No pude completar esa consulta: ${error?.message || 'error desconocido'}. No se modificó ningún dato.`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  const quickActions = [
    '¿Qué requiere atención ahora?',
    '¿Cuántos confirmados reales tenemos?',
    '¿Cómo está la capacidad de mesas?',
    '¿Cuánto falta pagar?',
    '¿Qué falta cerrar en el cronograma?',
    '¿Qué falta definir en música?',
  ];

  return <>
    <button type="button" className={styles.fab} onClick={() => setOpen((value) => !value)} aria-label={open ? 'Cerrar copiloto' : 'Abrir copiloto'}>
      {open ? <X size={19}/> : <><Sparkles size={17}/><span>Copiloto</span></>}
    </button>

    {open && <aside className={styles.panel} aria-label="Copiloto operacional">
      <header className={styles.header}>
        <div className={styles.identity}>
          <span><Bot size={18}/></span>
          <div><strong>Copiloto operacional</strong><small>IA real · herramientas conectadas · solo lectura</small></div>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={17}/></button>
      </header>

      <div className={styles.context}>
        <MessageCircle size={13}/><span>Contexto actual: <strong>{pageLabel}</strong></span>
      </div>

      <div className={styles.messages}>
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`${styles.message} ${message.role === 'user' ? styles.user : styles.assistant}`}>
          <div>{message.text}</div>
          {message.role === 'assistant' && message.toolsUsed?.length ? <small style={{ display: 'block', marginTop: 7, opacity: .58, fontSize: 7 }}>Fuentes consultadas: {message.toolsUsed.join(', ')}</small> : null}
        </div>)}
        {loading && <div className={styles.loading}><Loader2 size={18} className="animate-spin"/><span>Consultando fuentes del evento…</span></div>}
      </div>

      <div className={styles.quick}>{quickActions.map((action) => <button type="button" key={action} onClick={() => void submit(action)} disabled={loading}>{action}</button>)}</div>

      <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pregunta por personas, mesas, presupuesto, cronograma…" disabled={loading}/>
        <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar">{loading ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}</button>
      </form>

      <footer className={styles.footer}>
        <span>No ejecuta cambios sin confirmación.</span>
        <Link href="/dashboard/planning" onClick={() => setOpen(false)}>Abrir Planificación <ArrowRight size={12}/></Link>
      </footer>
    </aside>}
  </>;
}
