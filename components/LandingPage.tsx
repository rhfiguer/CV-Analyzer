import React from 'react';
import { Rocket, Sparkles, ChevronRight, CheckCircle2, ShieldCheck, Cpu, Zap, PlayCircle } from 'lucide-react';

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

      {/* RIGHT COLUMN: Visual Mockup (Browser Window) */}
      {/* UX IMPROVEMENT: Added onClick handler and cursor-pointer to make the mockup interactive */}
      <div 
        onClick={onStart}
        className="relative hidden lg:block perspective-1000 group cursor-pointer"
        title="Clic para iniciar la aplicación"
      >
        {/* Glow behind */}
        <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] rounded-full opacity-50 group-hover:bg-cyan-500/30 transition-all duration-500"></div>
        
        {/* Browser Window Mockup */}
        <div className="relative bg-slate-950/80 backdrop-blur-xl border border-slate-700 group-hover:border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden transform rotate-y-[-5deg] rotate-x-[5deg] group-hover:rotate-0 group-hover:scale-[1.02] transition-all duration-500 ease-out">
          
          {/* Interactive Overlay Hint */}
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all">
             <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-cyan-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-cyan-500/50 flex items-center gap-2">
                <PlayCircle size={20} />
                ACCEDER AL SISTEMA
             </div>
          </div>

          {/* Browser Header */}
          <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <div className="bg-slate-800 rounded-md px-3 py-1 text-[10px] text-slate-500 font-mono flex-grow text-center group-hover:text-cyan-400 transition-colors">
              cosmic-cv-analyzer.app // v.2.0
            </div>
          </div>

          {/* Window Body (Mock UI) */}
          <div className="p-8 space-y-6 opacity-90 select-none pointer-events-none">
             <div className="text-center space-y-2 mb-8">
                <div className="h-2 w-24 bg-cyan-900/50 rounded-full mx-auto"></div>
                <h2 className="text-2xl font-bold text-white">Identificación del Piloto</h2>
                <div className="h-2 w-64 bg-slate-800 rounded-full mx-auto"></div>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <div className="h-3 w-20 bg-slate-700 rounded mx-1"></div>
                   <div className="h-12 w-full bg-slate-900 border border-slate-700 rounded-xl flex items-center px-4 group-hover:border-slate-600 transition-colors">
                      <span className="text-slate-600 group-hover:text-slate-500">Carlos...</span>
                      <span className="ml-auto w-0.5 h-5 bg-cyan-500 animate-pulse opacity-0 group-hover:opacity-100"></span>
                   </div>
                </div>
                <div className="space-y-2">
                   <div className="h-3 w-32 bg-slate-700 rounded mx-1"></div>
                   <div className="h-12 w-full bg-slate-900 border border-slate-700 rounded-xl group-hover:border-slate-600 transition-colors"></div>
                </div>
                <div className="pt-4 flex justify-end">
                   <div className="h-10 w-32 bg-slate-800 rounded-xl group-hover:bg-cyan-900/30 transition-colors"></div>
                </div>
             </div>
          </div>

          {/* Floating Element */}
          <div className="absolute bottom-6 left-6 bg-slate-800/90 backdrop-blur border border-slate-600 p-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce">
             <div className="bg-green-500/20 p-2 rounded-full text-green-400">
                <CheckCircle2 size={16} />
             </div>
             <div>
                <p className="text-xs text-white font-bold">Sistema Online</p>
                <p className="text-[10px] text-slate-400">Listo para analizar</p>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};