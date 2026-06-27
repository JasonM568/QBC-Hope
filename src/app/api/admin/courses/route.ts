import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

// POST /api/admin/courses — 建立課程
export async function POST(request: Request) {
  const gate = await requireApiAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  let body: {
    title?: string;
    slug?: string;
    summary?: string;
    cover_url?: string;
    is_published?: boolean;
    sort_order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "title 必填" }, { status: 400 });

  const slug =
    body.slug?.trim().toLowerCase().replace(/\s+/g, "-") ||
    `course-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await admin
    .from("courses")
    .insert({
      title,
      slug,
      summary: body.summary?.trim() || null,
      cover_url: body.cover_url?.trim() || null,
      is_published: body.is_published ?? false,
      sort_order: body.sort_order ?? 0,
    })
    .select("id, slug")
    .single();

  if (error) {
    const msg = error.code === "23505" ? "slug 已存在，請換一個" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ course: data });
}
