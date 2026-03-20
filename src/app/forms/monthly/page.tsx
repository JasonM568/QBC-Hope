"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportPDF } from "@/lib/export-pdf";

const domains = [
  { key: "career", label: "事業", desc: "工作成就、職涯發展" },
  { key: "relationship", label: "關係", desc: "家庭、友誼、人際" },
  { key: "health", label: "健康", desc: "身體、心理、運動" },
  { key: "wealth", label: "財務", desc: "收入、理財、資產" },
  { key: "growth", label: "成長", desc: "學習、靈性、自我提升" },
] as const;

type DomainKey = typeof domains[number]["key"];

export default function MonthlyReportPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [scores, setScores] = useState<Record<DomainKey, number>>({
    career: 5, relationship: 5, health: 5, wealth: 5, growth: 5,
  });
  const [notes, setNotes] = useState<Record<DomainKey, string>>({
    career: "", relationship: "", health: "", wealth: "", growth: "",
  });
  const [overallReflection, setOverallReflection] = useState("");
  const [nextMonthGoals, setNextMonthGoals] = useState("");
  const [userName, setUserName] = useState("");
  const [existing, setExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserName(user.user_metadata?.display_name || user.email || "");

      const { data } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("month", month)
        .single();

      if (data) {
        setScores({
          career: data.career_score, relationship: data.relationship_score,
          health: data.health_score, wealth: data.wealth_score, growth: data.growth_score,
        });
        setNotes({
          career: data.career_note || "", relationship: data.relationship_note || "",
          health: data.health_note || "", wealth: data.wealth_note || "", growth: data.growth_note || "",
        });
        setOverallReflection(data.overall_reflection || "");
        setNextMonthGoals(data.next_month_goals || "");
        setExisting(true);
      }
      setLoading(false);
    }
    load();
  }, [router, year, month]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      year, month,
      career_score: scores.career, career_note: notes.career,
      relationship_score: scores.relationship, relationship_note: notes.relationship,
      health_score: scores.health, health_note: notes.health,
      wealth_score: scores.wealth, wealth_note: notes.wealth,
      growth_score: scores.growth, growth_note: notes.growth,
      overall_reflection: overallReflection,
      next_month_goals: nextMonthGoals,
    };

    const { error } = existing
      ? await supabase.from("monthly_reports").update(payload).eq("user_id", user.id).eq("year", year).eq("month", month)
      : await supabase.from("monthly_reports").insert(payload);

    if (error) {
      setMessage("儲存失敗：" + error.message);
    } else {
      setMessage("月報已儲存！");
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
          <h1 className="text-2xl font-bold">人生五域平衡月報告</h1>
          <p className="text-muted-foreground mt-1">{year} 年 {month} 月</p>
          {existing && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-400/10 text-green-400 text-sm rounded-full">
              本月已填寫（可更新）
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {domains.map((d) => (
            <div key={d.key} className="p-6 rounded-xl border border-border bg-card">
              <h2 className="font-semibold text-gold mb-1">{d.label}</h2>
              <p className="text-muted-foreground text-sm mb-4">{d.desc}</p>
              <div className="mb-4">
                <Label>評分 (1-10)：{scores[d.key]}</Label>
                <input
                  type="range" min={1} max={10}
                  value={scores[d.key]}
                  onChange={(e) => setScores({ ...scores, [d.key]: parseInt(e.target.value) })}
                  className="w-full mt-2 accent-gold"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span><span>5</span><span>10</span>
                </div>
              </div>
              <Label>本月反思</Label>
              <Textarea
                value={notes[d.key]}
                onChange={(e) => setNotes({ ...notes, [d.key]: e.target.value })}
                placeholder={`${d.label}方面的本月回顧...`}
                rows={3}
                className="mt-2 bg-background border-border"
              />
            </div>
          ))}

          <div className="p-6 rounded-xl border border-border bg-card">
            <Label>整體反思</Label>
            <Textarea
              value={overallReflection}
              onChange={(e) => setOverallReflection(e.target.value)}
              placeholder="這個月最大的收穫與挑戰..."
              rows={4}
              className="mt-2 bg-background border-border"
            />
          </div>

          <div className="p-6 rounded-xl border border-border bg-card">
            <Label>下個月目標</Label>
            <Textarea
              value={nextMonthGoals}
              onChange={(e) => setNextMonthGoals(e.target.value)}
              placeholder="下個月最想達成的 3 件事..."
              rows={4}
              className="mt-2 bg-background border-border"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12">
            {saving ? "儲存中..." : existing ? "更新月報" : "提交月報"}
          </Button>

          <Button
            type="button"
            onClick={() =>
              exportPDF({
                reportTitle: "人生五域平衡月報告",
                subtitle: `${year} 年 ${month} 月`,
                date: `${year}-${String(month).padStart(2, "0")}`,
                userName,
                sections: [
                  ...domains.map((d) => ({
                    title: d.label,
                    content: [
                      { label: "評分", value: `${scores[d.key]} / 10` },
                      { label: "本月反思", value: notes[d.key] },
                    ],
                  })),
                  { title: "整體反思", content: overallReflection },
                  { title: "下個月目標", content: nextMonthGoals },
                ],
              })
            }
            variant="outline"
            className="w-full border-gold/30 text-gold hover:bg-gold/10 h-12"
          >
            匯出 PDF
          </Button>
        </form>
      </main>
    </div>
  );
}
