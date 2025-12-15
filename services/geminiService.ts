import { AnalysisResult, MissionId } from "../types";

/**
 * Converts a File object to a Base64 string.
 */
const fileToGenerativePart = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        data: base64Data,
        mimeType: file.type
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Sends the CV to the secure backend for analysis.
 * Replaces direct client-side API calls.
 */
export const analyzeCV = async (
  file: File, 
  mission: MissionId, 
  email: string,
  name: string
): Promise<AnalysisResult> => {
  
  try {
    // 1. Prepare file payload (Base64)
    const { data, mimeType } = await fileToGenerativePart(file);

    console.log("Contacting Central Command (/api/analyze)...");

    // 2. Call the Vercel Serverless Function
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileBase64: data,
        mimeType: mimeType,
        missionId: mission,
        name: name
      }),
    });

    // 3. Robust Error Handling
    const contentType = response.headers.get("content-type");
    
    // Si la respuesta no es JSON (ej: es HTML de error 404 o 500 de Vercel por defecto)
    if (!contentType || !contentType.includes("application/json")) {
       const text = await response.text();
       console.error("Respuesta no válida del servidor:", text.substring(0, 200));
       
       if (response.status === 404) {
         throw new Error("ERROR DE CONEXIÓN: El endpoint /api/analyze no está disponible. Si estás en local, asegúrate de usar 'vercel dev' para que funcionen las API routes.");
       }
       throw new Error(`Error del servidor (${response.status}). Verifica los logs de Vercel.`);
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Error desconocido del servidor: ${response.status}`);
    }

    return result as AnalysisResult;

  } catch (error: any) {
    console.error("Error en la misión de análisis:", error);
    // Propagar el mensaje exacto para mostrarlo en la UI
    throw error;
  }
};