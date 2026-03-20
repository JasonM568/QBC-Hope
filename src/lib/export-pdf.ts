import jsPDF from "jspdf";

// Load Noto Sans TC font for Chinese support
let fontLoaded = false;
let fontBase64 = "";

async function loadChineseFont(doc: jsPDF) {
  if (fontLoaded && fontBase64) {
    doc.addFileToVFS("NotoSansTC-Regular.ttf", fontBase64);
    doc.addFont("NotoSansTC-Regular.ttf", "NotoSansTC", "normal");
    doc.setFont("NotoSansTC");
    return;
  }

  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-tc@latest/chinese-traditional-400-normal.ttf"
    );
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    fontBase64 = btoa(binary);
    doc.addFileToVFS("NotoSansTC-Regular.ttf", fontBase64);
    doc.addFont("NotoSansTC-Regular.ttf", "NotoSansTC", "normal");
    doc.setFont("NotoSansTC");
    fontLoaded = true;
  } catch {
    // Fallback: won't render Chinese perfectly but won't crash
    console.warn("Failed to load Chinese font, using default");
  }
}

interface PDFSection {
  title: string;
  content: string | { label: string; value: string }[];
}

interface PDFOptions {
  reportTitle: string;
  subtitle?: string;
  date: string;
  userName: string;
  sections: PDFSection[];
}

export async function exportPDF(options: PDFOptions) {
  const { reportTitle, subtitle, date, userName, sections } = options;
  const doc = new jsPDF("p", "mm", "a4");

  await loadChineseFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  function checkPageBreak(needed: number) {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  }

  // Header bar
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, 45, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 45, pageWidth, 1, "F");

  // Title
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(22);
  doc.text("HOPE", margin, 18);
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text("人生作業系統", margin + 30, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(reportTitle, margin, 30);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text(subtitle, margin, 38);
  }

  // Meta info
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`${userName}  |  ${date}`, pageWidth - margin, 38, { align: "right" });

  y = 55;

  // Sections
  for (const section of sections) {
    checkPageBreak(30);

    // Section title
    doc.setFillColor(212, 175, 55);
    doc.rect(margin, y, 3, 7, "F");
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(section.title, margin + 6, y + 6);
    y += 12;

    if (typeof section.content === "string") {
      // Text content
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(section.content || "(未填寫)", contentWidth - 6);
      checkPageBreak(lines.length * 5 + 5);
      doc.text(lines, margin + 6, y);
      y += lines.length * 5 + 8;
    } else {
      // Key-value pairs
      for (const item of section.content) {
        checkPageBreak(20);
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(item.label, margin + 6, y);
        y += 5;
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(item.value || "(未填寫)", contentWidth - 10);
        doc.text(lines, margin + 10, y);
        y += lines.length * 5 + 5;
      }
    }

    // Separator
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // Footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).getNumberOfPages() as number;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `HOPE 人生作業系統  |  第 ${i} / ${pageCount} 頁`,
      pageWidth / 2,
      287,
      { align: "center" }
    );
  }

  // Download
  const fileName = `HOPE_${reportTitle}_${date}.pdf`;
  doc.save(fileName);
}
