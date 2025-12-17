import { createClient } from '@supabase/supabase-js';
import { MissionId } from '../types';

/**
 * CONFIGURACIÓN DE SUPABASE
 * 
 * VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar en .env.local o Vercel.
 */

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabase: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Log discreto de inicialización
    console.debug("🔌 Supabase Client: Inicializado.");
  } catch (e) {
    console.error("❌ Fallo al inicializar cliente Supabase:", e);
  }
} else {
  console.warn("⚠️ Supabase NO configurado. La app está en modo DEMO (sin base de datos real).");
}

export const saveLead = async (
  name: string, 
  email: string, 
  marketingConsent: boolean,
  missionId?: MissionId | null
) => {
  const timestamp = new Date().toISOString();

  // 1. MODO DEMO (Sin credenciales)
  if (!supabase) {
    console.groupCollapsed('%c 🚧 MOCK DB: Guardado Simulado', 'color: orange; font-weight: bold; background: #222; padding: 2px 4px; border-radius: 2px;');
    // PII MASKING
    console.log(`Usuario: ${name.charAt(0)}***`);
    console.log(`Email: [HIDDEN]`);
    console.log(`Misión: ${missionId || 'Pendiente'}`);
    console.log("Estado: NO SE GUARDÓ EN NUBE (Faltan API Keys)");
    console.groupEnd();
    return;
  }

  // 2. MODO PRODUCCIÓN (Intento de guardado real)
  console.group('%c 🛰️ DB UPLINK: Guardando Lead...', 'color: #06b6d4; font-weight: bold;'); // Cyan color
  
  try {
    const { data, error } = await supabase
      .from('cosmic_cv_leads') // Tabla específica
      .insert([
        { 
          name, 
          email, 
          marketing_consent: marketingConsent,
          mission_id: missionId || null,
          created_at: timestamp
        },
      ])
      .select(); // Pedimos que nos devuelva el registro creado para confirmar ID

    if (error) {
      console.error('%c ❌ ERROR AL GUARDAR EN SUPABASE ', 'background: red; color: white; font-weight: bold; padding: 2px 4px;');
      console.error("Mensaje:", error.message);
      
      // DIAGNÓSTICO INTELIGENTE DE RLS
      if (error.message.includes("row-level security")) {
        console.warn(`
%c 🛡️ ALERTA DE SEGURIDAD (RLS) DETECTADA 🛡️
Parece que la tabla 'cosmic_cv_leads' existe, pero no tiene una política que permita escribir datos públicos.
        
SOLUCIÓN: Ejecuta este SQL en tu panel de Supabase:
---------------------------------------------------
create policy "Permitir inserción pública cosmic leads"
on public.cosmic_cv_leads
for insert
to anon
with check (true);
---------------------------------------------------
        `, 'color: yellow; font-family: monospace;');
      }

    } else {
      console.log('%c ✅ GUARDADO EXITOSO ', 'background: #22c55e; color: black; font-weight: bold; padding: 2px 4px;');
      console.log("Tabla: cosmic_cv_leads");
      console.log("ID Registro:", data?.[0]?.id);
      // No logueamos los datos crudos aquí para seguridad
    }
  } catch (err) {
    console.error('%c 💥 ERROR DE CONEXIÓN CRÍTICO ', 'background: red; color: white; font-weight: bold;');
    console.error(err);
  } finally {
    console.groupEnd();
  }
};