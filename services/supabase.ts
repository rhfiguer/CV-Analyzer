
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
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("❌ Error Supabase Init:", e);
  }
}

/**
 * Guarda el lead en la base de datos de forma segura (Fail-Safe).
 * No bloquea la ejecución principal en caso de fallo de RLS o red.
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
    // 🕵️‍♂️ INSTRUMENTACIÓN DE AUDITORÍA
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    console.log("🕵️‍♂️ [DEBUG SAVE_LEAD] User ID:", user?.id);
    console.log("🕵️‍♂️ [DEBUG SAVE_LEAD] User Email:", user?.email);
    console.log("🕵️‍♂️ [DEBUG SAVE_LEAD] Role:", user?.role);
    if (authErr) console.warn("🕵️‍♂️ [DEBUG SAVE_LEAD] Auth Warning:", authErr.message);

    // Intentar el upsert
    const { error } = await supabase
      .from('cosmic_cv_leads')
      .upsert({ 
        email: normalizedEmail, 
        name, 
        marketing_consent: marketingConsent,
        mission_id: missionId || null
      }, { onConflict: 'email' });

    if (error) {
      // Capturamos el error 401/RLS aquí pero no lanzamos excepción
      console.error("❌ [LEAD ERROR] Fallo controlado de escritura (RLS/401):", error.message);
    } else {
      console.log("✅ [LEAD SUCCESS] Lead sincronizado.");
    }
  } catch (err: any) {
    // Fallo catastrófico (red/otros) - Se silencia para no romper el flujo
    console.error("💥 [LEAD CRITICAL] Error de persistencia silencioso:", err.message);
  }
};
