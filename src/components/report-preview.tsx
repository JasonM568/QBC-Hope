"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

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

function CheckMark({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className={`text-xs ${checked ? "text-gold" : "text-muted-foreground/50"}`}>
      {checked ? "✓" : "○"} {label}
    </span>
  );
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
  const previewRef = useRef<HTMLDivElement>(null);

  // 打開時鎖定背景滾動
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

  if (!open) {
    return (
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 bg-gold text-black hover:bg-gold-light font-semibold h-12"
        >
          預覽報表
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
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm"
      style={{ touchAction: "none" }}
    >
      {/* 操作列 */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
        <p className="text-sm text-muted-foreground">截圖此畫面即可分享到群組</p>
        <div className="flex gap-2">
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
            onClick={() => setOpen(false)}
            variant="outline"
            className="text-xs"
          >
            關閉
          </Button>
        </div>
      </div>

      {/* 預覽內容 - 可滾動 */}
      <div
        className="flex-1 overflow-y-auto p-4 flex justify-center"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y" }}
      >
        <div
          ref={previewRef}
          className="w-full max-w-2xl bg-[#0A0A0A] rounded-xl border border-border overflow-hidden h-fit"
        >
          {/* 標題列 */}
          <div className="bg-[#111] px-5 py-4 border-b border-gold/30">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-gold">{reportTitle}</h1>
                {subtitle && (
                  <p className="text-xs text-gold/70 mt-0.5">{subtitle}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-foreground">{userName}</p>
                <p className="text-sm text-muted-foreground">{date}</p>
              </div>
            </div>
          </div>

          {/* 內容區 */}
          <div className="p-4 space-y-3">
            {sections.map((section, i) => {
              // 雙欄排版
              if (section.columns && section.columns.length === 2) {
                return (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    {section.columns.map((col, ci) => (
                      <SectionCard key={ci} section={col} />
                    ))}
                  </div>
                );
              }
              return <SectionCard key={i} section={section} />;
            })}
          </div>

          {/* 底部 */}
          <div className="px-5 py-2 border-t border-border/50 text-center">
            <p className="text-[10px] text-muted-foreground/50">HOPE 人生作業系統</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: PreviewSection }) {
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      {/* Section 標題 */}
      <div className="bg-gold/10 px-3 py-1.5">
        <h3 className="text-xs font-semibold text-gold">{section.title}</h3>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {/* 勾選項 */}
        {section.checks && section.checks.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {section.checks.map((c, i) => (
              <CheckMark key={i} checked={c.checked} label={c.label} />
            ))}
          </div>
        )}

        {/* Key-value 項目 */}
        {section.items &&
          section.items.map((item, i) => (
            <div key={i}>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap">
                {item.value || "—"}
              </p>
            </div>
          ))}

        {/* 純文字 */}
        {section.content && (
          <p className="text-xs text-foreground/90 whitespace-pre-wrap">
            {section.content}
          </p>
        )}
      </div>
    </div>
  );
}
