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

const capitals = [
  { key: "health", label: "健康資本", desc: "身體狀態、體能、心理健康" },
  { key: "relationship", label: "關係資本", desc: "家庭、友誼、人脈、社群" },
  { key: "financial", label: "財務資本", desc: "收入、儲蓄、投資、財務自由度" },
  { key: "knowledge", label: "知識資本", desc: "技能、學歷、專業能力、持續學習" },
] as const;

type CapitalKey = typeof capitals[number]["key"];

export default function CapitalInventoryPage() {
  const [scores, setScores] = useState<Record<CapitalKey, number>>({
    health: 5, relationship: 5, financial: 5, knowledge: 5,
  });
  const [notes, setNotes] = useState<Record<CapitalKey, string>>({
    health: "", relationship: "", financial: "", knowledge: "",
  });
  const [periodLabel, setPeriodLabel] = useState(() => {
    const now = new Date();
    const half = now.getMonth() < 6 ? "上半年" : "下半年";
    return `${now.getFullYear()} ${half}`;
  });
  const [overallReflection, setOverallReflection] = useState("");
  const [userName, setUserName] = useState("");
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

    const { error } = await supabase.from("capital_inventories").insert({
      user_id: user.id,
      period_label: periodLabel,
      health_score: scores.health,
      health_note: notes.health,
      relationship_score: scores.relationship,
      relationship_note: notes.relationship,
      financial_score: scores.financial,
      financial_note: notes.financial,
      knowledge_score: scores.knowledge,
      knowledge_note: notes.knowledge,
      overall_reflection: overallReflection,
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
          <p className="text-muted-foreground mt-1">盤點你的四大人生資本</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-card">
            <Label htmlFor="period">盤點期別</Label>
            <Input
              id="period"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              className="mt-2 bg-background border-border"
            />
          </div>

          {capitals.map((c) => (
            <div key={c.key} className="p-6 rounded-xl border border-border bg-card">
              <h2 className="font-semibold text-gold mb-1">{c.label}</h2>
              <p className="text-muted-foreground text-sm mb-4">{c.desc}</p>
              <div className="mb-4">
                <Label>評分 (1-10)：{scores[c.key]}</Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={scores[c.key]}
                  onChange={(e) => setScores({ ...scores, [c.key]: parseInt(e.target.value) })}
                  className="w-full mt-2 accent-gold"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span><span>5</span><span>10</span>
                </div>
              </div>
              <Label>說明與反思</Label>
              <Textarea
                value={notes[c.key]}
                onChange={(e) => setNotes({ ...notes, [c.key]: e.target.value })}
                placeholder={`關於${c.label}的現況與想法...`}
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
              placeholder="綜合四大資本，你覺得目前最需要加強的是？"
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
            {saving ? "儲存中..." : "儲存盤點"}
          </Button>

          <Button
            type="button"
            onClick={() =>
              exportPDF({
                reportTitle: "人生資本盤點表",
                subtitle: periodLabel,
                date: new Date().toISOString().split("T")[0],
                userName,
                sections: [
                  ...capitals.map((c) => ({
                    title: c.label,
                    content: [
                      { label: "評分", value: `${scores[c.key]} / 10` },
                      { label: "說明與反思", value: notes[c.key] },
                    ],
                  })),
                  { title: "整體反思", content: overallReflection },
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
