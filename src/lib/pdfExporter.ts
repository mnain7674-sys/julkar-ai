import { jsPDF } from "jspdf";
import { Message, Conversation, SavedPdfDoc } from "../types";

/**
 * Clean text stripper for PDF generation
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (match) => {
      // Keep code contents but strip backticks
      return match.replace(/```\w*\n?/g, "").replace(/```/g, "");
    })
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_#\-]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

/**
 * Generate PDF for a single message or response
 */
export function generateMessagePdf(
  message: Message,
  chatTitle = "JOXIQ AI Response Report"
): { savedDoc: SavedPdfDoc; pdfDataUrl: string } {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("JOXIQ AI — Official Document & Report", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateStr = new Date(message.timestamp).toLocaleString();
  doc.text(`Generated: ${dateStr}  |  Session: ${chatTitle}`, margin, 22);

  let yCursor = 36;

  // Message metadata badge
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, yCursor, contentWidth, 10, 2, 2, "F");
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Role: ${message.role === "assistant" ? "JOXIQ AI Assistant" : "User"}`, margin + 4, yCursor + 6.5);

  yCursor += 16;

  // Clean content lines
  const cleanContent = stripMarkdown(message.content);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  const lines = doc.splitTextToSize(cleanContent, contentWidth);

  for (let i = 0; i < lines.length; i++) {
    if (yCursor > pageHeight - 20) {
      doc.addPage();
      yCursor = 20;

      // Header on new page
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`JOXIQ AI Document Export — Page ${doc.getNumberOfPages()}`, margin, 12);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 14, pageWidth - margin, 14);
      yCursor = 22;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
    }

    doc.text(lines[i], margin, yCursor);
    yCursor += 5.5;
  }

  // Footer on last page
  yCursor = Math.max(yCursor + 10, pageHeight - 15);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated securely by JOXIQ AI • https://joxiq.ai", margin, pageHeight - 9);

  const fileName = `JOXIQ_AI_${chatTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25)}_${Date.now()}.pdf`;
  doc.save(fileName);

  const pdfDataUrl = doc.output("datauristring");
  const estSizeKb = Math.round((pdfDataUrl.length * 0.75) / 1024);

  const savedDoc: SavedPdfDoc = {
    id: `pdf_${Math.random().toString(36).substring(2, 11)}`,
    title: `${chatTitle} (PDF Report)`,
    timestamp: Date.now(),
    messageId: message.id,
    contentSnippet: cleanContent.slice(0, 120) + "...",
    pdfDataUrl,
    fileSize: `${estSizeKb} KB`,
  };

  return { savedDoc, pdfDataUrl };
}

/**
 * Generate full conversation history PDF
 */
export function generateConversationPdf(conversation: Conversation): { savedDoc: SavedPdfDoc; pdfDataUrl: string } {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("JOXIQ AI — Complete Chat History Export", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  const dateStr = new Date(conversation.timestamp).toLocaleString();
  doc.text(`Title: ${conversation.title}  |  Exported: ${dateStr}  |  Model: ${conversation.model}`, margin, 23);

  let yCursor = 40;

  for (let idx = 0; idx < conversation.messages.length; idx++) {
    const msg = conversation.messages[idx];
    const isUser = msg.role === "user";

    // Speaker header box
    if (yCursor > pageHeight - 35) {
      doc.addPage();
      yCursor = 20;
    }

    if (isUser) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setTextColor(30, 41, 59);
    } else {
      doc.setFillColor(238, 242, 255); // indigo-50
      doc.setTextColor(67, 56, 202); // indigo-700
    }

    doc.roundedRect(margin, yCursor, contentWidth, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const msgTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    doc.text(`${isUser ? "👤 User" : "🤖 JOXIQ AI"} — ${msgTime}`, margin + 4, yCursor + 5.5);

    yCursor += 12;

    // Check for image/attachment mention
    if (msg.image) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("📷 [Attached Image / Photo Included in Session]", margin + 4, yCursor);
      yCursor += 6;
    }

    const cleanContent = stripMarkdown(msg.content);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    const lines = doc.splitTextToSize(cleanContent, contentWidth);

    for (let i = 0; i < lines.length; i++) {
      if (yCursor > pageHeight - 20) {
        doc.addPage();
        yCursor = 20;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`JOXIQ AI Chat History Export — Page ${doc.getNumberOfPages()}`, margin, 12);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, 14, pageWidth - margin, 14);
        yCursor = 22;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
      }

      doc.text(lines[i], margin, yCursor);
      yCursor += 5;
    }

    yCursor += 8; // spacing between messages
  }

  // Footer on last page
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("JOXIQ AI Chat History Backup Document • https://joxiq.ai", margin, pageHeight - 9);

  const safeTitle = conversation.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  const fileName = `JOXIQ_Chat_PDF_${safeTitle}_${Date.now()}.pdf`;
  doc.save(fileName);

  const pdfDataUrl = doc.output("datauristring");
  const estSizeKb = Math.round((pdfDataUrl.length * 0.75) / 1024);

  const savedDoc: SavedPdfDoc = {
    id: `pdf_chat_${Math.random().toString(36).substring(2, 11)}`,
    title: `${conversation.title} (Full PDF Document)`,
    timestamp: Date.now(),
    contentSnippet: `Complete chat history export with ${conversation.messages.length} messages.`,
    pdfDataUrl,
    fileSize: `${estSizeKb} KB`,
  };

  return { savedDoc, pdfDataUrl };
}

