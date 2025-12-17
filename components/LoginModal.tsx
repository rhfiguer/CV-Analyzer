import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { X, Mail, ArrowRight, CheckCircle, Fingerprint, Loader2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledEmail?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess, prefilledEmail }) => {
  const [email, setEmail] = useState(prefilledEmail || '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Sistema de autenticación no configurado (Modo Demo).");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Usamos signInWithOtp para Magic Link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // IMPORTANTE: Esta URL debe estar permitida en Authentication -> URL Configuration en Supabase
          emailRedirectTo: window.location.origin, 
        },
      });

      if (error) throw error;
      setSent(true);
      
      // Simular éxito para flujo demo si no hay backend real, o esperar confirmación real
      // En un flujo real, el usuario debe ir a su email. 
      // Si queremos detectar cuando vuelve, la app principal manejará el onAuthStateChange.
      // Sin embargo, para este flujo modal, indicamos que se envió.
      
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Error al iniciar secuencia de identificación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop con blur */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden animate-[fadeIn_0.3s_ease-out]">
        
        {/* Header Decorativo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-cyan-950/50 rounded-full border border-cyan-500/20">
              <Fingerprint size={40} className="text-cyan-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-2">Identificación Requerida</h2>
          <p className="text-center text-slate-400 text-sm mb-8">
            Para acceder a los datos clasificados de Nivel Premium, necesitamos verificar tus credenciales.
          </p>

          {!sent ? (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="auth-email" className="text-xs text-cyan-300 font-bold tracking-widest uppercase ml-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
                  <span className="font-bold">Error:</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Enviar Enlace de Acceso <ArrowRight size={18} />
                  </>
                )}
              </button>
              
              <div className="text-center pt-2">
                 <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Conexión Segura v.2.0
                 </p>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                <h3 className="text-green-400 font-bold flex items-center justify-center gap-2 mb-2">
                  <CheckCircle size={20} /> Enlace Enviado
                </h3>
                <p className="text-sm text-slate-300">
                  Hemos enviado un enlace mágico a <strong>{email}</strong>.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Haz click en el enlace de tu correo para autorizar el dispositivo. Esta ventana se actualizará automáticamente.
                </p>
              </div>
              <button
                 onClick={() => setSent(false)}
                 className="text-cyan-400 text-xs hover:underline"
              >
                 Intentar con otro correo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};