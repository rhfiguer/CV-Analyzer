
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
    console.log("[IDENTITY-WEBHOOK] 🛰️ Señal recibida de Lemon Squeezy.");

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret || !supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Configuración de servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    
    // 1. Verificación de Firma
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("[IDENTITY-WEBHOOK] Firma inválida.");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const attributes = payload.data.attributes;
    
    // IDENTITY-FIRST: Recuperamos el user_id de los metadatos personalizados
    const userId = payload.meta.custom_data?.user_id;
    const subscriptionId = payload.data.id;
    const status = attributes.status;

    console.log(`[IDENTITY-WEBHOOK] Evento: ${eventName} | UserID: ${userId} | Status: ${status}`);

    if (!userId) {
      console.warn("[IDENTITY-WEBHOOK] No se encontró user_id en el payload. Operación cancelada.");
      return res.status(200).json({ message: 'No user_id found, ignoring' });
    }

    // 2. Gestión de la tabla 'subscriptions'
    if (['subscription_created', 'subscription_updated', 'subscription_payment_success', 'order_created'].includes(eventName)) {
      
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          lemon_subscription_id: subscriptionId.toString(),
          status: status, // active, past_due, etc.
          current_period_end: attributes.renews_at || attributes.ends_at,
          updated_at: new Date().toISOString()
        }, { onConflict: 'lemon_subscription_id' });

      if (error) {
        console.error("[IDENTITY-WEBHOOK ERROR]", error.message);
        return res.status(500).json({ error: 'DB Update failed' });
      }

      // Sincronizar también con perfiles para compatibilidad legacy
      await supabase
        .from('profiles')
        .update({ is_premium: ['active', 'on_trial'].includes(status) })
        .eq('id', userId);

      console.log(`[IDENTITY-WEBHOOK SUCCESS] Privilegios actualizados para usuario ${userId}`);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("[IDENTITY-WEBHOOK CRITICAL FAILURE]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
