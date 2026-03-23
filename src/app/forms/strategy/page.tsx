"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportPDF } from "@/lib/export-pdf";
import ReportPreview from "@/components/report-preview";

function Checkbox({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-border accent-gold" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function PartHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">{num}</span>
      <h2 className="font-semibold text-lg">PART {num} {title}</h2>
    </div>
  );
}

function StepHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-7 h-7 rounded-full bg-gold text-black text-sm font-bold flex items-center justify-center">{num}</span>
      <h2 className="font-semibold text-lg">STEP {num} {title}</h2>
    </div>
  );
}

interface StrategyForm {
  core_ability: string;
  success_experience: string;
  unique_ability: string;
  resource_tech: boolean;
  resource_network: boolean;
  resource_fund: boolean;
  resource_brand: boolean;
  resource_experience: boolean;
  resource_other_text: string;
  current_field: string;
  target_market: string;
  focused_battlefield: string;
  market_trend: string;
  three_year_opportunity: string;
  ai_tech_dividend: string;
  who_am_i: string;
  who_to_help: string;
  what_problem: string;
  positioning_statement: string;
  // QBC AI Agent 互動流程
  step1_success_three: string;
  step1_praised_ability: string;
  step1_effortless: string;
  step1_ai_response: string;
  step2_value_conversion: string;
  step2_solve_problem: string;
  step2_monetize_ways: string;
  step2_ai_response: string;
  step3_target_people: string;
  step3_target_industry: string;
  step3_b2b_or_b2c: string;
  step3_ai_response: string;
  step4_current_trend: string;
  step4_ai_amplify: string;
  step4_growth_3year: string;
  step4_ai_response: string;
  result_battlefield: string;
  result_positioning: string;
  result_advantage: string;
  result_first_action: string;
}

const emptyForm: StrategyForm = {
  core_ability: "", success_experience: "", unique_ability: "",
  resource_tech: false, resource_network: false, resource_fund: false, resource_brand: false, resource_experience: false, resource_other_text: "",
  current_field: "", target_market: "", focused_battlefield: "",
  market_trend: "", three_year_opportunity: "", ai_tech_dividend: "",
  who_am_i: "", who_to_help: "", what_problem: "", positioning_statement: "",
  step1_success_three: "", step1_praised_ability: "", step1_effortless: "", step1_ai_response: "",
  step2_value_conversion: "", step2_solve_problem: "", step2_monetize_ways: "", step2_ai_response: "",
  step3_target_people: "", step3_target_industry: "", step3_b2b_or_b2c: "", step3_ai_response: "",
  step4_current_trend: "", step4_ai_amplify: "", step4_growth_3year: "", step4_ai_response: "",
  result_battlefield: "", result_positioning: "", result_advantage: "", result_first_action: "",
};

