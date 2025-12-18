
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
    console.log("[LEDGER-WEBHOOK] 🛰️ Señal entrante de Lemon Squeezy detectada.");

    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[LEDGER-WEBHOOK CRITICAL] Variables de entorno faltantes.");
      return res.status(500).json({ error: 'Configuración de servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    // 1. Verificación de Integridad (Firma)
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("[LEDGER-WEBHOOK ERROR] Firma inválida. Intento de acceso no autorizado.");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const attributes = payload.data.attributes;
    const resourceId = payload.data.id; // Lemon Order/Subscription ID

    const userEmail = (attributes.user_email || "").toLowerCase().trim();
    const status = attributes.status;

    console.log(`[LEDGER-WEBHOOK] Evento: ${eventName} | Email: ${userEmail} | ID: ${resourceId} | Status: ${status}`);

    // Solo procesamos eventos que otorgan derechos premium
    const isPremiumEvent = [
      'order_created', 
      'subscription_created', 
      'subscription_updated', 
      'subscription_payment_success'
    ].includes(eventName);
    
    const hasPaidStatus = ['paid', 'active', 'on_trial'].includes(status);

    if (isPremiumEvent && hasPaidStatus && userEmail) {
      console.log(`[LEDGER-WEBHOOK] 📖 Inyectando registro en Libro Mayor para: ${userEmail}`);
      
      // UPSERT en la nueva tabla 'premium_purchases'
      // Esto asegura que el pago quede registrado pase lo que pase con la cuenta de usuario.
      const { data, error: ledgerError } = await supabase
        .from('premium_purchases')
        .upsert({
          email: userEmail,
          lemon_order_id: resourceId.toString(),
          created_at: new Date().toISOString()
        }, { onConflict: 'lemon_order_id' });

      if (ledgerError) {
        console.error(`[LEDGER-WEBHOOK ERROR] No se pudo guardar en premium_purchases: ${ledgerError.message}`);
        return res.status(500).json({ error: 'Ledger insertion failed' });
      }

      console.log(`[LEDGER-WEBHOOK SUCCESS] Pago blindado en DB. Usuario ${userEmail} tiene derecho premium.`);
      return res.status(200).json({ success: true, message: 'Entitlement secured in ledger' });
    }

    console.log(`[LEDGER-WEBHOOK INFO] Evento ${eventName} con status ${status} no califica para registro premium.`);
    return res.status(200).json({ message: 'Event ignored (no payment action)' });

  } catch (error) {
    console.error("[LEDGER-WEBHOOK CRITICAL FAILURE]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
