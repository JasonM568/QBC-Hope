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

export default function WeeklyAltruismPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [weekNumber] = useState(getWeekNumber(now));
  const [sharesCount, setSharesCount] = useState(0);
  const [helpsCount, setHelpsCount] = useState(0);
  const [referralsCount, setReferralsCount] = useState(0);
  const [sharesDetail, setSharesDetail] = useState("");
  const [helpsDetail, setHelpsDetail] = useState("");
  const [referralsDetail, setReferralsDetail] = useState("");
  const [reflection, setReflection] = useState("");
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
        setSharesDetail(data.shares_detail || "");
        setHelpsDetail(data.helps_detail || "");
        setReferralsDetail(data.referrals_detail || "");
        setReflection(data.reflection || "");
        setAnnouncedInGroup(data.announced_in_group || false);
        setExisting(true);
      }
      setLoading(false);
    }
    load();
  }, [router, year, weekNumber]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("登入狀態已過期，請重新登入。建議使用外部瀏覽器（Safari/Chrome）開啟。"); setSaving(false); return; }

    const payload = {
      user_id: user.id,
      year, week_number: weekNumber,
      shares_count: sharesCount, shares_detail: sharesDetail,
      helps_count: helpsCount, helps_detail: helpsDetail,
      referrals_count: referralsCount, referrals_detail: referralsDetail,
      reflection,
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

  function setCount(setter: (v: number) => void, raw: string) {
    const num = raw === "" ? 0 : parseInt(raw) || 0;
    if (num > 100) {
      setCountWarning("次數上限為 100，請輸入 0-100 之間的數值");
      setTimeout(() => setCountWarning(""), 3000);
      return;
    }
    setCountWarning("");
    setter(Math.max(0, num));
  }

  const totalImpact = sharesCount + helpsCount + referralsCount;

  return (
    <div className="min-h-screen">
      <Navbar userName={userName} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">利他影響力週報</h1>
          <p className="text-muted-foreground mt-1">{year} 年 第 {weekNumber} 週</p>
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
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {countWarning && (
            <p className="text-red-400 text-sm">{countWarning}</p>
          )}
          {/* Shares */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="font-semibold text-gold mb-4">分享 (Share)</h2>
            <div className="flex items-center gap-4 mb-4">
              <Label className="shrink-0">次數</Label>
              <Input
                type="number" min={0} max={100}
                value={sharesCount || ""}
                onChange={(e) => setCount(setSharesCount, e.target.value)}
                className="w-24 bg-background border-border"
              />
            </div>
            <Label>分享了什麼？</Label>
            <Textarea
              value={sharesDetail}
              onChange={(e) => setSharesDetail(e.target.value)}
              placeholder="分享的知識、經驗或資源..."
              rows={3}
              className="mt-2 bg-background border-border"
            />
          </div>

          {/* Helps */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="font-semibold text-gold mb-4">幫助 (Help)</h2>
            <div className="flex items-center gap-4 mb-4">
              <Label className="shrink-0">次數</Label>
              <Input
                type="number" min={0} max={100}
                value={helpsCount || ""}
                onChange={(e) => setCount(setHelpsCount, e.target.value)}
                className="w-24 bg-background border-border"
              />
            </div>
            <Label>幫助了誰？</Label>
            <Textarea
              value={helpsDetail}
              onChange={(e) => setHelpsDetail(e.target.value)}
              placeholder="具體幫助的人與事..."
              rows={3}
              className="mt-2 bg-background border-border"
            />
          </div>

          {/* Referrals */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="font-semibold text-gold mb-4">引薦 (Refer)</h2>
            <div className="flex items-center gap-4 mb-4">
              <Label className="shrink-0">次數</Label>
              <Input
                type="number" min={0} max={100}
                value={referralsCount || ""}
                onChange={(e) => setCount(setReferralsCount, e.target.value)}
                className="w-24 bg-background border-border"
              />
            </div>
            <Label>引薦了誰給誰？</Label>
            <Textarea
              value={referralsDetail}
              onChange={(e) => setReferralsDetail(e.target.value)}
              placeholder="引薦的人脈連結..."
              rows={3}
              className="mt-2 bg-background border-border"
            />
          </div>

          <div className="p-6 rounded-xl border border-border bg-card">
            <Label>本週反思</Label>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="利他帶給你什麼感受與收穫？"
              rows={4}
              className="mt-2 bg-background border-border"
            />
          </div>

          {/* 群組公佈確認 */}
          <div className="p-4 rounded-xl border border-gold/30 bg-card">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={announcedInGroup}
                onChange={(e) => setAnnouncedInGroup(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-gold"
              />
              <span className="text-sm">是否已在群裡完成公佈？</span>
            </label>
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12">
            {saving ? "儲存中..." : existing ? "更新週報" : "提交週報"}
          </Button>

          <ReportPreview
            reportTitle="利他影響力週報"
            subtitle={`${year} 年 第 ${weekNumber} 週`}
            date={`${year}-W${weekNumber}`}
            userName={userName}
            sections={[
              { title: "影響力總覽", items: [
                { label: "分享", value: `${sharesCount} 次` },
                { label: "幫助", value: `${helpsCount} 次` },
                { label: "引薦", value: `${referralsCount} 次` },
                { label: "總計", value: `${totalImpact} 次` },
              ]},
              { title: "", columns: [
                { title: "分享 Share", content: sharesDetail },
                { title: "幫助 Help", content: helpsDetail },
              ]},
              { title: "引薦 Refer", content: referralsDetail },
              { title: "本週反思", content: reflection },
              { title: "群組公佈", checks: [{ label: "已在群裡完成公佈", checked: announcedInGroup }] },
            ]}
            onExportPDF={() =>
              exportPDF({
                reportTitle: "利他影響力週報",
                subtitle: `${year} 年 第 ${weekNumber} 週`,
                date: `${year}-W${weekNumber}`,
                userName,
                sections: [
                  { title: "影響力總覽", content: [
                    { label: "分享次數", value: `${sharesCount} 次` },
                    { label: "幫助次數", value: `${helpsCount} 次` },
                    { label: "引薦次數", value: `${referralsCount} 次` },
                    { label: "總計", value: `${totalImpact} 次` },
                  ]},
                  { title: "分享內容", content: sharesDetail },
                  { title: "幫助紀錄", content: helpsDetail },
                  { title: "引薦紀錄", content: referralsDetail },
                  { title: "本週反思", content: reflection },
                ],
              })
            }
          />
        </form>
      </main>
    </div>
  );
}
