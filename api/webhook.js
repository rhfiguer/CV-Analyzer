
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
    console.log("[LS-WEBHOOK] 🛰️ Inbound Notification Received.");

    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[LS-WEBHOOK CRITICAL] Env variables missing.");
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    // Verificación de firma criptográfica
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("[LS-WEBHOOK ERROR] Signature mismatch.");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const attributes = payload.data.attributes;
    const resourceId = payload.data.id; // ID de la orden o suscripción

    const userEmail = (attributes.user_email || "").toLowerCase().trim();
    const status = attributes.status;

    console.log(`[LS-WEBHOOK EVENT] Type: ${eventName} | Email: ${userEmail} | ID: ${resourceId} | Status: ${status}`);

    // Solo procesamos eventos que implican un derecho premium
    const isPremiumEvent = [
      'order_created', 
      'subscription_created', 
      'subscription_updated', 
      'subscription_payment_success'
    ].includes(eventName);
    
    // El derecho premium se otorga si el estatus es de pago activo
    const hasPaid = ['paid', 'active', 'on_trial'].includes(status);

    if (isPremiumEvent && hasPaid && userEmail) {
      console.log(`[LS-WEBHOOK LEDGER] Registrando compra en Ledger para: ${userEmail}`);
      
      // UPSERT en la tabla 'premium_purchases' (Nuestro Libro Mayor)
      const { data, error: ledgerError } = await supabase
        .from('premium_purchases')
        .upsert({
          email: userEmail,
          lemon_order_id: resourceId.toString(),
          created_at: new Date().toISOString()
        }, { onConflict: 'lemon_order_id' });

      if (ledgerError) {
        console.error(`[LS-WEBHOOK LEDGER ERROR] Fallo al escribir en premium_purchases: ${ledgerError.message}`);
        return res.status(500).json({ error: 'Failed to record purchase' });
      }

      console.log(`[LS-WEBHOOK SUCCESS] Ledger actualizado. Compra blindada para ${userEmail}.`);
      return res.status(200).json({ success: true, message: 'Purchase recorded in ledger' });
    }

    console.log(`[LS-WEBHOOK INFO] Evento '${eventName}' con status '${status}' ignorado por el Ledger.`);
    return res.status(200).json({ message: 'Event ignored by business logic' });
  } catch (error) {
    console.error("[LS-WEBHOOK CRITICAL FAILURE]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
