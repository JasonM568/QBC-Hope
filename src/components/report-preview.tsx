"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";

interface CheckItem {
  label: string;
  checked: boolean;
}

interface PreviewSection {
  title: string;
  content?: string;
  items?: { label: string; value: string }[];
  checks?: CheckItem[];
  columns?: PreviewSection[];
}

interface ReportPreviewProps {
  reportTitle: string;
  subtitle?: string;
  date: string;
  userName: string;
  sections: PreviewSection[];
  onExportPDF?: () => void;
}

export default function ReportPreview({
  reportTitle,
  subtitle,
  date,
  userName,
  sections,
  onExportPDF,
}: ReportPreviewProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [renderWidth, setRenderWidth] = useState(720);
  const renderRef = useRef<HTMLDivElement>(null);

  // 鎖定背景滾動
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  const generateImage = useCallback(async () => {
    if (!renderRef.current) return;
    setGenerating(true);

    // 根據螢幕寬度決定渲染寬度：手機用螢幕寬度，桌面上限 720
    const screenW = window.innerWidth;
    const w = Math.min(screenW, 720);
    setRenderWidth(w);
    setOpen(true);

    // 等 DOM 以新寬度渲染完
    await new Promise((r) => setTimeout(r, 150));

    try {
      // 手機用 3x 確保下載圖片夠清晰，桌面用 2x
      const scale = screenW <= 500 ? 3 : 2;
      const canvas = await html2canvas(renderRef.current, {
        backgroundColor: "#0A0A0A",
        scale,
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      setImageUrl(url);
    } catch {
      console.error("Failed to generate image");
    }
    setGenerating(false);
  }, []);

  function handleClose() {
    setOpen(false);
    setImageUrl(null);
  }

  async function handleDownload() {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.download = `HOPE_${reportTitle}_${date}.png`;
    link.href = imageUrl;
    link.click();
  }

  return (
    <>
      {/* 按鈕列 */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={generateImage}
          disabled={generating}
          className="flex-1 bg-gold text-black hover:bg-gold-light font-semibold h-12"
        >
          {generating ? "產生中..." : "預覽報表"}
        </Button>
        {onExportPDF && (
          <Button
            type="button"
            onClick={onExportPDF}
            variant="outline"
            className="flex-1 border-gold/30 text-gold hover:bg-gold/10 h-12"
          >
            匯出 PDF
          </Button>
        )}
      </div>

      {/* 隱藏的 HTML 渲染區（用來產生圖片） */}
      <div
        style={{ position: "fixed", left: "-9999px", top: 0, width: renderWidth }}
        aria-hidden
      >
        <div ref={renderRef} style={{ width: renderWidth, background: "#0A0A0A", padding: 0 }}>
          {/* 標題列 */}
          <div style={{ background: "#111", padding: renderWidth <= 500 ? "16px" : "20px 24px", borderBottom: "2px solid #D4AF37" }}>
            {renderWidth <= 500 ? (
              /* 手機：標題與姓名上下排列 */
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#D4AF37" }}>{reportTitle}</div>
                {subtitle && (
                  <div style={{ fontSize: 15, color: "#D4AF37B3", marginTop: 2 }}>{subtitle}</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#EDEDEF" }}>{userName}</div>
                  <div style={{ fontSize: 14, color: "#A1A1AA" }}>{date}</div>
                </div>
              </div>
            ) : (
              /* 桌面：左右排列 */
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#D4AF37" }}>{reportTitle}</div>
                  {subtitle && (
                    <div style={{ fontSize: 18, color: "#D4AF37B3", marginTop: 4 }}>{subtitle}</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#EDEDEF" }}>{userName}</div>
                  <div style={{ fontSize: 16, color: "#A1A1AA", marginTop: 2 }}>{date}</div>
                </div>
              </div>
            )}
          </div>

          {/* 內容區 */}
          <div style={{ padding: renderWidth <= 500 ? 10 : 16 }}>
            {sections.map((section, i) => {
              if (section.columns && section.columns.length === 2) {
                // 手機：欄位改為上下排列
                if (renderWidth <= 500) {
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      {section.columns.map((col, ci) => (
                        <div key={ci} style={{ marginBottom: ci === 0 ? 10 : 0 }}>
                          <RenderSection section={col} compact />
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    {section.columns.map((col, ci) => (
                      <RenderSection key={ci} section={col} />
                    ))}
                  </div>
                );
              }
              return (
                <div key={i} style={{ marginBottom: renderWidth <= 500 ? 10 : 12 }}>
                  <RenderSection section={section} compact={renderWidth <= 500} />
                </div>
              );
            })}
          </div>

          {/* 底部 */}
          <div style={{ borderTop: "1px solid #27272A", padding: renderWidth <= 500 ? "10px 16px" : "14px 24px", textAlign: "center" }}>
            <div style={{ fontSize: renderWidth <= 500 ? 15 : 18, fontWeight: 700, color: "#D4AF37" }}>HOPE 人生作業系統</div>
          </div>
        </div>
      </div>

      {/* 全螢幕圖片預覽 */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          style={{ touchAction: "none" }}
        >
          {/* 操作列 */}
          <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
            <p className="text-sm text-muted-foreground">長按圖片可儲存</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={!imageUrl}
                className="bg-gold text-black hover:bg-gold-light text-xs font-semibold"
              >
                儲存圖片
              </Button>
              {onExportPDF && (
                <Button
                  size="sm"
                  onClick={onExportPDF}
                  variant="outline"
                  className="border-gold/30 text-gold hover:bg-gold/10 text-xs"
                >
                  匯出 PDF
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleClose}
                variant="outline"
                className="text-xs"
              >
                關閉
              </Button>
            </div>
          </div>

          {/* 圖片顯示區 */}
          <div
            className="flex-1 overflow-y-auto flex justify-center p-4"
            style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y" }}
          >
            {generating && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">產生報表圖片中...</p>
              </div>
            )}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={reportTitle}
                className="w-full max-w-2xl h-auto rounded-lg"
                style={{ userSelect: "none" }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// 用 inline style 渲染（html2canvas 不支援 Tailwind class）
function RenderSection({ section, compact }: { section: PreviewSection; compact?: boolean }) {
  const titleSize = compact ? 13 : 14;
  const labelSize = compact ? 11 : 12;
  const contentSize = compact ? 13 : 14;
  const checkSize = compact ? 12 : 14;
  const pad = compact ? "8px 10px" : "10px 12px";

  return (
    <div style={{ border: "1px solid #27272A80", borderRadius: 8, overflow: "hidden" }}>
      {/* Section 標題 */}
      {section.title && (
        <div style={{ background: "#D4AF3718", padding: compact ? "6px 10px" : "8px 12px" }}>
          <div style={{ fontSize: titleSize, fontWeight: 600, color: "#D4AF37" }}>{section.title}</div>
        </div>
      )}

      <div style={{ padding: pad }}>
        {/* 勾選項 */}
        {section.checks && section.checks.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? "4px 12px" : "6px 16px", marginBottom: section.items || section.content ? 8 : 0 }}>
            {section.checks.map((c, i) => (
              <span key={i} style={{ fontSize: checkSize, color: c.checked ? "#D4AF37" : "#71717A80" }}>
                {c.checked ? "✓" : "○"} {c.label}
              </span>
            ))}
          </div>
        )}

        {/* Key-value 項目 */}
        {section.items &&
          section.items.map((item, i) => (
            <div key={i} style={{ marginBottom: compact ? 4 : 6 }}>
              <div style={{ fontSize: labelSize, color: "#A1A1AA" }}>{item.label}</div>
              <div style={{ fontSize: contentSize, color: "#EDEDEFE6", whiteSpace: "pre-wrap" }}>
                {item.value || "—"}
              </div>
            </div>
          ))}

        {/* 純文字 */}
        {section.content && (
          <div style={{ fontSize: contentSize, color: "#EDEDEFE6", whiteSpace: "pre-wrap" }}>
            {section.content}
          </div>
        )}
      </div>
    </div>
  );
}
