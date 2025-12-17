import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------
// CONFIGURACIÓN SUPABASE ADMIN
// Usamos SERVICE_ROLE_KEY para poder escribir en la DB sin restricciones RLS
// ya que este webhook actúa como un sistema backend confiable.
// ----------------------------------------------------------------------
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ----------------------------------------------------------------------
// UTILIDAD: RAW BODY BUFFER
// Vercel/Node necesita leer el stream crudo para verificar la firma HMAC.
// Si usamos req.body (ya parseado), la firma fallará por diferencias de formato.
// ----------------------------------------------------------------------
const getRawBody = async (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

export default async function handler(req, res) {
  // 1. Solo permitimos método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Check de variables críticas
    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error("SERVER ERROR: Faltan variables de entorno críticas.");
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 2. Obtener el Raw Body (Buffer)
    const rawBody = await getRawBody(req);
    
    // 3. VALIDACIÓN DE FIRMA (SEGURIDAD CRÍTICA)
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    // Calculamos el hash del cuerpo crudo
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    // Obtenemos la firma que envía Lemon Squeezy
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    // Usamos timingSafeEqual para evitar ataques de tiempo
    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error("ALERTA DE SEGURIDAD: Firma de webhook inválida.");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 4. Parsear el cuerpo una vez validado
    const payload = JSON.parse(rawBody.toString());
    const { meta, data } = payload;
    const eventName = meta.event_name;

    console.log(`Webhook recibido: ${eventName}`);

    // Filtramos solo los eventos que nos interesan
    const allowedEvents = [
      'subscription_created',
      'subscription_updated',
      'subscription_resumed',
      'subscription_cancelled',
      'subscription_expired'
    ];

    if (!allowedEvents.includes(eventName)) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    // 5. Extraer datos relevantes
    const attributes = data.attributes;
    const userEmail = attributes.user_email;
    const variantId = attributes.variant_id;
    const customerId = attributes.customer_id;
    const status = attributes.status;
    const renewsAt = attributes.renews_at;

    // Determinar estado Premium
    // Simplificación solicitada: True si activo/creado/resumido, False si cancelado/expirado.
    let isPremium = false;
    
    if (['subscription_created', 'subscription_updated', 'subscription_resumed'].includes(eventName)) {
        // Validación adicional: Lemon Squeezy puede enviar 'updated' con status 'past_due'
        if (status === 'active' || status === 'on_trial') {
            isPremium = true;
        }
    }

    console.log(`Procesando usuario: ${userEmail} | Premium: ${isPremium}`);

    // 6. Actualizar Supabase (Tabla 'profiles')
    // Buscamos por email y actualizamos
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        is_premium: isPremium,
        lemon_customer_id: customerId,
        lemon_variant_id: variantId,
        lemon_status: status,
        renews_at: renewsAt,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail);

    if (dbError) {
      console.error("DB ERROR:", dbError);
      // Retornamos 500 para que Lemon Squeezy reintente el webhook más tarde
      return res.status(500).json({ error: 'Database update failed' });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}