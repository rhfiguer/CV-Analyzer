import { GoogleGenAI, Type } from "@google/genai";

// Inicializar cliente con la API Key del entorno de servidor
// IMPORTANTE: Esta key debe configurarse en Vercel (Settings > Environment Variables) como API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const { fileBase64, mimeType, missionId, name } = req.body;

    // CHECK ESPECÍFICO DE API KEY
    if (!process.env.API_KEY) {
      console.error("Server Error: Missing API_KEY env var");
      return res.status(500).json({ 
        error: 'CONFIGURACIÓN REQUERIDA: Falta la API_KEY de Gemini en las variables de entorno de Vercel.' 
      });
    }

    if (!fileBase64 || !missionId || !name) {
      return res.status(400).json({ error: 'Datos incompletos para la misión.' });
    }

    // Contexto de misión
    let missionContext = "";
    switch (missionId) {
      case 'GLOBAL':
        missionContext = "Mercado Anglosajón y Estados Unidos. Alto nivel de competencia, enfoque en logros cuantificables y formato ATS.";
        break;
      case 'EUROPE':
        missionContext = "Mercado Europeo y Nórdico. Enfoque en equilibrio vida-trabajo, habilidades blandas, idiomas y adaptabilidad cultural.";
        break;
      case 'LOCAL':
        missionContext = "Mercado Local y Latinoamérica. Relaciones interpersonales, lealtad y experiencia regional relevante.";
        break;
      case 'EXPLORATION':
        missionContext = "Trabajo Remoto y Nómada Digital. Autonomía, gestión del tiempo, herramientas asíncronas y comunicación digital.";
        break;
      default:
        missionContext = "Mercado General Tecnológico.";
    }

    const systemInstruction = `
      Eres un experto en reclutamiento intergaláctico y optimización de carreras con rango de Gran Almirante.
      Tu tarea es analizar el CV de un aspirante (Comandante ${name}) para la misión: ${missionContext}.
      
      Analiza el documento proporcionado y genera un reporte estratégico en formato JSON estricto.
      El tono debe ser profesional pero con sutiles referencias espaciales/sci-fi.
      Refierete al usuario por su nombre: ${name}.
      Sé crítico pero motivador.
    `;

    // Schema de respuesta
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

    console.log(`Iniciando análisis para ${name}...`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'application/pdf',
              data: fileBase64
            }
          },
          { text: `Analiza este CV para el Comandante ${name}.` }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("La IA no devolvió respuesta. Intenta de nuevo.");

    return res.status(200).json(JSON.parse(responseText));

  } catch (error) {
    console.error("Error en /api/analyze:", error);
    return res.status(500).json({ error: error.message || "Fallo crítico en el motor de análisis." });
  }
}