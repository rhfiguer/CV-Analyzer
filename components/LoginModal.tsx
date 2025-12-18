
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { X, Fingerprint, Loader2, Chrome } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
            Identifícate con tu cuenta de Google para desbloquear tu Reporte Premium y sincronizar tus misiones.
          </p>

          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full py-5 px-6 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
            >
              {googleLoading ? <Loader2 className="animate-spin" size={20} /> : <Chrome size={20} />}
              CONTINUAR CON GOOGLE
            </button>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium text-center">
                {error}
              </div>
            )}
            
            <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold">
              Protocolo Seguro SSL/TLS 256-bit
            </p>
          </div>
          
          <div className="text-center mt-12 border-t border-slate-800 pt-6">
             <p className="text-[9px] text-slate-700 uppercase tracking-[0.3em] font-black">
                Somos MAAS Identity v3.1
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
