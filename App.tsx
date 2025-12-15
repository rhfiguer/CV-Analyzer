import React, { useState, useRef, useEffect } from 'react';
import { MissionId, FormDataState, AnalysisResult } from './types';
import { MISSIONS } from './constants';
import { MissionCard } from './components/MissionCard';
import { ResultPanel } from './components/ResultPanel';
import { analyzeCV } from './services/geminiService';
import { saveLead } from './services/supabase';
import { UploadCloud, FileText, ChevronRight, AlertCircle, Sparkles, Rocket } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Consents - Now defaulted to TRUE
  const [privacyConsent, setPrivacyConsent] = useState<boolean>(true);
  
  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    email: '',
    mission: null,
    file: null,
    marketingConsent: true // Defaulted to TRUE
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // GDPR: Load data from LocalStorage only if it exists
  useEffect(() => {
    const savedData = localStorage.getItem('cosmic_pilot_credentials');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.name && parsed.email) {
          setFormData(prev => ({ 
            ...prev, 
            name: parsed.name, 
            email: parsed.email,
            // If user previously unchecked it, respect that decision. Otherwise default to true.
            marketingConsent: parsed.marketingConsent !== undefined ? parsed.marketingConsent : true
          }));
          // We assume privacy was accepted if they have saved data, but we keep the state controllable
          setPrivacyConsent(true);
        }
      } catch (e) {
        console.error("Error loading credentials", e);
      }
    }
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
  };

  const handleMarketingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, marketingConsent: e.target.checked }));
  };

  const handleMissionSelect = (id: MissionId) => {
    setFormData(prev => ({ ...prev, mission: id }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setError("Solo se permiten archivos PDF para el análisis de combustible.");
        return;
      }
      setFormData(prev => ({ ...prev, file: file }));
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
       const file = e.dataTransfer.files[0];
       if (file.type !== 'application/pdf') {
        setError("Solo se permiten archivos PDF.");
        return;
      }
      setFormData(prev => ({ ...prev, file: file }));
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.email || !formData.name) {
        setError("Identificación completa requerida para continuar.");
        return;
      }
      if (!privacyConsent) {
        setError("Debes aceptar el protocolo de privacidad (GDPR) para proceder.");
        return;
      }
      
      // 1. Save locally for UX
      localStorage.setItem('cosmic_pilot_credentials', JSON.stringify({
        name: formData.name,
        email: formData.email,
        marketingConsent: formData.marketingConsent
      }));

      // 2. Save remotely to DB (Marketing Lead)
      // Fire and forget - don't block the UI if DB is slow
      saveLead(formData.name, formData.email, formData.marketingConsent).catch(e => console.error("DB Error", e));
      
      if (formData.marketingConsent) {
        console.log(">> MARKETING SIGNAL: Subscribing commander to frequency", formData.email);
      }
    } else if (step === 2) {
       // Optional: Update lead with selected mission if desired
       saveLead(formData.name, formData.email, formData.marketingConsent, formData.mission).catch(e => console.error("DB Update Error", e));
    }
    
    setError(null);
    setStep(prev => prev + 1);
  };

  const startAnalysis = async () => {
    if (!formData.file || !formData.mission || !formData.email || !formData.name) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeCV(formData.file, formData.mission, formData.email, formData.name);
      setResult(data);
      setLoading(false);
      setStep(4); // Result step
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error crítico en los sistemas de navegación. Intente nuevamente.");
      setLoading(false);
    }
  };

  const resetMission = () => {
    setStep(1);
    setResult(null);
    // Keep name, email and marketing pref for UX
    setFormData(prev => ({ ...prev, mission: null, file: null }));
    // Reset privacy consent to force check on new analysis (good practice) or keep it true based on preference
    setPrivacyConsent(true); 
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-cyan-500/30">
      {/* Background Elements */}
      {/* Vignette effect: Transparent center to show canvas stars, darker edges for focus */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/40 to-black/90 pointer-events-none"></div>
      <div className="fixed inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      
      {/* Main Container */}
      <main className="container mx-auto px-4 py-8 md:py-16 relative z-10 min-h-screen flex flex-col items-center justify-center">
        
        {/* Header */}
        <header className="text-center mb-8 md:mb-12 animate-[fadeIn_1s_ease-out]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            <Sparkles size={12} /> Sistema de Reclutamiento Interestelar v2.5
          </div>
          <h1 className="text-3xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 mb-2 md:mb-4">
            Cosmic CV Analyzer
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
            Optimiza tu perfil profesional para el mercado laboral intergaláctico usando 
            Inteligencia Artificial de última generación.
          </p>
        </header>

        {/* Content Box */}
        <div className="w-full max-w-3xl glass-panel rounded-3xl p-1 shadow-2xl overflow-hidden relative">
          
          {/* Progress Bar */}
          {!result && (
             <div className="h-1 bg-slate-800 w-full top-0 absolute left-0">
               <div 
                 className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-500"
                 style={{ width: `${(step / 3) * 100}%` }}
               ></div>
             </div>
          )}

          <div className="p-6 md:p-10">
            
            {/* Step 1: Identification */}
            {step === 1 && (
              <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-cyan-500">01.</span> Identificación del Piloto
                </h2>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-xs md:text-sm text-slate-400 uppercase tracking-wide font-semibold pl-1">
                      Nombre del Piloto
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={handleNameChange}
                      placeholder="Ej: Carlos, Romina"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 md:px-5 md:py-4 text-base md:text-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      autoFocus
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs md:text-sm text-slate-400 uppercase tracking-wide font-semibold pl-1">
                      ID de Comandante (Email)
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      placeholder="comandante@flota-estelar.com"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 md:px-5 md:py-4 text-base md:text-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>

                  {/* Compact Consents Section */}
                  <div className="space-y-2 pt-2 px-1">
                    
                    {/* GDPR Consent (Required) */}
                    <label className="flex items-start gap-3 cursor-pointer group opacity-90 hover:opacity-100 transition-opacity">
                      <div className="relative flex items-center mt-0.5">
                        <input
                          type="checkbox"
                          checked={privacyConsent}
                          onChange={(e) => setPrivacyConsent(e.target.checked)}
                          className="peer appearance-none w-4 h-4 border border-slate-600 rounded bg-slate-900 checked:bg-cyan-600 checked:border-cyan-600 transition-all"
                        />
                         <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 top-0.5 left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                         </svg>
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed select-none group-hover:text-slate-400">
                        <span className="font-semibold text-slate-400 group-hover:text-slate-300">Protocolo de Privacidad.</span> Acepto el procesamiento local de mis datos.
                      </div>
                    </label>

                    {/* Marketing Consent (Optional) */}
                    <label className="flex items-start gap-3 cursor-pointer group opacity-80 hover:opacity-100 transition-opacity">
                      <div className="relative flex items-center mt-0.5">
                        <input
                          type="checkbox"
                          checked={formData.marketingConsent}
                          onChange={handleMarketingChange}
                          className="peer appearance-none w-4 h-4 border border-slate-600 rounded bg-slate-900 checked:bg-purple-600 checked:border-purple-600 transition-all"
                        />
                         <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 top-0.5 left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                         </svg>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed select-none group-hover:text-slate-400">
                        <span className="font-semibold text-slate-500 group-hover:text-slate-300">Comunicaciones.</span> Recibir novedades sobre oportunidades de carrera.
                      </div>
                    </label>
                  </div>

                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={nextStep}
                    disabled={!privacyConsent || !formData.name || !formData.email}
                    className={`
                      group flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                      ${(privacyConsent && formData.name && formData.email)
                        ? 'bg-white text-slate-950 hover:bg-cyan-50'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                    `}
                  >
                    Confirmar ID <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Mission Selection */}
            {step === 2 && (
              <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
                 <div className="mb-2">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-500">02.</span> Selección de Trayectoria
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">Elige el cuadrante del universo donde quieres operar.</p>
                 </div>

                {/* Grid changed to 2 cols on small screens to fit content */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {MISSIONS.map((m) => (
                    <MissionCard
                      key={m.id}
                      mission={m}
                      selected={formData.mission === m.id}
                      onClick={() => handleMissionSelect(m.id)}
                    />
                  ))}
                </div>

                <div className="flex justify-between pt-6">
                   <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white transition-colors text-sm font-medium">
                    Atrás
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!formData.mission}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                      ${formData.mission 
                        ? 'bg-white text-slate-950 hover:bg-cyan-50 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                    `}
                  >
                    Confirmar Rumbo <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Upload */}
            {step === 3 && !loading && !result && (
              <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                 <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-cyan-500">03.</span> Carga de Combustible (CV)
                </h2>
                
                <div 
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300
                    ${formData.file 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'}
                  `}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="application/pdf"
                  />
                  
                  {formData.file ? (
                    <div className="animate-pulse">
                      <FileText size={48} className="text-green-400 mb-4 mx-auto" />
                      <p className="text-lg font-medium text-green-300">{formData.file.name}</p>
                      <p className="text-sm text-green-500/70 mt-1">Listo para análisis</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <UploadCloud size={32} className="text-cyan-400" />
                      </div>
                      <p className="text-lg font-medium text-slate-200">Arrastra tu CV (PDF)</p>
                      <p className="text-sm text-slate-500 mt-2">o haz click para abrir la compuerta</p>
                    </>
                  )}
                </div>

                <div className="flex justify-between pt-6">
                   <button onClick={() => setStep(2)} className="text-slate-500 hover:text-white transition-colors text-sm font-medium">
                    Atrás
                  </button>
                  <button
                    onClick={startAnalysis}
                    disabled={!formData.file}
                    className={`
                      w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg
                      ${formData.file 
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/50' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                    `}
                  >
                     INICIAR DESPEGUE 🚀
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="py-20 flex flex-col items-center justify-center text-center animate-[fadeIn_0.5s_ease-out]">
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Rocket size={32} className="text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">Analizando Atmósfera...</h3>
                <p className="text-slate-400">Calculando probabilidades de éxito en la misión {MISSIONS.find(m => m.id === formData.mission)?.title}</p>
              </div>
            )}

            {/* Step 4: Results */}
            {step === 4 && result && (
               <ResultPanel 
                result={result} 
                onReset={resetMission}
                userName={formData.name}
                userEmail={formData.email}
                missionId={formData.mission}
               />
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3 animate-bounce">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;