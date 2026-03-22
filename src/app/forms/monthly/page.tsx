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
import ReportPreview from "@/components/report-preview";

function Radio({ name, value, checked, onChange, label }: {
  name: string; value: string; checked: boolean; onChange: (v: string) => void; label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={() => onChange(value)} className="accent-gold" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function PartHeader({ num, title, subtitle, question }: { num: number; title: string; subtitle: string; question: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-gold text-lg">PART {num} {title} {subtitle}</h2>
      <p className="text-sm text-gold/80 mt-1">核心問題：{question}</p>
    </div>
  );
}

interface MonthlyForm {
  satisfaction: number;
  monthly_keywords: string;
  last_career_score: number;
  last_wealth_score: number;
  last_health_score: number;
  last_family_score: number;
  last_relationship_score: number;
  // P1 事業
  career_value: string;
  career_achievement: string;
  career_stuck: string;
  career_score: number;
  career_next: string;
  // P2 財富
  wealth_income_change: string;
  wealth_new_source: string;
  wealth_investment: string;
  wealth_score: number;
  wealth_next: string;
  // P3 健康
  health_routine: string;
  health_status: string;
  health_exercise: string;
  health_score: number;
  health_next: string;
  // P4 家庭
  family_complaint: boolean;
  family_complaint_reason: string;
  family_activity: string;
  family_interaction: string;
  family_score: number;
  family_next: string;
  // P5 關係
  relation_new_connection: boolean;
  relation_new_important: string;
  relation_interaction: string;
  relation_score: number;
  relation_next: string;
  // 反思
  reflection_breakthrough: string;
  reflection_learning: string;
  reflection_mistake: string;
  // 平衡
  balance_strongest: string;
  balance_weakest: string;
  balance_reason: string;
  // 策略
  next_three_things: string;
  next_domain_order: string;
  highlight: string;
  important_change: string;
  next_step: string;
}

const emptyForm: MonthlyForm = {
  satisfaction: 5, monthly_keywords: "",
  last_career_score: 0, last_wealth_score: 0, last_health_score: 0, last_family_score: 0, last_relationship_score: 0,
  career_value: "", career_achievement: "", career_stuck: "", career_score: 10, career_next: "",
  wealth_income_change: "stable", wealth_new_source: "", wealth_investment: "", wealth_score: 10, wealth_next: "",
  health_routine: "normal", health_status: "", health_exercise: "", health_score: 10, health_next: "",
  family_complaint: false, family_complaint_reason: "", family_activity: "", family_interaction: "", family_score: 10, family_next: "",
  relation_new_connection: false, relation_new_important: "", relation_interaction: "", relation_score: 10, relation_next: "",
  reflection_breakthrough: "", reflection_learning: "", reflection_mistake: "",
  balance_strongest: "", balance_weakest: "", balance_reason: "",
  next_three_things: "", next_domain_order: "", highlight: "", important_change: "", next_step: "",
};

export default function MonthlyReportPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [form, setForm] = useState<MonthlyForm>(emptyForm);
  const [userName, setUserName] = useState("");
  const [existing, setExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const set = <K extends keyof MonthlyForm>(key: K, value: MonthlyForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const totalScore = form.career_score + form.wealth_score + form.health_score + form.family_score + form.relation_score;
  const lastTotal = form.last_career_score + form.last_wealth_score + form.last_health_score + form.last_family_score + form.last_relationship_score;

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
        setForm({ ...emptyForm, ...data });
        setExisting(true);
      } else {
        // Load last month's scores for comparison
        const lastMonth = month === 1 ? 12 : month - 1;
        const lastYear = month === 1 ? year - 1 : year;
        const { data: lastData } = await supabase
          .from("monthly_reports")
          .select("career_score, wealth_score, health_score, family_score, relation_score")
          .eq("user_id", user.id)
          .eq("year", lastYear)
          .eq("month", lastMonth)
          .single();

        if (lastData) {
          setForm((prev) => ({
            ...prev,
            last_career_score: lastData.career_score || 0,
            last_wealth_score: lastData.wealth_score || 0,
            last_health_score: lastData.health_score || 0,
            last_family_score: lastData.family_score || 0,
            last_relationship_score: lastData.relation_score || 0,
          }));
        }
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, user_id: _uid, created_at: _ca, ...formData } = form as MonthlyForm & Record<string, unknown>;
    const payload = { user_id: user.id, year, month, ...formData };

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
          <p className="text-muted-foreground mt-1">HOPE Life Balance Monthly Report</p>
          <p className="text-gold mt-2 font-medium">核心理念：真正的成功，不是單一領域，而是整體人生的成長。</p>
          {existing && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-400/10 text-green-400 text-sm rounded-full">
              本月已填寫（可更新）
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold">
              <span className="text-gold">{year}</span>年<span className="text-gold">{month}</span>月
            </div>
            <div>
              <Label>本月整體滿意度 (1-10分)：{form.satisfaction}</Label>
              <input type="range" min={1} max={10} value={form.satisfaction} onChange={(e) => set("satisfaction", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
            </div>
            <div>
              <Label>本月關鍵字（請用3個詞描述本月）</Label>
              <Input value={form.monthly_keywords} onChange={(e) => set("monthly_keywords", e.target.value)} placeholder="例：突破、學習、調整" className="mt-1 bg-background border-border" />
            </div>
          </div>

          {/* 人生五域平衡表分數 */}
          <div className="p-6 rounded-xl border border-gold/30 bg-card">
            <h2 className="font-bold text-gold mb-4">人生五域平衡表分數</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">上個月分數</p>
                {[
                  { label: "事業 Career", key: "last_career_score" as const },
                  { label: "財富 Wealth", key: "last_wealth_score" as const },
                  { label: "健康 Health", key: "last_health_score" as const },
                  { label: "家庭 Family", key: "last_family_score" as const },
                  { label: "關係 Relation", key: "last_relationship_score" as const },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <span className="text-sm">{item.label}</span>
                    <Input type="number" min={0} max={20} value={form[item.key] || ""} onChange={(e) => set(item.key, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)} className="w-16 text-center bg-background border-border h-8 text-sm" />
                  </div>
                ))}
                <div className="flex items-center justify-between py-1 border-t border-border mt-1">
                  <span className="text-sm font-semibold">總分</span>
                  <span className="text-gold font-bold">{lastTotal}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">這個月分數</p>
                {[
                  { label: "事業 Career", score: form.career_score },
                  { label: "財富 Wealth", score: form.wealth_score },
                  { label: "健康 Health", score: form.health_score },
                  { label: "家庭 Family", score: form.family_score },
                  { label: "關係 Relation", score: form.relation_score },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-gold font-bold w-16 text-center">{item.score}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1 border-t border-border mt-1">
                  <span className="text-sm font-semibold">總分</span>
                  <span className="text-gold font-bold">{totalScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PART 1 事業 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={1} title="事業" subtitle="Career" question="我是否在創造價值？" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>本月我創造的價值</Label>
                <Textarea value={form.career_value} onChange={(e) => set("career_value", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>本月的成就</Label>
                <Textarea value={form.career_achievement} onChange={(e) => set("career_achievement", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>本月的卡關</Label>
                <Textarea value={form.career_stuck} onChange={(e) => set("career_stuck", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Label>評分 (1-20)：{form.career_score}</Label>
              <input type="range" min={1} max={20} value={form.career_score} onChange={(e) => set("career_score", parseInt(e.target.value))} className="flex-1 accent-gold" />
            </div>
            <div>
              <Label>下月優化方向</Label>
              <Textarea value={form.career_next} onChange={(e) => set("career_next", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
            </div>
          </div>

          {/* PART 2 財富 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={2} title="財富" subtitle="Wealth" question="我的收入是否成長？" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>本月收入變化</Label>
                <div className="flex flex-col gap-1 mt-1">
                  <Radio name="income" value="growth" checked={form.wealth_income_change === "growth"} onChange={(v) => set("wealth_income_change", v)} label="成長" />
                  <Radio name="income" value="stable" checked={form.wealth_income_change === "stable"} onChange={(v) => set("wealth_income_change", v)} label="持平" />
                  <Radio name="income" value="decline" checked={form.wealth_income_change === "decline"} onChange={(v) => set("wealth_income_change", v)} label="下降" />
                </div>
              </div>
              <div>
                <Label>本月新增收入來源</Label>
                <Textarea value={form.wealth_new_source} onChange={(e) => set("wealth_new_source", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>本月投資/資產變化</Label>
                <Textarea value={form.wealth_investment} onChange={(e) => set("wealth_investment", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Label>評分 (1-20)：{form.wealth_score}</Label>
              <input type="range" min={1} max={20} value={form.wealth_score} onChange={(e) => set("wealth_score", parseInt(e.target.value))} className="flex-1 accent-gold" />
            </div>
            <div>
              <Label>下月優化方向</Label>
              <Textarea value={form.wealth_next} onChange={(e) => set("wealth_next", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
            </div>
          </div>

          {/* PART 3 健康 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={3} title="健康" subtitle="Health" question="我的身體是否更好？" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>作息狀況</Label>
                <div className="flex flex-col gap-1 mt-1">
                  <Radio name="routine" value="regular" checked={form.health_routine === "regular"} onChange={(v) => set("health_routine", v)} label="規律" />
                  <Radio name="routine" value="normal" checked={form.health_routine === "normal"} onChange={(v) => set("health_routine", v)} label="普通" />
                  <Radio name="routine" value="poor" checked={form.health_routine === "poor"} onChange={(v) => set("health_routine", v)} label="不佳" />
                </div>
              </div>
              <div>
                <Label>本月健康狀態</Label>
                <Textarea value={form.health_status} onChange={(e) => set("health_status", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>運動頻率</Label>
                <Textarea value={form.health_exercise} onChange={(e) => set("health_exercise", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Label>評分 (1-20)：{form.health_score}</Label>
              <input type="range" min={1} max={20} value={form.health_score} onChange={(e) => set("health_score", parseInt(e.target.value))} className="flex-1 accent-gold" />
            </div>
            <div>
              <Label>下月優化方向</Label>
              <Textarea value={form.health_next} onChange={(e) => set("health_next", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
            </div>
          </div>

          {/* PART 4 家庭 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={4} title="家庭" subtitle="Family" question="我是否有陪伴家人？" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>家人是否抱怨</Label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="complaint" checked={form.family_complaint === true} onChange={() => set("family_complaint", true)} className="accent-gold" />
                    <span className="text-sm">是</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="complaint" checked={form.family_complaint === false} onChange={() => set("family_complaint", false)} className="accent-gold" />
                    <span className="text-sm">否</span>
                  </label>
                </div>
                {form.family_complaint && (
                  <div className="mt-2">
                    <Label>原因</Label>
                    <Textarea value={form.family_complaint_reason} onChange={(e) => set("family_complaint_reason", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
                  </div>
                )}
              </div>
              <div>
                <Label>本月陪伴活動</Label>
                <Textarea value={form.family_activity} onChange={(e) => set("family_activity", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>關鍵互動事件</Label>
                <Textarea value={form.family_interaction} onChange={(e) => set("family_interaction", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Label>評分 (1-20)：{form.family_score}</Label>
              <input type="range" min={1} max={20} value={form.family_score} onChange={(e) => set("family_score", parseInt(e.target.value))} className="flex-1 accent-gold" />
            </div>
            <div>
              <Label>下月優化方向</Label>
              <Textarea value={form.family_next} onChange={(e) => set("family_next", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
            </div>
          </div>

          {/* PART 5 關係 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={5} title="關係" subtitle="Relationship" question="我是否建立新的連結？" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>有新連結</Label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="newconn" checked={form.relation_new_connection === true} onChange={() => set("relation_new_connection", true)} className="accent-gold" />
                    <span className="text-sm">是</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="newconn" checked={form.relation_new_connection === false} onChange={() => set("relation_new_connection", false)} className="accent-gold" />
                    <span className="text-sm">否</span>
                  </label>
                </div>
              </div>
              <div>
                <Label>新增重要連結</Label>
                <Textarea value={form.relation_new_important} onChange={(e) => set("relation_new_important", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>重要互動事件</Label>
                <Textarea value={form.relation_interaction} onChange={(e) => set("relation_interaction", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Label>評分 (1-20)：{form.relation_score}</Label>
              <input type="range" min={1} max={20} value={form.relation_score} onChange={(e) => set("relation_score", parseInt(e.target.value))} className="flex-1 accent-gold" />
            </div>
            <div>
              <Label>下月優化方向</Label>
              <Textarea value={form.relation_next} onChange={(e) => set("relation_next", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
            </div>
          </div>

          {/* 本月關鍵反思 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-bold text-gold text-lg">本月關鍵反思</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>本月最重要的一個突破</Label>
                <Textarea value={form.reflection_breakthrough} onChange={(e) => set("reflection_breakthrough", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>本月最大的學習</Label>
                <Textarea value={form.reflection_learning} onChange={(e) => set("reflection_learning", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>本月最大的錯誤</Label>
                <Textarea value={form.reflection_mistake} onChange={(e) => set("reflection_mistake", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* 人生平衡檢視 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-bold text-gold text-lg">人生平衡檢視</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>最強領域</Label>
                <Input value={form.balance_strongest} onChange={(e) => set("balance_strongest", e.target.value)} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>最弱領域</Label>
                <Input value={form.balance_weakest} onChange={(e) => set("balance_weakest", e.target.value)} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>原因檢討</Label>
                <Textarea value={form.balance_reason} onChange={(e) => set("balance_reason", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* 下月成長策略 */}
          <div className="p-6 rounded-xl border border-gold/30 bg-card space-y-4">
            <h2 className="font-bold text-gold text-lg">下月成長策略</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>下月最重要的三件事</Label>
                <Textarea value={form.next_three_things} onChange={(e) => set("next_three_things", e.target.value)} placeholder="1.&#10;2.&#10;3." rows={4} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>下月五域順序（優先排序）</Label>
                <Textarea value={form.next_domain_order} onChange={(e) => set("next_domain_order", e.target.value)} placeholder="1.&#10;2.&#10;3.&#10;4.&#10;5." rows={4} className="mt-1 bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>本月亮點</Label>
                <Textarea value={form.highlight} onChange={(e) => set("highlight", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>重要改變</Label>
                <Textarea value={form.important_change} onChange={(e) => set("important_change", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>下一步</Label>
                <Textarea value={form.next_step} onChange={(e) => set("next_step", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</p>
          )}

          <Button type="submit" disabled={saving} className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12">
            {saving ? "儲存中..." : existing ? "更新月報" : "提交月報"}
          </Button>

          <ReportPreview
            reportTitle="人生五域平衡月報告"
            subtitle={`${year} 年 ${month} 月`}
            date={`${year}-${String(month).padStart(2, "0")}`}
            userName={userName}
            sections={[
              { title: "五域分數總覽", items: [
                { label: "事業 Career", value: `${form.career_score} / 20` },
                { label: "財富 Wealth", value: `${form.wealth_score} / 20` },
                { label: "健康 Health", value: `${form.health_score} / 20` },
                { label: "家庭 Family", value: `${form.family_score} / 20` },
                { label: "關係 Relation", value: `${form.relation_score} / 20` },
                { label: "總分", value: `${totalScore} / 100` },
              ]},
              { title: "", columns: [
                { title: "PART 1 事業", items: [
                  { label: "創造的價值", value: form.career_value },
                  { label: "成就", value: form.career_achievement },
                  { label: "卡關", value: form.career_stuck },
                ]},
                { title: "PART 2 財富", items: [
                  { label: "收入變化", value: form.wealth_income_change === "growth" ? "成長" : form.wealth_income_change === "stable" ? "持平" : "下降" },
                  { label: "新增收入來源", value: form.wealth_new_source },
                  { label: "投資/資產變化", value: form.wealth_investment },
                ]},
              ]},
              { title: "", columns: [
                { title: "PART 3 健康", items: [
                  { label: "作息", value: form.health_routine === "regular" ? "規律" : form.health_routine === "normal" ? "普通" : "不佳" },
                  { label: "健康狀態", value: form.health_status },
                ]},
                { title: "PART 4 家庭", items: [
                  { label: "陪伴活動", value: form.family_activity },
                  { label: "關鍵互動", value: form.family_interaction },
                ]},
              ]},
              { title: "PART 5 關係", items: [
                { label: "新增重要連結", value: form.relation_new_important },
                { label: "重要互動事件", value: form.relation_interaction },
              ]},
              { title: "本月關鍵反思", items: [
                { label: "突破", value: form.reflection_breakthrough },
                { label: "學習", value: form.reflection_learning },
                { label: "錯誤", value: form.reflection_mistake },
              ]},
            ]}
            onExportPDF={() =>
              exportPDF({
                reportTitle: "人生五域平衡月報告",
                subtitle: `${year} 年 ${month} 月`,
                date: `${year}-${String(month).padStart(2, "0")}`,
                userName,
                sections: [
                  { title: "PART 1：事業", content: [
                    { label: "評分", value: `${form.career_score} / 20` },
                    { label: "創造的價值", value: form.career_value },
                    { label: "成就", value: form.career_achievement },
                  ]},
                  { title: "PART 2：財富", content: [
                    { label: "評分", value: `${form.wealth_score} / 20` },
                    { label: "收入變化", value: form.wealth_income_change === "growth" ? "成長" : form.wealth_income_change === "stable" ? "持平" : "下降" },
                  ]},
                  { title: "PART 3：健康", content: [
                    { label: "評分", value: `${form.health_score} / 20` },
                    { label: "健康狀態", value: form.health_status },
                  ]},
                  { title: "PART 4：家庭", content: [
                    { label: "評分", value: `${form.family_score} / 20` },
                    { label: "陪伴活動", value: form.family_activity },
                  ]},
                  { title: "PART 5：關係", content: [
                    { label: "評分", value: `${form.relation_score} / 20` },
                    { label: "重要互動", value: form.relation_interaction },
                  ]},
                  { title: "總分", content: `${totalScore} / 100` },
                  { title: "本月關鍵反思", content: [
                    { label: "突破", value: form.reflection_breakthrough },
                    { label: "學習", value: form.reflection_learning },
                  ]},
                ],
              })
            }
          />
        </form>
      </main>
    </div>
  );
}
