"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlanResetFormProps {
  studentId: string;
  currentStartDate: string | null;
  currentRound: number;
}

export default function PlanResetForm({
  studentId,
  currentStartDate,
  currentRound,
}: PlanResetFormProps) {
  const [startDate, setStartDate] = useState(currentStartDate || "");
  const [round, setRound] = useState(currentRound);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });

  // 計算目前天數
  function calcDay() {
    if (!currentStartDate) return null;
    const start = new Date(currentStartDate);
    const now = new Date(today);
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff - (currentRound - 1) * 21 + 1;
  }

  const currentDay = calcDay();

  async function handleSave() {
    if (!startDate) {
      setMessage("請選擇起始日期");
      return;
    }
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/coach/update-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        updates: { plan_start_date: startDate, plan_round: round },
      }),
    });
    const result = await res.json();

    if (!res.ok) {
      setMessage("更新失敗：" + (result.error || "未知錯誤"));
    } else {
      setMessage("已更新學員的 21 天計畫設定");
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleClear() {
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/coach/update-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        updates: { plan_start_date: null, plan_round: 1 },
      }),
    });
    const result = await res.json();

    if (!res.ok) {
      setMessage("重置失敗：" + (result.error || "未知錯誤"));
    } else {
      setStartDate("");
      setRound(1);
      setMessage("已重置，學員可重新設定起始日");
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  }

  if (!editing) {
    return (
      <div className="p-4 rounded-xl border border-border bg-card">
        {currentStartDate ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">起始日</span>
                <span className="font-semibold">{currentStartDate}</span>
                <span className="text-sm text-muted-foreground">第 {currentRound} 輪</span>
                {currentDay !== null && (
                  <span className="px-2 py-0.5 bg-gold/10 text-gold text-sm rounded-full font-semibold">
                    Day {currentDay > 21 ? "已完成" : currentDay}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="border-gold/30 text-gold hover:bg-gold/10 text-xs"
            >
              調整設定
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">學員尚未啟動 21 天計畫</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="border-gold/30 text-gold hover:bg-gold/10 text-xs"
            >
              幫學員設定
            </Button>
          </div>
        )}
        {message && (
          <p className={`text-sm mt-2 ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-gold/30 bg-card space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>計畫起始日</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 border-border bg-background [color-scheme:dark]"
          />
        </div>
        <div>
          <Label>目前輪次</Label>
          <Input
            type="number"
            min={1}
            value={round}
            onChange={(e) => setRound(parseInt(e.target.value) || 1)}
            className="mt-1 border-border bg-background"
          />
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold text-black hover:bg-gold-light font-semibold"
          size="sm"
        >
          {saving ? "儲存中..." : "儲存"}
        </Button>
        {currentStartDate && (
          <Button
            onClick={handleClear}
            disabled={saving}
            variant="outline"
            size="sm"
            className="border-red-400/30 text-red-400 hover:bg-red-400/10"
          >
            重置計畫
          </Button>
        )}
        <Button
          onClick={() => { setEditing(false); setMessage(""); }}
          variant="outline"
          size="sm"
        >
          取消
        </Button>
      </div>
    </div>
  );
}
