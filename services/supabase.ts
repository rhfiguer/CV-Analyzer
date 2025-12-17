import { createClient } from '@supabase/supabase-js';
import { MissionId } from '../types';

/**
 * CONFIGURACIÓN DE SUPABASE
 */

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export let supabase: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.debug("🔌 Supabase Client: Inicializado.");
  } catch (e) {
    console.error("❌ Fallo al inicializar cliente Supabase:", e);
  }
} else {
  console.warn("⚠️ Supabase NO configurado. La app está en modo DEMO.");
}

/**
 * Guarda un lead o lo actualiza si ya existe (prevención de duplicados).
 */
export const saveLead = async (
  name: string, 
  email: string, 
  marketingConsent: boolean,
  missionId?: MissionId | null
) => {
  const timestamp = new Date().toISOString();
  const normalizedEmail = email.toLowerCase().trim();

  if (!supabase) {
    console.groupCollapsed('%c 🚧 MOCK DB: Registro Simulado', 'color: orange; font-weight: bold;');
    console.log(`Email: ${normalizedEmail}`);
    console.log(`Misión: ${missionId || 'Pendiente'}`);
    console.groupEnd();
    return;
  }

  console.group('%c 🛰️ DB UPLINK: Sincronizando Lead...', 'color: #06b6d4; font-weight: bold;');
  
  try {
    // Usamos UPSERT con 'onConflict: email' para asegurar que NO haya duplicados.
    // IMPORTANTE: La columna 'email' en Supabase debe tener una restricción UNIQUE.
    const { error } = await supabase
      .from('cosmic_cv_leads')
      .upsert(
        { 
          email: normalizedEmail, 
          name, 
          marketing_consent: marketingConsent,
          mission_id: missionId || null,
          created_at: timestamp // En upsert, esto actúa como la fecha de última actividad
        },
        { 
          onConflict: 'email',
          ignoreDuplicates: false // Actualiza los datos existentes si hay coincidencia
        }
      );

    if (error) {
      console.error('%c ❌ ERROR DE SINCRONIZACIÓN ', 'background: red; color: white; font-weight: bold;');
      console.error("Mensaje:", error.message);
    } else {
      console.log('%c ✅ LEAD SINCRONIZADO ', 'background: #22c55e; color: black; font-weight: bold;');
      console.log(`Registro único para "${normalizedEmail}" asegurado.`);
    }
  } catch (err) {
    console.error('%c 💥 FALLO DE COMUNICACIÓN ', 'background: red; color: white; font-weight: bold;');
    console.error(err);
  } finally {
    console.groupEnd();
  }
};