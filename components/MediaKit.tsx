import React from 'react';
import { FileText, Sparkles, X } from 'lucide-react';

interface MediaKitProps {
  onClose: () => void;
}

export const MediaKit: React.FC<MediaKitProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md overflow-y-auto">
      {/* Header */}
      <div className="fixed top-0 left-0 w-full bg-slate-900/80 border-b border-slate-700 p-4 flex justify-between items-center z-50">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
           <Sparkles className="text-cyan-400" /> Media Kit Generator
        </h2>
        <button 
           onClick={onClose} 
           className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
        >
           <X size={18} /> Cerrar
        </button>
      </div>

      <div className="p-8 pt-24 flex flex-col items-center gap-12">
        <p className="text-slate-400 max-w-2xl text-center">
          Estas son tus imágenes de marca generadas por código. <br/>
          <span className="text-cyan-400 font-bold">Haz una captura de pantalla (Screenshot)</span> de cada recuadro para usarlas.
        </p>

        {/* 1. SOCIAL SHARE IMAGE (1200x630) */}
        <div className="flex flex-col items-center gap-4">
           <div className="text-sm text-slate-500 uppercase tracking-widest font-bold">Social Share Image (1200 x 630)</div>
           
           {/* THE CANVAS */}
           <div 
             style={{ width: '1200px', height: '630px', transform: 'scale(0.65)', transformOrigin: 'top center' }}
             className="relative bg-slate-950 overflow-hidden flex items-center border border-slate-800 shadow-2xl shrink-0"
           >
              {/* Background FX */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(6,182,212,0.08),transparent_50%)]"></div>
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30"></div>
              
              <div className="grid grid-cols-2 w-full h-full relative z-10 px-20">
                  {/* Left: Text */}
                  <div className="flex flex-col justify-center gap-6">
                      <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-sm font-bold tracking-widest uppercase w-fit">
                        <Sparkles size={16} /> Tecnología de Calibración
                      </div>
                      
                      <h1 className="text-7xl font-extrabold text-white leading-tight">
                         Analizador <br/>
                         <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-cyan-500">Cósmico de CV</span>
                      </h1>
                      
                      <p className="text-2xl text-slate-400 font-light leading-relaxed max-w-lg">
                         Potencia tu carrera como migrante de alta ambición. Auditoría IA, rango militar y plan de vuelo.
                      </p>

                      <div className="mt-4 flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                         <span className="text-slate-300 font-mono">cv.somosmaas.org</span>
                      </div>
                  </div>

                  {/* Right: The Giant Rocket */}
                  <div className="flex items-center justify-center relative">
                      <div className="relative transform rotate-6 scale-125">
                          {/* Glow */}
                          <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] rounded-full"></div>
                          
                          {/* Rocket Hull */}
                          <div className="relative w-64 h-80 bg-slate-950 border-4 border-cyan-500 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.3)] flex flex-col items-center p-8 overflow-hidden z-20">
                              <div className="w-24 h-24 rounded-full border-4 border-cyan-500/30 flex items-center justify-center mb-8 bg-cyan-500/5">
                                <FileText size={48} className="text-cyan-400" />
                              </div>
                              <div className="w-full space-y-4 opacity-80">
                                <div className="h-3 bg-cyan-500/60 rounded-full w-full"></div>
                                <div className="h-3 bg-cyan-500/30 rounded-full w-3/4"></div>
                                <div className="h-3 bg-cyan-500/30 rounded-full w-5/6"></div>
                              </div>
                              <div className="absolute top-0 left-0 w-full h-2 bg-cyan-400 opacity-50"></div>
                          </div>

                          {/* Fins */}
                          <div className="absolute bottom-10 -left-10 w-20 h-32 bg-slate-900 border-4 border-cyan-500/50 rounded-l-3xl transform -skew-y-12 z-10"></div>
                          <div className="absolute bottom-10 -right-10 w-20 h-32 bg-slate-900 border-4 border-cyan-500/50 rounded-r-3xl transform skew-y-12 z-10"></div>

                          {/* Flame */}
                          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-32 h-40 bg-cyan-400 blur-xl rounded-b-full opacity-80"></div>
                      </div>
                  </div>
              </div>
           </div>
        </div>

        {/* 2. APP ICON (512x512) */}
        <div className="flex flex-col items-center gap-4 pb-20">
           <div className="text-sm text-slate-500 uppercase tracking-widest font-bold">App Icon / Logo (512 x 512)</div>
           
           <div className="w-[512px] h-[512px] bg-slate-950 rounded-[40px] border border-slate-800 flex items-center justify-center relative overflow-hidden shadow-2xl">
              {/* Subtle Grid BG */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
              
              <div className="relative transform scale-[1.8] -translate-y-4">
                 {/* Rocket Simplified */}
                 <div className="relative w-40 h-56 bg-slate-950 border-[6px] border-cyan-500 rounded-2xl flex flex-col items-center p-5 z-20 shadow-[0_0_40px_rgba(6,182,212,0.4)]">
                      <div className="w-16 h-16 rounded-full border-[4px] border-cyan-500/30 flex items-center justify-center mb-6">
                        <div className="w-8 h-8 bg-cyan-500 rounded-full"></div>
                      </div>
                      <div className="w-full space-y-3">
                        <div className="h-2 bg-cyan-500/60 rounded-full w-full"></div>
                        <div className="h-2 bg-cyan-500/30 rounded-full w-3/4"></div>
                      </div>
                 </div>
                 {/* Fins */}
                 <div className="absolute bottom-6 -left-6 w-12 h-20 bg-slate-900 border-[6px] border-cyan-500 rounded-l-xl transform -skew-y-12 z-10"></div>
                 <div className="absolute bottom-6 -right-6 w-12 h-20 bg-slate-900 border-[6px] border-cyan-500 rounded-r-xl transform skew-y-12 z-10"></div>
                 {/* Flame */}
                 <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-20 h-24 bg-cyan-400 blur-lg rounded-b-full"></div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};