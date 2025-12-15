import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, AlertTriangle, Navigation, Star, Mail, Download, CheckCircle, AlertCircle } from 'lucide-react';
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

export const ResultPanel: React.FC<ResultPanelProps> = ({ 
  result, 
  onReset, 
  userName = "Comandante", 
  userEmail = "",
  missionId 
}) => {
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

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
      const timeoutPromise = new Promise<{ success: boolean, error: string }>((_, reject) => 
        setTimeout(() => reject(new Error("Tiempo de espera agotado (Timeout)")), 20000)
      );

      const response = await Promise.race([emailPromise, timeoutPromise]);

      if (response.success) {
        setEmailStatus('sent');
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
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-center">Plan de Vuelo Sugerido</h3>
        <div className="flex flex-col md:flex-row justify-between gap-4 relative">
            {/* Connecting Line (Desktop) */}
            {/* FIX: Posicionar top-8 (2rem/32px) para alinear con el centro de los círculos (padding 1rem + radio 1rem) */}
            <div className="hidden md:block absolute top-8 left-4 right-4 h-0.5 bg-slate-700/50 -z-0"></div>
            
            {result.plan_de_vuelo.map((step, idx) => (
                <div key={idx} className="relative z-10 flex-1 bg-slate-950 border border-slate-600 p-4 rounded-xl flex flex-col items-center text-center hover:border-cyan-400 transition-colors h-full shadow-lg">
                    {/* Circle Indicator */}
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-cyan-400 flex items-center justify-center font-bold mb-3 border-2 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                        {idx + 1}
                    </div>
                    <p className="text-sm text-slate-300 leading-snug">{step}</p>
                </div>
            ))}
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
              ? 'bg-green-500/20 border-green-500 text-green-400 cursor-default' 
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
      
      {emailStatus === 'sent' && (
        <p className="text-center text-xs text-slate-500 mt-2 animate-pulse">
          * Correo enviado con éxito a {userEmail}.
        </p>
      )}
      {emailStatus === 'error' && (
        <div className="flex items-center justify-center gap-2 mt-2 animate-pulse">
            <AlertCircle size={14} className="text-red-400"/>
            <p className="text-center text-xs text-red-400">
                La frecuencia de comunicación falló. El reporte se ha descargado a tu dispositivo.
            </p>
        </div>
      )}
    </div>
  );
};