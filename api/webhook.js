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
      console.error("CRITICAL: Missing Env Vars (LS Secret or SB Keys)");
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    // Verificación de Firma
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("AUTH ERROR: Invalid Webhook Signature");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const attributes = payload.data.attributes;

    // NORMALIZACIÓN RADICAL DE EMAIL
    const userEmail = attributes.user_email.toLowerCase().trim();
    const status = attributes.status;

    console.log(`[LS WEBHOOK] Evento: ${eventName} | Email: ${userEmail} | Status: ${status}`);

    // Determinamos si es un evento de "Activación"
    const isActivation = [
      'order_created', 
      'subscription_created', 
      'subscription_updated'
    ].includes(eventName);

    if (!isActivation) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    // El estado 'paid' es para órdenes únicas, 'active' o 'on_trial' para suscripciones
    const isPremium = ['paid', 'active', 'on_trial'].includes(status);

    if (isPremium) {
      console.log(`[LS WEBHOOK] Intentando actualizar perfil para: ${userEmail}`);
      
      // Intentamos actualizar usando ILIKE (Case Insensitive) para mayor seguridad
      // Y pedimos que nos devuelva el registro para confirmar
      const { data, error, count } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          lemon_status: status,
          updated_at: new Date().toISOString()
        }, { count: 'exact' })
        .ilike('email', userEmail); // Búsqueda insensible a mayúsculas

      if (error) {
        console.error("[SB ERROR]:", error.message);
        return res.status(500).json({ error: error.message });
      }

      if (count === 0) {
        console.warn(`[LS WEBHOOK] ⚠️ Email ${userEmail} no encontrado en 'profiles'. El usuario pagó antes de registrarse o hay un error de tabla.`);
        // Nota: Si el usuario no existe, Lemon Squeezy reintentará el webhook más tarde 
        // o el usuario activará el Polling en el front.
        return res.status(404).json({ error: 'User profile not found yet' });
      }

      console.log(`[LS WEBHOOK] ✅ ÉXITO: Perfil de ${userEmail} actualizado a PREMIUM.`);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("[LS WEBHOOK FATAL]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}