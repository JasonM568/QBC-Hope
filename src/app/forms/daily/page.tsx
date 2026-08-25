"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportDailyPDF } from "@/lib/export-pdf";
import ReportPreview from "@/components/report-preview";
import {
  addDaysISO,
  computeCompletion,
  findRecoverableMiss,
  rateTone,
} from "@/lib/plan/completion";

interface DailyReport {
  id?: string;
  day_number: number;
  energy_state: number;
  most_important_thing: string;
  // PART 1
  belief_four_beliefs: boolean;
  belief_find_hope: boolean;
  belief_cognition: boolean;
  belief_upgrade: boolean;
  belief_shine: boolean;
  self_declaration: string;
  // PART 2
  awareness_improve: string;
  awareness_notice: string;
  // PART 3
  learning_content: string;
  learning_course: boolean;
  learning_book: boolean;
  learning_dialogue: boolean;
  learning_observation: boolean;
  learning_other: boolean;
  // PART 4
  action_content: string;
  action_career: boolean;
  action_wealth: boolean;
  action_health: boolean;
  action_family: boolean;
  action_relationship: boolean;
  // PART 5
  sharing_content: string;
  // PART 6
  gratitude: string;
  // PART 7
  daily_score: number;
  compare_yesterday: string;
  score_note: string;
  // PART 8
  tomorrow_action: string;
  // 公佈
  announced_in_group: boolean;
}

const emptyReport: DailyReport = {
  day_number: 1,
  energy_state: 7,
  most_important_thing: "",
  belief_four_beliefs: false,
  belief_find_hope: false,
  belief_cognition: false,
  belief_upgrade: false,
  belief_shine: false,
  self_declaration: "",
  awareness_improve: "",
  awareness_notice: "",
  learning_content: "",
  learning_course: false,
  learning_book: false,
  learning_dialogue: false,
  learning_observation: false,
  learning_other: false,
  action_content: "",
  action_career: false,
  action_wealth: false,
  action_health: false,
  action_family: false,
  action_relationship: false,
  sharing_content: "",
  gratitude: "",
  daily_score: 7,
  compare_yesterday: "",
  score_note: "",
  tomorrow_action: "",
  announced_in_group: false,
};

interface PlanRoundRow {
  start_date: string;
  round_number: number;
}

/**
 * 輪程 RPC 的回傳正規化。
 *
 * 三個函式都宣告 `RETURNS plan_rounds`（composite type），PostgREST 對這種
 * 回傳可能給單一物件，也可能給單元素陣列。兩種都接，避免綁死在某一種行為上。
 */
function pickRound(data: unknown): PlanRoundRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Partial<PlanRoundRow>;
  if (typeof r.start_date !== "string" || typeof r.round_number !== "number") {
    return null;
  }
  return { start_date: r.start_date, round_number: r.round_number };
}

function Checkbox({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-border accent-gold"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function PartHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">
        {num}
      </span>
      <h2 className="font-semibold">PART {num}：{title}</h2>
    </div>
  );
}

