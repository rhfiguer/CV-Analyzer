import { createClient } from '@supabase/supabase-js';
import { MissionId } from '../types';

// EN VITE, USAMOS import.meta.env EN LUGAR DE process.env
// Y LAS VARIABLES PÚBLICAS DEBEN EMPEZAR CON VITE_
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabase: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase client init failed:", e);
  }
} else {
  console.warn("Supabase credentials not found. Check VITE_SUPABASE_URL in Vercel env vars.");
}

export const saveLead = async (
  name: string, 
  email: string, 
  marketingConsent: boolean,
  missionId?: MissionId | null
) => {
  if (!supabase) {
    // Fail silently in UI, just log in console
    console.warn("Supabase not configured. Lead not saved.");
    return;
  }

  try {
    const { error } = await supabase
      .from('leads')
      .insert([
        { 
          name, 
          email, 
          marketing_consent: marketingConsent,
          mission_id: missionId || null,
          created_at: new Date().toISOString()
        },
      ]);

    if (error) {
      console.error("Error saving lead to Supabase:", error);
    } else {
      console.log("Lead secured in database.");
    }
  } catch (err) {
    console.error("Critical error saving lead:", err);
  }
};