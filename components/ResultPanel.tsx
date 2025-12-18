
import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, AlertTriangle, Navigation, Star, Mail, CheckCircle, Lock, Unlock, Loader2, RefreshCw } from 'lucide-react';
import { generateMissionReport } from '../services/pdfService';
import { sendEmailReport } from '../services/emailService';
import { MISSIONS } from '../constants';
import { supabase, saveLead } from '../services/supabase';
import { LoginModal } from './LoginModal';

const LEMON_SQUEEZY_CHECKOUT_URL = "https://somosmaas.lemonsqueezy.com/buy/9a84d545-268d-42da-b7b8-9b77bd47cf43"; 

interface ResultPanelProps {
  result: AnalysisResult;
  onReset: () => void;
  userName?: string; 
  userEmail?: string;
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
  userEmail = "",
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
      
      if (currentSession) {
          await checkEntitlement(currentSession);
      }
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
    
    console.log(`[IDENTITY-CHECK] Validando suscripción para UID: ${currentSession.user.id}`);

    try {
        // Consultamos la tabla maestra de suscripciones por ID de Usuario
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', currentSession.user.id)
            .in('status', ['active', 'on_trial'])
            .maybeSingle();
        
        if (subscription) {
            console.log("✅ [ENTITLEMENT] Suscripción activa detectada.");
            setIsPremiumUnlocked(true);
            return true;
        }

        // Fallback: Verificar si existe un registro histórico en perfiles (Compatibilidad)
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', currentSession.user.id)
            .single();

        if (profile?.is_premium) {
            setIsPremiumUnlocked(true);
            return true;
        }

    } catch (e: any) {
        console.error("❌ [ENTITLEMENT] Error en validación táctica:", e.message);
    }
    return false;
  };

  const handleUnlockClick = () => {
    if (!session) {
        setIsLoginModalOpen(true);
        return;
    }
    proceedToCheckout();
  };

  const proceedToCheckout = () => {
      if (!session?.user) return;
      
      // IDENTITY-FIRST: Pasamos el user_id para que el webhook lo vincule sin errores
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
          alert("✅ ¡Misión Exitosa! El radar ha detectado tu suscripción activa.");
        } else {
          alert("🛰️ Radar de Pago: No detectamos una suscripción activa vinculada a esta cuenta.\n\nRecuerda que el procesamiento puede tardar hasta 30 segundos.");
        }
      }
    } catch (err) {
      alert("Error al sincronizar con la base.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleSendEmail = async () => {
    if (emailStatus === 'sending') return;
    setEmailStatus('sending');
    try {
      const doc = generateMissionReport(result, userName, userEmail);
      const missionTitle = MISSIONS.find(m => m.id === missionId)?.title;
      const response = await sendEmailReport(doc, userEmail, userName, missionTitle);
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
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onSuccess={() => {}} prefilledEmail={userEmail} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-700 p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1 font-bold">Rango Asignado</p>
            <h2 className="text-3xl font-black text-cyan-400 tracking-tighter">{result.nivel_actual}</h2>
          </div>
          <Star className="text-yellow-500/80" size={40} />
        </div>
        <div className="bg-slate-900/60 border border-slate-700 p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1 font-bold">Éxito Estimado</p>
            <h2 className={`text-3xl font-black ${result.probabilidad_exito > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
              {result.probabilidad_exito}%
            </h2>
          </div>
          <CheckCircle className="text-cyan-500 opacity-20" size={40} />
        </div>
      </div>

      <div className="glass-panel p-7 rounded-2xl border-l-4 border-cyan-500 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Navigation size={120} />
        </div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
           <Navigation size={18} className="text-cyan-400"/> Análisis de Trayectoria
        </h3>
        <p className="text-slate-300 leading-relaxed relative z-10">{result.analisis_mision}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 rounded-2xl p-6 border border-green-500/20 shadow-lg">
          <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
            <ShieldCheck size={16} /> Propulsores Activos
          </h4>
          <ul className="space-y-3">
            {result.puntos_fuertes.map((point, idx) => {
               const isLocked = !isPremiumUnlocked && idx >= 2;
               return (
                  <li key={idx} className={`flex items-start gap-3 text-sm transition-all duration-500 ${isLocked ? 'blur-[4px] select-none opacity-30 italic' : 'text-slate-300'}`}>
                    <span className="mt-1 text-green-500">{isLocked ? <Lock size={12}/> : '✓'}</span>
                    {isLocked ? "Análisis táctico restringido..." : point}
                  </li>
               );
            })}
          </ul>
        </div>

        <div className="bg-slate-900/40 rounded-2xl p-6 border border-red-500/20 shadow-lg relative overflow-hidden">
          <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
            <AlertTriangle size={16} /> Fugas en el Casco
          </h4>
          <div className={`space-y-3 ${!isPremiumUnlocked ? 'blur-[6px] select-none opacity-20 italic' : ''}`}>
            {result.brechas_criticas.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-red-500 mt-1">⚠</span> {point}
              </li>
            ))}
          </div>
          {!isPremiumUnlocked && (
             <div className="absolute inset-0 flex items-center justify-center">
                 <Lock size={32} className="text-red-500/20" />
             </div>
          )}
        </div>
      </div>

      <div className="bg-slate-950/80 rounded-3xl p-8 border border-slate-700/50 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <h3 className="text-base font-black text-white mb-10 uppercase tracking-[0.3em] text-center border-b border-slate-800 pb-4">Plan de Vuelo Táctico</h3>
        <div className={`grid gap-6 ${gridColsClass}`}>
            {result.plan_de_vuelo.map((step, idx) => {
                const { title, body } = parseStepContent(step);
                const isLockedItem = !isPremiumUnlocked && idx > 0;
                return (
                    <div key={idx} className={`relative p-5 rounded-2xl border transition-all duration-700 ${isLockedItem ? 'border-slate-800 bg-transparent opacity-20 blur-[5px]' : 'border-cyan-500/30 bg-slate-900/50 shadow-lg'}`}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-950 border border-cyan-500/50 text-cyan-400 flex items-center justify-center text-xs font-black">
                            {idx + 1}
                        </div>
                        <h4 className="font-bold text-[11px] text-cyan-400 mb-2 uppercase tracking-wider text-center pt-2">{isLockedItem ? 'Bloqueado' : title}</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed text-center">{isLockedItem ? 'Desbloquea para ver el paso.' : body}</p>
                    </div>
                );
            })}
        </div>

        {!isPremiumUnlocked && (
            <div className="absolute inset-0 z-30 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center justify-center px-6 pt-12">
                <button 
                    onClick={handleUnlockClick}
                    className="group px-10 py-5 bg-white text-slate-950 hover:bg-cyan-50 text-base font-black rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                >
                    <Unlock size={22} className="group-hover:rotate-12 transition-transform"/>
                    DESBLOQUEAR ACCESO PREMIUM
                </button>
                <div className="mt-6 flex flex-col items-center gap-2">
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">¿Ya completaste la transferencia?</p>
                    <button onClick={handleManualVerification} disabled={verifyingPayment} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-colors">
                        {verifyingPayment ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14} />}
                        VERIFICAR RADAR DE PAGO
                    </button>
                </div>
            </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-4">
        <button onClick={onReset} className="text-slate-500 hover:text-slate-300 font-bold transition-all text-xs uppercase tracking-widest">
           Nueva Misión
        </button>
        {isPremiumUnlocked && (
            <button 
                onClick={handleSendEmail} 
                disabled={emailStatus === 'sending' || emailStatus === 'sent'} 
                className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-full flex items-center gap-3 shadow-2xl hover:shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
                {emailStatus === 'sending' ? <Loader2 className="animate-spin" size={20}/> : emailStatus === 'sent' ? <CheckCircle size={20}/> : <Mail size={20}/>}
                {emailStatus === 'sent' ? 'REPORTE ENVIADO' : 'ENVIAR A MI TERMINAL'}
            </button>
        )}
      </div>
    </div>
  );
};
