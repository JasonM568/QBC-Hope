"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportPDF } from "@/lib/export-pdf";

export default function StrategyPage() {
  const [strengths, setStrengths] = useState("");
  const [battlefield, setBattlefield] = useState("");
  const [positioning, setPositioning] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [userName, setUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Array<{ id: string; created_at: string; strengths: string; positioning: string }>>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserName(user.user_metadata?.display_name || user.email || "");

      // Load latest entry
      const { data } = await supabase
        .from("strategic_positions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        const latest = data[0];
        setStrengths(latest.strengths || "");
        setBattlefield(latest.battlefield || "");
        setPositioning(latest.positioning || "");
        setActionPlan(latest.action_plan || "");
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

    const { error } = await supabase.from("strategic_positions").insert({
      user_id: user.id,
      strengths,
      battlefield,
      positioning,
      action_plan: actionPlan,
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
          <p className="text-muted-foreground mt-1">找到你的優勢、選定戰場、明確定位</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold">我的優勢</h2>
            </div>
            <Label>你最擅長什麼？別人最常稱讚你的是？</Label>
            <Textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="列出你的核心優勢、天賦、技能..."
              rows={5}
              className="mt-2 bg-background border-border"
            />
          </div>

          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">2</span>
              <h2 className="font-semibold">選定戰場</h2>
            </div>
            <Label>你要在哪個領域發揮？市場在哪裡？</Label>
            <Textarea
              value={battlefield}
              onChange={(e) => setBattlefield(e.target.value)}
              placeholder="你選擇深耕的產業、領域、市場..."
              rows={5}
              className="mt-2 bg-background border-border"
            />
          </div>

          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">3</span>
              <h2 className="font-semibold">明確定位</h2>
            </div>
            <Label>一句話說明你是誰、你為誰解決什麼問題？</Label>
            <Textarea
              value={positioning}
              onChange={(e) => setPositioning(e.target.value)}
              placeholder="我是＿＿，我幫助＿＿透過＿＿達成＿＿"
              rows={4}
              className="mt-2 bg-background border-border"
            />
          </div>

          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center">4</span>
              <h2 className="font-semibold">行動計畫</h2>
            </div>
            <Label>接下來 90 天，你要做哪些關鍵行動？</Label>
            <Textarea
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="列出 3-5 個具體可執行的行動..."
              rows={5}
              className="mt-2 bg-background border-border"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full bg-gold text-black hover:bg-gold-light font-semibold h-12">
            {saving ? "儲存中..." : "儲存戰略定位"}
          </Button>

          <Button
            type="button"
            onClick={() =>
              exportPDF({
                reportTitle: "個人戰略定位工具",
                date: new Date().toISOString().split("T")[0],
                userName,
                sections: [
                  { title: "我的優勢", content: strengths },
                  { title: "選定戰場", content: battlefield },
                  { title: "明確定位", content: positioning },
                  { title: "行動計畫", content: actionPlan },
                ],
              })
            }
            variant="outline"
            className="w-full border-gold/30 text-gold hover:bg-gold/10 h-12"
          >
            匯出 PDF
          </Button>
        </form>

        {/* History */}
        {history.length > 1 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-4">歷史紀錄</h2>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="p-4 rounded-xl border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(h.created_at).toLocaleDateString("zh-TW")}
                  </p>
                  <p className="text-sm text-foreground/80">{h.positioning || h.strengths?.slice(0, 100)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
