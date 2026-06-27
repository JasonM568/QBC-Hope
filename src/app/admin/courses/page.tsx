import { requireRole } from "@/lib/auth-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import CoursesAdminPanel, { type AdminCourse } from "./courses-admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const { user, profile } = await requireRole(["admin", "master"]);
  const admin = createServiceRoleClient();

  const { data: courses } = await admin
    .from("courses")
    .select("id, slug, title, summary, cover_url, is_published, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const courseIds = (courses ?? []).map((c) => c.id);

  const { data: lessons } = courseIds.length
    ? await admin
        .from("course_lessons")
        .select("id, course_id, sort_order, title, video_provider, video_id, video_hash, duration_sec, is_preview")
        .in("course_id", courseIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const { data: planAccess } = courseIds.length
    ? await admin
        .from("course_plan_access")
        .select("course_id, plan")
        .in("course_id", courseIds)
    : { data: [] };

  const data: AdminCourse[] = (courses ?? []).map((c) => ({
    ...c,
    lessons: (lessons ?? []).filter((l) => l.course_id === c.id),
    plans: (planAccess ?? []).filter((p) => p.course_id === c.id).map((p) => p.plan),
  }));

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name || user.email || ""} userRole={profile.role} />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">課程管理</h1>
          <p className="text-sm text-muted-foreground">
            建立課程與單元（MVP 用 YouTube 影片 ID）、設定哪些訂閱方案可解鎖。授權＝訂閱方案分級 + 手動批次開通（Phase 3）。
          </p>
        </header>

        <CoursesAdminPanel courses={data} />
      </main>
    </div>
  );
}
