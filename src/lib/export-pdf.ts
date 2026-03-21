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
  doc.setFontSize(12);
  doc.setTextColor(180, 180, 180);
  doc.text("人生作業系統", margin + 30, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(reportTitle, margin, 32);

  if (subtitle) {
    doc.setFontSize(18);
    doc.setTextColor(180, 180, 180);
    doc.text(subtitle, margin, 40);
  }

  // Meta info — 姓名 18pt, 日期 16pt
  doc.setFontSize(18);
  doc.setTextColor(237, 237, 239);
  doc.text(userName, pageWidth - margin, 32, { align: "right" });
  doc.setFontSize(16);
  doc.setTextColor(150, 150, 150);
  doc.text(date, pageWidth - margin, 40, { align: "right" });

  y = 50;

  // Sections
  for (const section of sections) {
    checkPageBreak(30);

    // Section title — 14pt
    doc.setFillColor(212, 175, 55);
    doc.rect(margin, y, 3, 7, "F");
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text(section.title, margin + 6, y + 6);
    y += 14;

    if (typeof section.content === "string") {
      // Text content — 14pt
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(section.content || "(未填寫)", contentWidth - 6);
      checkPageBreak(lines.length * 6 + 5);
      doc.text(lines, margin + 6, y);
      y += lines.length * 6 + 8;
    } else {
      // Key-value pairs
      for (const item of section.content) {
        checkPageBreak(20);
        // label — 12pt
        doc.setFontSize(12);
        doc.setTextColor(120, 120, 120);
        doc.text(item.label, margin + 6, y);
        y += 6;
        // value — 14pt
        doc.setFontSize(14);
        doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(item.value || "(未填寫)", contentWidth - 10);
        doc.text(lines, margin + 10, y);
        y += lines.length * 6 + 6;
      }
    }

    // Separator
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // Footer — 18pt gold
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).getNumberOfPages() as number;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(18);
    doc.setTextColor(212, 175, 55);
    doc.text("HOPE 人生作業系統", pageWidth / 2, 284, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`第 ${i} / ${pageCount} 頁`, pageWidth / 2, 290, { align: "center" });
  }

  // Download
  const fileName = `HOPE_${reportTitle}_${date}.pdf`;
  doc.save(fileName);
}

// =============================================
// 日報表專用 PDF：單頁表格式排版
// =============================================

interface DailyPDFData {
  userName: string;
  date: string;
  dayNumber: number;
  planRound?: number;
  energyState: number;
  mostImportantThing: string;
  beliefs: { label: string; checked: boolean }[];
  selfDeclaration: string;
  awarenessImprove: string;
  awarenessNotice: string;
  learningContent: string;
  learningSources: { label: string; checked: boolean }[];
  actionContent: string;
  actionDomains: { label: string; checked: boolean }[];
  sharingContent: string;
  gratitude: string;
  dailyScore: number;
  compareYesterday: string;
  scoreNote: string;
  tomorrowAction: string;
  announcedInGroup: boolean;
}

