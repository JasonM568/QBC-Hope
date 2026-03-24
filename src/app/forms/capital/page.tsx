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

function Checkbox({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="w-4 h-4 rounded border-border accent-gold" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function Radio({ name, value, checked, onChange, label, disabled }: {
  name: string; value: string; checked: boolean; onChange: (v: string) => void; label: string; disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={() => onChange(value)} disabled={disabled} className="accent-gold" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function PartHeader({ num, title, subtitle }: { num: number; title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-gold text-lg">PART {num} {title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

interface CapitalForm {
  current_job: string;
  life_goal: string;
  inventory_cycle: string;
  // P1
  eco_income_source: string;
  eco_score_a: number;
  eco_income_stability: string;
  eco_asset_amount: string;
  eco_asset_cash: boolean;
  eco_asset_stock: boolean;
  eco_asset_realestate: boolean;
  eco_asset_equity: boolean;
  eco_asset_other: boolean;
  eco_score_b: number;
  // P2
  know_core_expertise: string;
  know_score_a: number;
  know_books_per_year: number;
  know_courses_per_year: number;
  know_score_b: number;
  // P3
  social_key_people: string;
  social_score_a: number;
  social_cooperate: boolean;
  social_introduce: boolean;
  social_invest: boolean;
  social_score_b: number;
  // P4
  psych_difficulty: string;
  psych_score_a: number;
  psych_future: string;
  psych_score_b: number;
  // 總評
  overall_evaluation: string;
  // 成長計劃
  growth_plan_economic: string;
  growth_plan_knowledge: string;
  growth_plan_social: string;
  growth_plan_psychological: string;
  // 前後比較
  before_economic: number;
  before_knowledge: number;
  before_social: number;
  before_psychological: number;
  after_economic: number;
  after_knowledge: number;
  after_social: number;
  after_psychological: number;
  has_grown: string;
  growth_reflection: string;
}

const emptyForm: CapitalForm = {
  current_job: "", life_goal: "", inventory_cycle: "first",
  eco_income_source: "", eco_score_a: 5, eco_income_stability: "moderate",
  eco_asset_amount: "", eco_asset_cash: false, eco_asset_stock: false,
  eco_asset_realestate: false, eco_asset_equity: false, eco_asset_other: false, eco_score_b: 8,
  know_core_expertise: "", know_score_a: 5, know_books_per_year: 0, know_courses_per_year: 0, know_score_b: 8,
  social_key_people: "", social_score_a: 5, social_cooperate: false, social_introduce: false, social_invest: false, social_score_b: 8,
  psych_difficulty: "need_time", psych_score_a: 8, psych_future: "normal", psych_score_b: 5,
  overall_evaluation: "beginner",
  growth_plan_economic: "", growth_plan_knowledge: "", growth_plan_social: "", growth_plan_psychological: "",
  before_economic: 0, before_knowledge: 0, before_social: 0, before_psychological: 0,
  after_economic: 0, after_knowledge: 0, after_social: 0, after_psychological: 0,
  has_grown: "", growth_reflection: "",
};

export default function CapitalInventoryPage() {
  const [form, setForm] = useState<CapitalForm>(emptyForm);
  const [userName, setUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const set = <K extends keyof CapitalForm>(key: K, value: CapitalForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      setUserName(prof?.display_name || user.user_metadata?.display_name || user.email || "");
      setLoading(false);
    }
    load();
  }, [router]);

  const ecoTotal = form.eco_score_a + form.eco_score_b;
  const knowTotal = form.know_score_a + form.know_score_b;
  const socialTotal = form.social_score_a + form.social_score_b;
  const psychTotal = form.psych_score_a + form.psych_score_b;
  const grandTotal = ecoTotal + knowTotal + socialTotal + psychTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("登入狀態已過期，請重新登入。建議使用外部瀏覽器（Safari/Chrome）開啟。"); setSaving(false); return; }

    const { error } = await supabase.from("capital_inventories").insert({
      user_id: user.id,
      ...form,
    });

    if (error) {
      setMessage("儲存失敗：" + error.message);
    } else {
      setMessage("盤點已儲存！");
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
          <h1 className="text-2xl font-bold">人生資本盤點表</h1>
          <p className="text-muted-foreground mt-1">Personal Life Capital Inventory</p>
          <p className="text-gold mt-2 font-medium">理念：每個人都是一個經濟體，你的價值來自四種資本。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>目前工作說明</Label>
                <Input value={form.current_job} onChange={(e) => set("current_job", e.target.value)} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>盤點週期</Label>
                <div className="flex flex-col gap-1.5 mt-2">
                  <Radio name="cycle" value="first" checked={form.inventory_cycle === "first"} onChange={(v) => set("inventory_cycle", v)} label="第一次盤點" />
                  <Radio name="cycle" value="half_year" checked={form.inventory_cycle === "half_year"} onChange={(v) => set("inventory_cycle", v)} label="半年更新" />
                  <Radio name="cycle" value="annual" checked={form.inventory_cycle === "annual"} onChange={(v) => set("inventory_cycle", v)} label="年度回顧" />
                </div>
              </div>
            </div>
            <div>
              <Label>人生目標</Label>
              <Textarea value={form.life_goal} onChange={(e) => set("life_goal", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
            </div>
          </div>

          {/* PART 1 經濟資本 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={1} title="經濟資本" subtitle="Economic Capital" />
            <div>
              <Label>目前主要收入來源和年收入金額</Label>
              <Textarea value={form.eco_income_source} onChange={(e) => set("eco_income_source", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>評分 A (1-10)：{form.eco_score_a}</Label>
                <input type="range" min={1} max={10} value={form.eco_score_a} onChange={(e) => set("eco_score_a", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
              </div>
              <div>
                <Label>收入穩定度</Label>
                <div className="flex flex-col gap-1 mt-1">
                  <Radio name="stability" value="stable" checked={form.eco_income_stability === "stable"} onChange={(v) => set("eco_income_stability", v)} label="穩定" />
                  <Radio name="stability" value="moderate" checked={form.eco_income_stability === "moderate"} onChange={(v) => set("eco_income_stability", v)} label="中等" />
                  <Radio name="stability" value="unstable" checked={form.eco_income_stability === "unstable"} onChange={(v) => set("eco_income_stability", v)} label="不穩定" />
                </div>
              </div>
            </div>
            <div>
              <Label>擁有資產總金額</Label>
              <Input value={form.eco_asset_amount} onChange={(e) => set("eco_asset_amount", e.target.value)} className="mt-1 bg-background border-border" />
            </div>
            <div>
              <Label className="mb-2 block">目前資產類型</Label>
              <div className="flex flex-wrap gap-4">
                <Checkbox checked={form.eco_asset_cash} onChange={(v) => set("eco_asset_cash", v)} label="現金" />
                <Checkbox checked={form.eco_asset_stock} onChange={(v) => set("eco_asset_stock", v)} label="股票" />
                <Checkbox checked={form.eco_asset_realestate} onChange={(v) => set("eco_asset_realestate", v)} label="不動產" />
                <Checkbox checked={form.eco_asset_equity} onChange={(v) => set("eco_asset_equity", v)} label="公司股權" />
                <Checkbox checked={form.eco_asset_other} onChange={(v) => set("eco_asset_other", v)} label="其他" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>評分 B (1-15)：{form.eco_score_b}</Label>
                <input type="range" min={1} max={15} value={form.eco_score_b} onChange={(e) => set("eco_score_b", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
              </div>
              <div className="flex items-end">
                <p className="text-gold font-bold text-lg">總分 A+B = {ecoTotal}</p>
              </div>
            </div>
          </div>

          {/* PART 2 智識資本 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={2} title="智識資本" subtitle="Knowledge Capital" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>你的核心專業</Label>
                <Textarea value={form.know_core_expertise} onChange={(e) => set("know_core_expertise", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>評分 A (1-10)：{form.know_score_a}</Label>
                <input type="range" min={1} max={10} value={form.know_score_a} onChange={(e) => set("know_score_a", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>每年閱讀（本書）</Label>
                <Input type="number" min={0} value={form.know_books_per_year || ""} onChange={(e) => set("know_books_per_year", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>每年學習（個課）</Label>
                <Input type="number" min={0} value={form.know_courses_per_year || ""} onChange={(e) => set("know_courses_per_year", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>評分 B (1-15)：{form.know_score_b}</Label>
                <input type="range" min={1} max={15} value={form.know_score_b} onChange={(e) => set("know_score_b", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
              </div>
            </div>
            <p className="text-gold font-bold text-lg">總分 A+B = {knowTotal}</p>
          </div>

          {/* PART 3 社會資本 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={3} title="社會資本" subtitle="Social Capital" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>你認識的關鍵人物</Label>
                <Textarea value={form.social_key_people} onChange={(e) => set("social_key_people", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>評分 A (1-10)：{form.social_score_a}</Label>
                <input type="range" min={1} max={10} value={form.social_score_a} onChange={(e) => set("social_score_a", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex flex-col gap-1.5">
                  <Checkbox checked={form.social_cooperate} onChange={(v) => set("social_cooperate", v)} label="願意與你合作" />
                  <Checkbox checked={form.social_introduce} onChange={(v) => set("social_introduce", v)} label="願意介紹資源" />
                  <Checkbox checked={form.social_invest} onChange={(v) => set("social_invest", v)} label="願意投資你" />
                </div>
              </div>
              <div>
                <Label>評分 B (1-15)：{form.social_score_b}</Label>
                <input type="range" min={1} max={15} value={form.social_score_b} onChange={(e) => set("social_score_b", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
              </div>
            </div>
            <p className="text-gold font-bold text-lg">總分 A+B = {socialTotal}</p>
          </div>

          {/* PART 4 心理資本 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={4} title="心理資本" subtitle="Psychological Capital" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>遇到困難時</Label>
                <div className="flex flex-col gap-1 mt-1">
                  <Radio name="difficulty" value="quick_recover" checked={form.psych_difficulty === "quick_recover"} onChange={(v) => set("psych_difficulty", v)} label="很快恢復" />
                  <Radio name="difficulty" value="need_time" checked={form.psych_difficulty === "need_time"} onChange={(v) => set("psych_difficulty", v)} label="需要時間" />
                  <Radio name="difficulty" value="give_up" checked={form.psych_difficulty === "give_up"} onChange={(v) => set("psych_difficulty", v)} label="容易放棄" />
                </div>
              </div>
              <div>
                <Label>評分 A (1-15)：{form.psych_score_a}</Label>
                <input type="range" min={1} max={15} value={form.psych_score_a} onChange={(e) => set("psych_score_a", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>你對未來</Label>
                <div className="flex flex-col gap-1 mt-1">
                  <Radio name="future" value="very_confident" checked={form.psych_future === "very_confident"} onChange={(v) => set("psych_future", v)} label="非常有信心" />
                  <Radio name="future" value="normal" checked={form.psych_future === "normal"} onChange={(v) => set("psych_future", v)} label="一般" />
                  <Radio name="future" value="uncertain" checked={form.psych_future === "uncertain"} onChange={(v) => set("psych_future", v)} label="不確定" />
                </div>
              </div>
              <div>
                <Label>評分 B (1-10)：{form.psych_score_b}</Label>
                <input type="range" min={1} max={10} value={form.psych_score_b} onChange={(e) => set("psych_score_b", parseInt(e.target.value))} className="w-full mt-1 accent-gold" />
              </div>
            </div>
            <p className="text-gold font-bold text-lg">總分 A+B = {psychTotal}</p>
          </div>

          {/* 人生資本總評 */}
          <div className="p-6 rounded-xl border border-gold/30 bg-card space-y-4">
            <h2 className="font-bold text-gold text-lg">人生資本總評 Total Life Capital</h2>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-3 rounded-lg bg-gold/10">
                <p className="text-xs text-muted-foreground">經濟資本</p>
                <p className="text-xl font-bold text-gold">{ecoTotal}</p>
              </div>
              <div className="p-3 rounded-lg bg-gold/10">
                <p className="text-xs text-muted-foreground">智慧資本</p>
                <p className="text-xl font-bold text-gold">{knowTotal}</p>
              </div>
              <div className="p-3 rounded-lg bg-gold/10">
                <p className="text-xs text-muted-foreground">社會資本</p>
                <p className="text-xl font-bold text-gold">{socialTotal}</p>
              </div>
              <div className="p-3 rounded-lg bg-gold/10">
                <p className="text-xs text-muted-foreground">心理資本</p>
                <p className="text-xl font-bold text-gold">{psychTotal}</p>
              </div>
              <div className="p-3 rounded-lg bg-gold/20">
                <p className="text-xs text-muted-foreground">總分</p>
                <p className="text-xl font-bold text-gold">{grandTotal}</p>
              </div>
            </div>
            <div>
              <Label>總體評價</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                <Radio name="eval" value="beginner" checked={form.overall_evaluation === "beginner"} onChange={(v) => set("overall_evaluation", v)} label="初階成長期" />
                <Radio name="eval" value="stable" checked={form.overall_evaluation === "stable"} onChange={(v) => set("overall_evaluation", v)} label="穩定成長期" />
                <Radio name="eval" value="fast" checked={form.overall_evaluation === "fast"} onChange={(v) => set("overall_evaluation", v)} label="高速發展期" />
                <Radio name="eval" value="mature" checked={form.overall_evaluation === "mature"} onChange={(v) => set("overall_evaluation", v)} label="成熟階段" />
              </div>
            </div>
          </div>

          {/* 未來六個月成長計劃 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-bold text-gold text-lg">未來六個月成長計劃</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>PART 1 經濟資本</Label>
                <Textarea value={form.growth_plan_economic} onChange={(e) => set("growth_plan_economic", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>PART 2 智識資本</Label>
                <Textarea value={form.growth_plan_knowledge} onChange={(e) => set("growth_plan_knowledge", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>PART 3 社會資本</Label>
                <Textarea value={form.growth_plan_social} onChange={(e) => set("growth_plan_social", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>PART 4 心理資本</Label>
                <Textarea value={form.growth_plan_psychological} onChange={(e) => set("growth_plan_psychological", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* 前後比較 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="font-bold text-gold text-lg">人生資本前後回顧比較</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2">人生資本</th>
                    <th className="text-center py-2">Before</th>
                    <th className="text-center py-2">After</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "經濟資本", bKey: "before_economic" as const, aKey: "after_economic" as const },
                    { label: "智識資本", bKey: "before_knowledge" as const, aKey: "after_knowledge" as const },
                    { label: "社會資本", bKey: "before_social" as const, aKey: "after_social" as const },
                    { label: "心理資本", bKey: "before_psychological" as const, aKey: "after_psychological" as const },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-border/50">
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 text-center">
                        <Input type="number" min={0} value={form[row.bKey] || ""} onChange={(e) => set(row.bKey, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)} className="w-20 mx-auto text-center bg-background border-border" />
                      </td>
                      <td className="py-2 text-center">
                        <Input type="number" min={0} value={form[row.aKey] || ""} onChange={(e) => set(row.aKey, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)} className="w-20 mx-auto text-center bg-background border-border" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4">
              <Label>是否成長：</Label>
              <Radio name="grown" value="yes" checked={form.has_grown === "yes"} onChange={(v) => set("has_grown", v)} label="是" />
              <Radio name="grown" value="no" checked={form.has_grown === "no"} onChange={(v) => set("has_grown", v)} label="否" />
            </div>
            <div>
              <Label>感想</Label>
              <Textarea value={form.growth_reflection} onChange={(e) => set("growth_reflection", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</p>
          )}

          <Button type="submit" disabled={saving} className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12">
            {saving ? "儲存中..." : "儲存盤點"}
          </Button>

          <ReportPreview
            reportTitle="人生資本盤點表"
            date={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" })}
            userName={userName}
            sections={[
              { title: "基本資訊", items: [
                { label: "目前工作", value: form.current_job },
                { label: "人生目標", value: form.life_goal },
                { label: "盤點週期", value: form.inventory_cycle === "first" ? "第一次盤點" : form.inventory_cycle === "half_year" ? "半年更新" : "年度回顧" },
              ]},
              { title: "", columns: [
                { title: "PART 1 經濟資本", items: [
                  { label: "收入來源", value: form.eco_income_source },
                  { label: "收入穩定度", value: form.eco_income_stability === "stable" ? "穩定" : form.eco_income_stability === "moderate" ? "中等" : "不穩定" },
                  { label: "資產總額", value: form.eco_asset_amount },
                  { label: "評分 A", value: `${form.eco_score_a} / 10` },
                  { label: "評分 B", value: `${form.eco_score_b} / 15` },
                  { label: "總分", value: `${ecoTotal}` },
                ], checks: [
                  { label: "現金", checked: form.eco_asset_cash },
                  { label: "股票", checked: form.eco_asset_stock },
                  { label: "不動產", checked: form.eco_asset_realestate },
                  { label: "公司股權", checked: form.eco_asset_equity },
                  { label: "其他", checked: form.eco_asset_other },
                ]},
                { title: "PART 2 智識資本", items: [
                  { label: "核心專業", value: form.know_core_expertise },
                  { label: "每年閱讀", value: `${form.know_books_per_year} 本` },
                  { label: "每年課程", value: `${form.know_courses_per_year} 個` },
                  { label: "評分 A", value: `${form.know_score_a} / 10` },
                  { label: "評分 B", value: `${form.know_score_b} / 15` },
                  { label: "總分", value: `${knowTotal}` },
                ]},
              ]},
              { title: "", columns: [
                { title: "PART 3 社會資本", items: [
                  { label: "關鍵人物", value: form.social_key_people },
                  { label: "評分 A", value: `${form.social_score_a} / 10` },
                  { label: "評分 B", value: `${form.social_score_b} / 15` },
                  { label: "總分", value: `${socialTotal}` },
                ], checks: [
                  { label: "願意合作", checked: form.social_cooperate },
                  { label: "願意引薦", checked: form.social_introduce },
                  { label: "願意投資", checked: form.social_invest },
                ]},
                { title: "PART 4 心理資本", items: [
                  { label: "遇到困難", value: form.psych_difficulty === "quick_recover" ? "很快恢復" : form.psych_difficulty === "need_time" ? "需要時間" : "容易放棄" },
                  { label: "對未來", value: form.psych_future === "very_confident" ? "非常有信心" : form.psych_future === "normal" ? "一般" : "不確定" },
                  { label: "評分 A", value: `${form.psych_score_a} / 15` },
                  { label: "評分 B", value: `${form.psych_score_b} / 10` },
                  { label: "總分", value: `${psychTotal}` },
                ]},
              ]},
              { title: "人生資本總評", items: [
                { label: "經濟資本", value: `${ecoTotal} 分` },
                { label: "智識資本", value: `${knowTotal} 分` },
                { label: "社會資本", value: `${socialTotal} 分` },
                { label: "心理資本", value: `${psychTotal} 分` },
                { label: "總分", value: `${grandTotal} 分` },
                { label: "總體評價", value: form.overall_evaluation === "beginner" ? "初階成長期" : form.overall_evaluation === "stable" ? "穩定成長期" : form.overall_evaluation === "fast" ? "高速發展期" : "成熟階段" },
              ]},
              { title: "未來六個月成長計劃", items: [
                { label: "經濟資本", value: form.growth_plan_economic },
                { label: "智識資本", value: form.growth_plan_knowledge },
                { label: "社會資本", value: form.growth_plan_social },
                { label: "心理資本", value: form.growth_plan_psychological },
              ]},
              { title: "前後比較", items: [
                { label: "經濟 Before→After", value: `${form.before_economic} → ${form.after_economic}` },
                { label: "智識 Before→After", value: `${form.before_knowledge} → ${form.after_knowledge}` },
                { label: "社會 Before→After", value: `${form.before_social} → ${form.after_social}` },
                { label: "心理 Before→After", value: `${form.before_psychological} → ${form.after_psychological}` },
                { label: "是否成長", value: form.has_grown === "yes" ? "是" : form.has_grown === "no" ? "否" : "—" },
                { label: "感想", value: form.growth_reflection },
              ]},
            ]}
            onExportPDF={() =>
              exportPDF({
                reportTitle: "人生資本盤點表",
                date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }),
                userName,
                sections: [
                  { title: "基本資訊", content: [
                    { label: "目前工作", value: form.current_job },
                    { label: "人生目標", value: form.life_goal },
                  ]},
                  { title: "PART 1 經濟資本", content: [
                    { label: "收入來源", value: form.eco_income_source },
                    { label: "穩定度", value: form.eco_income_stability === "stable" ? "穩定" : form.eco_income_stability === "moderate" ? "中等" : "不穩定" },
                    { label: "資產總額", value: form.eco_asset_amount },
                    { label: "評分", value: `A: ${form.eco_score_a}/10  B: ${form.eco_score_b}/15  總分: ${ecoTotal}` },
                  ]},
                  { title: "PART 2 智識資本", content: [
                    { label: "核心專業", value: form.know_core_expertise },
                    { label: "閱讀/課程", value: `${form.know_books_per_year} 本 / ${form.know_courses_per_year} 個` },
                    { label: "評分", value: `A: ${form.know_score_a}/10  B: ${form.know_score_b}/15  總分: ${knowTotal}` },
                  ]},
                  { title: "PART 3 社會資本", content: [
                    { label: "關鍵人物", value: form.social_key_people },
                    { label: "評分", value: `A: ${form.social_score_a}/10  B: ${form.social_score_b}/15  總分: ${socialTotal}` },
                  ]},
                  { title: "PART 4 心理資本", content: [
                    { label: "遇到困難", value: form.psych_difficulty === "quick_recover" ? "很快恢復" : form.psych_difficulty === "need_time" ? "需要時間" : "容易放棄" },
                    { label: "對未來", value: form.psych_future === "very_confident" ? "非常有信心" : form.psych_future === "normal" ? "一般" : "不確定" },
                    { label: "評分", value: `A: ${form.psych_score_a}/15  B: ${form.psych_score_b}/10  總分: ${psychTotal}` },
                  ]},
                  { title: "人生資本總分", content: `${grandTotal} 分（${form.overall_evaluation === "beginner" ? "初階成長期" : form.overall_evaluation === "stable" ? "穩定成長期" : form.overall_evaluation === "fast" ? "高速發展期" : "成熟階段"}）` },
                  { title: "未來六個月成長計劃", content: [
                    { label: "經濟資本", value: form.growth_plan_economic },
                    { label: "智識資本", value: form.growth_plan_knowledge },
                    { label: "社會資本", value: form.growth_plan_social },
                    { label: "心理資本", value: form.growth_plan_psychological },
                  ]},
                  { title: "前後比較", content: [
                    { label: "經濟", value: `${form.before_economic} → ${form.after_economic}` },
                    { label: "智識", value: `${form.before_knowledge} → ${form.after_knowledge}` },
                    { label: "社會", value: `${form.before_social} → ${form.after_social}` },
                    { label: "心理", value: `${form.before_psychological} → ${form.after_psychological}` },
                    { label: "是否成長", value: form.has_grown === "yes" ? "是" : form.has_grown === "no" ? "否" : "—" },
                    { label: "感想", value: form.growth_reflection },
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
