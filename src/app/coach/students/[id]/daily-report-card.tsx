"use client";

import { useState } from "react";

interface DailyReport {
  id: string;
  report_date: string;
  day_number?: number;
  energy_state: number;
  most_important_thing: string;
  self_declaration: string;
  belief_four_beliefs: boolean;
  belief_find_hope: boolean;
  belief_cognition: boolean;
  belief_upgrade: boolean;
  belief_shine: boolean;
  awareness_improve: string;
  awareness_notice: string;
  learning_content: string;
  learning_course: boolean;
  learning_book: boolean;
  learning_dialogue: boolean;
  learning_observation: boolean;
  learning_other: boolean;
  action_content: string;
  action_career: boolean;
  action_wealth: boolean;
  action_health: boolean;
  action_family: boolean;
  action_relationship: boolean;
  sharing_content: string;
  gratitude: string;
  daily_score: number;
  compare_yesterday: string;
  score_note: string;
  tomorrow_action: string;
  announced_in_group: boolean;
  created_at: string;
}

function Check({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className={`text-xs ${checked ? "text-gold" : "text-muted-foreground/40"}`}>
      {checked ? "✓" : "○"} {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="mt-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function DailyReportCard({ report: r }: { report: DailyReport }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      {/* Header — always visible */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold">{r.report_date}</span>
          {r.created_at && (
            <span className="text-xs text-muted-foreground ml-2">
              填寫 {new Date(r.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gold">能量 {r.energy_state}</span>
          <span className="text-blue-400">評分 {r.daily_score}</span>
          {r.day_number && <span className="text-muted-foreground">第{r.day_number}天</span>}
        </div>
      </div>

      {/* Summary — always visible */}
      <Field label="今天最重要的一件事" value={r.most_important_thing} />

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-gold text-black hover:bg-gold-light transition-colors"
      >
        {expanded ? "收合詳情" : "查看詳情"}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {/* 1 晨間信念打卡 */}
          <div>
            <p className="text-xs text-gold font-medium mb-1">1 晨間信念打卡</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Check checked={r.belief_four_beliefs} label="四大信念" />
              <Check checked={r.belief_find_hope} label="看見希望" />
              <Check checked={r.belief_cognition} label="認知決定" />
              <Check checked={r.belief_upgrade} label="升級自己" />
              <Check checked={r.belief_shine} label="照亮他人" />
            </div>
            <Field label="自我宣言" value={r.self_declaration} />
          </div>

          {/* 2 今日覺察 */}
          <div>
            <p className="text-xs text-gold font-medium mb-1">2 今日覺察</p>
            <Field label="可以更好的地方" value={r.awareness_improve} />
            <Field label="覺察到什麼" value={r.awareness_notice} />
          </div>

          {/* 3 今日學習 */}
          <div>
            <p className="text-xs text-gold font-medium mb-1">3 今日學習</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Check checked={r.learning_course} label="課程" />
              <Check checked={r.learning_book} label="書籍" />
              <Check checked={r.learning_dialogue} label="對話" />
              <Check checked={r.learning_observation} label="觀察" />
              <Check checked={r.learning_other} label="其他" />
            </div>
            <Field label="學到什麼" value={r.learning_content} />
          </div>

          {/* 4 今日行動 */}
          <div>
            <p className="text-xs text-gold font-medium mb-1">4 今日行動</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Check checked={r.action_career} label="事業" />
              <Check checked={r.action_wealth} label="財富" />
              <Check checked={r.action_health} label="健康" />
              <Check checked={r.action_family} label="家庭" />
              <Check checked={r.action_relationship} label="關係" />
            </div>
            <Field label="做了什麼" value={r.action_content} />
          </div>

          {/* 5 今日分享 */}
          <Field label="5 今日分享" value={r.sharing_content} />

          {/* 6 感恩時刻 */}
          <Field label="6 感恩時刻" value={r.gratitude} />

          {/* 7 今日評分 */}
          <div>
            <p className="text-xs text-gold font-medium mb-1">7 今日評分</p>
            <div className="flex gap-4 text-sm">
              <span>給分：<span className="text-gold font-semibold">{r.daily_score}/10</span></span>
              <span>比昨天：{r.compare_yesterday === "better" ? "好" : r.compare_yesterday === "worse" ? "差" : "—"}</span>
            </div>
            <Field label="自評" value={r.score_note} />
          </div>

          {/* 8 明日行動 */}
          <Field label="8 明日行動" value={r.tomorrow_action} />

          {/* 群組公佈 */}
          <div className="pt-2 border-t border-border">
            <Check checked={r.announced_in_group} label="已在群裡完成公佈" />
          </div>
        </div>
      )}
    </div>
  );
}
