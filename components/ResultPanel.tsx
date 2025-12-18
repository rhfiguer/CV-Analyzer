
import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, AlertTriangle, Navigation, Star, Mail, CheckCircle, Lock, Unlock, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { generateMissionReport } from '../services/pdfService';
import { sendEmailReport } from '../services/emailService';
import { MISSIONS } from '../constants';
import { supabase } from '../services/supabase';
import { LoginModal } from './LoginModal';

const LEMON_SQUEEZY_CHECKOUT_URL = "https://somosmaas.lemonsqueezy.com/buy/9a84d545-268d-42da-b7b8-9b77bd47cf43"; 

interface ResultPanelProps {
  result: AnalysisResult;
  onReset: () => void;
  userName?: string; 
  missionId?: string;
}

const parseStepContent = (text: string) => {
  const mdMatch = text.match(/\*\*(.*?)\*\*:?\s*(.*)/s);
  if (mdMatch) return { title: mdMatch[1], body: mdMatch[2] };
  const colonIndex = text.indexOf(':');
  if (colonIndex > 0 && colonIndex < 60) {
    return { title: text.substring(0, colonIndex).trim(), body: text.substring(colonIndex + 1).trim() };
  }
  return { title: '', body: text };
};

export const ResultPanel: React.FC<ResultPanelProps> = ({ 
  result, 
  onReset, 
  userName = "Comandante", 
  missionId 
}) => {
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  useEffect(() => {
    if (!supabase) return;

    const initialize = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession) await checkEntitlement(currentSession);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession) {
          setIsLoginModalOpen(false);
          await checkEntitlement(newSession);
      }
      if (event === 'SIGNED_OUT') setIsPremiumUnlocked(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkEntitlement = async (currentSession: any): Promise<boolean> => {
    if (!currentSession?.user || !supabase) return false;
    
    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', currentSession.user.id)
            .in('status', ['active', 'on_trial'])
            .maybeSingle();
        
        if (subscription) {
            setIsPremiumUnlocked(true);
            return true;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', currentSession.user.id)
            .single();

        if (profile?.is_premium) {
            setIsPremiumUnlocked(true);
            return true;
        }

    } catch (e: any) {}
    return false;
  };

  const handleUnlockAction = () => {
    if (!session) {
        setIsLoginModalOpen(true);
        return;
    }
    proceedToCheckout();
  };

  const proceedToCheckout = () => {
      if (!session?.user) return;
      const checkoutUrl = new URL(LEMON_SQUEEZY_CHECKOUT_URL);
      checkoutUrl.searchParams.set('checkout[email]', session.user.email);
      checkoutUrl.searchParams.set('checkout[custom][user_id]', session.user.id);
      checkoutUrl.searchParams.set('checkout[custom][name]', userName);
      window.location.href = checkoutUrl.toString();
  };

  const handleManualVerification = async () => {
    setVerifyingPayment(true);
    try {
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
      if (refreshedSession) {
        setSession(refreshedSession);
        const hasPremium = await checkEntitlement(refreshedSession);
        if (hasPremium) {
          alert("✅ ¡Radar Sincronizado! Acceso Premium habilitado.");
        } else {
          alert("🛰️ Radar de Pago: No detectamos transacciones recientes vinculadas a esta cuenta.\n\nNota: Si acabas de pagar, espera 30 segundos y reintenta.");
        }
      }
    } catch (err) {
      alert("Error en la conexión con la base.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleSendEmail = async () => {
    if (!session?.user?.email || emailStatus === 'sending') return;
    setEmailStatus('sending');
    try {
      const doc = generateMissionReport(result, userName, session.user.email);
      const missionTitle = MISSIONS.find(m => m.id === missionId)?.title;
      const response = await sendEmailReport(doc, session.user.email, userName, missionTitle);
      if (response.success) setEmailStatus('sent');
      else throw new Error(response.error);
    } catch (error) {
      setEmailStatus('error'); 
    }
  };

  const stepCount = result.plan_de_vuelo.length;
  let gridColsClass = stepCount >= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3";

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onSuccess={() => {}} />

      {/* CABECERA DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-2xl flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent"></div>
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 font-black">Rango de Piloto</p>
            <h2 className="text-3xl font-black text-cyan-400 tracking-tighter">{result.nivel_actual}</h2>
          </div>
          <Star className="text-yellow-500/40 relative z-10 group-hover:scale-110 transition-transform" size={40} />
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-2xl flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent"></div>
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 font-black">Éxito en Misión</p>
            <h2 className={`text-3xl font-black ${result.probabilidad_exito > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
              {result.probabilidad_exito}%
            </h2>
          </div>
          <CheckCircle className="text-cyan-500 opacity-20 relative z-10 group-hover:rotate-12 transition-transform" size={40} />
        </div>
      </div>

      {/* ANÁLISIS TÁCTICO */}
      <div className="glass-panel p-8 rounded-3xl border-l-4 border-cyan-500 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-5">
            <Navigation size={200} />
        </div>
        <h3 className="text-lg font-black text-white mb-4 flex items-center gap-3 uppercase tracking-widest">
           <Sparkles size={18} className="text-cyan-400"/> Informe de Inteligencia
        </h3>
        <p className="text-slate-300 leading-relaxed text-sm relative z-10">{result.analisis_mision}</p>
      </div>

      {/* GRID DE DETALLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 rounded-3xl p-7 border border-green-500/20 shadow-lg relative">
          <h4 className="text-green-400 font-black mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            <ShieldCheck size={16} /> Propulsores Activos
          </h4>
          <ul className="space-y-4">
            {result.puntos_fuertes.map((point, idx) => {
               const isLocked = !isPremiumUnlocked && idx >= 2;
               return (
                  <li key={idx} className={`flex items-start gap-3 text-sm transition-all duration-700 ${isLocked ? 'blur-[5px] select-none opacity-20' : 'text-slate-300'}`}>
                    <span className="mt-1 text-green-500 font-bold">{isLocked ? <Lock size={12}/> : '✓'}</span>
                    {isLocked ? "Contenido Premium Bloqueado" : point}
                  </li>
               );
            })}
          </ul>
        </div>

        <div className="bg-slate-900/40 rounded-3xl p-7 border border-red-500/20 shadow-lg relative overflow-hidden">
          <h4 className="text-red-400 font-black mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            <AlertTriangle size={16} /> Fugas Críticas
          </h4>
          <div className={`space-y-4 ${!isPremiumUnlocked ? 'blur-[8px] select-none opacity-20' : ''}`}>
            {result.brechas_criticas.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-red-500 mt-1">⚠</span> {point}
              </li>
            ))}
          </div>
          {!isPremiumUnlocked && (
             <div className="absolute inset-0 flex items-center justify-center">
                 <Lock size={40} className="text-red-500/10" />
             </div>
          )}
        </div>
      </div>

      {/* PLAN DE VUELO - ZONA PREMIUM */}
      <div className="bg-slate-950/90 rounded-[2.5rem] p-10 border border-slate-700/30 relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
        <h3 className="text-xs font-black text-white mb-12 uppercase tracking-[0.4em] text-center border-b border-slate-800 pb-6">Hoja de Ruta Táctica</h3>
        
        <div className={`grid gap-6 ${gridColsClass}`}>
            {result.plan_de_vuelo.map((step, idx) => {
                const { title, body } = parseStepContent(step);
                const isLockedItem = !isPremiumUnlocked && idx > 0;
                return (
                    <div key={idx} className={`relative p-6 rounded-2xl border transition-all duration-1000 ${isLockedItem ? 'border-slate-800 bg-transparent opacity-10 blur-[8px]' : 'border-cyan-500/20 bg-slate-900/40 shadow-xl'}`}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border border-cyan-500 text-cyan-400 flex items-center justify-center text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                            {idx + 1}
                        </div>
                        <h4 className="font-black text-[10px] text-cyan-400 mb-3 uppercase tracking-widest text-center pt-3">{isLockedItem ? 'RESTRINGIDO' : title}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed text-center font-medium">{isLockedItem ? 'Mejora tu rango para ver este paso.' : body}</p>
                    </div>
                );
            })}
        </div>

        {!isPremiumUnlocked && (
            <div className="absolute inset-0 z-40 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col items-center justify-center px-10 pt-16">
                <button 
                    onClick={handleUnlockAction}
                    className="group px-12 py-6 bg-white text-slate-950 hover:bg-cyan-50 text-lg font-black rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.15)] flex items-center gap-4 transition-all hover:scale-105 active:scale-95"
                >
                    <Unlock size={24} className="group-hover:rotate-12 transition-transform"/>
                    {session ? 'DESBLOQUEAR REPORTE COMPLETO' : 'IDENTIFICARSE CON GOOGLE'}
                </button>
                
                <div className="mt-8 flex flex-col items-center gap-3">
                    <p className="text-slate-600 text-[10px] uppercase tracking-widest font-black">¿Transferencia ya realizada?</p>
                    <button onClick={handleManualVerification} disabled={verifyingPayment} className="flex items-center gap-2 text-cyan-500 hover:text-cyan-400 text-xs font-black transition-colors uppercase tracking-widest">
                        {verifyingPayment ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16} />}
                        Sincronizar Radar de Pago
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* ACCIONES FINALES */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-8 pt-6">
        <button onClick={onReset} className="text-slate-600 hover:text-slate-300 font-black transition-all text-[10px] uppercase tracking-[0.3em]">
           Nueva Auditoría
        </button>
        
        {isPremiumUnlocked && session && (
            <button 
                onClick={handleSendEmail} 
                disabled={emailStatus === 'sending' || emailStatus === 'sent'} 
                className="px-12 py-5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black rounded-full flex items-center gap-4 shadow-[0_10px_40px_rgba(6,182,212,0.3)] hover:shadow-cyan-500/50 transition-all active:scale-95 disabled:opacity-50"
            >
                {emailStatus === 'sending' ? <Loader2 className="animate-spin" size={20}/> : emailStatus === 'sent' ? <CheckCircle size={20}/> : <Mail size={20}/>}
                {emailStatus === 'sent' ? 'INFORME ENVIADO' : `RECIBIR EN MI TERMINAL`}
            </button>
        )}
      </div>
      
      {isPremiumUnlocked && (
        <p className="text-center text-slate-500 text-[9px] uppercase tracking-widest font-bold">
          Enviando reporte táctico a: {session?.user?.email}
        </p>
      )}
    </div>
  );
};
