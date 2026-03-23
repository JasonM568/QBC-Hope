import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  // Verify coach/admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["coach", "admin", "master"].includes(profile.role)) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { studentId, updates } = await request.json();
  if (!studentId || !updates) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  // Verify this student is assigned to this coach (skip for admin)
  if (profile.role === "coach") {
    const { data: student } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", studentId)
      .eq("coach_id", user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "此學員不屬於你" }, { status: 403 });
    }
  }

  // Use service role to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Only allow specific fields to be updated
  const allowedFields = ["plan_start_date", "plan_round", "display_name", "nickname"];
  const safeUpdates: Record<string, unknown> = {};
  for (const key of Object.keys(updates)) {
    if (allowedFields.includes(key)) {
      safeUpdates[key] = updates[key];
    }
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(safeUpdates)
    .eq("id", studentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
