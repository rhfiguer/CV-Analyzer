
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Globe, LogOut, User, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { LoginModal } from './LoginModal';
import { useSubscriptionStatus } from '../hooks/useSubscription';

export const Navbar: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { isPremium, loading: subLoading } = useSubscriptionStatus();

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] px-4 py-3 md:px-8 bg-slate-950/40 backdrop-blur-xl border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* LOGO */}
        <a href="https://somosmaas.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Globe size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-white tracking-widest uppercase leading-none">Somos MAAS</span>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em] leading-none mt-1 opacity-80">Analizador Cósmico</span>
          </div>
        </a>

        {/* AUTH STATE */}
        <div className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3 pl-3 py-1.5 pr-1.5 bg-slate-900/50 border border-slate-800 rounded-full">
               <div className="flex flex-col items-end px-1">
                 <span className="hidden md:block text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                   {session.user.user_metadata.full_name || session.user.email}
                 </span>
                 {isPremium && (
                   <span className="flex items-center gap-1 text-[9px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 rounded-sm uppercase tracking-widest border border-yellow-500/20">
                     <ShieldCheck size={8} /> PRO
                   </span>
                 )}
               </div>
               <div className="w-8 h-8 rounded-full border-2 border-cyan-500/50 overflow-hidden bg-slate-800 relative">
                  {session.user.user_metadata.avatar_url ? (
                    <img src={session.user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="w-full h-full p-1.5 text-slate-400" />
                  )}
               </div>
               <button 
                 onClick={handleSignOut}
                 className="p-2 text-slate-400 hover:text-white transition-colors"
                 title="Cerrar Sesión"
               >
                 <LogOut size={16} />
               </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-950 text-xs font-black rounded-full transition-all active:scale-95 shadow-lg flex items-center gap-2"
            >
              <Sparkles size={14} />
              ACCEDER
            </button>
          )}
        </div>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onSuccess={() => setIsLoginModalOpen(false)} 
      />
    </nav>
  );
};
