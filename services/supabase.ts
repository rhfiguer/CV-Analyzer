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
    // CAMBIO CRÍTICO: Eliminamos .select()
    // Al ser un formulario público, a menudo no tenemos permisos de SELECT (Lectura)
    // por seguridad. Al quitar .select(), hacemos un "Fire and Forget" que es más robusto ante RLS.
    const { error } = await supabase
      .from('cosmic_cv_leads')
      .insert([
        { 
          name, 
          email, 
          marketing_consent: marketingConsent,
          mission_id: missionId || null,
          created_at: timestamp
        },
      ]);

    if (error) {
      console.error('%c ❌ ERROR AL GUARDAR EN SUPABASE ', 'background: red; color: white; font-weight: bold; padding: 2px 4px;');
      console.error("Code:", error.code);
      console.error("Mensaje:", error.message);
      
      // DIAGNÓSTICO INTELIGENTE DE RLS
      if (error.code === '42501' || error.message.includes("row-level security")) {
        console.warn(`
%c 🛡️ BLOQUEO DE SEGURIDAD (RLS) 🛡️
La base de datos rechazó la escritura.
        
ASEGÚRATE DE CORRER ESTE SQL EN SUPABASE (SQL EDITOR):
---------------------------------------------------
drop policy if exists "Public Insert" on cosmic_cv_leads;

create policy "Public Insert"
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
      console.log("Modo: Write-Only (ID oculto por seguridad)");
    }
  } catch (err) {
    console.error('%c 💥 ERROR DE CONEXIÓN CRÍTICO ', 'background: red; color: white; font-weight: bold;');
    console.error(err);
  } finally {
    console.groupEnd();
  }
};