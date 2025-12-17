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
      console.error("SERVER ERROR: Faltan variables de entorno críticas.");
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("ALERTA DE SEGURIDAD: Firma de webhook inválida.");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const { meta, data } = payload;
    const eventName = meta.event_name;

    console.log(`Webhook recibido: ${eventName}`);

    const allowedEvents = [
      'subscription_created',
      'subscription_updated',
      'subscription_resumed',
      'subscription_cancelled',
      'subscription_expired',
      'order_created' // A veces pagos únicos vienen como order_created
    ];

    if (!allowedEvents.includes(eventName)) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const attributes = data.attributes;
    // NORMALIZACIÓN DE EMAIL (CRÍTICO)
    const userEmail = attributes.user_email.toLowerCase().trim();
    const variantId = attributes.variant_id || attributes.first_order_item?.variant_id;
    const customerId = attributes.customer_id;
    const status = attributes.status; // status puede ser 'paid' en orders o 'active' en subs
    const renewsAt = attributes.renews_at;

    let isPremium = false;
    
    // Lógica para Subscripciones
    if (['subscription_created', 'subscription_updated', 'subscription_resumed'].includes(eventName)) {
        if (status === 'active' || status === 'on_trial') {
            isPremium = true;
        }
    }
    // Lógica para Pagos Únicos (Lifetime deals)
    if (eventName === 'order_created' && status === 'paid') {
        isPremium = true;
    }

    console.log(`Procesando usuario: ${userEmail} | Premium: ${isPremium}`);

    // Intentamos actualizar. Si el email no existe, no hará nada (update count 0).
    // Esto es un problema si el usuario pagó pero no se logueó antes.
    const { error: dbError, count } = await supabase
      .from('profiles')
      .update({
        is_premium: isPremium,
        lemon_customer_id: customerId ? String(customerId) : null,
        lemon_variant_id: variantId ? String(variantId) : null,
        lemon_status: status,
        renews_at: renewsAt,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail); // Supabase ignora case sensitivity usualmente, pero mejor asegurarse

    if (dbError) {
      console.error("DB ERROR:", dbError);
      return res.status(500).json({ error: 'Database update failed' });
    }

    // Si count es null (a veces pasa en Vercel Edge) o 0, el usuario no existe en profiles.
    if (count === 0) {
        console.warn(`⚠️ ALERTA: Pago recibido de ${userEmail} pero no existe perfil en DB.`);
        // Aquí no podemos hacer mucho sin auth.users id, pero queda en el log.
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}