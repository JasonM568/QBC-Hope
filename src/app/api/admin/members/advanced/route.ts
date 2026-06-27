import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-api";

// 批次開通／取消「進階模組」權限
// POST body: { userIds: string[], enable: boolean }
export async function POST(request: Request) {
  const gate = await requireApiAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  let body: { userIds?: unknown; enable?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const { userIds, enable } = body;

  if (!Array.isArray(userIds) || userIds.length === 0 || !userIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "userIds 必須是非空字串陣列" }, { status: 400 });
  }
  if (typeof enable !== "boolean") {
    return NextResponse.json({ error: "enable 必須是 boolean" }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ advanced_modules_enabled: enable })
    .in("id", userIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: userIds.length, enable });
}
