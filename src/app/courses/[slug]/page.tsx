import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCourseAccess } from "@/lib/courses/access";
import LessonPlayer from "@/components/courses/lesson-player";

export const dynamic = "force-dynamic";

export default async function CoursePlayerPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { lesson?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();

  const { data: course } = await admin
    .from("courses")
    .select("id, slug, title, summary, is_published")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!course) notFound();

  // 未上架：只有 admin/master 看得到
  if (!course.is_published) {
    const role = user
      ? (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role
      : null;
    if (!role || !["admin", "master"].includes(role)) notFound();
  }

  const { data: lessons } = await admin
    .from("course_lessons")
    .select("id, title, video_provider, video_id, video_hash, duration_sec, is_preview, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  const lessonList = lessons ?? [];
  const access = await getCourseAccess(admin, user?.id ?? null, course.id);

  const selected =
    lessonList.find((l) => l.id === searchParams.lesson) ?? lessonList[0] ?? null;
  const canPlaySelected = selected ? selected.is_preview || access.canWatch : false;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/courses" className="text-sm text-muted-foreground hover:text-foreground">
          ← 課程列表
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{course.title}</h1>
        {course.summary && (
          <p className="mt-1 text-sm text-muted-foreground">{course.summary}</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        {/* 播放區 */}
        <div className="space-y-3">
          {!selected ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              此課程尚無單元。
            </div>
          ) : canPlaySelected ? (
            <LessonPlayer
              provider={selected.video_provider}
              videoId={selected.video_id}
              hash={selected.video_hash}
              title={selected.title}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 text-center space-y-3">
              <p className="text-lg">🔒 此單元需訂閱會員才能觀看</p>
              <p className="text-sm text-muted-foreground">
                {user ? "您目前的方案未包含本課程。" : "請先登入並訂閱會員。"}
              </p>
              <Link
                href={user ? "/dashboard" : "/auth/login"}
                className="inline-block rounded-md border border-gold/50 bg-gold/10 px-4 py-2 text-sm text-gold hover:bg-gold/20 transition"
              >
                {user ? "查看訂閱方案" : "登入 / 註冊"}
              </Link>
            </div>
          )}
          {selected && <h2 className="font-semibold">{selected.title}</h2>}
        </div>

        {/* 單元列表 */}
        <aside className="space-y-1">
          <p className="text-sm font-medium mb-2">單元（{lessonList.length}）</p>
          {lessonList.map((l, i) => {
            const isCurrent = selected?.id === l.id;
            return (
              <Link
                key={l.id}
                href={`/courses/${course.slug}?lesson=${l.id}`}
                className={`block rounded-md border px-3 py-2 text-sm transition ${
                  isCurrent
                    ? "border-gold/50 bg-gold/10"
                    : "border-border bg-card hover:border-gold/30"
                }`}
              >
                <span className="text-muted-foreground">{i + 1}.</span> {l.title}
                {l.is_preview && <span className="ml-1.5 text-xs text-gold">試看</span>}
                {!l.is_preview && !access.canWatch && (
                  <span className="ml-1.5 text-xs text-muted-foreground">🔒</span>
                )}
              </Link>
            );
          })}
        </aside>
      </div>
    </main>
  );
}
