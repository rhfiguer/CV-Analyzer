const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  // Configuración de CORS
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

    if (!process.env.RESEND_API_KEY) {
       console.error("Missing RESEND_API_KEY");
       return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    if (!email || !name || !pdfBase64) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailHtml = `
      <div style="font-family: sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 8px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
          <h1 style="color: #22d3ee; margin-top: 0;">Reporte de Misión Generado</h1>
          <p style="font-size: 16px; line-height: 1.6;">Saludos, Comandante <strong>${name}</strong>.</p>
          <p style="font-size: 16px; line-height: 1.6;">
            La Inteligencia Artificial de la flota ha completado el análisis de tu perfil para la misión: 
            <strong style="color: #f472b6;">${missionTitle || 'Operación Clasificada'}</strong>.
          </p>
          <div style="background-color: #0f172a; padding: 15px; border-left: 4px solid #22d3ee; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #94a3b8;">
              Estado de transmisión: <strong>COMPLETADO</strong><br/>
              Archivo adjunto: <strong>Reporte Táctico (PDF)</strong>
            </p>
          </div>
          <p style="font-size: 14px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #334155; padding-top: 20px;">
            Cosmic CV Analyzer - Sistema de Reclutamiento Interestelar.<br/>
            Este es un mensaje automático. No responder a esta frecuencia.
          </p>
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: 'Cosmic CV <onboarding@resend.dev>',
      to: [email],
      subject: `🚀 Reporte de Misión: ${name}`,
      html: emailHtml,
      attachments: [
        {
          content: pdfBase64,
          filename: `Mision_Cosmica_${name.replace(/\s+/g, '_')}.pdf`,
          contentType: 'application/pdf',
        },
      ],
    });

    if (data.error) {
        console.error("Resend API Error:", data.error);
        return res.status(500).json({ error: data.error.message });
    }

    return res.status(200).json({ success: true, id: data.data?.id });

  } catch (error) {
    console.error("Serverless Function Critical Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};