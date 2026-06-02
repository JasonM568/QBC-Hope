import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

// POST /api/admin/courses/[id]/lessons — 新增單元
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireApiAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  let body: {
    title?: string;
    video_provider?: string;
    video_id?: string;
    video_hash?: string;
    duration_sec?: number;
    is_preview?: boolean;
    sort_order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const title = body.title?.trim();
  const videoId = body.video_id?.trim();
  const provider = body.video_provider || "youtube";
  if (!title) return NextResponse.json({ error: "title 必填" }, { status: 400 });
  if (!videoId) return NextResponse.json({ error: "video_id 必填" }, { status: 400 });
  if (!["youtube", "vimeo"].includes(provider)) {
    return NextResponse.json({ error: "video_provider 只能 youtube/vimeo" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("course_lessons")
    .insert({
      course_id: params.id,
      title,
      video_provider: provider,
      video_id: videoId,
      video_hash: body.video_hash?.trim() || null,
      duration_sec: typeof body.duration_sec === "number" ? body.duration_sec : null,
      is_preview: body.is_preview ?? false,
      sort_order: body.sort_order ?? 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ lesson: data });
}
