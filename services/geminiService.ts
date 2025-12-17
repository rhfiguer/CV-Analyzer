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
      // INTELIGENCIA DE ERRORES:
      // Si el error viene como un JSON stringificado (como el de Gemini 503), lo limpiamos.
      let cleanError = result.error || `Error desconocido del servidor: ${response.status}`;
      
      try {
        // Intentamos detectar si es un JSON raw: {"error": {"code": 503 ...}}
        if (typeof cleanError === 'string' && (cleanError.trim().startsWith('{') || cleanError.includes('"message":'))) {
            const parsed = JSON.parse(cleanError);
            // Extraer el mensaje profundo
            if (parsed.error?.message) cleanError = parsed.error.message;
            else if (parsed.message) cleanError = parsed.message;
        }
      } catch (e) {
        // Si falla el parseo, usamos el string original
      }

      // Traducción a "Lenguaje Cósmico"
      if (cleanError.includes("overloaded") || cleanError.includes("503") || cleanError.includes("UNAVAILABLE")) {
          cleanError = "Sistemas de navegación saturados por alta demanda (Error 503). Por favor, espera 10 segundos e intenta el despegue nuevamente.";
      }

      throw new Error(cleanError);
    }

    // ---------------------------------------------------------
    // CAPA DE SANEAMIENTO DE DATOS (DATA SANITIZATION LAYER)
    // ---------------------------------------------------------
    
    // Problema común: LLMs devuelven 0.87 en lugar de 87 para porcentajes.
    let rawProb = result.probabilidad_exito;
    
    // Si viene como string "85%" o "0.85", limpiarlo
    if (typeof rawProb === 'string') {
        rawProb = parseFloat((rawProb as string).replace('%', ''));
    }

    let finalProb = Number(rawProb);
    
    // Fallback de seguridad si no es un número
    if (isNaN(finalProb)) {
        finalProb = 50; 
    }

    // Heurística: Si el valor es <= 1.0 (ej: 0.85), asumimos notación decimal y convertimos a %.
    // Excepción: Si es exactamente 0 o 1, podría ser ambiguo, pero en contextos de scoring 
    // 1 suele ser 1% (muy bajo) o 100% (decimal). 
    // Dado que 1% es raro en CVs decentes, trataremos 1 como 100%.
    if (finalProb <= 1.0 && finalProb > 0) {
        finalProb = Math.round(finalProb * 100);
    } else {
        finalProb = Math.round(finalProb);
    }

    // Clamp final (asegurar rango 0-100)
    finalProb = Math.max(0, Math.min(100, finalProb));

    const cleanResult: AnalysisResult = {
        ...result,
        probabilidad_exito: finalProb
    };

    return cleanResult;

  } catch (error: any) {
    console.error("Error en la misión de análisis:", error);
    // Propagar el mensaje exacto para mostrarlo en la UI
    throw error;
  }
};