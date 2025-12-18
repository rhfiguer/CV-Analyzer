
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    console.log("[LS WEBHOOK] 📨 Notificación detectada.");

    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[LS WEBHOOK ERROR] Configuración de variables de entorno incompleta.");
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    // Verificación de firma
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("[LS WEBHOOK ERROR] Firma inválida.");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const attributes = payload.data.attributes;
    const resourceId = payload.data.id; 

    const userEmail = (attributes.user_email || "").toLowerCase().trim();
    const status = attributes.status;
    const isTest = attributes.test_mode;

    console.log(`[LS WEBHOOK] ⚡ Evento: ${eventName} | Piloto: ${userEmail} | Status: ${status}`);

    const isValidEvent = [
      'order_created', 
      'subscription_created', 
      'subscription_updated', 
      'subscription_payment_success'
    ].includes(eventName);
    
    if (!isValidEvent) {
      console.log(`[LS WEBHOOK INFO] Evento ${eventName} no requiere acción de privilegios.`);
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Un pedido 'paid' o suscripción 'active'/'on_trial' otorga premium
    const isPremium = ['paid', 'active', 'on_trial'].includes(status) || (isTest && status === 'paid');

    if (isPremium && userEmail) {
      // Mapeo exacto según la imagen de la estructura de la tabla 'profiles'
      const premiumData = {
        is_premium: true,
        status: status,
        subscription_id: resourceId.toString(),
        customer_id: attributes.customer_id?.toString() || null,
        variant_id: attributes.variant_id?.toString() || null,
        renews_at: attributes.renews_at || null // Sincronizado con tu esquema
      };

      console.log("[LS WEBHOOK DB] Datos preparados para inyección:", JSON.stringify(premiumData, null, 2));

      // 1. Actualizar 'profiles' (Tabla principal de Auth)
      console.log(`[LS WEBHOOK DB] Actualizando registro en 'profiles' para email: ${userEmail}`);
      const { count: profileCount, error: profileError } = await supabase
        .from('profiles')
        .update(premiumData, { count: 'exact' })
        .ilike('email', userEmail);

      if (profileError) {
        console.error(`[LS WEBHOOK DB ERROR] Tabla profiles: ${profileError.message}`);
      } else {
        console.log(`[LS WEBHOOK DB SUCCESS] Tabla profiles: ${profileCount} filas afectadas.`);
      }

      // 2. Backup en 'cosmic_cv_leads' (Nuestra caja fuerte de emails)
      console.log(`[LS WEBHOOK DB] Realizando backup en 'cosmic_cv_leads'...`);
      const { error: leadError } = await supabase
        .from('cosmic_cv_leads')
        .upsert({
          email: userEmail,
          is_premium: true,
          last_payment_status: status,
          ls_subscription_id: resourceId.toString(),
          // Si tienes renews_at en leads también, podrías añadirlo aquí
        }, { onConflict: 'email' });

      if (leadError) {
        console.error(`[LS WEBHOOK DB ERROR] Tabla leads: ${leadError.message}`);
      } else {
        console.log(`[LS WEBHOOK DB SUCCESS] Tabla leads: Backup sincronizado.`);
      }

      return res.status(200).json({ 
        success: true, 
        applied: (profileCount || 0) > 0,
        email: userEmail,
        status: status
      });
    }

    console.log(`[LS WEBHOOK INFO] El status '${status}' no cumple requisitos Premium.`);
    return res.status(200).json({ success: true, isPremium: false });
  } catch (error) {
    console.error("[LS WEBHOOK CRITICAL ERROR]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
