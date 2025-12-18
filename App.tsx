
import React, { useState, useRef, useEffect } from 'react';
import { MissionId, FormDataState, AnalysisResult } from './types';
import { MISSIONS } from './constants';
import { MissionCard } from './components/MissionCard';
import { ResultPanel } from './components/ResultPanel';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { analyzeCV } from './services/geminiService';
import { supabase } from './services/supabase';
import { UploadCloud, FileText, ChevronRight, AlertCircle, Sparkles, Rocket, CheckCircle2, User } from 'lucide-react';

const MAX_FILE_SIZE_MB = 3;
const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState<boolean>(true);
  const [session, setSession] = useState<any>(null);
  
  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    email: '',
    mission: null,
    file: null,
    marketingConsent: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session: currentSession } }: any) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setFormData(prev => ({
          ...prev,
          name: currentSession.user.user_metadata.full_name || '',
          email: currentSession.user.email || ''
        }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, newSession: any) => {
      setSession(newSession);
      if (newSession?.user) {
        setFormData(prev => ({
          ...prev,
          name: newSession.user.user_metadata.full_name || prev.name,
          email: newSession.user.email || prev.email
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
  };

  const handleMissionSelect = (id: MissionId) => {
    setFormData(prev => ({ ...prev, mission: id }));
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError("Solo se permiten archivos PDF.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setFormData(prev => ({ ...prev, file: file }));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) validateAndSetFile(e.target.files[0]);
  };

  const handleStartApp = () => setShowLanding(false);

  const nextStep = () => {
    if (step === 1) {
      if (!formData.email || !formData.name) {
        setError("Identificación requerida.");
        return;
      }
    }
    setError(null);
    setStep(prev => prev + 1);
  };

  const startAnalysis = async () => {
    if (!formData.file || !formData.mission || !formData.email || !formData.name) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeCV(formData.file, formData.mission, formData.email, formData.name, formData.marketingConsent);
      setResult(data);
      setLoading(false);
      setStep(4);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error en el análisis.");
      setLoading(false);
    }
  };

  const resetMission = () => {
    setStep(1);
    setResult(null);
    setFormData(prev => ({ ...prev, mission: null, file: null }));
    setPrivacyConsent(true); 
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-cyan-500/30 pt-20">
      <Navbar />
      
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/40 to-black/90 pointer-events-none"></div>
      
      <main className="container mx-auto px-4 py-6 md:py-10 relative z-10 min-h-screen flex flex-col items-center justify-center">
        {showLanding ? (
          <LandingPage onStart={handleStartApp} />
        ) : (
          <>
            <header className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
                <Sparkles size={12} /> Tecnología de Calibración
              </div>
              <h1 className="text-3xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 mb-2">
                Analizador Cósmico de CV
              </h1>
            </header>

            <div className="w-full max-w-3xl glass-panel rounded-3xl p-1 shadow-2xl relative overflow-hidden">
              {!result && (
                 <div className="h-1 bg-slate-800 w-full top-0 absolute left-0">
                   <div className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
                 </div>
              )}

              <div className="p-6 md:p-10">
                {step === 1 && (
                  <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-500">01.</span> Identificación del Piloto
                    </h2>
                    
                    {session ? (
                      /* IDENTIDAD VERIFICADA - UI LIMPIA */
                      <div className="bg-slate-900/60 border border-cyan-500/20 p-6 rounded-2xl flex items-center gap-5 shadow-inner">
                         <div className="w-16 h-16 rounded-full border-2 border-cyan-500/50 overflow-hidden shrink-0">
                           <img src={session.user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-grow">
                           <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Sesión Activa vía Google</p>
                           <h3 className="text-lg font-bold text-white leading-tight">{session.user.user_metadata.full_name}</h3>
                           <p className="text-sm text-slate-500">{session.user.email}</p>
                         </div>
                         <div className="text-green-500 bg-green-500/10 p-2 rounded-full">
                           <CheckCircle2 size={24} />
                         </div>
                      </div>
                    ) : (
                      /* INPUT MANUAL FALLBACK */
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs text-slate-400 uppercase tracking-wide font-semibold pl-1">Nombre Completo</label>
                          <input type="text" value={formData.name} onChange={handleNameChange} placeholder="Ej: John Doe" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-all" autoFocus />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-slate-400 uppercase tracking-wide font-semibold pl-1">Correo de Contacto</label>
                          <input type="email" value={formData.email} onChange={handleEmailChange} placeholder="tu@email.com" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-all" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <input type="checkbox" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)} id="privacy" className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500" />
                      <label htmlFor="privacy" className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">Acepto los términos de servicio y política de privacidad.</label>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button onClick={nextStep} disabled={!privacyConsent || !formData.name || !formData.email} className="group px-8 py-4 bg-white text-slate-950 font-black rounded-2xl disabled:opacity-50 transition-all hover:bg-slate-100 active:scale-95 shadow-xl flex items-center gap-2">
                        SIGUIENTE <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-500">02.</span> Selección de Trayectoria
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {MISSIONS.map((m) => (
                        <MissionCard key={m.id} mission={m} selected={formData.mission === m.id} onClick={() => handleMissionSelect(m.id)} />
                      ))}
                    </div>
                    <div className="flex justify-between pt-6">
                      <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Atrás</button>
                      <button onClick={nextStep} disabled={!formData.mission} className="px-8 py-4 bg-white text-slate-950 font-black rounded-2xl disabled:opacity-50 transition-all hover:bg-slate-100 active:scale-95 shadow-xl flex items-center gap-2">
                        CONFIRMAR RUMBO <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && !loading && !result && (
                  <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-500">03.</span> Carga de Combustible (CV)
                    </h2>
                    <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${formData.file ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-900/40'}`}>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
                      {formData.file ? (
                        <div className="text-center">
                          <FileText size={56} className="text-green-400 mb-4 mx-auto" />
                          <p className="text-lg font-bold text-white">{formData.file.name}</p>
                          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Listo para el despegue</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <UploadCloud size={56} className="text-cyan-500 mb-4 mx-auto opacity-80" />
                          <p className="text-lg font-bold text-slate-200">Sube tu CV en PDF</p>
                          <p className="text-xs text-slate-500 mt-1">Máximo 3MB</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between pt-6">
                      <button onClick={() => setStep(2)} className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Atrás</button>
                      <button onClick={startAnalysis} disabled={!formData.file} className="px-10 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] disabled:opacity-50 transition-all hover:scale-105 active:scale-95 flex items-center gap-3">
                        <Rocket size={20} /> INICIAR ANÁLISIS 🚀
                      </button>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="py-24 flex flex-col items-center justify-center text-center">
                    <div className="relative w-24 h-24 mb-10">
                      <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Rocket size={36} className="text-cyan-400" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Analizando Trayectoria...</h3>
                    <p className="text-slate-500 text-sm font-bold animate-pulse tracking-widest uppercase">Sincronizando con satélites de IA</p>
                  </div>
                )}

                {step === 4 && result && (
                   <ResultPanel result={result} onReset={resetMission} userName={formData.name} missionId={formData.mission!} />
                )}

                {error && (
                  <div className="mt-6 bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
