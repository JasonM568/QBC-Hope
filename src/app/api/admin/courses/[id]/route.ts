import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

// PATCH /api/admin/courses/[id] — 更新課程
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireApiAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.slug === "string")
    patch.slug = body.slug.trim().toLowerCase().replace(/\s+/g, "-");
  if ("summary" in body) patch.summary = (body.summary as string)?.trim() || null;
  if ("cover_url" in body) patch.cover_url = (body.cover_url as string)?.trim() || null;
  if (typeof body.is_published === "boolean") patch.is_published = body.is_published;
  if (typeof body.sort_order === "number") patch.sort_order = body.sort_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const { error } = await admin.from("courses").update(patch).eq("id", params.id);
  if (error) {
    const msg = error.code === "23505" ? "slug 已存在，請換一個" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/courses/[id] — 刪除課程（連帶單元/授權 cascade）
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireApiAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { error } = await admin.from("courses").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
