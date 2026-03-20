"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CoachNoteForm({
  coachId,
  studentId,
}: {
  coachId: string;
  studentId: string;
}) {
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<"feedback" | "memo" | "alert">("feedback");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);

    const supabase = createClient();
    await supabase.from("coach_notes").insert({
      coach_id: coachId,
      student_id: studentId,
      content: content.trim(),
      note_type: noteType,
    });

    setContent("");
    setSaving(false);
    router.refresh();
  }

  const types = [
    { key: "feedback" as const, label: "回饋" },
    { key: "memo" as const, label: "備忘" },
    { key: "alert" as const, label: "提醒" },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-border bg-card">
      <div className="flex gap-2 mb-3">
        {types.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setNoteType(t.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              noteType === t.key
                ? "bg-gold text-black"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="寫下對這位學員的觀察、建議或提醒..."
        rows={3}
        className="bg-background border-border mb-3"
      />
      <Button
        type="submit"
        disabled={saving || !content.trim()}
        className="bg-gold text-black hover:bg-gold-light font-semibold text-sm"
      >
        {saving ? "儲存中..." : "新增筆記"}
      </Button>
    </form>
  );
}
