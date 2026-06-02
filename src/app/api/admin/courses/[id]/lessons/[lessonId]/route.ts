import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

// PATCH /api/admin/courses/[id]/lessons/[lessonId] — 更新單元
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; lessonId: string } }
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
  if (typeof body.video_provider === "string") {
    if (!["youtube", "vimeo"].includes(body.video_provider)) {
      return NextResponse.json({ error: "video_provider 只能 youtube/vimeo" }, { status: 400 });
    }
    patch.video_provider = body.video_provider;
  }
  if (typeof body.video_id === "string") patch.video_id = body.video_id.trim();
  if ("video_hash" in body) patch.video_hash = (body.video_hash as string)?.trim() || null;
  if ("duration_sec" in body)
    patch.duration_sec = typeof body.duration_sec === "number" ? body.duration_sec : null;
  if (typeof body.is_preview === "boolean") patch.is_preview = body.is_preview;
  if (typeof body.sort_order === "number") patch.sort_order = body.sort_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const { error } = await admin
    .from("course_lessons")
    .update(patch)
    .eq("id", params.lessonId)
    .eq("course_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/courses/[id]/lessons/[lessonId] — 刪除單元
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; lessonId: string } }
) {
  const gate = await requireApiAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { error } = await admin
    .from("course_lessons")
    .delete()
    .eq("id", params.lessonId)
    .eq("course_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
