
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Inicialización de Supabase en Servidor
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
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
    const { fileBase64, mimeType, missionId, name, email, marketingConsent } = req.body;

    console.log(`[ANALYZER] 🚀 Iniciando análisis para: ${name} (${email}) | Misión: ${missionId}`);

    if (!process.env.API_KEY) {
      console.error("[ERROR] Missing API_KEY");
      return res.status(500).json({ error: 'Configuration Error: Missing API Key' });
    }

    // --- REGISTRO DE LEAD CON UPSERT (LÓGICA DEFINITIVA) ---
    if (supabase && email) {
      try {
        const cleanEmail = email.toLowerCase().trim();
        console.log(`[DB] Sincronizando lead (upsert) para ${cleanEmail}...`);
        
        const { error: dbError } = await supabase
          .from('cosmic_cv_leads')
          .upsert({
            email: cleanEmail,
            name: name,
            marketing_consent: marketingConsent || false,
            mission_id: missionId
          }, { onConflict: 'email' });

        if (dbError) console.error("[DB ERROR] Fallo en upsert:", dbError.message);
        else console.log(`[DB SUCCESS] Lead sincronizado correctamente.`);
      } catch (dbEx) {
        console.error("[DB CRITICAL] Error de conexión:", dbEx.message);
      }
    }

    if (!fileBase64 || !missionId || !name) {
      return res.status(400).json({ error: 'Payload incompleto' });
    }

    // Contexto de misión
    let missionContext = "";
    switch (missionId) {
      case 'GLOBAL': missionContext = "Mercado Anglosajón/USA. Formato ATS, logros cuantificables."; break;
      case 'EUROPE': missionContext = "Mercado Europeo. Habilidades blandas y adaptabilidad."; break;
      case 'LOCAL': missionContext = "Mercado Local/Latam. Relaciones y experiencia regional."; break;
      case 'EXPLORATION': missionContext = "Remoto/Nómada Digital. Autonomía y herramientas digitales."; break;
      default: missionContext = "Mercado General.";
    }

    const systemInstruction = `Eres un Almirante experto en reclutamiento intergaláctico. Analiza el CV de ${name} para la misión: ${missionContext}. Refiérete a él por su nombre. Sé táctico, crítico y motiva al despegue. Devuelve JSON estricto.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        nivel_actual: { type: Type.STRING },
        probabilidad_exito: { type: Type.NUMBER },
        analisis_mision: { type: Type.STRING },
        puntos_fuertes: { type: Type.ARRAY, items: { type: Type.STRING } },
        brechas_criticas: { type: Type.ARRAY, items: { type: Type.STRING } },
        plan_de_vuelo: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["nivel_actual", "probabilidad_exito", "analisis_mision", "puntos_fuertes", "brechas_criticas", "plan_de_vuelo"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType || 'application/pdf', data: fileBase64 } },
          { text: `Analiza este CV para ${name}.` }
        ]
      },
      config: { systemInstruction, responseMimeType: "application/json", responseSchema },
    });

    return res.status(200).json(JSON.parse(response.text));

  } catch (error) {
    console.error("[ERROR CRÍTICO]:", error);
    return res.status(500).json({ error: error.message });
  }
}
