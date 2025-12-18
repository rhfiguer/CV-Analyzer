
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // 1. Configuración CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, pdfBase64, missionTitle } = req.body;

    console.log(`[API START] Procesando envío para ${name}.`);

    if (!process.env.RESEND_API_KEY) {
       return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    // Diseño de Email Premium Dark Mode
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Despegue Confirmado</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #e2e8f0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <!-- Header Image/Logo Replacement -->
          <tr>
            <td align="center" style="padding: 40px 0 20px 0; background: linear-gradient(to bottom, #1e293b, #0f172a);">
              <div style="display: inline-block; padding: 12px 24px; border-radius: 12px; background-color: #0f172a; border: 1px solid #22d3ee;">
                <span style="color: #ffffff; font-weight: 900; letter-spacing: 4px; font-size: 18px;">SOMOS MAAS</span>
              </div>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <h2 style="color: #ffffff; font-size: 28px; font-weight: 900; margin-bottom: 10px; text-align: center;">¡Hola, ${name}! 👋</h2>
              
              <p style="font-size: 18px; line-height: 1.6; text-align: center; color: #94a3b8; margin-top: 0;">
                La espera ha terminado. Nuestra IA ha analizado cada coordenada de tu perfil y tenemos noticias: <span style="color: #22d3ee; font-weight: bold;">Tu potencial es enorme.</span>
              </p>
              
              <div style="margin: 30px 0; padding: 25px; background-color: #0f172a; border-radius: 16px; border-left: 4px solid #e11d48;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #cbd5e1;">
                  Hemos detectado tus superpoderes y las áreas donde puedes acelerar tu carrera para la misión <strong>${missionTitle || 'Estratégica'}</strong>. Este no es solo un PDF, es tu mapa de vuelo para conquistar nuevos mercados.
                </p>
              </div>

              <!-- CTA Button -->
              <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 40px auto;">
                <tr>
                  <td align="center" bgcolor="#e11d48" style="border-radius: 14px;">
                    <a href="https://cv.somosmaas.org" target="_blank" style="display: inline-block; padding: 18px 36px; font-size: 16px; font-weight: 900; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 2px;">
                      DESCARGAR MI REPORTE TÁCTICO
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 16px; line-height: 1.6; text-align: center; color: #94a3b8;">
                Bienvenido a la tribu de <strong>Migrantes de Alta Ambición</strong>. Esto es solo el comienzo de tu ascenso.
              </p>
              
              <p style="font-size: 16px; font-weight: bold; text-align: center; color: #ffffff; margin-top: 40px;">
                Nos vemos en la órbita,<br>
                <span style="color: #e11d48;">El Equipo de Somos MAAS</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; font-size: 12px; color: #64748b; letter-spacing: 1px; text-transform: uppercase; font-weight: bold;">
                Somos MAAS - Elevando el talento global.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    console.log("[API] Transmitiendo vía Resend con nueva identidad visual...");

    const data = await resend.emails.send({
      from: 'Somos MAAS <hola@somosmaas.org>', 
      to: [email],
      reply_to: 'rhfiguer@gmail.com',
      subject: `🚀 ¡Despegue confirmado! Tu Estrategia Profesional está lista`,
      html: emailHtml,
      attachments: [
        {
          content: pdfBase64,
          filename: `Reporte_Tactico_${name.replace(/\s+/g, '_')}.pdf`,
          contentType: 'application/pdf',
        },
      ],
    });

    if (data.error) {
        return res.status(500).json({ error: data.error.message });
    }

    return res.status(200).json({ success: true, id: data.data?.id });

  } catch (error) {
    console.error("[API ERROR]:", error);
    return res.status(500).json({ error: error.message });
  }
}