export default function DailyReportPage() {
  const [report, setReport] = useState<DailyReport>(emptyReport);
  const [existing, setExisting] = useState(false);
  const [editing, setEditing] = useState(false);
  // 修改模式下，想把這篇日記挪到哪一天（僅限昨天／今天／明天）
  const [editTargetDate, setEditTargetDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const [planStartDate, setPlanStartDate] = useState<string | null>(null);
  const [planInputDate, setPlanInputDate] = useState("");
  const [startingSaving, setStartingSaving] = useState(false);
  const [planRound, setPlanRound] = useState(1);
  const [roundResetUsed, setRoundResetUsed] = useState(false);
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  // 目前表單內容的「乾淨基準」，用來判斷有沒有未儲存的輸入
  const [baseline, setBaseline] = useState(() => JSON.stringify(emptyReport));
  const [pastReports, setPastReports] = useState<{ report_date: string; day_number: number; energy_state: number; daily_score: number }[]>([]);
  const router = useRouter();

  const set = <K extends keyof DailyReport>(key: K, value: DailyReport[K]) =>
    setReport((prev) => ({ ...prev, [key]: value }));

  const activeDate = selectedDate || today;

  // 日期調整僅允許前後 1 天（昨天／今天／明天），避免補填任意日期灌「連續打卡」點數
  const yesterday = today ? addDaysISO(today, -1) : "";
  const tomorrow = today ? addDaysISO(today, 1) : "";
  const canCreateForActive = !!today && activeDate >= yesterday && activeDate <= tomorrow;

  // 表單唯讀判斷。兩種情況：
  //  1. 已存在的日報 → 非編輯模式時唯讀
  //  2. 不存在的日報 → 超出補填窗口時唯讀
  //     （若不鎖住，使用者會打完一整篇才發現沒有送出鍵，內容直接蒸發）
  const isReadOnly = existing ? !editing : !canCreateForActive;

  // 有未儲存的輸入時，切換日期／離開頁面要先攔一下
  const isDirty = JSON.stringify(report) !== baseline;

  // 漏填提醒：昨天空著、且還落在本輪窗口內。
  // 補填窗口是 ±1 天，所以「昨天」是唯一還救得回來的缺漏，過了今天就永久補不了。
  const missedYesterday = today
    ? findRecoverableMiss(planStartDate, today, pastReports.map((r) => r.report_date))
    : null;

  // 計算指定日期是第幾天（每輪從 plan_start_date 起算 Day 1）
  function calcDayNumber(startDate: string, _round: number, forDate?: string): number {
    const todayStr = forDate || today || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ty, tm, td] = todayStr.split("-").map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd);
    const targetMs = Date.UTC(ty, tm - 1, td);
    const diff = Math.floor((targetMs - startMs) / (1000 * 60 * 60 * 24));
    return diff + 1;
  }

  // 切換日期時重新載入資料
  async function switchDate(newDate: string) {
    if (newDate === activeDate) return;

    // 防呆：切換日期會整份重載，未儲存的輸入會直接消失。
    // 以前是無聲清空，使用者打到一半點去補昨天就全沒了。
    if (isDirty) {
      const ok = window.confirm(
        `「${activeDate}」還有尚未儲存的內容。\n\n` +
        `切換到「${newDate}」會清空這些輸入，且無法復原。\n\n` +
        `確定要切換嗎？`
      );
      if (!ok) return;
    }

    setSelectedDate(newDate);
    setLoading(true);
    setExisting(false);
    setEditing(false);
    setEditTargetDate("");
    setMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const dayNum = planStartDate
      ? calcDayNumber(planStartDate, planRound, newDate)
      : emptyReport.day_number;
    let next: DailyReport = {
      ...emptyReport,
      day_number: dayNum > 0 ? dayNum : 1,
    };

    const { data } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("report_date", newDate)
      .maybeSingle();

    if (data) {
      const correctDayNum = planStartDate
        ? calcDayNumber(planStartDate, planRound, newDate)
        : data.day_number;
      next = {
        ...emptyReport,
        ...data,
        day_number: correctDayNum > 0 ? correctDayNum : data.day_number,
      };
      setExisting(true);
    }

    setReport(next);
    setBaseline(JSON.stringify(next));
    setLoading(false);
  }

  useEffect(() => {
    // 在 client 端即時計算台灣日期，避免靜態預渲染導致日期錯誤
    const clientToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
    setToday(clientToday);

    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      // 載入計畫起始日與姓名
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_start_date, plan_round, display_name, round_reset_used")
        .eq("id", user.id)
        .single();

      setUserName(profile?.display_name || user.user_metadata?.display_name || user.email || "");

      setRoundResetUsed(profile?.round_reset_used || false);

      let next: DailyReport = emptyReport;

      if (profile?.plan_start_date) {
        setPlanStartDate(profile.plan_start_date);
        const round = profile.plan_round || 1;
        setPlanRound(round);
        const dayNum = calcDayNumber(profile.plan_start_date, round, clientToday);
        next = { ...next, day_number: dayNum > 0 ? dayNum : 1 };
      }

      const { data } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_date", clientToday)
        .maybeSingle();

      if (data) {
        const correctDayNum = profile?.plan_start_date
          ? calcDayNumber(profile.plan_start_date, profile?.plan_round || 1, clientToday)
          : data.day_number;
        next = {
          ...emptyReport,
          ...data,
          day_number: correctDayNum > 0 ? correctDayNum : data.day_number,
        };
        setExisting(true);
      }

      setReport(next);
      setBaseline(JSON.stringify(next));

      // 載入所有歷史日報
      const { data: history } = await supabase
        .from("daily_reports")
        .select("report_date, day_number, energy_state, daily_score")
        .eq("user_id", user.id)
        .order("report_date", { ascending: false });
      if (history) setPastReports(history);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function startPlan() {
    if (!planInputDate) {
      setMessage("請選擇起始日期");
      return;
    }
    setStartingSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("登入狀態已過期，請重新登入"); setStartingSaving(false); return; }

    // 防呆：起始日晚於今天一律再確認一次（最常見的誤操作是日期選擇器不小心滑到下個月）。
    // 若已有先前的日報，額外提醒那些日報會被排除在本輪之外。
    if (today && planInputDate > today) {
      const { data: existingReports } = await supabase
        .from("daily_reports")
        .select("report_date")
        .eq("user_id", user.id)
        .lt("report_date", planInputDate)
        .order("report_date", { ascending: false });

      const extraWarning =
        existingReports && existingReports.length > 0
          ? `你之前已填寫的日報（${existingReports.map(r => r.report_date).join("、")}）將不會計入本輪第 1-21 天的進度。\n\n`
          : `在那天之前，你的計畫都還不會開始（Day 1 從 ${planInputDate} 起算）。\n\n`;

      const confirmed = window.confirm(
        `注意：你選擇的起始日是 ${planInputDate}，是未來日期（今天是 ${today}）。\n\n` +
        extraWarning +
        `確定要以 ${planInputDate} 作為起始日嗎？`
      );
      if (!confirmed) {
        setStartingSaving(false);
        return;
      }
    }

    // 走 RPC：同時建立 plan_rounds 的 active 輪次並同步 profiles，避免兩邊不一致
    const { data, error } = await supabase
      .rpc("start_plan_round", { p_start_date: planInputDate });
    const round = pickRound(data);

    if (error || !round) {
      setMessage("啟動失敗：" + (error?.message ?? "沒有取得輪程資料"));
    } else {
      setPlanStartDate(round.start_date);
      setPlanRound(round.round_number);
      const dayNum = calcDayNumber(round.start_date, round.round_number);
      setReport((prev) => ({ ...prev, day_number: dayNum > 0 ? dayNum : 1 }));
      setMessage("21天計畫已啟動！");
    }
    setStartingSaving(false);
  }

  async function startNewRound() {
    setStartingSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("登入狀態已過期，請重新登入"); setStartingSaving(false); return; }

    // RPC 會先把本輪封存（定格達成率）再開下一輪
    const { data, error } = await supabase.rpc("begin_next_round");
    const round = pickRound(data);

    if (error || !round) {
      setMessage("重新啟動失敗：" + (error?.message ?? "沒有取得輪程資料"));
    } else {
      setPlanStartDate(round.start_date);
      setPlanRound(round.round_number);
      setReport((prev) => ({ ...prev, day_number: 1 }));
      setMessage(`第 ${round.round_number} 輪 21 天計畫已開始！`);
    }
    setStartingSaving(false);
  }

  async function resetCurrentRound() {
    if (roundResetUsed) return;
    if (!confirm("確定要重新啟動本輪嗎？天數將歸零從 Day 1 開始，此操作每個帳號僅限一次。")) return;

    setStartingSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("登入狀態已過期，請重新登入"); setStartingSaving(false); return; }

    const { data, error } = await supabase.rpc("reset_active_round");
    const round = pickRound(data);

    if (error || !round) {
      setMessage("重新啟動失敗：" + (error?.message ?? "沒有取得輪程資料"));
    } else {
      setPlanStartDate(round.start_date);
      setRoundResetUsed(true);
      setReport((prev) => ({ ...prev, day_number: 1 }));
      setMessage(`第 ${planRound} 輪已重新啟動！`);
    }
    setStartingSaving(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("登入狀態已過期，請重新登入。建議使用外部瀏覽器（Safari/Chrome）開啟。");
      setSaving(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...reportData } = report;
    const safeData = {
      ...reportData,
      day_number: Math.min(Math.max(report.day_number, 1), 21),
      compare_yesterday: reportData.compare_yesterday || null,
    };

    if (existing && editing) {
      // 修改模式：更新日報（可一併把日期挪到昨天／今天／明天）
      const target = editTargetDate || activeDate;

      // 若要改日期：檢查 ±1 範圍 + 目標日期未被其他日記占用
      if (target !== activeDate) {
        if (target < yesterday || target > tomorrow) {
          setMessage("日期僅能調整為昨天、今天或明天。");
          setSaving(false);
          return;
        }
        const { data: clash } = await supabase
          .from("daily_reports")
          .select("id")
          .eq("user_id", user.id)
          .eq("report_date", target)
          .maybeSingle();
        if (clash && clash.id !== report.id) {
          setMessage(`${target} 已經有一篇日記了，無法移到該日期。`);
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("daily_reports")
        .update({ ...safeData, report_date: target })
        .eq("id", report.id);

      if (error) {
        if (error.code === "23505") {
          setMessage(`${target} 已經有一篇日記了，無法移到該日期。`);
        } else {
          setMessage("修改失敗：" + error.message);
        }
        setSaving(false);
        return;
      } else {
        setMessage(target !== activeDate ? `日報已更新，日期改為 ${target}` : "日報已修改！");
        setEditing(false);
        setBaseline(JSON.stringify(report));
        if (target !== activeDate) setSelectedDate(target);
      }
    } else {
      // 新增模式
      const { error } = await supabase.from("daily_reports").insert({
        user_id: user.id,
        report_date: activeDate,
        ...safeData,
      });

      if (error) {
        if (error.code === "23505") {
          setMessage("今天已經填寫過了！");
        } else {
          setMessage("儲存失敗：" + error.message);
        }
      } else {
        setMessage("日報已儲存！");
        setExisting(true);
        setBaseline(JSON.stringify(report));
      }
    }

    // 儲存後重新載入歷史列表
    const { data: history } = await supabase
      .from("daily_reports")
      .select("report_date, day_number, energy_state, daily_score")
      .eq("user_id", user.id)
      .order("report_date", { ascending: false });
    if (history) setPastReports(history);

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar userName={userName} />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={userName} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">21天行動系統日報表</h1>
          <p className="text-muted-foreground mt-1">21-Day Action System Daily Report</p>
        </div>

        {/* 漏填提醒：昨天沒填，而且只剩今天能補 */}
        {missedYesterday && activeDate !== missedYesterday && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-400/40 bg-yellow-400/5">
            <p className="text-sm font-semibold text-yellow-400">
              昨天（{missedYesterday}）的日報還沒填
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              補填期限只到今天結束。過了今天，這一天就補不回來，會計入本輪達成率的缺漏。
            </p>
            <Button
              type="button"
              onClick={() => switchDate(missedYesterday)}
              className="mt-3 h-9 bg-yellow-400 text-black hover:bg-yellow-300 font-semibold text-sm"
            >
              立即補填 {missedYesterday}
            </Button>
          </div>
        )}

        {/* 常駐日期切換列 */}
        {planStartDate && (() => {
          // 計算 21 天計畫範圍
          const [sy, sm, sd] = planStartDate.split("-").map(Number);
          const planStart = new Date(Date.UTC(sy, sm - 1, sd));
          const planEnd = new Date(planStart.getTime() + 20 * 24 * 60 * 60 * 1000);
          const planEndStr = planEnd.toISOString().split("T")[0];

          // 產生 21 天完整日期列表
          const allDays: string[] = [];
          for (let i = 0; i < 21; i++) {
            const d = new Date(planStart.getTime() + i * 24 * 60 * 60 * 1000);
            allDays.push(d.toISOString().split("T")[0]);
          }

          // 統計已填寫
          const filledDates = new Set(pastReports.map(r => r.report_date));
          const filledCount = allDays.filter(ds => filledDates.has(ds)).length;

          // 本輪達成率（分子分母都只算到昨天，今天還沒過完不列入分母）
          const completion = computeCompletion(planStartDate, today, filledDates);

          // 預設顯示近 7 天（限制在計畫範圍內）
          const recentDays: string[] = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
            d.setUTCDate(d.getUTCDate() - i);
            const ds = d.toISOString().split("T")[0];
            if (ds >= planStartDate && ds <= planEndStr) {
              recentDays.push(ds);
            }
          }

          return (
            <div className="mb-6 p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gold">近 7 天日報</p>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    21 天已完成 {filledCount}/21 天
                  </p>
                  {completion.rate !== null && (
                    <p className="text-xs mt-0.5">
                      <span className="text-muted-foreground">達成率 </span>
                      <span className={`font-semibold ${rateTone(completion.rate)}`}>
                        {completion.rate}%
                      </span>
                      <span className="text-muted-foreground">
                        {" "}（{completion.completed}/{completion.expected}
                        {completion.isFinished ? " 天" : " 天・至昨日"}）
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {recentDays.map((ds) => {
                  const dayNum = calcDayNumber(planStartDate, planRound, ds);
                  const filled = filledDates.has(ds);
                  const isActive = activeDate === ds;
                  const isToday = ds === today;
                  const label = isToday ? "今天" : `Day ${dayNum}`;
                  return (
                    <button
                      key={ds}
                      type="button"
                      onClick={() => switchDate(ds)}
                      className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-gold text-black"
                          : filled
                            ? "bg-green-400/15 text-green-400 hover:bg-green-400/25"
                            : "bg-red-400/10 text-red-400 hover:bg-red-400/20"
                      }`}
                    >
                      {label}
                      {filled && !isActive && <span className="ml-1">✓</span>}
                      {!filled && !isActive && <span className="ml-1">!</span>}
                    </button>
                  );
                })}
              </div>

              {/* 指定日期選擇器 */}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground shrink-0">指定日期</p>
                <select
                  value={activeDate}
                  onChange={(e) => switchDate(e.target.value)}
                  className="flex-1 text-xs bg-background border border-border rounded-lg px-2 py-1.5 text-foreground [color-scheme:dark]"
                >
                  {allDays.map((ds) => {
                    const dayNum = calcDayNumber(planStartDate, planRound, ds);
                    const filled = filledDates.has(ds);
                    const isToday = ds === today;
                    return (
                      <option key={ds} value={ds}>
                        Day {dayNum}（{ds}）{isToday ? " — 今天" : ""}{filled ? " ✓" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {activeDate !== today && (
                <p className="text-xs text-yellow-400">
                  {existing
                    ? `正在查看 ${activeDate} 的日報`
                    : canCreateForActive
                      ? `正在補填 ${activeDate} 的日報`
                      : `${activeDate} 超過可補填範圍（僅限昨天／今天／明天）`}
                </p>
              )}

              {/* 重新啟動本輪（第二輪以上，每帳號限一次） */}
              {planRound >= 2 && !roundResetUsed && (
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={resetCurrentRound}
                    disabled={startingSaving}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    {startingSaving ? "重新啟動中..." : `重新啟動第 ${planRound} 輪（限一次）`}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* 計畫啟動區塊 */}
        {!planStartDate && !loading && (
          <div className="p-6 rounded-xl border border-gold/30 bg-card mb-6 space-y-4">
            <h2 className="font-bold text-gold text-lg">啟動 21 天行動計畫</h2>
            <p className="text-sm text-muted-foreground">
              請選擇你的計畫起始日，系統將自動計算每天是第幾天。
            </p>
            <div>
              <Label className="mb-1 block">計畫起始日</Label>
              <p className="text-xs text-muted-foreground mb-2">請點選下方欄位選擇日期（最晚為今天）</p>
              <Input
                type="date"
                value={planInputDate}
                max={today || undefined}
                onChange={(e) => setPlanInputDate(e.target.value)}
                className="mt-1 border-gold/30 text-foreground bg-background [color-scheme:dark]"
              />
            </div>
            {planInputDate && (
              today && planInputDate > today ? (
                <p className="text-sm text-red-400">
                  已選擇：{planInputDate}（未來日期，今天是 {today}）<br />
                  計畫要到那天才開始，確定不是選錯月份嗎？
                </p>
              ) : (
                <p className="text-sm text-gold">
                  已選擇：{planInputDate}
                </p>
              )
            )}
            <Button
              type="button"
              onClick={startPlan}
              disabled={startingSaving || !planInputDate}
              className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12"
            >
              {startingSaving ? "啟動中..." : "啟動計畫"}
            </Button>
            {message && (
              <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</p>
            )}
          </div>
        )}

        {/* 計畫已超過 21 天 */}
        {planStartDate && report.day_number > 21 && !existing && (
          <div className="p-6 rounded-xl border border-gold/30 bg-card mb-6 space-y-4">
            <h2 className="font-bold text-gold text-lg">恭喜完成第 {planRound} 輪 21 天！</h2>
            <p className="text-sm text-muted-foreground">
              你已完成本輪 21 天行動計畫。你可以開始新的一輪，繼續保持成長動力！
            </p>
            <Button
              type="button"
              onClick={startNewRound}
              disabled={startingSaving}
              className="bg-gold text-black hover:bg-gold-light font-semibold h-10"
            >
              {startingSaving ? "啟動中..." : `開始第 ${planRound + 1} 輪`}
            </Button>
            {message && (
              <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 超出補填窗口：在最上面就講清楚，並且整份表單唯讀。
              以前欄位是可以打字的，使用者會寫完一整篇才發現沒有送出鍵。 */}
          {!existing && !canCreateForActive && (
            <div className="p-4 rounded-xl border border-red-400/40 bg-red-400/5">
              <p className="text-sm font-semibold text-red-400">
                {activeDate} 已超過補填期限，這一天無法再填寫
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                日報只能填寫「昨天、今天、明天」三天，避免事後補填影響連續打卡的真實性。
                下方表單已鎖定為唯讀，請切換到可填寫的日期。
              </p>
              <Button
                type="button"
                onClick={() => switchDate(today)}
                className="mt-3 h-9 bg-gold text-black hover:bg-gold-light font-semibold text-sm"
              >
                回到今天（{today}）
              </Button>
            </div>
          )}

          {/* Header Info */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>日期</Label>
                {existing && editing ? (
                  canCreateForActive ? (
                    <>
                      <div className="mt-1 flex gap-1.5">
                        {[{ n: -1, l: "昨天" }, { n: 0, l: "今天" }, { n: 1, l: "明天" }].map(({ n, l }) => {
                          const d = today ? addDaysISO(today, n) : "";
                          const sel = (editTargetDate || activeDate) === d;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setEditTargetDate(d)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sel ? "bg-gold text-black" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}
                            >
                              {l}（{d.slice(5)}）
                            </button>
                          );
                        })}
                      </div>
                      {editTargetDate && editTargetDate !== activeDate && (
                        <p className="mt-1.5 text-xs text-yellow-400">將把此日記日期由 {activeDate} 改為 {editTargetDate}</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-yellow-400">{activeDate}（此日期較早，僅能修改內容，無法改日期）</p>
                  )
                ) : (
                  <>
                    <div className="mt-1 flex gap-1.5">
                      {[{ n: -1, l: "昨天" }, { n: 0, l: "今天" }, { n: 1, l: "明天" }].map(({ n, l }) => {
                        const d = today ? addDaysISO(today, n) : "";
                        const isActive = activeDate === d;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => switchDate(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? "bg-gold text-black" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}
                          >
                            {l}（{d.slice(5)}）
                          </button>
                        );
                      })}
                    </div>
                    <p className={`mt-1.5 text-xs ${activeDate !== today ? "text-yellow-400" : "text-muted-foreground"}`}>
                      目前：{activeDate}{activeDate === today ? "（今天）" : ""}
                    </p>
                  </>
                )}
              </div>
              <div>
                <Label>第幾天 (1-21)</Label>
                {planStartDate ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-bold text-gold">
                      Day {report.day_number > 21 ? 21 : report.day_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      （第 {planRound} 輪・起始日 {planStartDate}）
                    </span>
                  </div>
                ) : (
                  <Input
                    type="number" min={1} max={21}
                    value={report.day_number}
                    onChange={(e) => set("day_number", parseInt(e.target.value) || 1)}
                    disabled={isReadOnly}
                    className="mt-1 bg-background border-border"
                  />
                )}
              </div>
            </div>
            <div>
              <Label>今天的能量狀態 (1-10分)：{report.energy_state}</Label>
              <input
                type="range" min={1} max={10}
                value={report.energy_state}
                onChange={(e) => set("energy_state", parseInt(e.target.value))}
                disabled={isReadOnly}
                className="w-full mt-2 accent-gold"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span><span>5</span><span>10</span>
              </div>
            </div>
            <div>
              <Label>今天最重要的一件事</Label>
              <Textarea
                value={report.most_important_thing}
                onChange={(e) => set("most_important_thing", e.target.value)}
                disabled={isReadOnly}
                placeholder="今天最重要的一件事..."
                rows={2}
                className="mt-1 bg-background border-border"
              />
            </div>
          </div>

          {/* PART 1: 晨間信念打卡 */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <PartHeader num={1} title="晨間信念打卡" />
            <p className="text-sm text-muted-foreground mb-3">每天早晨朗讀</p>
            <div className="space-y-2 mb-4">
              <Checkbox checked={report.belief_four_beliefs} onChange={(v) => set("belief_four_beliefs", v)} label="四大信念" disabled={isReadOnly} />
              <Checkbox checked={report.belief_find_hope} onChange={(v) => set("belief_find_hope", v)} label="找到方法，看見希望" disabled={isReadOnly} />
              <Checkbox checked={report.belief_cognition} onChange={(v) => set("belief_cognition", v)} label="人生不是被環境決定，而是被認知決定" disabled={isReadOnly} />
              <Checkbox checked={report.belief_upgrade} onChange={(v) => set("belief_upgrade", v)} label="我每天都在升級自己" disabled={isReadOnly} />
              <Checkbox checked={report.belief_shine} onChange={(v) => set("belief_shine", v)} label="我願意照亮他人" disabled={isReadOnly} />
            </div>
            <Label>今日一句自我宣言</Label>
            <Textarea
              value={report.self_declaration}
              onChange={(e) => set("self_declaration", e.target.value)}
              disabled={isReadOnly}
              placeholder="今日一句自我宣言..."
              rows={2}
              className="mt-1 bg-background border-border"
            />
          </div>

          {/* PART 2: 今日覺察 */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <PartHeader num={2} title="今日覺察" />
            <div className="space-y-4">
              <div>
                <Label>今天我在哪個地方可以更好？</Label>
                <Textarea
                  value={report.awareness_improve}
                  onChange={(e) => set("awareness_improve", e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                  className="mt-1 bg-background border-border"
                />
              </div>
              <div>
                <Label>今日有覺察到什麼？</Label>
                <Textarea
                  value={report.awareness_notice}
                  onChange={(e) => set("awareness_notice", e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                  className="mt-1 bg-background border-border"
                />
              </div>
            </div>
          </div>

          {/* PART 3: 今日學習 */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <PartHeader num={3} title="今日學習" />
            <Label>今天學到什麼新的觀念 or 事物？</Label>
            <Textarea
              value={report.learning_content}
              onChange={(e) => set("learning_content", e.target.value)}
              disabled={isReadOnly}
              rows={3}
              className="mt-1 bg-background border-border"
            />
            <p className="text-sm text-muted-foreground mt-3 mb-2">學習來源</p>
            <div className="flex flex-wrap gap-4">
              <Checkbox checked={report.learning_course} onChange={(v) => set("learning_course", v)} label="課程" disabled={isReadOnly} />
              <Checkbox checked={report.learning_book} onChange={(v) => set("learning_book", v)} label="書籍" disabled={isReadOnly} />
              <Checkbox checked={report.learning_dialogue} onChange={(v) => set("learning_dialogue", v)} label="對話" disabled={isReadOnly} />
              <Checkbox checked={report.learning_observation} onChange={(v) => set("learning_observation", v)} label="觀察" disabled={isReadOnly} />
              <Checkbox checked={report.learning_other} onChange={(v) => set("learning_other", v)} label="其他" disabled={isReadOnly} />
            </div>
          </div>

          {/* PART 4: 今日行動 */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <PartHeader num={4} title="今日行動" />
            <Label>今天做了什麼新的行動？</Label>
            <Textarea
              value={report.action_content}
              onChange={(e) => set("action_content", e.target.value)}
              disabled={isReadOnly}
              rows={3}
              className="mt-1 bg-background border-border"
            />
            <p className="text-sm text-muted-foreground mt-3 mb-2">行動領域</p>
            <div className="flex flex-wrap gap-4">
              <Checkbox checked={report.action_career} onChange={(v) => set("action_career", v)} label="事業" disabled={isReadOnly} />
              <Checkbox checked={report.action_wealth} onChange={(v) => set("action_wealth", v)} label="財富" disabled={isReadOnly} />
              <Checkbox checked={report.action_health} onChange={(v) => set("action_health", v)} label="健康" disabled={isReadOnly} />
              <Checkbox checked={report.action_family} onChange={(v) => set("action_family", v)} label="家庭" disabled={isReadOnly} />
              <Checkbox checked={report.action_relationship} onChange={(v) => set("action_relationship", v)} label="關係" disabled={isReadOnly} />
            </div>
          </div>

          {/* PART 5 & 6: 今日分享 + 感恩時刻 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card">
              <PartHeader num={5} title="今日分享" />
              <Label>今天對誰分享了什麼？</Label>
              <Textarea
                value={report.sharing_content}
                onChange={(e) => set("sharing_content", e.target.value)}
                disabled={isReadOnly}
                rows={4}
                className="mt-1 bg-background border-border"
              />
            </div>
            <div className="p-6 rounded-xl border border-border bg-card">
              <PartHeader num={6} title="感恩時刻" />
              <Label>今天最感恩的一件事</Label>
              <Textarea
                value={report.gratitude}
                onChange={(e) => set("gratitude", e.target.value)}
                disabled={isReadOnly}
                rows={4}
                className="mt-1 bg-background border-border"
              />
            </div>
          </div>

          {/* PART 7 & 8: 今日評分 + 明日行動 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card">
              <PartHeader num={7} title="今日評分" />
              <div className="space-y-3">
                <div>
                  <Label>給分 (1-10)：{report.daily_score}</Label>
                  <input
                    type="range" min={1} max={10}
                    value={report.daily_score}
                    onChange={(e) => set("daily_score", parseInt(e.target.value))}
                    disabled={isReadOnly}
                    className="w-full mt-1 accent-gold"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">比昨天</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio" name="compare"
                        checked={report.compare_yesterday === "better"}
                        onChange={() => set("compare_yesterday", "better")}
                        disabled={isReadOnly}
                        className="accent-gold"
                      />
                      <span className="text-sm">好</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio" name="compare"
                        checked={report.compare_yesterday === "worse"}
                        onChange={() => set("compare_yesterday", "worse")}
                        disabled={isReadOnly}
                        className="accent-gold"
                      />
                      <span className="text-sm">差</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label>自評說明</Label>
                  <Textarea
                    value={report.score_note}
                    onChange={(e) => set("score_note", e.target.value)}
                    disabled={isReadOnly}
                    rows={2}
                    className="mt-1 bg-background border-border"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card">
              <PartHeader num={8} title="明日行動" />
              <Label>明天最重要的一件事</Label>
              <Textarea
                value={report.tomorrow_action}
                onChange={(e) => set("tomorrow_action", e.target.value)}
                disabled={isReadOnly}
                rows={6}
                className="mt-1 bg-background border-border"
              />
            </div>
          </div>

          {/* 群組公佈確認 */}
          <div className="p-4 rounded-xl border border-gold/30 bg-card">
            <Checkbox
              checked={report.announced_in_group}
              onChange={(v) => set("announced_in_group", v)}
              label="是否已在群裡完成公佈？"
              disabled={isReadOnly}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          {((!existing && canCreateForActive) || editing) && (
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12"
            >
              {saving ? "儲存中..." : editing ? "儲存修改" : "提交今日日報"}
            </Button>
          )}

          {!existing && !canCreateForActive && (
            <p className="text-sm text-yellow-400 text-center">
              此日期超過可填寫範圍，僅能填寫昨天、今天或明天的日記。
            </p>
          )}

          {existing && !editing && (
            <Button
              type="button"
              onClick={() => { setEditing(true); setEditTargetDate(activeDate); setMessage(""); }}
              className="w-full bg-secondary text-foreground hover:bg-secondary/80 font-semibold h-12 mt-3"
            >
              修改今日日報
            </Button>
          )}

          {editing && (
            <Button
              type="button"
              onClick={() => { setEditing(false); setEditTargetDate(""); setMessage(""); }}
              variant="outline"
              className="w-full mt-3"
            >
              取消修改
            </Button>
          )}

          {existing && !editing && (
            <ReportPreview
              reportTitle="21天行動系統日報表"
              subtitle={`Day ${report.day_number}${planRound > 1 ? ` (第${planRound}輪)` : ""}`}
              date={activeDate}
              userName={userName}
              gridLayout
              sections={[
                /* 左1 */ {
                  title: "基本資訊",
                  items: [
                    { label: "能量狀態", value: `${report.energy_state} / 10` },
                    { label: "最重要的事", value: report.most_important_thing },
                  ],
                },
                /* 右1 */ {
                  title: "1 晨間信念打卡",
                  checks: [
                    { label: "四大信念", checked: report.belief_four_beliefs },
                    { label: "看見希望", checked: report.belief_find_hope },
                    { label: "認知決定", checked: report.belief_cognition },
                    { label: "升級自己", checked: report.belief_upgrade },
                    { label: "照亮他人", checked: report.belief_shine },
                  ],
                  items: [{ label: "自我宣言", value: report.self_declaration }],
                },
                /* 左2 */ {
                  title: "2 今日覺察",
                  items: [
                    { label: "可以更好的地方", value: report.awareness_improve },
                    { label: "覺察到什麼", value: report.awareness_notice },
                  ],
                },
                /* 右2 */ {
                  title: "3 今日學習",
                  items: [{ label: "學到什麼", value: report.learning_content }],
                  checks: [
                    { label: "課程", checked: report.learning_course },
                    { label: "書籍", checked: report.learning_book },
                    { label: "對話", checked: report.learning_dialogue },
                    { label: "觀察", checked: report.learning_observation },
                    { label: "其他", checked: report.learning_other },
                  ],
                },
                /* 左3 */ {
                  title: "4 今日行動",
                  items: [{ label: "做了什麼", value: report.action_content }],
                  checks: [
                    { label: "事業", checked: report.action_career },
                    { label: "財富", checked: report.action_wealth },
                    { label: "健康", checked: report.action_health },
                    { label: "家庭", checked: report.action_family },
                    { label: "關係", checked: report.action_relationship },
                  ],
                },
                /* 右3 */ {
                  title: "5 今日分享",
                  content: report.sharing_content,
                },
                /* 左4 */ {
                  title: "6 感恩時刻",
                  content: report.gratitude,
                },
                /* 右4 */ {
                  title: "7 今日評分",
                  items: [
                    { label: "給分", value: `${report.daily_score} / 10` },
                    { label: "比昨天", value: report.compare_yesterday === "better" ? "好" : report.compare_yesterday === "worse" ? "差" : "—" },
                    { label: "自評", value: report.score_note },
                  ],
                },
                /* 左5 */ {
                  title: "8 明日行動",
                  content: report.tomorrow_action,
                },
                /* 右5 */ {
                  title: "群組公佈",
                  checks: [{ label: "已在群裡完成公佈", checked: report.announced_in_group }],
                },
              ]}
              onExportPDF={() =>
                exportDailyPDF({
                  userName,
                  date: activeDate,
                  dayNumber: report.day_number,
                  planRound,
                  energyState: report.energy_state,
                  mostImportantThing: report.most_important_thing,
                  beliefs: [
                    { label: "四大信念", checked: report.belief_four_beliefs },
                    { label: "找到方法，看見希望", checked: report.belief_find_hope },
                    { label: "認知決定人生", checked: report.belief_cognition },
                    { label: "每天升級自己", checked: report.belief_upgrade },
                    { label: "願意照亮他人", checked: report.belief_shine },
                  ],
                  selfDeclaration: report.self_declaration,
                  awarenessImprove: report.awareness_improve,
                  awarenessNotice: report.awareness_notice,
                  learningContent: report.learning_content,
                  learningSources: [
                    { label: "課程", checked: report.learning_course },
                    { label: "書籍", checked: report.learning_book },
                    { label: "對話", checked: report.learning_dialogue },
                    { label: "觀察", checked: report.learning_observation },
                    { label: "其他", checked: report.learning_other },
                  ],
                  actionContent: report.action_content,
                  actionDomains: [
                    { label: "事業", checked: report.action_career },
                    { label: "財富", checked: report.action_wealth },
                    { label: "健康", checked: report.action_health },
                    { label: "家庭", checked: report.action_family },
                    { label: "關係", checked: report.action_relationship },
                  ],
                  sharingContent: report.sharing_content,
                  gratitude: report.gratitude,
                  dailyScore: report.daily_score,
                  compareYesterday: report.compare_yesterday,
                  scoreNote: report.score_note,
                  tomorrowAction: report.tomorrow_action,
                  announcedInGroup: report.announced_in_group,
                })
              }
            />
          )}
        </form>

        {/* 歷史日報紀錄 */}
        {pastReports.length > 0 && (
          <div className="mt-8 mb-8">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-gold font-semibold">歷史日報紀錄</span>
                <span className="text-xs text-muted-foreground">共 {pastReports.length} 篇</span>
              </div>
              <span className="text-muted-foreground text-sm">{showHistory ? "收起" : "展開"}</span>
            </button>

            {showHistory && (
              <div className="mt-2 space-y-2">
                {pastReports.map((r) => (
                  <button
                    key={r.report_date}
                    type="button"
                    onClick={() => {
                      switchDate(r.report_date);
                      setShowHistory(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                      activeDate === r.report_date
                        ? "border-gold bg-gold/10"
                        : "border-border bg-card hover:bg-card/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{r.report_date}</span>
                      <span className="text-xs text-gold">Day {r.day_number}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>能量 {r.energy_state}/10</span>
                      <span>評分 {r.daily_score}/10</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
