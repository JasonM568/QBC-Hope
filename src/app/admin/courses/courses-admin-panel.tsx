"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AdminLesson {
  id: string;
  course_id: string;
  sort_order: number;
  title: string;
  video_provider: string;
  video_id: string;
  video_hash: string | null;
  duration_sec: number | null;
  is_preview: boolean;
}

export interface AdminCourse {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  lessons: AdminLesson[];
  plans: string[];
}

const ALL_PLANS = [
  { key: "trial", label: "體驗 trial" },
  { key: "monthly", label: "月繳 monthly" },
  { key: "annual", label: "年繳 annual" },
];

export default function CoursesAdminPanel({ courses }: { courses: AdminCourse[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // 建課表單
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `錯誤 ${res.status}`);
      router.refresh();
      return data;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createCourse() {
    if (!newTitle.trim()) return setErr("請輸入課程標題");
    const ok = await call("/api/admin/courses", "POST", {
      title: newTitle,
      slug: newSlug || undefined,
    });
    if (ok) {
      setNewTitle("");
      setNewSlug("");
    }
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {err}
        </div>
      )}

      {/* 建立課程 */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">＋ 新增課程</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
          <Input
            placeholder="課程標題（必填）"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Input
            placeholder="slug（選填，英數）"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
          />
          <Button onClick={createCourse} disabled={busy}>
            建立
          </Button>
        </div>
      </section>

      {/* 課程列表 */}
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">尚無課程，先在上方建立一門。</p>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              busy={busy}
              expanded={expanded === c.id}
              onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
              call={call}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({
  course,
  busy,
  expanded,
  onToggle,
  call,
}: {
  course: AdminCourse;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  call: (url: string, method: string, body?: unknown) => Promise<unknown>;
}) {
  const [plans, setPlans] = useState<string[]>(course.plans);

  // 新增單元表單
  const [lTitle, setLTitle] = useState("");
  const [lVideoId, setLVideoId] = useState("");
  const [lPreview, setLPreview] = useState(false);

  async function addLesson() {
    if (!lTitle.trim() || !lVideoId.trim()) return;
    const ok = await call(`/api/admin/courses/${course.id}/lessons`, "POST", {
      title: lTitle,
      video_id: lVideoId,
      video_provider: "youtube",
      is_preview: lPreview,
      sort_order: course.lessons.length,
    });
    if (ok) {
      setLTitle("");
      setLVideoId("");
      setLPreview(false);
    }
  }

  function togglePlan(p: string) {
    setPlans((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* 標題列 */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{course.title}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                course.is_published
                  ? "bg-green-500/15 text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {course.is_published ? "已上架" : "草稿"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            /{course.slug} · {course.lessons.length} 單元 · 方案：
            {course.plans.length ? course.plans.join("、") : "未設定"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              call(`/api/admin/courses/${course.id}`, "PATCH", {
                is_published: !course.is_published,
              })
            }
          >
            {course.is_published ? "下架" : "上架"}
          </Button>
          <Button variant="outline" size="sm" onClick={onToggle}>
            {expanded ? "收合" : "管理"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (confirm(`確定刪除課程「${course.title}」？單元與授權會一併刪除。`)) {
                call(`/api/admin/courses/${course.id}`, "DELETE");
              }
            }}
          >
            刪除
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-5">
          {/* 方案授權 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">解鎖方案（哪些訂閱可看）</p>
            <div className="flex flex-wrap items-center gap-3">
              {ALL_PLANS.map((p) => (
                <label key={p.key} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={plans.includes(p.key)}
                    onChange={() => togglePlan(p.key)}
                  />
                  {p.label}
                </label>
              ))}
              <Button
                size="sm"
                disabled={busy}
                onClick={() => call(`/api/admin/courses/${course.id}/plans`, "PUT", { plans })}
              >
                儲存方案
              </Button>
            </div>
          </div>

          {/* 單元列表 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">單元（{course.lessons.length}）</p>
            {course.lessons.length === 0 ? (
              <p className="text-xs text-muted-foreground">尚無單元。</p>
            ) : (
              <div className="rounded-md border border-border divide-y divide-border">
                {course.lessons.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">
                        {l.sort_order}. {l.title}
                        {l.is_preview && (
                          <span className="ml-2 text-xs text-gold">試看</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {l.video_provider}:{l.video_id}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        call(`/api/admin/courses/${course.id}/lessons/${l.id}`, "DELETE")
                      }
                    >
                      刪
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 新增單元 */}
            <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto_auto] items-center">
              <Input
                placeholder="單元標題"
                value={lTitle}
                onChange={(e) => setLTitle(e.target.value)}
              />
              <Input
                placeholder="YouTube 影片 ID"
                value={lVideoId}
                onChange={(e) => setLVideoId(e.target.value)}
              />
              <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={lPreview}
                  onChange={(e) => setLPreview(e.target.checked)}
                />
                試看
              </label>
              <Button size="sm" onClick={addLesson} disabled={busy}>
                ＋單元
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
