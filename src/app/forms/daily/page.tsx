"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportPDF } from "@/lib/export-pdf";

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
};

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const set = <K extends keyof DailyReport>(key: K, value: DailyReport[K]) =>
    setReport((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserName(user.user_metadata?.display_name || user.email || "");

      const { data } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_date", today)
        .single();

      if (data) {
        setReport({
          ...emptyReport,
          ...data,
        });
        setExisting(true);
      }
      setLoading(false);
    }
    load();
  }, [router, today]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (existing) {
      setMessage("今天已經填寫過了！");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("daily_reports").insert({
      user_id: user.id,
      report_date: today,
      ...report,
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
    }
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
          {existing && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-400/10 text-green-400 text-sm rounded-full">
              今日已完成
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>日期</Label>
                <Input value={today} disabled className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>第幾天 (1-21)</Label>
                <Input
                  type="number" min={1} max={21}
                  value={report.day_number}
                  onChange={(e) => set("day_number", parseInt(e.target.value) || 1)}
                  disabled={existing}
                  className="mt-1 bg-background border-border"
                />
              </div>
            </div>
            <div>
              <Label>今天的能量狀態 (1-10分)：{report.energy_state}</Label>
              <input
                type="range" min={1} max={10}
                value={report.energy_state}
                onChange={(e) => set("energy_state", parseInt(e.target.value))}
                disabled={existing}
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
                disabled={existing}
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
              <Checkbox checked={report.belief_four_beliefs} onChange={(v) => set("belief_four_beliefs", v)} label="四大信念" disabled={existing} />
              <Checkbox checked={report.belief_find_hope} onChange={(v) => set("belief_find_hope", v)} label="找到方法，看見希望" disabled={existing} />
              <Checkbox checked={report.belief_cognition} onChange={(v) => set("belief_cognition", v)} label="人生不是被環境決定，而是被認知決定" disabled={existing} />
              <Checkbox checked={report.belief_upgrade} onChange={(v) => set("belief_upgrade", v)} label="我每天都在升級自己" disabled={existing} />
              <Checkbox checked={report.belief_shine} onChange={(v) => set("belief_shine", v)} label="我願意照亮他人" disabled={existing} />
            </div>
            <Label>今日一句自我宣言</Label>
            <Textarea
              value={report.self_declaration}
              onChange={(e) => set("self_declaration", e.target.value)}
              disabled={existing}
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
                  disabled={existing}
                  rows={3}
                  className="mt-1 bg-background border-border"
                />
              </div>
              <div>
                <Label>今日有覺察到什麼？</Label>
                <Textarea
                  value={report.awareness_notice}
                  onChange={(e) => set("awareness_notice", e.target.value)}
                  disabled={existing}
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
              disabled={existing}
              rows={3}
              className="mt-1 bg-background border-border"
            />
            <p className="text-sm text-muted-foreground mt-3 mb-2">學習來源</p>
            <div className="flex flex-wrap gap-4">
              <Checkbox checked={report.learning_course} onChange={(v) => set("learning_course", v)} label="課程" disabled={existing} />
              <Checkbox checked={report.learning_book} onChange={(v) => set("learning_book", v)} label="書籍" disabled={existing} />
              <Checkbox checked={report.learning_dialogue} onChange={(v) => set("learning_dialogue", v)} label="對話" disabled={existing} />
              <Checkbox checked={report.learning_observation} onChange={(v) => set("learning_observation", v)} label="觀察" disabled={existing} />
              <Checkbox checked={report.learning_other} onChange={(v) => set("learning_other", v)} label="其他" disabled={existing} />
            </div>
          </div>

          {/* PART 4: 今日行動 */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <PartHeader num={4} title="今日行動" />
            <Label>今天做了什麼新的行動？</Label>
            <Textarea
              value={report.action_content}
              onChange={(e) => set("action_content", e.target.value)}
              disabled={existing}
              rows={3}
              className="mt-1 bg-background border-border"
            />
            <p className="text-sm text-muted-foreground mt-3 mb-2">行動領域</p>
            <div className="flex flex-wrap gap-4">
              <Checkbox checked={report.action_career} onChange={(v) => set("action_career", v)} label="事業" disabled={existing} />
              <Checkbox checked={report.action_wealth} onChange={(v) => set("action_wealth", v)} label="財富" disabled={existing} />
              <Checkbox checked={report.action_health} onChange={(v) => set("action_health", v)} label="健康" disabled={existing} />
              <Checkbox checked={report.action_family} onChange={(v) => set("action_family", v)} label="家庭" disabled={existing} />
              <Checkbox checked={report.action_relationship} onChange={(v) => set("action_relationship", v)} label="關係" disabled={existing} />
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
                disabled={existing}
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
                disabled={existing}
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
                    disabled={existing}
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
                        disabled={existing}
                        className="accent-gold"
                      />
                      <span className="text-sm">好</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio" name="compare"
                        checked={report.compare_yesterday === "worse"}
                        onChange={() => set("compare_yesterday", "worse")}
                        disabled={existing}
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
                    disabled={existing}
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
                disabled={existing}
                rows={6}
                className="mt-1 bg-background border-border"
              />
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          {!existing && (
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12"
            >
              {saving ? "儲存中..." : "提交今日日報"}
            </Button>
          )}

          {existing && (
            <Button
              type="button"
              onClick={() =>
                exportPDF({
                  reportTitle: "21天行動系統日報表",
                  subtitle: `第 ${report.day_number} 天`,
                  date: today,
                  userName,
                  sections: [
                    { title: "基本資訊", content: [
                      { label: "能量狀態", value: `${report.energy_state} / 10` },
                      { label: "今天最重要的一件事", value: report.most_important_thing },
                    ]},
                    { title: "PART 1：晨間信念打卡", content: [
                      { label: "自我宣言", value: report.self_declaration },
                    ]},
                    { title: "PART 2：今日覺察", content: [
                      { label: "可以更好的地方", value: report.awareness_improve },
                      { label: "覺察到什麼", value: report.awareness_notice },
                    ]},
                    { title: "PART 3：今日學習", content: report.learning_content },
                    { title: "PART 4：今日行動", content: report.action_content },
                    { title: "PART 5：今日分享", content: report.sharing_content },
                    { title: "PART 6：感恩時刻", content: report.gratitude },
                    { title: "PART 7：今日評分", content: [
                      { label: "給分", value: `${report.daily_score} / 10` },
                      { label: "比昨天", value: report.compare_yesterday === "better" ? "好" : "差" },
                      { label: "自評說明", value: report.score_note },
                    ]},
                    { title: "PART 8：明日行動", content: report.tomorrow_action },
                  ],
                })
              }
              variant="outline"
              className="w-full border-gold/30 text-gold hover:bg-gold/10 h-12"
            >
              匯出 PDF
            </Button>
          )}
        </form>
      </main>
    </div>
  );
}
