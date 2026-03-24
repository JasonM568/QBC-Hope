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

  const pw = 210; // A4 width
  const ph = 297; // A4 height
  const m = 12;   // margin
  const w = pw - m * 2;
  const halfW = w / 2;
  const lineH = 4.5;   // 9pt 行高
  const cellPad = 3;    // 格內邊距
  const titleBarH = 7;  // 標題列高度
  const textW = halfW - cellPad * 2; // 格內文字寬度

  const gray = (v: number) => doc.setTextColor(v, v, v);
  const gold = () => doc.setTextColor(212, 175, 55);

  // helper: 量測文字換行後行數
  function measure(text: string, maxW?: number): string[] {
    doc.setFontSize(9);
    return doc.splitTextToSize(text || "", maxW || textW);
  }

  // ========== 頂部標題列（固定 22mm）==========
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

  doc.setFontSize(11);
  doc.setTextColor(237, 237, 239);
  const roundText = data.planRound ? `第${data.planRound}輪` : "";
  doc.text(`${data.userName}  |  Day ${data.dayNumber} ${roundText}`, pw - m, 12, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text(data.date, pw - m, 18, { align: "right" });

  // ========== 基本資訊列（固定 10mm）==========
  const infoY = 26;
  const infoH = 10;
  doc.setDrawColor(220, 220, 220);
  doc.rect(m, infoY, w * 0.25, infoH);
  doc.rect(m + w * 0.25, infoY, w * 0.2, infoH);
  doc.rect(m + w * 0.45, infoY, w * 0.55, infoH);

  doc.setFontSize(8); gray(120);
  doc.text("日期", m + 2, infoY + 3.5);
  doc.text("能量狀態", m + w * 0.25 + 2, infoY + 3.5);
  doc.text("今天最重要的一件事", m + w * 0.45 + 2, infoY + 3.5);

  doc.setFontSize(10); gray(30);
  doc.text(data.date, m + 2, infoY + 8);
  gold();
  doc.text(`${data.energyState} / 10`, m + w * 0.25 + 2, infoY + 8);
  doc.setFontSize(9); gray(30);
  const mitLines = measure(data.mostImportantThing, w * 0.55 - 4);
  doc.text(mitLines, m + w * 0.45 + 2, infoY + 8);

  // ========== 計算各區塊所需高度 ==========
  const checksRowH = 9;  // 勾選項兩排所需高度
  const labelH = 4.5;    // 子標題行高
  const scoreRowH = 5.5; // 評分行高

  // PART 1: 勾選項 + 自我宣言標題 + 宣言文字
  const declLines = measure(data.selfDeclaration);
  const need1 = checksRowH + labelH + declLines.length * lineH;

  // PART 2: 可以更好的地方標題 + 文字 + 覺察到什麼標題 + 文字
  const impLines = measure(data.awarenessImprove);
  const notLines = measure(data.awarenessNotice);
  const need2 = labelH + impLines.length * lineH + labelH + notLines.length * lineH;

  // PART 3: 學習內容 + 來源標題 + 勾選
  const learnLines = measure(data.learningContent);
  const need3 = learnLines.length * lineH + labelH + 5;

  // PART 4: 行動內容 + 領域標題 + 勾選
  const actLines = measure(data.actionContent);
  const need4 = actLines.length * lineH + labelH + 5;

  // PART 5: 分享內容
  const shareLines = measure(data.sharingContent);
  const need5 = shareLines.length * lineH;

  // PART 6: 感恩內容
  const gratLines = measure(data.gratitude);
  const need6 = gratLines.length * lineH;

  // PART 7: 評分 + 比昨天 + 自評說明標題 + 說明文字
  const scoreLines = measure(data.scoreNote);
  const need7 = scoreRowH + labelH + scoreLines.length * lineH;

  // PART 8: 明日行動文字
  const tmrwLines = measure(data.tomorrowAction);
  const need8 = tmrwLines.length * lineH;

  // 每列取左右最大值（加上格內邊距）
  const pad2 = cellPad * 2;
  const rowNeed1 = Math.max(need1, need2) + pad2;
  const rowNeed2 = Math.max(need3, need4) + pad2;
  const rowNeed3 = Math.max(need5, need6) + pad2;
  const rowNeed4 = Math.max(need7, need8) + pad2;

  const totalNeed = rowNeed1 + rowNeed2 + rowNeed3 + rowNeed4;
  const fixedH = 22 + 0.8 + infoH + 4 * titleBarH + 7 + 13; // header + info + titles + announce + footer
  const availableH = ph - fixedH - (infoY - 22); // 扣除所有固定區域
  const extraPerRow = totalNeed < availableH ? (availableH - totalNeed) / 4 : 0;

  const rowH1 = rowNeed1 + extraPerRow;
  const rowH2 = rowNeed2 + extraPerRow;
  const rowH3 = rowNeed3 + extraPerRow;
  const rowH4 = rowNeed4 + extraPerRow;

  // ========== 繪製 helpers ==========
  function drawTitleBar(title: string, x: number, ty: number, sw: number) {
    doc.setFillColor(212, 175, 55);
    doc.rect(x, ty, sw, titleBarH, "F");
    doc.setFontSize(10);
    doc.setTextColor(10, 10, 10);
    doc.text(title, x + 2, ty + 5);
  }

  function drawChecks(items: { label: string; checked: boolean }[], x: number, cy: number, colWidth: number) {
    doc.setFontSize(9);
    let cx = x + cellPad;
    for (const item of items) {
      gray(item.checked ? 50 : 160);
      doc.text((item.checked ? "[v] " : "[  ] ") + item.label, cx, cy);
      cx += colWidth;
    }
  }

  // ========== 繪製 4 列 ==========
  let y = infoY + infoH;

  // --- 列 1: PART 1 + PART 2 ---
  drawTitleBar("PART 1 晨間信念打卡", m, y, halfW);
  drawTitleBar("PART 2 今日覺察", m + halfW, y, halfW);
  y += titleBarH;
  const r1 = y;

  doc.setDrawColor(220, 220, 220);
  doc.rect(m, r1, halfW, rowH1);
  doc.rect(m + halfW, r1, halfW, rowH1);

  // PART 1 內容
  let cy = r1 + cellPad;
  drawChecks(data.beliefs.slice(0, 3), m, cy + 3, halfW / 3);
  drawChecks(data.beliefs.slice(3), m, cy + 7, halfW / 2);
  cy += checksRowH;
  doc.setFontSize(8); gray(120);
  doc.text("自我宣言", m + cellPad, cy + 3);
  cy += labelH;
  doc.setFontSize(9); gray(50);
  doc.text(declLines, m + cellPad, cy + 3);

  // PART 2 內容
  cy = r1 + cellPad;
  doc.setFontSize(8); gray(120);
  doc.text("可以更好的地方", m + halfW + cellPad, cy + 3);
  cy += labelH;
  doc.setFontSize(9); gray(50);
  doc.text(impLines, m + halfW + cellPad, cy + 3);
  cy += impLines.length * lineH;
  doc.setFontSize(8); gray(120);
  doc.text("覺察到什麼", m + halfW + cellPad, cy + 3);
  cy += labelH;
  doc.setFontSize(9); gray(50);
  doc.text(notLines, m + halfW + cellPad, cy + 3);

  y = r1 + rowH1;

  // --- 列 2: PART 3 + PART 4 ---
  drawTitleBar("PART 3 今日學習", m, y, halfW);
  drawTitleBar("PART 4 今日行動", m + halfW, y, halfW);
  y += titleBarH;
  const r2 = y;

  doc.setDrawColor(220, 220, 220);
  doc.rect(m, r2, halfW, rowH2);
  doc.rect(m + halfW, r2, halfW, rowH2);

  // PART 3 內容
  cy = r2 + cellPad;
  doc.setFontSize(9); gray(50);
  doc.text(learnLines, m + cellPad, cy + 3);
  cy += learnLines.length * lineH;
  doc.setFontSize(8); gray(120);
  doc.text("來源", m + cellPad, cy + 3);
  cy += labelH;
  drawChecks(data.learningSources, m, cy + 2, (halfW - cellPad * 2) / 5);

  // PART 4 內容
  cy = r2 + cellPad;
  doc.setFontSize(9); gray(50);
  doc.text(actLines, m + halfW + cellPad, cy + 3);
  cy += actLines.length * lineH;
  doc.setFontSize(8); gray(120);
  doc.text("領域", m + halfW + cellPad, cy + 3);
  cy += labelH;
  drawChecks(data.actionDomains, m + halfW, cy + 2, (halfW - cellPad * 2) / 5);

  y = r2 + rowH2;

  // --- 列 3: PART 5 + PART 6 ---
  drawTitleBar("PART 5 今日分享", m, y, halfW);
  drawTitleBar("PART 6 感恩時刻", m + halfW, y, halfW);
  y += titleBarH;
  const r3 = y;

  doc.setDrawColor(220, 220, 220);
  doc.rect(m, r3, halfW, rowH3);
  doc.rect(m + halfW, r3, halfW, rowH3);

  doc.setFontSize(9); gray(50);
  doc.text(shareLines, m + cellPad, r3 + cellPad + 3);
  doc.text(gratLines, m + halfW + cellPad, r3 + cellPad + 3);

  y = r3 + rowH3;

  // --- 列 4: PART 7 + PART 8 ---
  drawTitleBar("PART 7 今日評分", m, y, halfW);
  drawTitleBar("PART 8 明日行動", m + halfW, y, halfW);
  y += titleBarH;
  const r4 = y;

  doc.setDrawColor(220, 220, 220);
  doc.rect(m, r4, halfW, rowH4);
  doc.rect(m + halfW, r4, halfW, rowH4);

  // PART 7 內容
  cy = r4 + cellPad;
  doc.setFontSize(10); gold();
  doc.text(`${data.dailyScore} / 10`, m + cellPad, cy + 3);
  doc.setFontSize(9); gray(80);
  const compareLabel = data.compareYesterday === "better" ? "比昨天好" : data.compareYesterday === "worse" ? "比昨天差" : "";
  if (compareLabel) doc.text(compareLabel, m + 22, cy + 3);
  cy += scoreRowH;
  doc.setFontSize(8); gray(120);
  doc.text("自評說明", m + cellPad, cy + 3);
  cy += labelH;
  doc.setFontSize(9); gray(50);
  doc.text(scoreLines, m + cellPad, cy + 3);

  // PART 8 內容
  doc.setFontSize(9); gray(50);
  doc.text(tmrwLines, m + halfW + cellPad, r4 + cellPad + 3);

  y = r4 + rowH4;

  // ========== 群組公佈 ==========
  y += 2;
  doc.setFontSize(9);
  gray(data.announcedInGroup ? 50 : 160);
  doc.text((data.announcedInGroup ? "[v]" : "[  ]") + " 已在群裡完成公佈", m + 2, y + 3);

  // ========== Footer ==========
  doc.setFontSize(12);
  doc.setTextColor(212, 175, 55);
  doc.text("HOPE 人生作業系統", pw / 2, ph - 10, { align: "center" });

  doc.save(`HOPE_日報表_Day${data.dayNumber}_${data.date}.pdf`);
}
