"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StudentNameFormProps {
  studentId: string;
  currentName: string;
}

export default function StudentNameForm({ studentId, currentName }: StudentNameFormProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("姓名不可為空");
      return;
    }

    const chineseOnly = /^[\u4e00-\u9fff]{2,}$/;
    if (!chineseOnly.test(trimmed)) {
      setMessage("姓名請輸入至少 2 個中文字");
      return;
    }

    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", studentId);

    if (error) {
      setMessage("更新失敗：" + error.message);
    } else {
      setMessage("已更新學員姓名");
      setEditing(false);
    }
    setSaving(false);
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setEditing(true); setMessage(""); }}
          className="border-gold/30 text-gold hover:bg-gold/10 text-xs"
        >
          修改姓名
        </Button>
        {message && (
          <span className={`ml-2 text-xs ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-xl border border-gold/30 bg-card space-y-3">
      <div>
        <Label>學員姓名（中文）</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="至少 2 個中文字"
          className="mt-1 bg-background border-border"
        />
      </div>
      {message && (
        <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{message}</p>
      )}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-gold text-black hover:bg-gold-light font-semibold"
        >
          {saving ? "儲存中..." : "儲存"}
        </Button>
        <Button
          onClick={() => { setEditing(false); setName(currentName); setMessage(""); }}
          size="sm"
          variant="outline"
        >
          取消
        </Button>
      </div>
    </div>
  );
}
