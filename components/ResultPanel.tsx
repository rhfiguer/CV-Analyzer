import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, AlertTriangle, Navigation, Star, Mail, Download, CheckCircle, AlertCircle, Radio } from 'lucide-react';
import { generateMissionReport } from '../services/pdfService';
import { sendEmailReport } from '../services/emailService';
import { MISSIONS } from '../constants';

interface ResultPanelProps {
  result: AnalysisResult;
  onReset: () => void;
  userName?: string; 
  userEmail?: string;
  missionId?: string;
}

// Helper para procesar el formato de texto de los pasos (ej: "**Título**: Descripción")
const parseStepContent = (text: string) => {
  // 1. Intentar detectar formato Markdown Bold: **Título**: Descripción
  const mdMatch = text.match(/\*\*(.*?)\*\*:?\s*(.*)/s);
  if (mdMatch) {
    return { title: mdMatch[1], body: mdMatch[2] };
  }

  // 2. Intentar detectar formato con dos puntos: Título: Descripción
  // Limitamos la búsqueda del dos puntos a los primeros 60 caracteres para evitar falsos positivos en oraciones largas
  const colonIndex = text.indexOf(':');
  if (colonIndex > 0 && colonIndex < 60) {
    return { 
      title: text.substring(0, colonIndex).trim(), 
      body: text.substring(colonIndex + 1).trim() 
    };
  }

  // 3. Fallback: Devolver todo como cuerpo si no hay estructura clara
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

  const handleSendEmail = async () => {
    if (emailStatus === 'sending') return;
    
    setEmailStatus('sending');
    
    // 1. Give UI a moment to update state before heavy processing (PDF generation)
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // 2. Generate PDF
      console.log("Generating PDF...");
      const doc = generateMissionReport(result, userName, userEmail);
      const missionTitle = MISSIONS.find(m => m.id === missionId)?.title;
      
      console.log("Sending email request...");
      
      // 3. Send to Backend API with a race condition for safety
      // If the API call takes longer than 20 seconds, we treat it as a failure to unblock the UI
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
      
      // 4. Fallback: Download locally immediately if API fails
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
  // Calculamos la mejor distribución basada en la cantidad de items para evitar huérfanos
  const stepCount = result.plan_de_vuelo.length;
  
  let gridColsClass = "";
  let showLine = true;

  if (stepCount === 6) {
    // 6 items: 3 columnas (2 filas perfectas de 3)
    // Ocultamos la línea porque en 2 filas se ve extraña cortando solo la primera
    gridColsClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    showLine = false; 
  } else if (stepCount === 5) {
    // 5 items: Estándar de 5 columnas
    gridColsClass = "grid-cols-1 md:grid-cols-3 lg:grid-cols-5";
    showLine = true;
  } else if (stepCount === 4) {
    // 4 items: 4 columnas
    gridColsClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    showLine = true;
  } else if (stepCount === 3) {
    // 3 items: 3 columnas
    gridColsClass = "grid-cols-1 md:grid-cols-3";
    showLine = true;
  } else if (stepCount === 2) {
    // 2 items: 2 columnas centradas
    gridColsClass = "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto";
    showLine = true;
  } else {
    // Fallback (> 6 o 1): Grid generica
    gridColsClass = "grid-cols-1 md:grid-cols-3 lg:grid-cols-4";
    showLine = false;
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Header Stats */}
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

      {/* Main Analysis */}
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
        <div className="bg-slate-900/40 rounded-xl p-5 border border-green-900/50">
          <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2">
            <ShieldCheck size={18} /> Propulsores Activos
          </h4>
          <ul className="space-y-2">
            {result.puntos_fuertes.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                <span className="text-green-500 mt-1">✓</span> {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900/40 rounded-xl p-5 border border-red-900/50">
          <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} /> Fugas en el Casco
          </h4>
          <ul className="space-y-2">
            {result.brechas_criticas.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                <span className="text-red-500 mt-1">⚠</span> {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Flight Plan */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
        <h3 className="text-lg font-bold text-white mb-8 uppercase tracking-widest text-center relative z-10">Plan de Vuelo Sugerido</h3>
        
        {/* Container relativo para posicionar la línea y el grid */}
        <div className="relative">
             
             {/* Connecting Line (Only visible on MD+ and if showLine is true) */}
             {showLine && (
                <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-slate-700/50 -z-0"></div>
             )}

             {/* Smart Grid Distribution */}
            <div className={`grid gap-4 relative z-10 ${gridColsClass}`}>
                {result.plan_de_vuelo.map((step, idx) => {
                    const { title, body } = parseStepContent(step);
                    return (
                        <div key={idx} className="bg-slate-950 border border-slate-600 p-4 rounded-xl flex flex-col items-center hover:border-cyan-400 transition-all hover:-translate-y-1 duration-300 h-full shadow-lg group">
                            {/* Circle Indicator */}
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-cyan-400 flex items-center justify-center font-bold mb-3 border-2 border-slate-600 group-hover:border-cyan-400 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.1)] z-20 shrink-0">
                                {idx + 1}
                            </div>
                            
                            {/* Content Container */}
                            <div className="flex flex-col gap-2 w-full">
                                {title && (
                                    <h4 className="text-cyan-300 font-bold text-xs sm:text-sm text-center leading-tight">
                                        {title}
                                    </h4>
                                )}
                                <p className={`text-xs text-slate-300 leading-relaxed ${title ? 'text-left' : 'text-center'}`}>
                                    {body}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 pt-6">
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-full text-slate-400 hover:text-white transition-all font-medium text-sm hover:underline"
        >
          Iniciar Nueva Misión
        </button>

        <button
          onClick={handleSendEmail}
          disabled={emailStatus === 'sending' || emailStatus === 'sent'}
          className={`
            relative overflow-hidden group px-8 py-3 rounded-full font-bold transition-all border
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
                <Mail size={18} /> Enviar Reporte a la Base
              </>
            )}
            {emailStatus === 'sending' && (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Transmitiendo Datos...
              </>
            )}
            {emailStatus === 'sent' && (
              <>
                <CheckCircle size={18} /> Transmisión Completada
              </>
            )}
            {emailStatus === 'error' && (
               <>
                <Download size={18} /> Descarga Manual (Error de Red)
               </>
            )}
          </div>
        </button>
      </div>
      
      {/* SUCCESS & SPAM WARNING PANEL */}
      {emailStatus === 'sent' && (
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