
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

export const saveLead = async (
  name: string, 
  email: string, 
  marketingConsent: boolean,
  missionId?: MissionId | null
) => {
  if (!supabase) return;
  
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const { error } = await supabase
      .from('cosmic_cv_leads')
      .upsert({ 
        email: normalizedEmail, 
        name, 
        marketing_consent: marketingConsent,
        mission_id: missionId || null
      }, { onConflict: 'email' });

    if (error) {
      console.error("❌ Error DB Upsert:", error.message);
    } else {
      console.log("✅ Lead sincronizado (upsert).");
    }
  } catch (err) {
    console.error("💥 Error persistencia:", err);
  }
};
