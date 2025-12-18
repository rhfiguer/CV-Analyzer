
import { createClient } from '@supabase/supabase-js';
import { MissionId } from '../types';

const getEnv = (key: string) => {
  return (import.meta as any).env?.[key] || (process as any).env?.[key] || '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

export let supabase: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'somosmaas-auth-token',
        flowType: 'pkce'
      }
    });
  } catch (e) {
    console.error("❌ Error Supabase Init:", e);
  }
}

/**
 * Guarda el lead en la base de datos de forma segura (Fail-Safe).
 */
export const saveLead = async (
  name: string, 
  email: string, 
  marketingConsent: boolean,
  missionId?: MissionId | null
) => {
  if (!supabase) return;
  
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('cosmic_cv_leads')
      .upsert({ 
        email: normalizedEmail, 
        name, 
        marketing_consent: marketingConsent,
        mission_id: missionId || null,
        user_id: user?.id || null // Vincular a usuario si está logueado
      }, { onConflict: 'email' });

    if (!error) console.log("✅ [LEAD SUCCESS] Lead sincronizado.");
  } catch (err: any) {
    console.error("💥 [LEAD CRITICAL] Error de persistencia silencioso:", err.message);
  }
};
