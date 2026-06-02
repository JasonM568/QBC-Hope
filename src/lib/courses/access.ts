import type { SupabaseClient } from "@supabase/supabase-js";

// 課程存取判斷 — 對應 SPEC 模組八 第四節 gate function。
// 兩個授權來源任一通過即可看：
//   1) course_enrollments（手動 / 批次開通，未撤銷且未過期）
//   2) subscriptions（active/cancelling 且未到期）× course_plan_access（方案分級）
//
// 傳入 service-role client，確保讀得到 subscriptions / enrollments（繞 RLS）。

export type AccessReason = "enrollment" | "subscription" | "denied";

export interface CourseAccess {
  canWatch: boolean;
  reason: AccessReason;
}

export async function getCourseAccess(
  admin: SupabaseClient,
  userId: string | null,
  courseId: string
): Promise<CourseAccess> {
  if (!userId) return { canWatch: false, reason: "denied" };

  const nowIso = new Date().toISOString();

  // 來源 1：手動 / 批次開通
  const { data: enr } = await admin
    .from("course_enrollments")
    .select("expires_at, revoked_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .is("revoked_at", null)
    .maybeSingle();

  if (enr && (!enr.expires_at || enr.expires_at > nowIso)) {
    return { canWatch: true, reason: "enrollment" };
  }

  // 來源 2：訂閱 × 方案分級
  const { data: subs } = await admin
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .in("status", ["active", "cancelling"])
    .gt("expires_at", nowIso);

  if (subs && subs.length > 0) {
    const { data: planRows } = await admin
      .from("course_plan_access")
      .select("plan")
      .eq("course_id", courseId);

    const allowed = new Set((planRows ?? []).map((r) => r.plan as string));
    if (subs.some((s) => allowed.has(s.plan as string))) {
      return { canWatch: true, reason: "subscription" };
    }
  }

  return { canWatch: false, reason: "denied" };
}
