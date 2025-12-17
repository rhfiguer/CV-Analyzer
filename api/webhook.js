import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getRawBody = async (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error("CRITICAL CONFIG ERROR: Missing Env Vars");
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    // 1. Verificación de Firma Digital
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("AUTH FAILED: Invalid Signature from Lemon Squeezy");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const attributes = payload.data.attributes;

    // 2. Extracción de Datos y Normalización
    const userEmail = (attributes.user_email || "").toLowerCase().trim();
    const status = attributes.status;
    const isTest = attributes.test_mode; // Importante para detectar tus pruebas

    console.log(`[LS WEBHOOK] Evento: ${eventName} | Email: "${userEmail}" | Status: ${status} | TestMode: ${isTest}`);

    // Solo procesamos eventos de creación de orden o suscripción
    const isValidEvent = ['order_created', 'subscription_created', 'subscription_updated'].includes(eventName);
    if (!isValidEvent) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Un pago es válido si está pagado, activo o es una prueba exitosa
    const isPremium = ['paid', 'active', 'on_trial'].includes(status) || (isTest && status === 'paid');

    if (isPremium && userEmail) {
      console.log(`[LS WEBHOOK] 🚀 Iniciando activación para: ${userEmail}`);
      
      // INTENTO A: Actualizar en la tabla 'profiles' (Usuarios registrados)
      const { data: profileData, error: profileError, count: profileCount } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          lemon_status: status,
          updated_at: new Date().toISOString()
        }, { count: 'exact' })
        .ilike('email', userEmail);

      if (profileCount > 0) {
        console.log(`[LS WEBHOOK] ✅ Perfil actualizado exitosamente.`);
        return res.status(200).json({ success: true, target: 'profile' });
      }

      // INTENTO B (FALLBACK): Actualizar en la tabla 'cosmic_cv_leads' 
      // Esto es por si el usuario pagó ANTES de loguearse por primera vez
      console.log(`[LS WEBHOOK] ⚠️ Usuario no encontrado en 'profiles'. Intentando en 'cosmic_cv_leads'...`);
      const { error: leadError, count: leadCount } = await supabase
        .from('cosmic_cv_leads')
        .update({
          is_premium: true, // Asumiendo que añadiste esta columna o la usas como bandera
          updated_at: new Date().toISOString()
        }, { count: 'exact' })
        .ilike('email', userEmail);

      if (leadCount > 0) {
        console.log(`[LS WEBHOOK] ✅ Lead actualizado exitosamente.`);
        return res.status(200).json({ success: true, target: 'lead' });
      }

      console.warn(`[LS WEBHOOK] ❌ ERROR: El email "${userEmail}" no existe en ninguna tabla. Pago huérfano.`);
      return res.status(404).json({ error: 'User not found in database', emailAttempted: userEmail });
    }

    return res.status(200).json({ success: true, message: 'No premium action needed' });

  } catch (error) {
    console.error("[LS WEBHOOK FATAL ERROR]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}