export async function exportDailyPDF(data: DailyPDFData) {
  const doc = new jsPDF("p", "mm", "a4");
  await loadChineseFont(doc);

  const pw = doc.internal.pageSize.getWidth(); // 210
  const m = 12; // margin
  const w = pw - m * 2; // content width
  let y = 0;

  // --- 頂部標題列 ---
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pw, 22, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 22, pw, 0.8, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(18);
  doc.text("HOPE", m, 10);
  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  doc.text("人生作業系統", m + 24, 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("21天行動系統日報表", m, 18);

  // 姓名 + 日期
  doc.setFontSize(11);
  doc.setTextColor(237, 237, 239);
  const roundText = data.planRound ? `第${data.planRound}輪` : "";
  doc.text(`${data.userName}  |  Day ${data.dayNumber} ${roundText}`, pw - m, 12, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text(data.date, pw - m, 18, { align: "right" });

  y = 26;

  const gray = (v: number) => doc.setTextColor(v, v, v);
  const gold = () => doc.setTextColor(212, 175, 55);
  const drawBox = (x: number, by: number, bw: number, bh: number) => {
    doc.setDrawColor(220, 220, 220);
    doc.rect(x, by, bw, bh);
  };

  // helper: section title bar — 10pt
  function sectionTitle(title: string, x: number, sy: number, sw: number) {
    doc.setFillColor(212, 175, 55);
    doc.rect(x, sy, sw, 7, "F");
    doc.setFontSize(10);
    doc.setTextColor(10, 10, 10);
    doc.text(title, x + 2, sy + 5);
    return sy + 7;
  }

  // helper: 勾選項 (compact) — 9pt
  function drawChecks(items: { label: string; checked: boolean }[], x: number, cy: number, colWidth: number) {
    doc.setFontSize(9);
    let cx = x + 2;
    for (const item of items) {
      gray(item.checked ? 50 : 160);
      doc.text((item.checked ? "[v] " : "[  ] ") + item.label, cx, cy);
      cx += colWidth;
    }
  }

  // ---- 基本資訊列 ----
  const infoH = 10;
  drawBox(m, y, w * 0.25, infoH);
  drawBox(m + w * 0.25, y, w * 0.25, infoH);
  drawBox(m + w * 0.5, y, w * 0.5, infoH);

  doc.setFontSize(8); gray(120);
  doc.text("日期", m + 2, y + 3.5);
  doc.text("能量狀態", m + w * 0.25 + 2, y + 3.5);
  doc.text("今天最重要的一件事", m + w * 0.5 + 2, y + 3.5);

  doc.setFontSize(10); gray(30);
  doc.text(data.date, m + 2, y + 8);
  gold();
  doc.text(`${data.energyState} / 10`, m + w * 0.25 + 2, y + 8);
  doc.setFontSize(9); gray(30);
  const mitLines = doc.splitTextToSize(data.mostImportantThing || "", w * 0.5 - 4);
  doc.text(mitLines.slice(0, 1), m + w * 0.5 + 2, y + 8);

  y += infoH;

  // ---- PART 1 晨間信念打卡 ----
  const p1H = 18;
  const halfW = w / 2;

  y = sectionTitle("PART 1 晨間信念打卡", m, y, halfW);
  const p1Top = y;
  drawBox(m, y, halfW, p1H);
  drawChecks(data.beliefs.slice(0, 3), m, y + 4, halfW / 3);
  drawChecks(data.beliefs.slice(3), m, y + 8, halfW / 2);
  doc.setFontSize(8); gray(120);
  doc.text("自我宣言", m + 2, y + 12);
  doc.setFontSize(9); gray(50);
  const declLines = doc.splitTextToSize(data.selfDeclaration || "", halfW - 4);
  doc.text(declLines.slice(0, 1), m + 2, y + 15.5);

  // ---- PART 2 今日覺察 (右半) ----
  sectionTitle("PART 2 今日覺察", m + halfW, p1Top - 7, halfW);
  drawBox(m + halfW, p1Top, halfW, p1H);
  doc.setFontSize(8); gray(120);
  doc.text("可以更好的地方", m + halfW + 2, p1Top + 3.5);
  doc.setFontSize(9); gray(50);
  const aw1 = doc.splitTextToSize(data.awarenessImprove || "", halfW - 4);
  doc.text(aw1.slice(0, 2), m + halfW + 2, p1Top + 7);
  doc.setFontSize(8); gray(120);
  doc.text("覺察到什麼", m + halfW + 2, p1Top + 12.5);
  doc.setFontSize(9); gray(50);
  const aw2 = doc.splitTextToSize(data.awarenessNotice || "", halfW - 4);
  doc.text(aw2.slice(0, 1), m + halfW + 2, p1Top + 16);

  y = p1Top + p1H;

  // ---- PART 3 今日學習 + PART 4 今日行動 ----
  const p3H = 18;
  y = sectionTitle("PART 3 今日學習", m, y, halfW);
  const p3Top = y;
  drawBox(m, y, halfW, p3H);
  doc.setFontSize(9); gray(50);
  const lcLines = doc.splitTextToSize(data.learningContent || "", halfW - 4);
  doc.text(lcLines.slice(0, 2), m + 2, y + 4);
  doc.setFontSize(8); gray(120);
  doc.text("來源", m + 2, y + 11);
  drawChecks(data.learningSources, m, y + 14.5, (halfW - 4) / 5);

  sectionTitle("PART 4 今日行動", m + halfW, p3Top - 7, halfW);
  drawBox(m + halfW, p3Top, halfW, p3H);
  doc.setFontSize(9); gray(50);
  const acLines = doc.splitTextToSize(data.actionContent || "", halfW - 4);
  doc.text(acLines.slice(0, 2), m + halfW + 2, p3Top + 4);
  doc.setFontSize(8); gray(120);
  doc.text("領域", m + halfW + 2, p3Top + 11);
  drawChecks(data.actionDomains, m + halfW, p3Top + 14.5, (halfW - 4) / 5);

  y = p3Top + p3H;

  // ---- PART 5 今日分享 + PART 6 感恩時刻 ----
  const p5H = 16;
  y = sectionTitle("PART 5 今日分享", m, y, halfW);
  const p5Top = y;
  drawBox(m, y, halfW, p5H);
  doc.setFontSize(9); gray(50);
  const shLines = doc.splitTextToSize(data.sharingContent || "", halfW - 4);
  doc.text(shLines.slice(0, 3), m + 2, y + 4);

  sectionTitle("PART 6 感恩時刻", m + halfW, p5Top - 7, halfW);
  drawBox(m + halfW, p5Top, halfW, p5H);
  doc.setFontSize(9); gray(50);
  const grLines = doc.splitTextToSize(data.gratitude || "", halfW - 4);
  doc.text(grLines.slice(0, 3), m + halfW + 2, p5Top + 4);

  y = p5Top + p5H;

  // ---- PART 7 今日評分 + PART 8 明日行動 ----
  const p7H = 18;
  y = sectionTitle("PART 7 今日評分", m, y, halfW);
  const p7Top = y;
  drawBox(m, y, halfW, p7H);
  doc.setFontSize(10); gold();
  doc.text(`${data.dailyScore} / 10`, m + 2, y + 5);
  doc.setFontSize(9); gray(80);
  doc.text(`比昨天：${data.compareYesterday === "better" ? "好" : data.compareYesterday === "worse" ? "差" : "—"}`, m + 22, y + 5);
  doc.setFontSize(8); gray(120);
  doc.text("自評說明", m + 2, y + 9.5);
  doc.setFontSize(9); gray(50);
  const snLines = doc.splitTextToSize(data.scoreNote || "", halfW - 4);
  doc.text(snLines.slice(0, 2), m + 2, y + 13);

  sectionTitle("PART 8 明日行動", m + halfW, p7Top - 7, halfW);
  drawBox(m + halfW, p7Top, halfW, p7H);
  doc.setFontSize(9); gray(50);
  const tmLines = doc.splitTextToSize(data.tomorrowAction || "", halfW - 4);
  doc.text(tmLines.slice(0, 4), m + halfW + 2, p7Top + 4);

  y = p7Top + p7H;

  // ---- 群組公佈 ----
  y += 2;
  doc.setFontSize(9);
  gray(data.announcedInGroup ? 50 : 160);
  doc.text((data.announcedInGroup ? "[v]" : "[  ]") + " 已在群裡完成公佈", m + 2, y + 3);

  // ---- Footer — 12pt gold ----
  doc.setFontSize(12);
  doc.setTextColor(212, 175, 55);
  doc.text("HOPE 人生作業系統", pw / 2, 287, { align: "center" });

  doc.save(`HOPE_日報表_Day${data.dayNumber}_${data.date}.pdf`);
}
