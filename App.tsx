
import React, { useState, useRef, useEffect } from 'react';
import { MissionId, FormDataState, AnalysisResult } from './types';
import { MISSIONS } from './constants';
import { MissionCard } from './components/MissionCard';
import { ResultPanel } from './components/ResultPanel';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { analyzeCV } from './services/geminiService';
import { supabase } from './services/supabase';
import { UploadCloud, FileText, ChevronRight, AlertCircle, Sparkles, Rocket } from 'lucide-react';

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
          name: currentSession.user.user_metadata.full_name || prev.name,
          email: currentSession.user.email || prev.email
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

  const handleMarketingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, marketingConsent: e.target.checked }));
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
                  <div className="space-y-6">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-500">01.</span> Identificación del Piloto
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wide font-semibold pl-1">Nombre</label>
                        <input type="text" value={formData.name} onChange={handleNameChange} placeholder="Tu nombre" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-all" autoFocus />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wide font-semibold pl-1">Email</label>
                        <input type="email" value={formData.email} onChange={handleEmailChange} placeholder="tu@email.com" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-all" />
                      </div>
                      <div className="space-y-2 pt-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)} className="mt-1" />
                          <span className="text-xs text-slate-400">Acepto el procesamiento de mis datos.</span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={formData.marketingConsent} onChange={handleMarketingChange} className="mt-1" />
                          <span className="text-xs text-slate-400">Deseo recibir actualizaciones de carrera.</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button onClick={nextStep} disabled={!privacyConsent || !formData.name || !formData.email} className="px-6 py-3 bg-white text-slate-950 font-bold rounded-xl disabled:opacity-50 transition-all hover:bg-slate-100 active:scale-95">Confirmar ID <ChevronRight size={18} className="inline ml-1"/></button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-500">02.</span> Selección de Trayectoria
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {MISSIONS.map((m) => (
                        <MissionCard key={m.id} mission={m} selected={formData.mission === m.id} onClick={() => handleMissionSelect(m.id)} />
                      ))}
                    </div>
                    <div className="flex justify-between pt-6">
                      <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">Atrás</button>
                      <button onClick={nextStep} disabled={!formData.mission} className="px-6 py-3 bg-white text-slate-950 font-bold rounded-xl disabled:opacity-50 transition-all hover:bg-slate-100 active:scale-95">Confirmar Rumbo <ChevronRight size={18} className="inline ml-1"/></button>
                    </div>
                  </div>
                )}

                {step === 3 && !loading && !result && (
                  <div className="space-y-6">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-500">03.</span> Carga de Combustible (CV)
                    </h2>
                    <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${formData.file ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 hover:border-cyan-500/50'}`}>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
                      {formData.file ? (
                        <div className="text-center">
                          <FileText size={48} className="text-green-400 mb-4 mx-auto" />
                          <p className="text-lg font-medium text-green-300">{formData.file.name}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <UploadCloud size={48} className="text-cyan-400 mb-4 mx-auto" />
                          <p className="text-lg font-medium text-slate-200">Arrastra tu CV (PDF)</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between pt-6">
                      <button onClick={() => setStep(2)} className="text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">Atrás</button>
                      <button onClick={startAnalysis} disabled={!formData.file} className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95">INICIAR DESPEGUE 🚀</button>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="relative w-20 h-20 mb-8">
                      <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Rocket size={32} className="text-cyan-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Analizando Atmósfera...</h3>
                    <p className="text-slate-500 text-sm animate-pulse">Sincronizando con satélites IA</p>
                  </div>
                )}

                {step === 4 && result && (
                   <ResultPanel result={result} onReset={resetMission} userName={formData.name} userEmail={formData.email} missionId={formData.mission!} />
                )}

                {error && (
                  <div className="mt-6 bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <p className="text-sm">{error}</p>
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
