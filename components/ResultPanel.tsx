import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, AlertTriangle, Navigation, Star, Mail, Download, CheckCircle, AlertCircle, Radio, Lock, Unlock, Loader2, ArrowRight, Fingerprint, RefreshCw } from 'lucide-react';
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
  const [transmissionId, setTransmissionId] = useState<string>('');
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false); 
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  
  const pollingAttempts = useRef(0);
  const maxPollingAttempts = 10; // 30 segundos de espera total

  useEffect(() => {
    if (!supabase) return;

    // 1. Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) checkAndPoll(session);
    });

    // 2. Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session) {
          setIsLoginModalOpen(false);
          const isPremium = await checkPremiumStatus(session);
          // Si entra y no es premium, redirigimos suavemente al checkout
          if (!isPremium) triggerAutoRedirect(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAndPoll = async (currentSession: any) => {
      const isPremium = await checkPremiumStatus(currentSession);
      if (!isPremium) {
          startPolling(currentSession);
      }
  };

  const startPolling = (currentSession: any) => {
      if (pollingAttempts.current > 0) return;
      const interval = setInterval(async () => {
          pollingAttempts.current += 1;
          const isNowPremium = await checkPremiumStatus(currentSession);
          if (isNowPremium || pollingAttempts.current >= maxPollingAttempts) {
              clearInterval(interval);
          }
      }, 3000);
  };

  const handleManualVerification = async () => {
      if (!session) {
          setIsLoginModalOpen(true);
          return;
      }
      setVerifyingPayment(true);
      const isPremium = await checkPremiumStatus(session);
      // Simular un escaneo de radar
      await new Promise(r => setTimeout(r, 1500));
      setVerifyingPayment(false);
      
      if (!isPremium) {
          alert(`🛰️ Radar: El acceso Premium no ha sido detectado todavía.\n\nRecuerda usar el mismo email que en la compra: ${session.user.email}`);
      }
  };

  const checkPremiumStatus = async (currentSession: any): Promise<boolean> => {
    if (currentSession?.user && supabase) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_premium')
                .eq('id', currentSession.user.id)
                .single();
            
            if (data?.is_premium) {
                setIsPremiumUnlocked(true);
                return true;
            }
        } catch (e) {
            console.error("Error en radar premium:", e);
        }
    }
    return false;
  };

  const triggerAutoRedirect = (email: string) => {
      setShowRedirectModal(true);
      setTimeout(() => proceedToCheckout(email), 3500);
  };

  const handleUnlockClick = () => {
    setUnlocking(true);
    if (!session) {
        setIsLoginModalOpen(true);
        setUnlocking(false);
        return;
    }
    proceedToCheckout(session.user.email);
  };

  const proceedToCheckout = (email?: string) => {
      const targetEmail = (email || session?.user?.email || userEmail).toLowerCase().trim();
      const checkoutUrl = `${LEMON_SQUEEZY_CHECKOUT_URL}?checkout[email]=${encodeURIComponent(targetEmail)}`;
      window.location.href = checkoutUrl;
  };

  const handleSendEmail = async () => {
    if (emailStatus === 'sending') return;
    setEmailStatus('sending');
    try {
      const doc = generateMissionReport(result, userName, userEmail);
      const missionTitle = MISSIONS.find(m => m.id === missionId)?.title;
      const response = await sendEmailReport(doc, userEmail, userName, missionTitle);
      if (response.success) {
        setEmailStatus('sent');
        if (response.id) setTransmissionId(response.id);
      } else throw new Error(response.error);
    } catch (error: any) {
      setEmailStatus('error'); 
    }
  };

  const stepCount = result.plan_de_vuelo.length;
  let gridColsClass = stepCount >= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3";

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onSuccess={() => {}} prefilledEmail={userEmail} />

      {showRedirectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
           <div className="relative bg-slate-900 border border-cyan-500/50 rounded-2xl p-8 max-w-md w-full shadow-[0_0_60px_rgba(6,182,212,0.2)] text-center">
              <div className="flex justify-center mb-6 relative">
                 <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                 <Fingerprint size={64} className="text-cyan-400 relative z-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Identidad Confirmada</h2>
              <p className="text-slate-400 mb-6">Redirigiendo a pasarela de pago para activar sistemas premium...</p>
              <button onClick={() => proceedToCheckout()} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                 Ir al Pago Ahora <ArrowRight size={18} />
              </button>
           </div>
        </div>
      )}

      {/* Resumen de Rango */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-700 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Rango Asignado</p>
            <h2 className="text-3xl font-bold text-cyan-400">{result.nivel_actual}</h2>
          </div>
          <Star className="text-yellow-500" size={40} />
        </div>
        <div className="bg-slate-900/60 border border-slate-700 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Probabilidad Éxito</p>
            <h2 className={`text-3xl font-bold ${result.probabilidad_exito > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
              {result.probabilidad_exito}%
            </h2>
          </div>
          <CheckCircle className="text-cyan-500 opacity-30" size={40} />
        </div>
      </div>

      {/* Análisis Principal */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-purple-500">
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
           <Navigation size={20} className="text-purple-400"/> Análisis de Trayectoria
        </h3>
        <p className="text-slate-300 leading-relaxed">{result.analisis_mision}</p>
      </div>

      {/* Fortalezas y Brechas (con Blur si no es Premium) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative bg-slate-900/40 rounded-xl p-5 border border-green-900/50 overflow-hidden">
          <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2">
            <ShieldCheck size={18} /> Propulsores Activos
          </h4>
          <ul className="space-y-2">
            {result.puntos_fuertes.map((point, idx) => {
               const isLocked = !isPremiumUnlocked && idx >= 2;
               return (
                  <li key={idx} className={`flex items-start gap-2 text-sm transition-all ${isLocked ? 'blur-sm select-none opacity-40' : 'text-slate-300'}`}>
                    <span className="mt-1">{isLocked ? <Lock size={12}/> : '✓'}</span>
                    {isLocked ? "Contenido estratégico bloqueado." : point}
                  </li>
               );
            })}
          </ul>
        </div>

        <div className="relative bg-slate-900/40 rounded-xl p-5 border border-red-900/50 overflow-hidden">
          <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} /> Fugas en el Casco
          </h4>
          <div className={`space-y-2 ${!isPremiumUnlocked ? 'blur-sm select-none opacity-40' : ''}`}>
            {result.brechas_criticas.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                <span className="text-red-500 mt-1">⚠</span> {point}
              </li>
            ))}
          </div>
          {!isPremiumUnlocked && (
             <div className="absolute inset-0 flex items-center justify-center">
                 <Lock size={24} className="text-red-500/50" />
             </div>
          )}
        </div>
      </div>

      {/* Plan de Vuelo (Paso a Paso con Bloqueo) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
        <h3 className="text-lg font-bold text-white mb-8 uppercase tracking-widest text-center">Plan de Vuelo</h3>
        <div className={`grid gap-4 ${gridColsClass}`}>
            {result.plan_de_vuelo.map((step, idx) => {
                const { title, body } = parseStepContent(step);
                const isLockedItem = !isPremiumUnlocked && idx > 0;
                return (
                    <div key={idx} className={`bg-slate-950 border p-4 rounded-xl flex flex-col items-center text-center transition-all ${isLockedItem ? 'border-slate-800 opacity-40 blur-sm' : 'border-slate-600'}`}>
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-cyan-400 border border-slate-600 flex items-center justify-center font-bold mb-3">
                            {isLockedItem ? <Lock size={14}/> : idx + 1}
                        </div>
                        <h4 className="font-bold text-xs text-cyan-300 mb-1">{isLockedItem ? 'Reservado' : title}</h4>
                        <p className="text-[11px] text-slate-400">{isLockedItem ? 'Nivel de acceso insuficiente.' : body}</p>
                    </div>
                );
            })}
        </div>

        {!isPremiumUnlocked && (
            <div className="absolute inset-0 z-30 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent flex flex-col items-center justify-center pt-10 px-6">
                <button 
                    onClick={handleUnlockClick}
                    disabled={unlocking}
                    className="px-8 py-4 bg-white text-slate-950 hover:bg-cyan-50 text-sm md:text-base font-bold rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-3 hover:scale-105 transition-transform"
                >
                    {unlocking ? <Loader2 className="animate-spin" size={20} /> : <Unlock size={20} />}
                    DESBLOQUEAR REPORTE COMPLETO
                </button>
                <button onClick={handleManualVerification} disabled={verifyingPayment} className="mt-4 text-xs text-cyan-400 flex items-center gap-1 hover:underline">
                    {verifyingPayment ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12} />}
                    ¿Ya pagaste? Verificar ahora
                </button>
            </div>
        )}
      </div>

      {/* Botones de Acción Final */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <button onClick={onReset} className="text-slate-400 hover:text-white transition-all text-sm">Iniciar Nueva Misión</button>
        {isPremiumUnlocked && (
            <button onClick={handleSendEmail} disabled={emailStatus === 'sending' || emailStatus === 'sent'} className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {emailStatus === 'sending' ? <Loader2 className="animate-spin" size={18}/> : emailStatus === 'sent' ? <CheckCircle size={18}/> : <Mail size={18}/>}
                {emailStatus === 'sent' ? 'Enviado' : 'Enviar a mi Email'}
            </button>
        )}
      </div>
    </div>
  );
};