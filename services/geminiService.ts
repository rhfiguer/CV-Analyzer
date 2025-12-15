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

    // 3. Handle Errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle HTML/404 errors (Vercel specific)
      if (response.status === 404) {
        throw new Error("Error de conexión: No se encuentra el endpoint /api/analyze. Asegúrate de usar 'vercel dev'.");
      }
      
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    // 4. Return JSON Result
    const result = await response.json();
    return result as AnalysisResult;

  } catch (error: any) {
    console.error("Error en la misión de análisis:", error);
    throw error;
  }
};