import React from 'react';
import { Rocket, Sparkles, ChevronRight, CheckCircle2, ShieldCheck, Cpu, Zap, PlayCircle, FileText } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[80vh] animate-[fadeIn_0.8s_ease-out]">
      
      {/* LEFT COLUMN: Copywriting & CTA */}
      <div className="space-y-8 text-center lg:text-left pt-10 lg:pt-0">
        
        {/* Badge actualizado: Referencia de Color */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-500/50 text-cyan-300 text-xs font-bold tracking-widest uppercase mb-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <Sparkles size={14} className="text-cyan-400" /> Tecnología de Calibración Personal
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-white tracking-tight">
          Capitaliza tu potencial como <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">Migrante de Alta Ambición.</span>
        </h1>

        <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
          La primera herramienta diseñada para decodificar tu trayectoria y alinearla con estándares globales.
          Desbloquea el poder de la IA para auditar tu CV, detectar brechas críticas y proyectar tu carrera hacia una nueva órbita.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
          <button
            onClick={onStart}
            className="group relative px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all transform hover:scale-105 hover:-translate-y-1 active:scale-95 flex items-center gap-3"
          >
            <Rocket className="group-hover:animate-pulse" />
            INICIAR ANÁLISIS GRATUITO
          </button>
          <span className="text-slate-500 text-sm font-medium flex items-center gap-1">
             <Zap size={16} className="text-yellow-500" /> Diagnóstico Inicial Gratuito
          </span>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800 pt-8 mt-4">
          <div className="flex flex-col gap-2">
             <Cpu className="text-cyan-500 mb-1" size={24}/>
             <h3 className="font-bold text-slate-200">Motor de Inferencia IA</h3>
             <p className="text-xs text-slate-500">Tecnología neuronal avanzada que entiende el contexto, no solo palabras clave.</p>
          </div>
          <div className="flex flex-col gap-2">
             <Sparkles className="text-purple-500 mb-1" size={24}/>
             <h3 className="font-bold text-slate-200">Rango & Feedback</h3>
             <p className="text-xs text-slate-500">Recibe un rango militar y feedback táctico inmediato.</p>
          </div>
          <div className="flex flex-col gap-2">
             <CheckCircle2 className="text-green-500 mb-1" size={24}/>
             <h3 className="font-bold text-slate-200">Plan de Vuelo</h3>
             <p className="text-xs text-slate-500">Pasos concretos para elevar tu empleabilidad.</p>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Interactive CV-Rocket Visual */}
      <div 
        onClick={onStart}
        className="relative hidden lg:flex items-center justify-center h-full min-h-[400px] cursor-pointer group perspective-1000"
        title="Clic para despegar"
      >
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-green-500/10 blur-[80px] rounded-full opacity-40 group-hover:opacity-70 transition-all duration-700"></div>

        {/* The Composition */}
        <div className="relative transform transition-all duration-500 group-hover:scale-105 group-hover:-translate-y-6 group-hover:rotate-1">
             
             {/* Propulsion Flames (Behind) */}
             <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-24 h-40 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                <div className="w-4 h-full bg-green-400 blur-lg animate-pulse"></div>
                <div className="absolute top-0 w-12 h-24 bg-green-300 blur-md rounded-full opacity-80"></div>
                <div className="absolute top-0 w-8 h-16 bg-white blur-sm rounded-full"></div>
             </div>

             {/* Rocket Fins (Left) */}
             <div className="absolute bottom-8 -left-6 w-12 h-20 bg-slate-900 border-2 border-green-500/50 rounded-l-full origin-right transform -skew-y-12 group-hover:bg-green-900/20 transition-colors"></div>
             {/* Rocket Fins (Right) */}
             <div className="absolute bottom-8 -right-6 w-12 h-20 bg-slate-900 border-2 border-green-500/50 rounded-r-full origin-left transform skew-y-12 group-hover:bg-green-900/20 transition-colors"></div>

             {/* The CV Body (Main Hull) */}
             <div className="relative w-56 h-72 bg-slate-950 border-2 border-green-500 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.15)] group-hover:shadow-[0_0_50px_rgba(34,197,94,0.4)] transition-shadow flex flex-col items-center p-6 overflow-hidden z-10 backdrop-blur-md">
                 
                 {/* Internal Structure (Header) */}
                 <div className="w-16 h-16 rounded-full border-2 border-green-500/30 flex items-center justify-center mb-6 bg-green-500/5">
                    <FileText size={32} className="text-green-400" />
                 </div>

                 {/* Internal Structure (Lines) */}
                 <div className="w-full space-y-3 opacity-80">
                    <div className="h-2.5 bg-green-500/60 rounded-full w-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                    <div className="h-2 bg-green-500/30 rounded-full w-3/4"></div>
                    <div className="h-2 bg-green-500/30 rounded-full w-5/6"></div>
                    <div className="h-2 bg-green-500/20 rounded-full w-full"></div>
                    <div className="h-2 bg-green-500/10 rounded-full w-2/3 mt-4"></div>
                 </div>

                 {/* Holographic Scan Line */}
                 <div className="absolute top-0 left-0 w-full h-1 bg-green-400 shadow-[0_0_10px_#4ade80] opacity-50 animate-[scan_3s_linear_infinite]"></div>
                 
                 {/* Status Text */}
                 <div className="mt-auto pt-4">
                    <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-green-900/30 border border-green-500/30">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                       <span className="text-[10px] text-green-300 font-mono tracking-widest">SYSTEM READY</span>
                    </div>
                 </div>
             </div>
        </div>

        {/* Floating CTA Hint */}
        <div className="absolute bottom-10 animate-bounce transition-opacity duration-300">
           <div className="flex flex-col items-center gap-2 group-hover:opacity-100 opacity-50">
              <span className="text-green-400/80 text-xs font-bold tracking-[0.2em] uppercase">Click para Despegar</span>
              <ChevronRight className="rotate-90 text-green-500" size={20} />
           </div>
        </div>

      </div>

    </div>
  );
};