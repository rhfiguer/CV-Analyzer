import { createClient } from '@supabase/supabase-js';
import { MissionId } from '../types';

// NOTE: In a real production app, use process.env.NEXT_PUBLIC_SUPABASE_URL
// You must set these variables in your environment or replace them here for testing.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabase: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const saveLead = async (
  name: string, 
  email: string, 
  marketingConsent: boolean,
  missionId?: MissionId | null
) => {
  if (!supabase) {
    console.warn("Supabase not configured. Data will not be saved remotely.");
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