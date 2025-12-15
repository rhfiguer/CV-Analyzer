const { GoogleGenAI } = require("@google/genai");

// Inicializar cliente con la API Key del entorno de servidor (seguro)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

module.exports = async (req, res) => {
  // 1. Configuración CORS (Permitir peticiones desde el frontend)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Manejo de preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Extraer datos del cuerpo JSON
    const { fileBase64, mimeType, missionId, name } = req.body;

    if (!process.env.API_KEY) {
      console.error("Server Error: Missing API_KEY in environment variables.");
      return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
    }

    if (!fileBase64 || !missionId || !name) {
      return res.status(400).json({ error: 'Faltan datos requeridos (archivo, misión o nombre).' });
    }

    // 3. Construir el contexto de la misión (Lógica movida del frontend al backend)
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

    // 4. Configuración del Schema de respuesta (JSON Estricto)
    // Definimos el esquema manualmente para asegurar consistencia
    const responseSchema = {
      type: "OBJECT",
      properties: {
        nivel_actual: {
          type: "STRING",
          description: "Nivel de seniority con rango espacial (ej: Cadete, Comandante, Almirante).",
        },
        probabilidad_exito: {
          type: "NUMBER",
          description: "Probabilidad estimada de éxito en la misión (0-100).",
        },
        analisis_mision: {
          type: "STRING",
          description: "Feedback detallado sobre el encaje con la misión específica.",
        },
        puntos_fuertes: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Lista de 3-5 fortalezas clave.",
        },
        brechas_criticas: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Lista de 3-5 áreas que faltan o necesitan mejora urgente.",
        },
        plan_de_vuelo: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "3 pasos accionables y concretos para mejorar el perfil.",
        },
      },
      required: ["nivel_actual", "probabilidad_exito", "analisis_mision", "puntos_fuertes", "brechas_criticas", "plan_de_vuelo"],
    };

    console.log(`Iniciando análisis para ${name} en misión ${missionId}...`);

    // 5. Llamada a Gemini (usando gemini-2.5-flash para mejor rendimiento y JSON mode)
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

    // 6. Procesar y devolver respuesta
    const responseText = response.text();
    
    if (!responseText) {
      throw new Error("Gemini no devolvió texto.");
    }

    const jsonResult = JSON.parse(responseText);
    
    return res.status(200).json(jsonResult);

  } catch (error) {
    console.error("Error en /api/analyze:", error);
    return res.status(500).json({ 
      error: error.message || "Fallo crítico en el motor de análisis.",
      details: error.toString()
    });
  }
};