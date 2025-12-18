
import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, AlertTriangle, Navigation, Star, Mail, CheckCircle, Lock, Unlock, Loader2, RefreshCw } from 'lucide-react';
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
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  useEffect(() => {
    if (!supabase) return;

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) checkEntitlement(session);
    });

    // Suscripción a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session) {
          setIsLoginModalOpen(false);
          console.log("[ENTITLEMENT] Usuario identificado. Ejecutando verificación...");
          await checkEntitlement(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Lógica de Verificación (Self-Healing)
   * Consulta el Ledger y actualiza el perfil si encuentra un pago.
   */
  const checkEntitlement = async (currentSession: any): Promise<boolean> => {
    if (!currentSession?.user || !supabase) return false;
    const email = currentSession.user.email.toLowerCase().trim();

    console.log(`[ENTITLEMENT] Verificando acceso para: ${email}`);

    try {
        // 1. Check Perfil (Caché/Estado Local en DB)
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('is_premium, id')
            .eq('id', currentSession.user.id)
            .single();
        
        if (profile?.is_premium) {
            console.log("✅ [ENTITLEMENT] Usuario ya es Premium en tabla profiles.");
            setIsPremiumUnlocked(true);
            return true;
        }

        // 2. Check Ledger (La verdad absoluta: premium_purchases)
        console.log(`[ENTITLEMENT] Perfil estándar. Consultando Libro Mayor (premium_purchases) para ${email}...`);
        
        const { data: purchases, error: ledgerErr } = await supabase
            .from('premium_purchases')
            .select('email, lemon_order_id')
            .ilike('email', email); // Case-insensitive check

        if (purchases && purchases.length > 0) {
            console.log(`🚀 [SELF-HEALING] ¡Pago detectado en Ledger (ID: ${purchases[0].lemon_order_id})! Sincronizando perfil...`);
            
            // Reparación automática del perfil
            const { error: syncError } = await supabase
                .from('profiles')
                .update({ 
                    is_premium: true, 
                    status: 'active',
                    subscription_id: purchases[0].lemon_order_id
                })
                .eq('id', currentSession.user.id);
            
            if (syncError) {
                console.error("❌ [SELF-HEALING ERROR] Error al actualizar profile:", syncError.message);
            } else {
                console.log("✅ [SELF-HEALING SUCCESS] Perfil sincronizado. Acceso concedido.");
                setIsPremiumUnlocked(true);
                return true;
            }
        }

        console.log("[ENTITLEMENT] No se encontraron registros de pago asociados a este email.");
    } catch (e) {
        console.error("❌ [ENTITLEMENT CRITICAL] Error en la secuencia de verificación:", e);
    }
    return false;
  };

  const handleManualVerification = async () => {
      if (!session) {
          setIsLoginModalOpen(true);
          return;
      }
      setVerifyingPayment(true);
      const hasPremium = await checkEntitlement(session);
      
      // Latencia artificial para dar sensación de "escaneo de satélite"
      await new Promise(r => setTimeout(r, 1500));
      setVerifyingPayment(false);
      
      if (!hasPremium) {
          alert(`🛰️ Radar de Pago: No detectamos transacciones para ${session.user.email}.\n\nSi acabas de pagar, espera unos segundos a que Lemon Squeezy envíe la señal a nuestra base de datos e intenta de nuevo.`);
      }
  };

  const handleUnlockClick = () => {
    if (!session) {
        setIsLoginModalOpen(true);
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
      if (response.success) setEmailStatus('sent');
      else throw new Error(response.error);
    } catch (error: any) {
      setEmailStatus('error'); 
    }
  };

  const stepCount = result.plan_de_vuelo.length;
  let gridColsClass = stepCount >= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3";

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onSuccess={() => {}} prefilledEmail={userEmail} />

      {/* Rango y Probabilidad */}
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

      {/* Análisis Misión */}
      <div className="glass-panel p-7 rounded-2xl border-l-4 border-cyan-500 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Navigation size={120} />
        </div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
           <Navigation size={18} className="text-cyan-400"/> Análisis de Trayectoria
        </h3>
        <p className="text-slate-300 leading-relaxed relative z-10">{result.analisis_mision}</p>
      </div>

      {/* Fortalezas y Debilidades */}
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

      {/* Plan de Vuelo */}
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

      {/* Acciones Finales */}
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
