import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, MissionId } from "../types";

/**
 * Converts a File object to a Base64 string.
 */
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Simulates the Server Action `analyzeCV`.
 * Note: In a real Next.js environment, we would use `GoogleAIFileManager` to upload the file,
 * poll for state, and then delete it. In this browser-based demo, we use `inlineData` 
 * (Base64) which is supported by Gemini 2.5 Flash for PDFs.
 */
export const analyzeCV = async (
  file: File, 
  mission: MissionId, 
  email: string,
  name: string
): Promise<AnalysisResult> => {
  
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare the file for the model
  const filePart = await fileToGenerativePart(file);

  // Construct the prompt based on the mission
  let missionContext = "";
  switch (mission) {
    case MissionId.GLOBAL:
      missionContext = "Mercado Anglosajón y Estados Unidos. Alto nivel de competencia, enfoque en logros cuantificables y formato ATS.";
      break;
    case MissionId.EUROPE:
      missionContext = "Mercado Europeo y Nórdico. Enfoque en equilibrio vida-trabajo, habilidades blandas, idiomas y adaptabilidad cultural.";
      break;
    case MissionId.LOCAL:
      missionContext = "Mercado Local y Latinoamérica. Relaciones interpersonales, lealtad y experiencia regional relevante.";
      break;
    case MissionId.EXPLORATION:
      missionContext = "Trabajo Remoto y Nómada Digital. Autonomía, gestión del tiempo, herramientas asíncronas y comunicación digital.";
      break;
  }

  const systemInstruction = `
    Eres un experto en reclutamiento intergaláctico y optimización de carreras con rango de Gran Almirante.
    Tu tarea es analizar el CV de un aspirante (Comandante ${name}) para la misión: ${missionContext}.
    
    Analiza el documento proporcionado y genera un reporte estratégico en formato JSON.
    El tono debe ser profesional pero con sutiles referencias espaciales/sci-fi (usar términos como "trayectoria", "propulsores", "órbita", "despegue").
    Refierete al usuario por su nombre: ${name}.
    Sé crítico pero motivador.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          filePart,
          { text: `Analiza este CV para el Comandante ${name} basándote en la misión seleccionada.` }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nivel_actual: {
              type: Type.STRING,
              description: "Nivel de seniority con rango espacial (ej: Cadete, Comandante, Almirante).",
            },
            probabilidad_exito: {
              type: Type.NUMBER,
              description: "Probabilidad estimada de éxito en la misión (0-100).",
            },
            analisis_mision: {
              type: Type.STRING,
              description: "Feedback detallado sobre el encaje con la misión específica.",
            },
            puntos_fuertes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 3-5 fortalezas clave.",
            },
            brechas_criticas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 3-5 áreas que faltan o necesitan mejora urgente.",
            },
            plan_de_vuelo: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 pasos accionables y concretos para mejorar el perfil.",
            },
          },
          required: ["nivel_actual", "probabilidad_exito", "analisis_mision", "puntos_fuertes", "brechas_criticas", "plan_de_vuelo"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    } else {
      throw new Error("No se recibió respuesta de la IA.");
    }
  } catch (error) {
    console.error("Error en la misión:", error);
    throw error;
  }
};