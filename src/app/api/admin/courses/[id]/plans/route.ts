import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

const VALID_PLANS = ["trial", "monthly", "annual"];

// PUT /api/admin/courses/[id]/plans — 設定該課解鎖方案（整組覆寫）
// body: { plans: string[] }
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireApiAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  let body: { plans?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (!Array.isArray(body.plans)) {
    return NextResponse.json({ error: "plans 必須是陣列" }, { status: 400 });
  }
  const plans = Array.from(new Set(body.plans as string[])).filter((p) =>
    VALID_PLANS.includes(p)
  );

  // 整組覆寫：先刪該課全部，再插入選定方案
  const { error: delErr } = await admin
    .from("course_plan_access")
    .delete()
    .eq("course_id", params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  if (plans.length > 0) {
    const rows = plans.map((plan) => ({ course_id: params.id, plan }));
    const { error: insErr } = await admin.from("course_plan_access").insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, plans });
}
