import { createClient } from '@supabase/supabase-js';
import { MissionId } from '../types';

/**
 * CONFIGURACIÓN DE SUPABASE (OPCIONAL)
 * 
 * Para habilitar el guardado de leads, necesitas configurar estas variables en tu archivo .env.local
 * o en las variables de entorno de Vercel:
 * 
 * VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
 * VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
 * 
 * Si no las configuras, la app funcionará en "Modo Demo" y solo imprimirá los datos en consola.
 */

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabase: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase conectado correctamente.");
  } catch (e) {
    console.error("Fallo al inicializar Supabase:", e);
  }
} else {
  console.log("Modo Local: Supabase no configurado. Los datos se mostrarán en consola.");
}

export const saveLead = async (
  name: string, 
  email: string, 
  marketingConsent: boolean,
  missionId?: MissionId | null
) => {
  // Si no hay cliente, simulamos el éxito
  if (!supabase) {
    console.log(`[MOCK DB] Guardando lead: ${name} (${email}) - Misión: ${missionId || 'N/A'}`);
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
      console.warn("Error guardando en Supabase (no crítico):", error.message);
    } else {
      console.log("Lead guardado exitosamente en base de datos.");
    }
  } catch (err) {
    console.warn("Error de conexión con Supabase:", err);
  }
};