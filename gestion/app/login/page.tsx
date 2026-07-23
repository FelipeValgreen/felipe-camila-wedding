'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

const AUTHORIZED_EMAILS = [
  'filipo.valverde@gmail.com',
  'cavargask@gmail.com',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!AUTHORIZED_EMAILS.includes(normalizedEmail)) {
      setMessage({
        type: 'error',
        text: 'Este correo no está autorizado para ingresar al Centro de Gestión.',
      });
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setMessage({
          type: 'error',
          text: 'No pudimos iniciar sesión. Revisa el correo y la contraseña.',
        });
        return;
      }

      setMessage({ type: 'success', text: 'Acceso correcto. Abriendo el Centro de Gestión…' });
      router.replace('/dashboard');
      router.refresh();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Ocurrió un problema al iniciar sesión.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-hidden="true">
        <div className="login-visual-image" />
        <div className="login-visual-overlay" />
        <div className="login-visual-content">
          <span className="login-date">23 · 10 · 26</span>
          <div>
            <h1>Felipe &amp; Camila</h1>
            <p>El Umbral Vivo</p>
          </div>
          <div className="login-visual-line" />
          <p className="login-visual-copy">
            Un espacio privado para ordenar invitados, mesas, pagos y cada detalle del camino al matrimonio.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-brand">
            <span className="login-monogram">F&amp;C</span>
            <span className="login-eyebrow">Centro de Gestión</span>
            <h2>Bienvenidos</h2>
            <p>Ingresen con el correo autorizado y su contraseña.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label className="login-field">
              <span>Correo electrónico</span>
              <div className="login-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="nombre@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <div className="login-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {message && (
              <div className={`login-message ${message.type}`} role="status">
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading} className="login-submit">
              <span>{loading ? 'Ingresando…' : 'Ingresar al Centro de Gestión'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>

          <div className="login-security-note">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Acceso privado para Felipe y Camila.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
