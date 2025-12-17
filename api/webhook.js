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
      console.error("[LS WEBHOOK] CRITICAL: Missing Env Vars");
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    // 1. Verificación de Firma
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("[LS WEBHOOK] AUTH FAILED: Invalid Signature");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const attributes = payload.data.attributes;
    const resourceId = payload.data.id; 

    const userEmail = (attributes.user_email || "").toLowerCase().trim();
    const status = attributes.status;
    const isTest = attributes.test_mode;

    console.log(`[LS WEBHOOK] Evento: ${eventName} | Email: "${userEmail}" | Status: ${status}`);

    const isValidEvent = ['order_created', 'subscription_created', 'subscription_updated', 'subscription_payment_success'].includes(eventName);
    
    if (!isValidEvent) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const isPremium = ['paid', 'active', 'on_trial'].includes(status) || (isTest && status === 'paid');

    if (isPremium && userEmail) {
      console.log(`[LS WEBHOOK] 🚀 Ejecutando actualización para: ${userEmail}`);
      
      // Mapeo SEGURO: Solo columnas confirmadas. 
      // Eliminamos 'updated_at' y 'renews_at' para evitar errores de schema si no existen.
      const updatePayload = {
        is_premium: true,
        status: status,
        subscription_id: resourceId.toString(),
        customer_id: attributes.customer_id?.toString() || null,
        variant_id: attributes.variant_id?.toString() || null
      };

      const { error, count } = await supabase
        .from('profiles')
        .update(updatePayload, { count: 'exact' })
        .ilike('email', userEmail);

      if (error) {
        console.error("[LS WEBHOOK] Error en Supabase Update:", error.message);
        return res.status(500).json({ error: 'Database update failed', details: error.message });
      }

      if (count === 0) {
        console.warn(`[LS WEBHOOK] ⚠️ No se encontró perfil para "${userEmail}". El pago se procesó pero el acceso premium requiere un perfil previo.`);
        return res.status(404).json({ error: 'User profile not found', email: userEmail });
      }

      console.log(`[LS WEBHOOK] ✅ Perfil "${userEmail}" actualizado exitosamente.`);
      return res.status(200).json({ success: true, updated: count });
    }

    return res.status(200).json({ success: true, message: 'No action required' });

  } catch (error) {
    console.error("[LS WEBHOOK FATAL ERROR]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}