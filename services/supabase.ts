
import { createClient } from '@supabase/supabase-js';
import { MissionId } from '../types';

/**
 * CONFIGURACIÓN DE SUPABASE
 * Soporta Vite (import.meta.env) y Node-like (process.env)
 */
const getEnv = (key: string) => {
  return (import.meta as any).env?.[key] || (process as any).env?.[key] || '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

export let supabase: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.debug("🔌 Supabase Client: Inicializado con éxito.");
  } catch (e) {
    console.error("❌ Fallo al inicializar cliente Supabase:", e);
  }
} else {
  console.warn("⚠️ Supabase NO configurado o variables faltantes. Operando en modo DEMO.");
}

/**
 * Guarda un lead o lo actualiza si ya existe.
 * Esta es la "Caja Fuerte" donde guardamos el interés antes y después del pago.
 */
export const saveLead = async (
  name: string, 
  email: string, 
  marketingConsent: boolean,
  missionId?: MissionId | null
) => {
  const normalizedEmail = email.toLowerCase().trim();

  if (!supabase) {
    console.warn("🚧 MOCK DB: No hay conexión a Supabase. Datos:", { name, normalizedEmail, missionId });
    return;
  }

  try {
    const { error } = await supabase
      .from('cosmic_cv_leads')
      .upsert(
        { 
          email: normalizedEmail, 
          name, 
          marketing_consent: marketingConsent,
          mission_id: missionId || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'email' }
      );

    if (error) {
      console.error("❌ Error grabando lead en DB:", error.message);
      throw error;
    }
    console.log("✅ Lead sincronizado correctamente en cosmic_cv_leads.");
  } catch (err) {
    console.error("💥 Fallo crítico al intentar persistir el lead:", err);
  }
};
