"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdvancedToggle({
  studentId,
  initialEnabled,
}: {
  studentId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const supabase = createClient();
    const newVal = !enabled;
    const { error } = await supabase
      .from("profiles")
      .update({ advanced_modules_enabled: newVal })
      .eq("id", studentId);

    if (!error) setEnabled(newVal);
    setSaving(false);
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
      <div>
        <p className="text-sm font-medium">進階模組</p>
        <p className="text-xs text-muted-foreground">資本盤點、戰略定位、月報</p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? "bg-gold" : "bg-zinc-600"
        }`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          enabled ? "left-6" : "left-0.5"
        }`} />
      </button>
    </div>
  );
}
