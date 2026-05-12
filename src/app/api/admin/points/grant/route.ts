import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RequestBody {
  user_id: string;
  amount: number;
  note?: string;
}

/**
 * 管理員加值點數
 *   - 限 admin / master
 *   - amount 可正可負（負數=扣回），但不為 0
 *   - 透過 SECURITY DEFINER 的 grant_points RPC 寫入流水
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "master"].includes(profile.role)) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { user_id, amount, note } = body;
  if (!user_id || typeof amount !== "number" || amount === 0) {
    return NextResponse.json(
      { error: "user_id 必填，amount 不可為 0" },
      { status: 400 }
    );
  }

  // 用 service role 呼叫 RPC，避免 RLS 干擾
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("grant_points", {
    p_user_id: user_id,
    p_amount: amount,
    p_type: "admin_adjust",
    p_note: note ?? null,
    p_reference_id: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ balance_after: data });
}
