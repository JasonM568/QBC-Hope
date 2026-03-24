"use client";

import { useState } from "react";

interface DayStat {
  date: string;
  submitted: number;
  missing: number;
  total: number;
  submittedNames: string[];
  missingNames: string[];
}

export default function WeeklyReportSummary({
  days,
  today,
}: {
  days: DayStat[];
  today: string;
}) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  if (days.length === 0) return null;

  function formatDate(date: string) {
    const d = new Date(date + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function getLabel(date: string) {
    if (date === today) return "今天";
    const t = new Date(today + "T00:00:00");
    const d = new Date(date + "T00:00:00");
    const diff = Math.round((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return "昨天";
    return "";
  }

  function getRate(submitted: number, total: number) {
    if (total === 0) return 0;
    return Math.round((submitted / total) * 100);
  }

  return (
    <div className="mb-8 p-6 rounded-xl border border-border bg-card">
      <h2 className="text-lg font-semibold mb-4">📊 近 {days.length} 天日報總覽</h2>

      {/* Table Header */}
      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b border-border">
        <div>日期</div>
        <div className="text-center">已繳</div>
        <div className="text-center">未繳</div>
        <div className="text-center">繳交率</div>
      </div>

      {/* Table Rows */}
      {days.map((day) => {
        const rate = getRate(day.submitted, day.total);
        const label = getLabel(day.date);
        const isExpanded = expandedDate === day.date;

        return (
          <div key={day.date}>
            <button
              type="button"
              onClick={() => setExpandedDate(isExpanded ? null : day.date)}
              className="w-full grid grid-cols-4 gap-2 py-3 text-sm border-b border-border/50 hover:bg-secondary/30 transition-colors"
            >
              <div className="text-left">
                <span className="font-medium">{formatDate(day.date)}</span>
                {label && (
                  <span className="text-xs text-muted-foreground ml-1">（{label}）</span>
                )}
              </div>
              <div className="text-center text-green-400 font-medium">{day.submitted}</div>
              <div className="text-center text-red-400 font-medium">{day.missing}</div>
              <div className="text-center">
                <span className={`font-medium ${
                  rate === 100 ? "text-green-400" : rate >= 80 ? "text-gold" : rate >= 50 ? "text-yellow-400" : "text-red-400"
                }`}>
                  {rate}%
                </span>
              </div>
            </button>

            {/* Expanded Detail */}
            {isExpanded && (
              <div className="py-3 px-2 space-y-2 bg-secondary/10 border-b border-border/50">
                {day.submitted > 0 && (
                  <div>
                    <p className="text-xs text-green-400 font-medium mb-1">
                      ✅ 已繳交（{day.submitted} 人）
                    </p>
                    <p className="text-xs text-foreground/70">
                      {day.submittedNames.join("、")}
                    </p>
                  </div>
                )}
                {day.missing > 0 && (
                  <div>
                    <p className="text-xs text-red-400 font-medium mb-1">
                      ❌ 未繳交（{day.missing} 人）
                    </p>
                    <p className="text-xs text-foreground/70">
                      {day.missingNames.join("、")}
                    </p>
                  </div>
                )}
                {day.missing === 0 && (
                  <p className="text-xs text-green-400 text-center">🎉 全員繳交！</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
