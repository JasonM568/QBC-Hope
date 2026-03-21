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
  gridLayout?: boolean; // 2×5 格狀排版（日報表用）
  onExportPDF?: () => void;
}

export default function ReportPreview({
  reportTitle,
  subtitle,
  date,
  userName,
  sections,
  gridLayout,
  onExportPDF,
}: ReportPreviewProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
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

  const renderWidth = gridLayout ? 750 : 720;

  const generateImage = useCallback(async () => {
    if (!renderRef.current) return;
    setGenerating(true);
    setOpen(true);

    await new Promise((r) => setTimeout(r, 100));

    try {
      const canvas = await html2canvas(renderRef.current, {
        backgroundColor: "#0A0A0A",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      setImageUrl(dataUrl);

      canvas.toBlob((blob) => {
        if (blob) {
          const objUrl = URL.createObjectURL(blob);
          setBlobUrl(objUrl);
        }
      }, "image/png");
    } catch {
      console.error("Failed to generate image");
    }
    setGenerating(false);
  }, []);

  function handleClose() {
    setOpen(false);
    setImageUrl(null);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }

  async function handleDownload() {
    if (!imageUrl) return;
    if (blobUrl && navigator.share) {
      try {
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        const file = new File([blob], `HOPE_${reportTitle}_${date}.png`, { type: "image/png" });
        await navigator.share({ files: [file] });
        return;
      } catch {
        // fallback
      }
    }
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

      {/* 隱藏的 HTML 渲染區 */}
      <div
        style={{ position: "fixed", left: "-9999px", top: 0, width: renderWidth }}
        aria-hidden
      >
        <div ref={renderRef} style={{ width: renderWidth, background: "#0A0A0A", padding: 0 }}>
          {/* 標題列 */}
          <div style={{
            background: "#111",
            padding: gridLayout ? "16px 20px" : "20px 24px",
            borderBottom: "2px solid #D4AF37",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: gridLayout ? 28 : 22, fontWeight: 700, color: "#D4AF37" }}>{reportTitle}</div>
                {subtitle && (
                  <div style={{ fontSize: gridLayout ? 22 : 18, color: "#D4AF37B3", marginTop: 2 }}>{subtitle}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: gridLayout ? 22 : 18, fontWeight: 600, color: "#EDEDEF" }}>{userName}</div>
                <div style={{ fontSize: gridLayout ? 20 : 16, color: "#A1A1AA", marginTop: 2 }}>{date}</div>
              </div>
            </div>
          </div>

          {/* 內容區 */}
          {gridLayout ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: 10,
            }}>
              {sections.map((section, i) => (
                <GridBlock key={i} section={section} />
              ))}
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              {sections.map((section, i) => {
                if (section.columns && section.columns.length === 2) {
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      {section.columns.map((col, ci) => (
                        <RenderSection key={ci} section={col} />
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <RenderSection section={section} />
                  </div>
                );
              })}
            </div>
          )}

          {/* 底部 */}
          <div style={{
            borderTop: "1px solid #27272A",
            padding: gridLayout ? "10px 20px" : "14px 24px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: gridLayout ? 22 : 18, fontWeight: 700, color: "#D4AF37" }}>HOPE 人生作業系統</div>
          </div>
        </div>
      </div>

      {/* 全螢幕圖片預覽 */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          style={{ touchAction: "none" }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
            <p className="text-xs text-muted-foreground">長按圖片可儲存</p>
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
                  PDF
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

          <div
            className="flex-1 overflow-auto flex justify-center items-start p-2"
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              touchAction: "pinch-zoom pan-x pan-y",
            }}
          >
            {generating && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">產生報表圖片中...</p>
              </div>
            )}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blobUrl || imageUrl}
                alt={reportTitle}
                style={{
                  width: "100%",
                  maxWidth: renderWidth,
                  height: "auto",
                  borderRadius: 8,
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// gridLayout 專用：大字體緊湊區塊（日報表 2×5 格狀排版）
// 750px 渲染 → 390px 手機顯示 ≈ 52%
// 字體 26px 渲染 → 手機上約 13.5px，清晰可讀
// ============================================================
function GridBlock({ section }: { section: PreviewSection }) {
  return (
    <div style={{ border: "1px solid #27272A80", borderRadius: 8, overflow: "hidden" }}>
      {section.title && (
        <div style={{ background: "#D4AF3718", padding: "6px 10px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#D4AF37" }}>{section.title}</div>
        </div>
      )}

      <div style={{ padding: "8px 10px" }}>
        {section.checks && section.checks.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", marginBottom: section.items || section.content ? 6 : 0 }}>
            {section.checks.map((c, i) => (
              <span key={i} style={{ fontSize: 20, color: c.checked ? "#D4AF37" : "#71717A80" }}>
                {c.checked ? "✓" : "○"} {c.label}
              </span>
            ))}
          </div>
        )}

        {section.items &&
          section.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 18, color: "#A1A1AA" }}>{item.label}</div>
              <div style={{ fontSize: 22, color: "#EDEDEFE6", whiteSpace: "pre-wrap" }}>
                {item.value || "—"}
              </div>
            </div>
          ))}

        {section.content && (
          <div style={{ fontSize: 22, color: "#EDEDEFE6", whiteSpace: "pre-wrap" }}>
            {section.content}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 通用排版（其他表單用）
// ============================================================
function RenderSection({ section }: { section: PreviewSection }) {
  return (
    <div style={{ border: "1px solid #27272A80", borderRadius: 8, overflow: "hidden" }}>
      {section.title && (
        <div style={{ background: "#D4AF3718", padding: "8px 12px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#D4AF37" }}>{section.title}</div>
        </div>
      )}

      <div style={{ padding: "10px 12px" }}>
        {section.checks && section.checks.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: section.items || section.content ? 8 : 0 }}>
            {section.checks.map((c, i) => (
              <span key={i} style={{ fontSize: 14, color: c.checked ? "#D4AF37" : "#71717A80" }}>
                {c.checked ? "✓" : "○"} {c.label}
              </span>
            ))}
          </div>
        )}

        {section.items &&
          section.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: "#A1A1AA" }}>{item.label}</div>
              <div style={{ fontSize: 14, color: "#EDEDEFE6", whiteSpace: "pre-wrap" }}>
                {item.value || "—"}
              </div>
            </div>
          ))}

        {section.content && (
          <div style={{ fontSize: 14, color: "#EDEDEFE6", whiteSpace: "pre-wrap" }}>
            {section.content}
          </div>
        )}
      </div>
    </div>
  );
}
