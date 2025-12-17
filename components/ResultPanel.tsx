import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, AlertTriangle, Navigation, Star, Mail, Download, CheckCircle, AlertCircle, Radio, Lock, Unlock, Loader2, ArrowRight, Fingerprint } from 'lucide-react';
import { generateMissionReport } from '../services/pdfService';
import { sendEmailReport } from '../services/emailService';
import { MISSIONS } from '../constants';
import { supabase } from '../services/supabase';
import { LoginModal } from './LoginModal';

// ------------------------------------------------------------------
// CONFIGURACIÓN DE PAGO (LEMON SQUEEZY)
// Reemplaza esta URL con la URL "Buy" de tu variante en Lemon Squeezy
// ------------------------------------------------------------------
const LEMON_SQUEEZY_CHECKOUT_URL = "https://somosmaas.lemonsqueezy.com/buy/9a84d545-268d-42da-b7b8-9b77bd47cf43"; 
// ^^^ EJEMPLO: Reemplazar con ID Real

interface ResultPanelProps {
  result: AnalysisResult;
  onReset: () => void;
  userName?: string; 
  userEmail?: string;
  missionId?: string;
}

// Helper para procesar el formato de texto de los pasos
const parseStepContent = (text: string) => {
  const mdMatch = text.match(/\*\*(.*?)\*\*:?\s*(.*)/s);
  if (mdMatch) {
    return { title: mdMatch[1], body: mdMatch[2] };
  }
  const colonIndex = text.indexOf(':');
  if (colonIndex > 0 && colonIndex < 60) {
    return { 
      title: text.substring(0, colonIndex).trim(), 
      body: text.substring(colonIndex + 1).trim() 
    };
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
  
  // Auth & Premium State
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false); // Loading state for unlock button
  const [session, setSession] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // AUTO-REDIRECT STATE
  const [showRedirectModal, setShowRedirectModal] = useState(false);

  // 1. Efecto para detectar sesión y cambios de Auth
  useEffect(() => {
    if (!supabase) return; // Modo Demo

    // Obtener sesión inicial (Check silencioso al cargar página)
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) checkPremiumStatus(session);
    });

    // Suscribirse a cambios (Login exitoso desde Magic Link, Logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      setSession(session);
      
      // LOGIC: Auto-Redirect Flow
      // Si detectamos un inicio de sesión explícito (SIGNED_IN)
      if (event === 'SIGNED_IN' && session) {
          console.log(">> AUTH EVENT: Usuario autenticado. Verificando estado...");
          
          // Cerramos modal de login si estaba abierto
          setIsLoginModalOpen(false);

          // Verificamos si YA pagó
          const isAlreadyPremium = await checkPremiumStatus(session);
          
          // SI NO es premium, asumimos que acaba de loguearse para pagar -> AUTO REDIRECT
          if (!isAlreadyPremium) {
              console.log(">> PAGO PENDIENTE: Iniciando secuencia de auto-redirección...");
              triggerAutoRedirect(session.user.email);
          }
      } else {
          // Para otros eventos (refresh token, etc), solo chequeamos status
          if (session) checkPremiumStatus(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper para verificar si el usuario ya es premium (desde DB Profile)
  // Modificado para retornar boolean para uso inmediato
  const checkPremiumStatus = async (currentSession: any): Promise<boolean> => {
    if (currentSession?.user) {
        // Consultar perfil para ver si ya pagó
        const { data, error } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', currentSession.user.id)
            .single();
        
        if (data && data.is_premium) {
            setIsPremiumUnlocked(true);
            return true;
        }
    }
    return false;
  };

  const triggerAutoRedirect = (email: string) => {
      setShowRedirectModal(true);
      // Esperar 3 segundos para que el usuario lea el mensaje y luego ir al checkout
      setTimeout(() => {
          proceedToCheckout(email);
      }, 3000);
  };

  // 2. Lógica del Botón Desbloquear
  const handleUnlockClick = () => {
    setUnlocking(true);

    // CASO A: No hay sesión (o Modo Demo sin Supabase)
    if (!session) {
        if (!supabase) {
            // Fallback para modo demo local sin backend
            console.warn("Modo Demo: Simulando desbloqueo...");
            setTimeout(() => {
                setIsPremiumUnlocked(true);
                setUnlocking(false);
            }, 1500);
            return;
        }
        
        // Abrir Modal de Login
        setIsLoginModalOpen(true);
        setUnlocking(false);
        return;
    }

    // CASO B: Usuario Logueado -> Ir a Checkout
    proceedToCheckout(session.user.email);
  };

  const proceedToCheckout = (email?: string) => {
      // Usar email de sesión o el prop por defecto
      const targetEmail = email || session?.user?.email || userEmail;
      
      // Construir URL de Lemon Squeezy con email pre-rellenado
      const checkoutUrl = `${LEMON_SQUEEZY_CHECKOUT_URL}?checkout[email]=${encodeURIComponent(targetEmail)}`;
      
      console.log("Redirigiendo a pasarela de pago...", checkoutUrl);
      window.location.href = checkoutUrl;
  };

  // 3. Lógica de Envío de Email (Existente)
  const handleSendEmail = async () => {
    if (emailStatus === 'sending') return;
    
    setEmailStatus('sending');
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      console.log("Generating PDF...");
      const doc = generateMissionReport(result, userName, userEmail);
      const missionTitle = MISSIONS.find(m => m.id === missionId)?.title;
      
      console.log("Sending email request...");
      const emailPromise = sendEmailReport(doc, userEmail, userName, missionTitle);
      const timeoutPromise = new Promise<{ success: boolean, error: string, id?: string }>((_, reject) => 
        setTimeout(() => reject(new Error("Tiempo de espera agotado (Timeout)")), 20000)
      );

      const response = await Promise.race([emailPromise, timeoutPromise]);

      if (response.success) {
        setEmailStatus('sent');
        if (response.id) setTransmissionId(response.id);
      } else {
        throw new Error(response.error);
      }
      
    } catch (error: any) {
      console.error("Transmission failed, initiating manual override:", error);
      try {
        const doc = generateMissionReport(result, userName, userEmail);
        doc.save(`Mision_Cosmica_${userName.replace(/\s+/g, '_')}.pdf`);
      } catch (pdfError) {
        console.error("Local save failed too:", pdfError);
      }
      setEmailStatus('error'); 
    }
  };

  // SMART GRID LOGIC
  const stepCount = result.plan_de_vuelo.length;
  let gridColsClass = "";
  let showLine = true;

  if (stepCount === 6) {
    gridColsClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    showLine = false; 
  } else if (stepCount === 5) {
    gridColsClass = "grid-cols-1 md:grid-cols-3 lg:grid-cols-5";
    showLine = true;
  } else if (stepCount === 4) {
    gridColsClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    showLine = true;
  } else if (stepCount === 3) {
    gridColsClass = "grid-cols-1 md:grid-cols-3";
    showLine = true;
  } else if (stepCount === 2) {
    gridColsClass = "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto";
    showLine = true;
  } else {
    gridColsClass = "grid-cols-1 md:grid-cols-3 lg:grid-cols-4";
    showLine = false;
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Login Modal Integration */}
      <LoginModal 
         isOpen={isLoginModalOpen} 
         onClose={() => setIsLoginModalOpen(false)}
         onSuccess={() => {}} // Manejado por onAuthStateChange
         prefilledEmail={userEmail} // Usamos el email del form inicial
      />

      {/* --- AUTO-REDIRECT MODAL (NEW) --- */}
      {showRedirectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
           
           <div className="relative bg-slate-900 border border-cyan-500/50 rounded-2xl p-8 max-w-md w-full shadow-[0_0_60px_rgba(6,182,212,0.2)] text-center animate-[fadeIn_0.5s_ease-out]">
              
              <div className="flex justify-center mb-6 relative">
                 <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                 <Fingerprint size={64} className="text-cyan-400 relative z-10" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Identidad Confirmada</h2>
              <p className="text-slate-400 mb-6">
                Bienvenido de vuelta, Comandante. Estableciendo enlace seguro con la plataforma de pago...
              </p>

              <div className="w-full bg-slate-800 h-1.5 rounded-full mb-6 overflow-hidden">
                 <div className="h-full bg-cyan-400 animate-[progress_3s_ease-in-out_forwards] w-full origin-left"></div>
              </div>

              <button 
                onClick={() => proceedToCheckout()}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                 Ir al Pago Ahora <ArrowRight size={18} />
              </button>
           </div>
        </div>
      )}

      {/* Header Stats - SIEMPRE VISIBLE (GANCHO) */}
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
            <h2 className={`text-3xl font-bold ${result.probabilidad_exito > 70 ? 'text-green-400' : result.probabilidad_exito > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {result.probabilidad_exito}%
            </h2>
          </div>
          <div className="h-10 w-10 rounded-full border-4 border-slate-700 flex items-center justify-center relative">
             <div className="absolute inset-0 rounded-full border-4 border-cyan-500 opacity-25"></div>
          </div>
        </div>
      </div>

      {/* Main Analysis - SIEMPRE VISIBLE */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-purple-500">
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
           <Navigation size={20} className="text-purple-400"/> Análisis de Trayectoria
        </h3>
        <p className="text-slate-300 leading-relaxed">
          {result.analisis_mision}
        </p>
      </div>

      {/* Grid: Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Puntos Fuertes - PARCIALMENTE VISIBLE (TEASER) */}
        <div className="relative bg-slate-900/40 rounded-xl p-5 border border-green-900/50 overflow-hidden group">
          <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2 relative z-10">
            <ShieldCheck size={18} /> Propulsores Activos
          </h4>
          <ul className="space-y-2 relative z-0">
            {result.puntos_fuertes.map((point, idx) => {
               // Lógica de bloqueo: Si no es premium, solo mostramos los 2 primeros
               const isLocked = !isPremiumUnlocked && idx >= 2;

               return (
                  <li key={idx} className={`flex items-start gap-2 text-sm transition-all duration-500 ${isLocked ? 'blur-sm select-none opacity-40 grayscale' : 'text-slate-300'}`}>
                    <span className={`${isLocked ? 'text-slate-600' : 'text-green-500'} mt-1`}>
                       {isLocked ? <Lock size={14}/> : '✓'}
                    </span>
                    {/* Si está bloqueado, ponemos texto placeholder para que el blur se vea realista pero no revele info */}
                    {isLocked ? "Análisis de competencia estratégica encriptado." : point}
                  </li>
               );
            })}
          </ul>

          {/* OVERLAY DE BLOQUEO (STRENGTHS) - Solo si hay items ocultos */}
          {!isPremiumUnlocked && result.puntos_fuertes.length > 2 && (
             <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-end justify-center pb-6 z-20">
                 <div className="bg-green-950/90 border border-green-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    <Lock size={12} className="text-green-400" />
                    <span className="text-[10px] text-green-300 font-bold tracking-wide uppercase">
                       +{result.puntos_fuertes.length - 2} Propulsores Clasificados
                    </span>
                 </div>
             </div>
          )}
        </div>

        {/* Brechas Críticas - TOTALMENTE BLOQUEADO SI ES FREE */}
        <div className="relative bg-slate-900/40 rounded-xl p-5 border border-red-900/50 overflow-hidden group">
          
          <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2 relative z-10">
            <AlertTriangle size={18} /> Fugas en el Casco
          </h4>
          
          <div className={`space-y-2 relative z-0 ${!isPremiumUnlocked ? 'blur-sm select-none opacity-50 transition-all duration-700' : ''}`}>
            {result.brechas_criticas.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                <span className="text-red-500 mt-1">⚠</span> {point}
              </li>
            ))}
          </div>

          {/* OVERLAY DE BLOQUEO (WEAKNESSES) */}
          {!isPremiumUnlocked && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
                <div className="bg-red-950/80 border border-red-500/50 p-3 rounded-lg flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <Lock size={20} className="text-red-500 animate-pulse" />
                    <div className="text-left">
                        <p className="text-red-400 text-xs font-bold tracking-widest uppercase">DATOS CLASIFICADOS</p>
                        <p className="text-[10px] text-red-300/70">Requiere autorización de nivel superior</p>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Flight Plan - PASIALMENTE BLOQUEADO */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
        <h3 className="text-lg font-bold text-white mb-8 uppercase tracking-widest text-center relative z-10">Plan de Vuelo Sugerido</h3>
        
        <div className="relative">
             
             {showLine && (
                <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-slate-700/50 -z-0"></div>
             )}

            <div className={`grid gap-4 relative z-10 ${gridColsClass}`}>
                {result.plan_de_vuelo.map((step, idx) => {
                    const { title, body } = parseStepContent(step);
                    // Si no es premium, solo mostramos el primer paso claramente
                    const isLockedItem = !isPremiumUnlocked && idx > 0;

                    return (
                        <div key={idx} className={`
                            bg-slate-950 border p-4 rounded-xl flex flex-col items-center transition-all duration-300 h-full shadow-lg relative overflow-hidden
                            ${isLockedItem 
                                ? 'border-slate-800 opacity-60 blur-[3px] select-none scale-95 grayscale' 
                                : 'border-slate-600 hover:border-cyan-400 hover:-translate-y-1 group'}
                        `}>
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold mb-3 border-2 transition-colors z-20 shrink-0
                                ${isLockedItem 
                                    ? 'bg-slate-900 text-slate-600 border-slate-700' 
                                    : 'bg-slate-900 text-cyan-400 border-slate-600 group-hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]'}
                            `}>
                                {isLockedItem ? <Lock size={14}/> : idx + 1}
                            </div>
                            
                            <div className="flex flex-col gap-2 w-full">
                                {title && (
                                    <h4 className={`font-bold text-xs sm:text-sm text-center leading-tight ${isLockedItem ? 'text-slate-500' : 'text-cyan-300'}`}>
                                        {title}
                                    </h4>
                                )}
                                <p className={`text-xs leading-relaxed ${title ? 'text-left' : 'text-center'} ${isLockedItem ? 'text-slate-600' : 'text-slate-300'}`}>
                                    {isLockedItem ? 'Contenido táctico encriptado para su seguridad.' : body}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* OVERLAY DE BLOQUEO (FLIGHT PLAN) */}
            {!isPremiumUnlocked && (
                <div className="absolute inset-x-0 bottom-0 top-1/3 z-30 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent flex flex-col items-center justify-center pt-10">
                    <button 
                        onClick={handleUnlockClick}
                        disabled={unlocking}
                        className="group relative px-8 py-4 bg-white text-slate-950 font-bold rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-white to-cyan-400 opacity-20 group-hover:animate-pulse"></div>
                        {unlocking ? (
                             <>
                                <Loader2 className="animate-spin text-slate-950" size={20} />
                                VERIFICANDO CREDENCIALES...
                             </>
                        ) : (
                             <>
                                <Unlock size={20} className="text-cyan-600" />
                                DESBLOQUEAR REPORTE COMPLETO
                             </>
                        )}
                    </button>
                    <p className="text-slate-400 text-xs mt-3 flex items-center gap-1">
                        <Star size={12} className="text-yellow-500" />
                        Acceso Premium Instantáneo
                    </p>
                </div>
            )}
        </div>
      </div>

      {/* Action Buttons - SOLO VISIBLES SI ESTÁ DESBLOQUEADO O PARA RESETEAR */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 pt-6">
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-full text-slate-400 hover:text-white transition-all font-medium text-sm hover:underline"
        >
          Iniciar Nueva Misión
        </button>

        {isPremiumUnlocked && (
            <button
            onClick={handleSendEmail}
            disabled={emailStatus === 'sending' || emailStatus === 'sent'}
            className={`
                relative overflow-hidden group px-8 py-3 rounded-full font-bold transition-all border animate-[fadeIn_0.5s_ease-out]
                ${emailStatus === 'sent' 
                ? 'bg-green-500/10 border-green-500/50 text-green-400 cursor-default' 
                : emailStatus === 'error'
                ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30'
                : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                }
            `}
            >
            <div className="flex items-center gap-2">
                {emailStatus === 'idle' && (
                <>
                    <Mail size={18} /> Enviar Copia a la Base
                </>
                )}
                {emailStatus === 'sending' && (
                <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Transmitiendo...
                </>
                )}
                {emailStatus === 'sent' && (
                <>
                    <CheckCircle size={18} /> Transmisión Completada
                </>
                )}
                {emailStatus === 'error' && (
                <>
                    <Download size={18} /> Descarga Manual (Error)
                </>
                )}
            </div>
            </button>
        )}
      </div>
      
      {/* SUCCESS & SPAM WARNING PANEL */}
      {emailStatus === 'sent' && isPremiumUnlocked && (
        <div className="mt-6 bg-slate-900/80 border border-green-500/30 rounded-xl p-5 animate-[fadeIn_0.5s_ease-out] shadow-lg">
            
            {/* Header: Success */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-full text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                        <Radio size={24} className="animate-pulse"/>
                    </div>
                    <div>
                        <h4 className="text-green-400 font-bold text-lg leading-none">Señal Recibida</h4>
                        <p className="text-slate-400 text-xs mt-1">Paquete entregado a: {userEmail}</p>
                    </div>
                </div>
                {transmissionId && (
                    <div className="bg-black/40 rounded px-3 py-1 font-mono text-[10px] text-slate-500 border border-slate-700 tracking-wider">
                        ID: {transmissionId.slice(0, 18)}...
                    </div>
                )}
            </div>

            {/* Warning: Spam */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-4">
                <div className="bg-amber-500/20 p-2 rounded-full shrink-0">
                    <AlertTriangle className="text-amber-400" size={20} />
                </div>
                <div>
                    <p className="text-amber-200 font-bold text-sm uppercase tracking-wide mb-1">
                        Protocolo de Búsqueda
                    </p>
                    <p className="text-amber-100/80 text-sm leading-relaxed">
                        Si no visualiza el reporte en su bandeja principal en los próximos 60 segundos, 
                        es <strong>imperativo</strong> verificar su carpeta de <strong className="text-white bg-amber-600/50 px-1 rounded">SPAM / CORREO NO DESEADO</strong>. 
                        Los filtros de seguridad terrestres a menudo interceptan nuestras transmisiones.
                    </p>
                </div>
            </div>
        </div>
      )}

      {emailStatus === 'error' && (
        <div className="flex items-center justify-center gap-2 mt-4 animate-pulse bg-red-900/20 p-3 rounded-lg border border-red-900/50">
            <AlertCircle size={16} className="text-red-400"/>
            <p className="text-center text-sm text-red-300">
                Error en la red subespacial. El reporte se ha descargado a tu dispositivo localmente.
            </p>
        </div>
      )}
    </div>
  );
};