export default function StrategyPage() {
  const [form, setForm] = useState<StrategyForm>(emptyForm);
  const [userName, setUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Array<{ id: string; created_at: string; positioning_statement: string }>>([]);
  const router = useRouter();

  const set = <K extends keyof StrategyForm>(key: K, value: StrategyForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      setUserName(prof?.display_name || user.user_metadata?.display_name || user.email || "");

      const { data } = await supabase
        .from("strategic_positions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        const latest = data[0];
        setForm({ ...emptyForm, ...latest });
        setHistory(data);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, user_id: _uid, position_date: _pd, created_at: _ca, ...formData } = form as StrategyForm & Record<string, unknown>;
    const { error } = await supabase.from("strategic_positions").insert({
      user_id: user.id,
      ...formData,
    });

    if (error) {
      setMessage("儲存失敗：" + error.message);
    } else {
      setMessage("戰略定位已儲存！");
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
          <h1 className="text-2xl font-bold">個人戰略定位工具</h1>
          <p className="text-muted-foreground mt-1">Personal Strategic Positioning Tools</p>
          <p className="text-gold mt-2 font-medium">核心原則：成功不是更努力，而是選對戰場。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PART 1 優勢分析 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={1} title="優勢分析" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>我的核心能力</Label>
                <Textarea value={form.core_ability} onChange={(e) => set("core_ability", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>我的過去成功經驗</Label>
                <Textarea value={form.success_experience} onChange={(e) => set("success_experience", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>別人做不到，但我可以做到的是</Label>
                <Textarea value={form.unique_ability} onChange={(e) => set("unique_ability", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label className="mb-2 block">我的資源</Label>
                <div className="space-y-2">
                  <Checkbox checked={form.resource_tech} onChange={(v) => set("resource_tech", v)} label="技術" />
                  <Checkbox checked={form.resource_network} onChange={(v) => set("resource_network", v)} label="人脈" />
                  <Checkbox checked={form.resource_fund} onChange={(v) => set("resource_fund", v)} label="資金" />
                  <Checkbox checked={form.resource_brand} onChange={(v) => set("resource_brand", v)} label="品牌" />
                  <Checkbox checked={form.resource_experience} onChange={(v) => set("resource_experience", v)} label="經驗" />
                </div>
                <Textarea
                  value={form.resource_other_text}
                  onChange={(e) => set("resource_other_text", e.target.value)}
                  placeholder="其他資源補充說明..."
                  rows={2}
                  className="mt-2 bg-background border-border"
                />
              </div>
            </div>
          </div>

          {/* PART 2 戰場選擇 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={2} title="戰場選擇" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>我目前所在領域</Label>
                <Textarea value={form.current_field} onChange={(e) => set("current_field", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>我可以切入的市場</Label>
                <Textarea value={form.target_market} onChange={(e) => set("target_market", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>我選擇的戰場（聚焦）</Label>
                <Textarea value={form.focused_battlefield} onChange={(e) => set("focused_battlefield", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* PART 3 機會判斷 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={3} title="機會判斷" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>市場趨勢是什麼</Label>
                <Textarea value={form.market_trend} onChange={(e) => set("market_trend", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>未來3年機會是什麼</Label>
                <Textarea value={form.three_year_opportunity} onChange={(e) => set("three_year_opportunity", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>AI / 技術 / 時代紅利</Label>
                <Textarea value={form.ai_tech_dividend} onChange={(e) => set("ai_tech_dividend", e.target.value)} rows={4} className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* PART 4 個人定位一句話 */}
          <div className="p-6 rounded-xl border border-gold/30 bg-card space-y-4">
            <PartHeader num={4} title="個人定位一句話" />
            <p className="text-sm text-gold mb-2">我是誰 + 幫誰 + 解決什麼問題</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>我是誰</Label>
                <Textarea value={form.who_am_i} onChange={(e) => set("who_am_i", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>我可以幫助誰</Label>
                <Textarea value={form.who_to_help} onChange={(e) => set("who_to_help", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>我能解決什麼問題</Label>
                <Textarea value={form.what_problem} onChange={(e) => set("what_problem", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
              </div>
            </div>
            <div>
              <Label className="text-gold font-semibold">個人定位一句話</Label>
              <Textarea
                value={form.positioning_statement}
                onChange={(e) => set("positioning_statement", e.target.value)}
                placeholder="我是＿＿，我幫助＿＿，解決＿＿問題"
                rows={2}
                className="mt-1 bg-background border-gold/30"
              />
            </div>
          </div>

          {/* ===== 第二張表格：QBC AI Agent 互動流程 ===== */}
          <div className="mt-10 mb-6">
            <h1 className="text-2xl font-bold">QBC AI Agent 互動流程</h1>
            <p className="text-muted-foreground mt-1">根據以下步驟與 AI 對話，完成你的戰略定位分析</p>
            <a
              href="https://chatgpt.com/g/g-68a1306aa6648191a305d5e52f3d5c5b-qbcliang-zi-shang-ye-jiao-lian-gu-yuan-chang"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-lg bg-gold text-black font-semibold hover:bg-gold-light transition-colors"
            >
              前往 QBC <span aria-hidden>↗</span>
            </a>
          </div>

          {/* STEP 1 優勢挖掘 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <StepHeader num={1} title="優勢挖掘" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <p className="text-sm font-medium text-gold">輸入</p>
                <div>
                  <Label>你過去最成功的三件事是什麼？</Label>
                  <Textarea value={form.step1_success_three} onChange={(e) => set("step1_success_three", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label>別人最常稱讚你的能力是什麼？</Label>
                  <Textarea value={form.step1_praised_ability} onChange={(e) => set("step1_praised_ability", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label>你做什麼事情最不費力？</Label>
                  <Textarea value={form.step1_effortless} onChange={(e) => set("step1_effortless", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gold mb-2">請 QBC AI Agent 回覆</p>
                <p className="text-xs text-muted-foreground mb-2">優勢結構分析 ＋ 能力分類（技能 / 思維 / 資源）</p>
                <Textarea value={form.step1_ai_response} onChange={(e) => set("step1_ai_response", e.target.value)} rows={10} placeholder="將 AI 的回覆貼在這裡..." className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* STEP 2 能力轉換 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <StepHeader num={2} title="能力轉換" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <p className="text-sm font-medium text-gold">輸入</p>
                <div>
                  <Label>你的能力可以變成什麼價值？</Label>
                  <Textarea value={form.step2_value_conversion} onChange={(e) => set("step2_value_conversion", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label>可以解決誰的問題？</Label>
                  <Textarea value={form.step2_solve_problem} onChange={(e) => set("step2_solve_problem", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label>可以變現的方式有哪些？</Label>
                  <Textarea value={form.step2_monetize_ways} onChange={(e) => set("step2_monetize_ways", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gold mb-2">請 QBC AI Agent 回覆</p>
                <p className="text-xs text-muted-foreground mb-2">3-5 個商業和發展方向</p>
                <Textarea value={form.step2_ai_response} onChange={(e) => set("step2_ai_response", e.target.value)} rows={10} placeholder="將 AI 的回覆貼在這裡..." className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* STEP 3 戰場建議 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <StepHeader num={3} title="戰場建議" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <p className="text-sm font-medium text-gold">輸入</p>
                <div>
                  <Label>你想服務哪一群人？</Label>
                  <Textarea value={form.step3_target_people} onChange={(e) => set("step3_target_people", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label>你想進入哪個產業？</Label>
                  <Textarea value={form.step3_target_industry} onChange={(e) => set("step3_target_industry", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label>你想做 B2B 還是 B2C？</Label>
                  <Textarea value={form.step3_b2b_or_b2c} onChange={(e) => set("step3_b2b_or_b2c", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gold mb-2">請 QBC AI Agent 回覆</p>
                <p className="text-xs text-muted-foreground mb-2">最適戰場（Top 3）＋ 市場分析 ＋ 競爭程度</p>
                <Textarea value={form.step3_ai_response} onChange={(e) => set("step3_ai_response", e.target.value)} rows={10} placeholder="將 AI 的回覆貼在這裡..." className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* STEP 4 機會分析 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <StepHeader num={4} title="機會分析" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <p className="text-sm font-medium text-gold">輸入</p>
                <div>
                  <Label>現在的趨勢是什麼？</Label>
                  <Textarea value={form.step4_current_trend} onChange={(e) => set("step4_current_trend", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label>AI 是否可以放大這件事？</Label>
                  <Textarea value={form.step4_ai_amplify} onChange={(e) => set("step4_ai_amplify", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label>未來 3 年是否成長？</Label>
                  <Textarea value={form.step4_growth_3year} onChange={(e) => set("step4_growth_3year", e.target.value)} rows={3} className="mt-1 bg-background border-border" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gold mb-2">請 QBC AI Agent 回覆</p>
                <p className="text-xs text-muted-foreground mb-2">機會評分（高 / 中 / 低）＋ 時機判斷</p>
                <Textarea value={form.step4_ai_response} onChange={(e) => set("step4_ai_response", e.target.value)} rows={10} placeholder="將 AI 的回覆貼在這裡..." className="mt-1 bg-background border-border" />
              </div>
            </div>
          </div>

          {/* STEP 5 定位收斂 — 我的戰略定位結果 */}
          <div className="p-6 rounded-xl border border-gold/30 bg-card space-y-4">
            <StepHeader num={5} title="定位收斂" />
            <p className="text-sm text-muted-foreground mb-2">
              請 QBC AI Agent 根據 STEP 1~4 的所有輸入與輸出內容，產出你的戰略定位結果
            </p>
            <div className="p-4 rounded-lg border border-gold/20 bg-gold/5 space-y-4">
              <h3 className="font-semibold text-gold">我的戰略定位結果</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded bg-gold text-black text-xs font-bold flex items-center justify-center mt-1 shrink-0">1</span>
                  <div className="flex-1">
                    <Label>我的戰場一句話</Label>
                    <Textarea value={form.result_battlefield} onChange={(e) => set("result_battlefield", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded bg-gold text-black text-xs font-bold flex items-center justify-center mt-1 shrink-0">2</span>
                  <div className="flex-1">
                    <Label>我的定位一句話</Label>
                    <Textarea value={form.result_positioning} onChange={(e) => set("result_positioning", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded bg-gold text-black text-xs font-bold flex items-center justify-center mt-1 shrink-0">3</span>
                  <div className="flex-1">
                    <Label>我的優勢一句話</Label>
                    <Textarea value={form.result_advantage} onChange={(e) => set("result_advantage", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded bg-gold text-black text-xs font-bold flex items-center justify-center mt-1 shrink-0">4</span>
                  <div className="flex-1">
                    <Label>我的第一步行動</Label>
                    <Textarea value={form.result_first_action} onChange={(e) => set("result_first_action", e.target.value)} rows={2} className="mt-1 bg-background border-border" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</p>
          )}

          <Button type="submit" disabled={saving} className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12">
            {saving ? "儲存中..." : "儲存戰略定位"}
          </Button>

          <ReportPreview
            reportTitle="個人戰略定位工具"
            date={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" })}
            userName={userName}
            gridLayout
            sections={[
              /* 左1 */ { title: "PART 1 優勢分析", items: [
                { label: "核心能力", value: form.core_ability },
                { label: "成功經驗", value: form.success_experience },
                { label: "獨特能力", value: form.unique_ability },
              ], checks: [
                { label: "技術", checked: form.resource_tech },
                { label: "人脈", checked: form.resource_network },
                { label: "資金", checked: form.resource_fund },
                { label: "品牌", checked: form.resource_brand },
                { label: "經驗", checked: form.resource_experience },
              ]},
              /* 右1 */ { title: "PART 2 戰場選擇", items: [
                { label: "目前領域", value: form.current_field },
                { label: "切入市場", value: form.target_market },
                { label: "聚焦戰場", value: form.focused_battlefield },
              ]},
              /* 左2 */ { title: "PART 3 機會判斷", items: [
                { label: "市場趨勢", value: form.market_trend },
                { label: "3年機會", value: form.three_year_opportunity },
                { label: "AI/技術紅利", value: form.ai_tech_dividend },
              ]},
              /* 右2 */ { title: "PART 4 個人定位一句話", items: [
                { label: "我是誰", value: form.who_am_i },
                { label: "幫助誰", value: form.who_to_help },
                { label: "解決什麼問題", value: form.what_problem },
                { label: "定位一句話", value: form.positioning_statement },
              ]},
              /* 左3 */ { title: "STEP 1 優勢挖掘（輸入）", items: [
                { label: "過去最成功的三件事", value: form.step1_success_three },
                { label: "別人最常稱讚的能力", value: form.step1_praised_ability },
                { label: "做什麼最不費力", value: form.step1_effortless },
              ]},
              /* 右3 */ { title: "STEP 1 AI 回覆", content: form.step1_ai_response },
              /* 左4 */ { title: "STEP 2 能力轉換（輸入）", items: [
                { label: "能力變成什麼價值", value: form.step2_value_conversion },
                { label: "解決誰的問題", value: form.step2_solve_problem },
                { label: "變現方式", value: form.step2_monetize_ways },
              ]},
              /* 右4 */ { title: "STEP 2 AI 回覆", content: form.step2_ai_response },
              /* 左5 */ { title: "STEP 3 戰場建議（輸入）", items: [
                { label: "服務哪群人", value: form.step3_target_people },
                { label: "進入哪個產業", value: form.step3_target_industry },
                { label: "B2B / B2C", value: form.step3_b2b_or_b2c },
              ]},
              /* 右5 */ { title: "STEP 3 AI 回覆", content: form.step3_ai_response },
              /* 左6 */ { title: "STEP 4 機會分析（輸入）", items: [
                { label: "現在趨勢", value: form.step4_current_trend },
                { label: "AI 是否可以放大", value: form.step4_ai_amplify },
                { label: "未來3年是否成長", value: form.step4_growth_3year },
              ]},
              /* 右6 */ { title: "STEP 4 AI 回覆", content: form.step4_ai_response },
              /* 左7 */ { title: "我的戰略定位結果", items: [
                { label: "① 戰場一句話", value: form.result_battlefield },
                { label: "② 定位一句話", value: form.result_positioning },
              ]},
              /* 右7 */ { title: "我的戰略定位結果", items: [
                { label: "③ 優勢一句話", value: form.result_advantage },
                { label: "④ 第一步行動", value: form.result_first_action },
              ]},
            ]}
            onExportPDF={() =>
              exportPDF({
                reportTitle: "個人戰略定位工具",
                date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }),
                userName,
                sections: [
                  { title: "PART 1：優勢分析", content: [
                    { label: "核心能力", value: form.core_ability },
                    { label: "成功經驗", value: form.success_experience },
                    { label: "獨特能力", value: form.unique_ability },
                  ]},
                  { title: "PART 2：戰場選擇", content: [
                    { label: "目前領域", value: form.current_field },
                    { label: "切入市場", value: form.target_market },
                    { label: "聚焦戰場", value: form.focused_battlefield },
                  ]},
                  { title: "PART 3：機會判斷", content: [
                    { label: "市場趨勢", value: form.market_trend },
                    { label: "3年機會", value: form.three_year_opportunity },
                    { label: "AI/技術紅利", value: form.ai_tech_dividend },
                  ]},
                  { title: "PART 4：個人定位一句話", content: form.positioning_statement },
                  { title: "STEP 1：優勢挖掘", content: [
                    { label: "過去最成功的三件事", value: form.step1_success_three },
                    { label: "別人最常稱讚的能力", value: form.step1_praised_ability },
                    { label: "做什麼最不費力", value: form.step1_effortless },
                    { label: "AI 分析", value: form.step1_ai_response },
                  ]},
                  { title: "STEP 2：能力轉換", content: [
                    { label: "能力變成什麼價值", value: form.step2_value_conversion },
                    { label: "解決誰的問題", value: form.step2_solve_problem },
                    { label: "變現方式", value: form.step2_monetize_ways },
                    { label: "AI 分析", value: form.step2_ai_response },
                  ]},
                  { title: "STEP 3：戰場建議", content: [
                    { label: "服務哪群人", value: form.step3_target_people },
                    { label: "進入哪個產業", value: form.step3_target_industry },
                    { label: "B2B / B2C", value: form.step3_b2b_or_b2c },
                    { label: "AI 分析", value: form.step3_ai_response },
                  ]},
                  { title: "STEP 4：機會分析", content: [
                    { label: "現在趨勢", value: form.step4_current_trend },
                    { label: "AI 是否可以放大", value: form.step4_ai_amplify },
                    { label: "未來3年是否成長", value: form.step4_growth_3year },
                    { label: "AI 分析", value: form.step4_ai_response },
                  ]},
                  { title: "我的戰略定位結果", content: [
                    { label: "戰場一句話", value: form.result_battlefield },
                    { label: "定位一句話", value: form.result_positioning },
                    { label: "優勢一句話", value: form.result_advantage },
                    { label: "第一步行動", value: form.result_first_action },
                  ]},
                ],
              })
            }
          />
        </form>

        {history.length > 1 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-4">歷史紀錄</h2>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="p-4 rounded-xl border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(h.created_at).toLocaleDateString("zh-TW")}
                  </p>
                  <p className="text-sm text-foreground/80">{h.positioning_statement || "（未填寫定位）"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
