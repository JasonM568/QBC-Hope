import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 課程目錄（MVP 最小版；Phase 2 再做鎖頭 / 試看 / 升級 CTA 的完整呈現）
export default async function CoursesPage() {
  const admin = createServiceRoleClient();
  const { data: courses } = await admin
    .from("courses")
    .select("slug, title, summary, cover_url")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">線上課程</h1>
        <p className="text-sm text-muted-foreground">訂閱會員可觀看；部分單元開放試看。</p>
      </header>

      {!courses || courses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">目前尚無上架課程。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <Link
              key={c.slug}
              href={`/courses/${c.slug}`}
              className="rounded-lg border border-border bg-card p-4 hover:border-gold/50 transition"
            >
              {c.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.cover_url}
                  alt={c.title}
                  className="mb-3 aspect-video w-full rounded object-cover"
                />
              )}
              <h2 className="font-semibold">{c.title}</h2>
              {c.summary && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.summary}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
