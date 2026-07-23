'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const allowed = ['filipo.valverde@gmail.com', 'cavargask@gmail.com'];
    if (!allowed.includes(email.trim().toLowerCase())) {
      setMessage({ type: 'error', text: 'Acceso no autorizado. Este correo no tiene permisos en admin_profiles.' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Magic link enviado. Revisa tu bandeja de correo para ingresar.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al solicitar enlace de ingreso.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center p-6">
      <div className="bg-white border border-[rgba(17,17,15,0.14)] p-8 w-full max-w-md space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <span className="font-serif text-4xl text-[#11110F] block">F&C</span>
          <span className="text-xs uppercase tracking-[0.25em] text-[#B79A68] font-semibold block">
            Centro de Gestión Operativo
          </span>
          <p className="text-xs text-[#777168] mt-1">
            Ingreso exclusivo para administradores autorizados.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#777168] mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#FAF8F3] border border-[rgba(17,17,15,0.2)] p-3 text-sm focus:outline-none focus:border-[#11110F]"
            />
          </div>

          {message && (
            <div className={`p-3 text-xs border rounded ${message.type === 'success' ? 'bg-[#2D5A27]/10 text-[#2D5A27] border-[#2D5A27]/20' : 'bg-[#A83232]/10 text-[#A83232] border-[#A83232]/20'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#11110F] text-white text-xs uppercase tracking-[0.2em] font-semibold py-3.5 hover:bg-black transition-colors cursor-pointer"
          >
            {loading ? 'Enviando enlace...' : 'Enviar Magic Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
