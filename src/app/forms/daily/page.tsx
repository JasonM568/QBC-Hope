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
  morning_gratitude: string;
  today_goals: string;
  action_taken: string;
  reflection: string;
  energy_level: number;
  mood_score: number;
}

const emptyReport: DailyReport = {
  morning_gratitude: "",
  today_goals: "",
  action_taken: "",
  reflection: "",
  energy_level: 7,
  mood_score: 7,
};

export default function DailyReportPage() {
  const [report, setReport] = useState<DailyReport>(emptyReport);
  const [existing, setExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserName(user.user_metadata?.display_name || user.email || "");

      const { data } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_date", today)
        .single();

      if (data) {
        setReport(data);
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
      morning_gratitude: report.morning_gratitude,
      today_goals: report.today_goals,
      action_taken: report.action_taken,
      reflection: report.reflection,
      energy_level: report.energy_level,
      mood_score: report.mood_score,
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
          <h1 className="text-2xl font-bold">21天行動日報表</h1>
          <p className="text-muted-foreground mt-1">{today}</p>
          {existing && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-400/10 text-green-400 text-sm rounded-full">
              今日已完成
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Morning Gratitude */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold">晨間感恩</h2>
            </div>
            <Label htmlFor="gratitude">今天你感恩的三件事</Label>
            <Textarea
              id="gratitude"
              value={report.morning_gratitude}
              onChange={(e) => setReport({ ...report, morning_gratitude: e.target.value })}
              placeholder="1. &#10;2. &#10;3. "
              rows={4}
              disabled={existing}
              className="mt-2 bg-background border-border"
            />
          </div>

          {/* Step 2: Goals */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">2</span>
              <h2 className="font-semibold">今日目標</h2>
            </div>
            <Label htmlFor="goals">今天最重要的 3 個目標</Label>
            <Textarea
              id="goals"
              value={report.today_goals}
              onChange={(e) => setReport({ ...report, today_goals: e.target.value })}
              placeholder="1. &#10;2. &#10;3. "
              rows={4}
              disabled={existing}
              className="mt-2 bg-background border-border"
            />
          </div>

          {/* Step 3: Actions */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">3</span>
              <h2 className="font-semibold">執行紀錄</h2>
            </div>
            <Label htmlFor="actions">今天實際完成了什麼？</Label>
            <Textarea
              id="actions"
              value={report.action_taken}
              onChange={(e) => setReport({ ...report, action_taken: e.target.value })}
              placeholder="描述你今天做了哪些具體行動..."
              rows={4}
              disabled={existing}
              className="mt-2 bg-background border-border"
            />
          </div>

          {/* Step 4: Reflection */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">4</span>
              <h2 className="font-semibold">每日反思</h2>
            </div>
            <Label htmlFor="reflection">今天學到了什麼？明天如何改進？</Label>
            <Textarea
              id="reflection"
              value={report.reflection}
              onChange={(e) => setReport({ ...report, reflection: e.target.value })}
              placeholder="反思與改進方向..."
              rows={4}
              disabled={existing}
              className="mt-2 bg-background border-border"
            />
          </div>

          {/* Scores */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="font-semibold mb-4">今日自評</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="energy">精力指數 (1-10)</Label>
                <Input
                  id="energy"
                  type="number"
                  min={1}
                  max={10}
                  value={report.energy_level}
                  onChange={(e) => setReport({ ...report, energy_level: parseInt(e.target.value) || 1 })}
                  disabled={existing}
                  className="mt-2 bg-background border-border"
                />
              </div>
              <div>
                <Label htmlFor="mood">心情指數 (1-10)</Label>
                <Input
                  id="mood"
                  type="number"
                  min={1}
                  max={10}
                  value={report.mood_score}
                  onChange={(e) => setReport({ ...report, mood_score: parseInt(e.target.value) || 1 })}
                  disabled={existing}
                  className="mt-2 bg-background border-border"
                />
              </div>
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
                  reportTitle: "21天行動日報表",
                  date: today,
                  userName,
                  sections: [
                    { title: "晨間感恩", content: report.morning_gratitude },
                    { title: "今日目標", content: report.today_goals },
                    { title: "執行紀錄", content: report.action_taken },
                    { title: "每日反思", content: report.reflection },
                    {
                      title: "今日自評",
                      content: [
                        { label: "精力指數", value: `${report.energy_level} / 10` },
                        { label: "心情指數", value: `${report.mood_score} / 10` },
                      ],
                    },
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
