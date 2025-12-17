import { GoogleGenAI, Type } from "@google/genai";

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

    if (!process.env.API_KEY) {
      console.error("Server Error: Missing API_KEY");
      return res.status(500).json({ error: 'Configuration Error: Missing API Key' });
    }

    if (!fileBase64 || !missionId || !name) {
      return res.status(400).json({ error: 'Payload incompleto' });
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

      INSTRUCCIONES CRÍTICAS DE FORMATO:
      1. 'nivel_actual': DEBE ser un TÍTULO CORTO de rango (MÁXIMO 3 a 5 palabras). Ej: "Comandante Senior", "Estratega Táctico".
      2. 'probabilidad_exito': DEBE ser un número ENTERO entre 0 y 100. (Ejemplo: 85, NO 0.85).
      3. 'analisis_mision': Resumen del perfil y justificación del rango.
      4. 'puntos_fuertes' y 'brechas_criticas': Items concisos.
    `;

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

    console.log(`Iniciando análisis para ${name} (Misión: ${missionId})...`);

    let response;
    
    // ESTRATEGIA DE INTENTO ÚNICO + FALLBACK (Sin esperas para no agotar los 10s de Vercel)
    try {
      // Intento 1: Modelo Principal (Gemini 2.5 Flash)
      console.log("Intentando con gemini-2.5-flash...");
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType || 'application/pdf', data: fileBase64 } },
            { text: `Analiza este CV para el Comandante ${name}.` }
          ]
        },
        config: { systemInstruction, responseMimeType: "application/json", responseSchema },
      });
    } catch (primaryError) {
      console.warn("Fallo modelo primario:", primaryError.message);
      
      // Si es error 503 (Sobrecarga), intentamos inmediatamente con el modelo anterior (más estable)
      if (primaryError.message?.includes('503') || primaryError.status === 503) {
          console.log("⚠️ 2.5 Saturado. Activando propulsores auxiliares (gemini-2.0-flash)...");
          try {
            response = await ai.models.generateContent({
                model: "gemini-2.0-flash", // Fallback a versión anterior estable
                contents: {
                  parts: [
                    { inlineData: { mimeType: mimeType || 'application/pdf', data: fileBase64 } },
                    { text: `Analiza este CV para el Comandante ${name}.` }
                  ]
                },
                config: { systemInstruction, responseMimeType: "application/json", responseSchema },
            });
          } catch (secondaryError) {
             console.error("Fallo total de motores.");
             throw secondaryError; // Si falla el backup, lanzamos el error original
          }
      } else {
          throw primaryError; // Si no es 503 (ej: 400 Bad Request), fallar directo
      }
    }

    const responseText = response?.text;
    if (!responseText) throw new Error("La IA no devolvió respuesta.");

    return res.status(200).json(JSON.parse(responseText));

  } catch (error) {
    console.error("Error crítico en /api/analyze:", error);
    
    const statusCode = error.status || 500;
    let errorMessage = error.message || "Fallo crítico en el motor de análisis.";

    if (errorMessage.includes('Quota')) {
        return res.status(429).json({ error: "Límite de cuota alcanzado." });
    }

    return res.status(statusCode).json({ error: errorMessage });
  }
}