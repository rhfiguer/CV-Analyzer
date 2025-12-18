
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { X, Mail, ArrowRight, CheckCircle, Fingerprint, Loader2, Chrome } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledEmail?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess, prefilledEmail }) => {
  const [email, setEmail] = useState(prefilledEmail || '');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Error al conectar con Google.");
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Sistema de autenticación no configurado.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin, 
        },
      });

      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Error al iniciar secuencia de identificación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-[0_0_80px_rgba(6,182,212,0.15)] overflow-hidden animate-[fadeIn_0.3s_ease-out]">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-10">
          <X size={24} />
        </button>

        <div className="p-10 pt-12">
          <div className="flex justify-center mb-8">
            <div className="p-5 bg-cyan-950/50 rounded-full border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <Fingerprint size={48} className="text-cyan-400" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-center text-white mb-3 tracking-tight">Acceso a la Flota</h2>
          <p className="text-center text-slate-400 text-sm mb-10 leading-relaxed px-4">
            Identifícate para desbloquear tu Reporte Premium y sincronizar tu plan de vuelo.
          </p>

          {!sent ? (
            <div className="space-y-6">
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full py-4 px-6 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
              >
                {googleLoading ? <Loader2 className="animate-spin" size={20} /> : <Chrome size={20} />}
                CONTINUAR CON GOOGLE
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-[1px] bg-slate-800 flex-grow"></div>
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">o vía enlace táctico</span>
                <div className="h-[1px] bg-slate-800 flex-grow"></div>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all text-sm"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <>Enviar Enlace <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center space-y-6 animate-[fadeIn_0.5s_ease-out]">
              <div className="bg-cyan-500/5 border border-cyan-500/20 p-6 rounded-2xl">
                <CheckCircle size={40} className="text-cyan-400 mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Canal de Acceso Abierto</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Hemos enviado un enlace de identificación a <strong>{email}</strong>. Revisa tu bandeja de entrada.
                </p>
              </div>
              <button onClick={() => setSent(false)} className="text-slate-500 text-xs font-bold hover:text-white transition-colors">
                USAR OTRO MÉTODO
              </button>
            </div>
          )}
          
          <div className="text-center mt-8">
             <p className="text-[9px] text-slate-700 uppercase tracking-[0.3em] font-black">
                Somos MAAS Identity Protocol v3.0
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
