
import { AnalysisResult, MissionId } from "../types";

/**
 * Converts a File object to a Base64 string.
 */
const fileToGenerativePart = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
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
 */
export const analyzeCV = async (
  file: File, 
  mission: MissionId, 
  email: string,
  name: string,
  marketingConsent: boolean = true
): Promise<AnalysisResult> => {
  
  try {
    const { data, mimeType } = await fileToGenerativePart(file);

    console.log("Transmitting to Command Center...");

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileBase64: data,
        mimeType: mimeType,
        missionId: mission,
        name: name,
        email: email, // Enviado para registro en servidor
        marketingConsent: marketingConsent // Enviado para registro en servidor
      }),
    });

    if (response.status === 413) throw new Error("Archivo demasiado pesado (Máx 3MB).");
    if (response.status === 504) throw new Error("Timeout: La IA tardó demasiado.");
    if (response.status === 429) throw new Error("Límite de velocidad alcanzado. Espera 60s.");

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
       throw new Error(`Error de comunicación con la base (${response.status}).`);
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Error ${response.status}`);
    }

    // Sanitización de probabilidad
    let finalProb = Number(result.probabilidad_exito);
    if (isNaN(finalProb)) finalProb = 50; 
    if (finalProb <= 1.0 && finalProb > 0) finalProb = Math.round(finalProb * 100);
    else finalProb = Math.round(finalProb);
    finalProb = Math.max(0, Math.min(100, finalProb));

    return { ...result, probabilidad_exito: finalProb };

  } catch (error: any) {
    console.error("Analysis Flight Error:", error);
    throw error;
  }
};
