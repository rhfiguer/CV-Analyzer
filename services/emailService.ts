import { jsPDF } from "jspdf";

/**
 * Sends the generated PDF report to the Vercel Serverless Function.
 * Secure implementation: No API Keys involved in client-side code.
 */
export const sendEmailReport = async (
  doc: jsPDF,
  email: string,
  name: string,
  missionTitle?: string
): Promise<{ success: boolean; error?: string; id?: string }> => {
  try {
    // 1. Extract Base64 string from jsPDF
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // 2. Setup Timeout Controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for serverless wake-up

    console.log("Contacting Orbital Uplink (/api/send)...");

    // 3. Secure call to our own Backend Endpoint
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        pdfBase64,
        missionTitle
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 4. Handle HTML responses (CRITICAL DEBUGGING STEP)
    // If Vercel crashes or returns 404, it sends HTML, not JSON.
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("CRITICAL API ERROR. Received Non-JSON:", text.substring(0, 200));
        
        if (response.status === 404) {
             throw new Error("Ruta API no encontrada (404). Asegúrate de correr 'vercel dev', no 'npm run dev'.");
        }
        if (response.status === 500) {
             throw new Error("Error interno del servidor (500). Revisa los logs de la función Vercel.");
        }
        throw new Error(`Respuesta inválida del servidor (Status ${response.status}).`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en la transmisión del correo');
    }

    console.log("Uplink successful:", data.id);
    return { success: true, id: data.id };

  } catch (error: any) {
    console.error("Transmission Error:", error);
    let errorMessage = error.message;
    
    if (error.name === 'AbortError') {
        errorMessage = 'Tiempo de espera agotado. El servidor tardó demasiado en responder.';
    }

    return { success: false, error: errorMessage };
  }
};