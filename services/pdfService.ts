import { jsPDF } from "jspdf";
import { AnalysisResult } from "../types";

export const generateMissionReport = (result: AnalysisResult, userName: string, userEmail: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = 20;

  // Helper to check for page breaks
  const checkPageBreak = (heightNeeded: number) => {
    if (yPos + heightNeeded > pageHeight - margin) {
      doc.addPage();
      yPos = 20; // Reset to top margin
    }
  };

  // --- Header ---
  doc.setFillColor(15, 23, 42); // Dark Blue / Slate 900
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE MISIÓN: COSMIC CV", margin, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Piloto: ${userName} | ID: ${userEmail}`, margin, 32);

  yPos = 55;

  // --- Score Section ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ESTADO ACTUAL DE LA NAVE", margin, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Rango Asignado: ${result.nivel_actual}`, margin, yPos);
  doc.text(`Probabilidad de Éxito: ${result.probabilidad_exito}%`, margin + 100, yPos);
  
  yPos += 15;

  // --- Analysis ---
  doc.setDrawColor(6, 182, 212); // Cyan
  doc.setLineWidth(0.5);
  doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);

  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ANÁLISIS DE TRAYECTORIA", margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const splitAnalysis = doc.splitTextToSize(result.analisis_mision, contentWidth);
  const analysisHeight = splitAnalysis.length * 5;
  
  checkPageBreak(analysisHeight + 10);
  doc.text(splitAnalysis, margin, yPos);
  yPos += analysisHeight + 10;

  // --- Strengths ---
  checkPageBreak(40);
  doc.setTextColor(34, 197, 94); // Green
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PROPULSORES ACTIVOS (Fortalezas)", margin, yPos);
  yPos += 7;
  
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  result.puntos_fuertes.forEach((point) => {
    const bulletText = `• ${point}`;
    const splitPoint = doc.splitTextToSize(bulletText, contentWidth - 5);
    const pointHeight = splitPoint.length * 5;
    
    checkPageBreak(pointHeight + 2);
    doc.text(splitPoint, margin + 5, yPos);
    yPos += pointHeight + 3;
  });
  yPos += 5;

  // --- Weaknesses ---
  checkPageBreak(40);
  doc.setTextColor(239, 68, 68); // Red
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("FUGAS EN EL CASCO (Áreas de Mejora)", margin, yPos);
  yPos += 7;
  
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  result.brechas_criticas.forEach((point) => {
    const bulletText = `• ${point}`;
    const splitPoint = doc.splitTextToSize(bulletText, contentWidth - 5);
    const pointHeight = splitPoint.length * 5;
    
    checkPageBreak(pointHeight + 2);
    doc.text(splitPoint, margin + 5, yPos);
    yPos += pointHeight + 3;
  });
  yPos += 10;

  // --- Flight Plan (Dynamic Box) ---
  
  // 1. Pre-calculate text wrapping to determine box height
  const flightStepLines = result.plan_de_vuelo.map((step, index) => {
    const text = `${index + 1}. ${step}`;
    // Indent text slightly inside box
    return doc.splitTextToSize(text, contentWidth - 10);
  });

  let totalTextHeight = 0;
  flightStepLines.forEach(lines => {
    totalTextHeight += (lines.length * 5) + 4; // 5 units per line + 4 units gap
  });

  const boxHeaderHeight = 15;
  const boxPaddingBottom = 5;
  const totalBoxHeight = boxHeaderHeight + totalTextHeight + boxPaddingBottom;

  checkPageBreak(totalBoxHeight + 10);

  // 2. Draw Box Background
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.roundedRect(margin, yPos, contentWidth, totalBoxHeight, 3, 3, 'F');
  
  // 3. Draw Box Content
  const boxStartY = yPos;
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("PLAN DE VUELO SUGERIDO", margin + 5, boxStartY + 10);
  
  let currentTextY = boxStartY + 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  flightStepLines.forEach(lines => {
    doc.text(lines, margin + 5, currentTextY);
    currentTextY += (lines.length * 5) + 4;
  });
  
  // --- Footer on all pages ---
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount} - Generado por IA - Cosmic CV Analyzer`, 
      pageWidth / 2, 
      pageHeight - 10, 
      { align: "center" }
    );
  }

  return doc;
};