import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const body = await request.json();
  const { targetUserId, adminUserId } = body;

  if (!targetUserId || !adminUserId) {
    return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
  }

  // 驗證操作者是 admin
  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", adminUserId)
    .single();

  if (!adminProfile || !["admin", "tester"].includes(adminProfile.role)) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  // 不能刪除自己
  if (targetUserId === adminUserId) {
    return NextResponse.json({ error: "無法刪除自己" }, { status: 400 });
  }

  // 不能刪除其他 admin
  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", targetUserId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "找不到該用戶" }, { status: 404 });
  }

  if (targetProfile.role === "admin") {
    return NextResponse.json({ error: "無法刪除管理員" }, { status: 403 });
  }

  // 1. 刪除 profiles（CASCADE 會自動清除關聯資料）
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", targetUserId);

  if (profileError) {
    return NextResponse.json(
      { error: "刪除 profile 失敗：" + profileError.message },
      { status: 500 }
    );
  }

  // 2. 刪除 auth user
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
    targetUserId
  );

  if (authError) {
    return NextResponse.json(
      { error: "刪除 auth user 失敗：" + authError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
