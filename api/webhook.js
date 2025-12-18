
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
    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET || !supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const attributes = payload.data.attributes;
    const resourceId = payload.data.id; 

    const userEmail = (attributes.user_email || "").toLowerCase().trim();
    const status = attributes.status;
    const isTest = attributes.test_mode;

    // Eventos que otorgan o modifican el estado Premium
    const isValidEvent = [
      'order_created', 
      'subscription_created', 
      'subscription_updated', 
      'subscription_payment_success'
    ].includes(eventName);
    
    if (!isValidEvent) return res.status(200).json({ message: 'Event ignored' });

    const isPremium = ['paid', 'active', 'on_trial'].includes(status) || (isTest && status === 'paid');

    if (isPremium && userEmail) {
      console.log(`[LS WEBHOOK] ⚡ Procesando Premium para: ${userEmail}`);
      
      const premiumData = {
        is_premium: true,
        status: status,
        subscription_id: resourceId.toString(),
        customer_id: attributes.customer_id?.toString() || null,
        variant_id: attributes.variant_id?.toString() || null
      };

      // 1. Intentar actualizar perfil (Si ya existe el usuario)
      const { count: profileCount } = await supabase
        .from('profiles')
        .update(premiumData, { count: 'exact' })
        .ilike('email', userEmail);

      // 2. SIEMPRE hacer UPSERT en leads para asegurar la persistencia del pago
      await supabase
        .from('cosmic_cv_leads')
        .upsert({
          email: userEmail,
          is_premium: true,
          last_payment_status: status,
          ls_subscription_id: resourceId.toString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      return res.status(200).json({ success: true, profile_updated: (profileCount || 0) > 0 });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[LS WEBHOOK ERROR]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
