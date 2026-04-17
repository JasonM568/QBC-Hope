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

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function Checkbox({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
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

export default function WeeklyAltruismPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [weekNumber] = useState(getWeekNumber(now));

  // PART 1 行動統計
  const [sharesCount, setSharesCount] = useState(0);
  const [helpsCount, setHelpsCount] = useState(0);
  const [referralsCount, setReferralsCount] = useState(0);

  // PART 2 核心價值
  const [coreValue, setCoreValue] = useState("");

  // PART 3 實質成果
  const [resultTrust, setResultTrust] = useState(false);
  const [resultCooperation, setResultCooperation] = useState(false);
  const [resultIncome, setResultIncome] = useState(false);
  const [resultNetwork, setResultNetwork] = useState(false);
  const [resultNone, setResultNone] = useState(false);

  // PART 4 影響力心得
  const [impactInsight, setImpactInsight] = useState("");

  // PART 5 本週利他目標
  const [nextSharesCount, setNextSharesCount] = useState(0);
  const [nextHelpsCount, setNextHelpsCount] = useState(0);
  const [nextReferralsCount, setNextReferralsCount] = useState(0);

  // 群組公佈
  const [announcedInGroup, setAnnouncedInGroup] = useState(false);

  const [userName, setUserName] = useState("");
  const [existing, setExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [countWarning, setCountWarning] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      setUserName(prof?.display_name || user.user_metadata?.display_name || user.email || "");

      const { data } = await supabase
        .from("weekly_altruism")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("week_number", weekNumber)
        .single();

      if (data) {
        setSharesCount(data.shares_count || 0);
        setHelpsCount(data.helps_count || 0);
        setReferralsCount(data.referrals_count || 0);
        setCoreValue(data.core_value || "");
        setResultTrust(data.result_trust || false);
        setResultCooperation(data.result_cooperation || false);
        setResultIncome(data.result_income || false);
        setResultNetwork(data.result_network || false);
        setResultNone(data.result_none || false);
        setImpactInsight(data.impact_insight || "");
        setNextSharesCount(data.next_shares_count || 0);
        setNextHelpsCount(data.next_helps_count || 0);
        setNextReferralsCount(data.next_referrals_count || 0);
        setAnnouncedInGroup(data.announced_in_group || false);
        setExisting(true);
      }
      setLoading(false);
    }
    load();
  }, [router, year, weekNumber]);

  function setCount(setter: (v: number) => void, raw: string) {
    const num = raw === "" ? 0 : parseInt(raw) || 0;
    if (num > 100) {
      setCountWarning("次數上限為 100");
      setTimeout(() => setCountWarning(""), 3000);
      return;
    }
    setCountWarning("");
    setter(Math.max(0, num));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("登入狀態已過期，請重新登入。"); setSaving(false); return; }

    const payload = {
      user_id: user.id,
      year, week_number: weekNumber,
      shares_count: sharesCount,
      helps_count: helpsCount,
      referrals_count: referralsCount,
      shares_detail: "", helps_detail: "", referrals_detail: "", reflection: "",
      core_value: coreValue,
      result_trust: resultTrust,
      result_cooperation: resultCooperation,
      result_income: resultIncome,
      result_network: resultNetwork,
      result_none: resultNone,
      impact_insight: impactInsight,
      next_shares_count: nextSharesCount,
      next_helps_count: nextHelpsCount,
      next_referrals_count: nextReferralsCount,
      announced_in_group: announcedInGroup,
    };

    const { error } = existing
      ? await supabase.from("weekly_altruism").update(payload).eq("user_id", user.id).eq("year", year).eq("week_number", weekNumber)
      : await supabase.from("weekly_altruism").insert(payload);

    if (error) {
      setMessage("儲存失敗：" + error.message);
    } else {
      setMessage("週報已儲存！");
      setExisting(true);
    }
    setSaving(false);
  }

  const totalImpact = sharesCount + helpsCount + referralsCount;
  const weekLabel = `${year} 年 第 ${weekNumber} 週`;

  const resultChecks = [
    { label: "建立信任", checked: resultTrust },
    { label: "建立合作", checked: resultCooperation },
    { label: "創造收入", checked: resultIncome },
    { label: "拓展人脈", checked: resultNetwork },
    { label: "暫無明顯成果", checked: resultNone },
  ];

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
          <h1 className="text-2xl font-bold">利他影響力週報</h1>
          <p className="text-muted-foreground mt-1">{weekLabel}</p>
          {existing && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-400/10 text-green-400 text-sm rounded-full">
              本週已填寫（可更新）
            </span>
          )}
        </div>

        {/* Impact Summary */}
        <div className="p-6 rounded-xl border border-gold/30 bg-card mb-6">
          <p className="text-muted-foreground text-sm">本週利他影響力</p>
          <p className="text-4xl font-bold text-gold mt-1">{totalImpact} 次</p>
          <p className="text-xs text-muted-foreground mt-1">
            分享 {sharesCount} 次 ・ 幫助 {helpsCount} 次 ・ 引薦 {referralsCount} 次
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {countWarning && (
            <p className="text-red-400 text-sm">{countWarning}</p>
          )}

          {/* PART 1 行動統計 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={1} title="行動統計" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">分享知識</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number" min={0} max={100}
                    value={sharesCount || ""}
                    onChange={(e) => setCount(setSharesCount, e.target.value)}
                    className="w-full bg-background border-border text-center"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">次</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">幫助別人</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number" min={0} max={100}
                    value={helpsCount || ""}
                    onChange={(e) => setCount(setHelpsCount, e.target.value)}
                    className="w-full bg-background border-border text-center"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">次</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">引薦機會</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number" min={0} max={100}
                    value={referralsCount || ""}
                    onChange={(e) => setCount(setReferralsCount, e.target.value)}
                    className="w-full bg-background border-border text-center"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">次</span>
                </div>
              </div>
            </div>
          </div>

          {/* PART 2 核心價值 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-3">
            <PartHeader num={2} title="核心價值" />
            <p className="text-xs text-muted-foreground">本週最有價值的行動是什麼？（做了什麼 / 影響了誰 / 帶來什麼改變）</p>
            <Textarea
              value={coreValue}
              onChange={(e) => setCoreValue(e.target.value)}
              placeholder="描述你本週最有價值的利他行動..."
              rows={4}
              className="bg-background border-border"
            />
          </div>

          {/* PART 3 實質成果 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-3">
            <PartHeader num={3} title="實質成果" />
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Checkbox label="建立信任" checked={resultTrust} onChange={setResultTrust} />
              <Checkbox label="建立合作" checked={resultCooperation} onChange={setResultCooperation} />
              <Checkbox label="創造收入" checked={resultIncome} onChange={setResultIncome} />
              <Checkbox label="拓展人脈" checked={resultNetwork} onChange={setResultNetwork} />
              <Checkbox label="暫無明顯成果" checked={resultNone} onChange={setResultNone} />
            </div>
          </div>

          {/* PART 4 影響力心得 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-3">
            <PartHeader num={4} title="影響力心得" />
            <p className="text-xs text-muted-foreground">最大收穫 / 建立信任關係</p>
            <Textarea
              value={impactInsight}
              onChange={(e) => setImpactInsight(e.target.value)}
              placeholder="利他帶給你什麼感受與收穫？"
              rows={4}
              className="bg-background border-border"
            />
          </div>

          {/* PART 5 本週利他目標 */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <PartHeader num={5} title="本週利他目標" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">分享知識</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number" min={0} max={100}
                    value={nextSharesCount || ""}
                    onChange={(e) => setCount(setNextSharesCount, e.target.value)}
                    className="w-full bg-background border-border text-center"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">次</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">幫助別人</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number" min={0} max={100}
                    value={nextHelpsCount || ""}
                    onChange={(e) => setCount(setNextHelpsCount, e.target.value)}
                    className="w-full bg-background border-border text-center"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">次</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">引薦機會</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number" min={0} max={100}
                    value={nextReferralsCount || ""}
                    onChange={(e) => setCount(setNextReferralsCount, e.target.value)}
                    className="w-full bg-background border-border text-center"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">次</span>
                </div>
              </div>
            </div>
          </div>

          {/* 群組公佈 */}
          <div className="p-4 rounded-xl border border-gold/30 bg-card">
            <Checkbox
              label="是否已在群裡完成公佈？"
              checked={announcedInGroup}
              onChange={setAnnouncedInGroup}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12">
            {saving ? "儲存中..." : existing ? "更新週報" : "提交週報"}
          </Button>

          {existing && (
            <ReportPreview
              reportTitle="利他影響力週報"
              subtitle={weekLabel}
              date={`${year}-W${weekNumber}`}
              userName={userName}
              sections={[
                {
                  title: "1 行動統計",
                  items: [
                    { label: "分享知識", value: `${sharesCount} 次` },
                    { label: "幫助別人", value: `${helpsCount} 次` },
                    { label: "引薦機會", value: `${referralsCount} 次` },
                    { label: "總計", value: `${totalImpact} 次` },
                  ],
                },
                { title: "2 核心價值", content: coreValue },
                { title: "3 實質成果", checks: resultChecks },
                { title: "4 影響力心得", content: impactInsight },
                {
                  title: "5 本週利他目標",
                  items: [
                    { label: "分享知識", value: `${nextSharesCount} 次` },
                    { label: "幫助別人", value: `${nextHelpsCount} 次` },
                    { label: "引薦機會", value: `${nextReferralsCount} 次` },
                  ],
                },
                { title: "群組公佈", checks: [{ label: "已在群裡完成公佈", checked: announcedInGroup }] },
              ]}
              onExportPDF={() =>
                exportPDF({
                  reportTitle: "利他影響力週報",
                  subtitle: weekLabel,
                  date: `${year}-W${weekNumber}`,
                  userName,
                  sections: [
                    {
                      title: "行動統計",
                      content: [
                        { label: "分享知識", value: `${sharesCount} 次` },
                        { label: "幫助別人", value: `${helpsCount} 次` },
                        { label: "引薦機會", value: `${referralsCount} 次` },
                        { label: "總計", value: `${totalImpact} 次` },
                      ],
                    },
                    { title: "核心價值", content: coreValue },
                    {
                      title: "實質成果",
                      content: resultChecks
                        .filter((c) => c.checked)
                        .map((c) => c.label)
                        .join("、") || "暫無",
                    },
                    { title: "影響力心得", content: impactInsight },
                    {
                      title: "本週利他目標",
                      content: [
                        { label: "分享知識", value: `${nextSharesCount} 次` },
                        { label: "幫助別人", value: `${nextHelpsCount} 次` },
                        { label: "引薦機會", value: `${nextReferralsCount} 次` },
                      ],
                    },
                  ],
                })
              }
            />
          )}
        </form>
      </main>
    </div>
  );
}
