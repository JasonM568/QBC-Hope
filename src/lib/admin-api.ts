import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// API route 共用的 admin 守門：驗證登入 + role ∈ (admin/master)，
// 通過則回傳 { user, admin(service-role client) }；否則回傳 { error: NextResponse }。
//
// 用法：
//   const gate = await requireApiAdmin();
//   if ("error" in gate) return gate.error;
//   const { user, admin } = gate;

export type AdminGate =
  | { error: NextResponse }
  | { user: { id: string }; admin: SupabaseClient };

export async function requireApiAdmin(): Promise<AdminGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "未登入" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "master"].includes(profile.role)) {
    return { error: NextResponse.json({ error: "權限不足" }, { status: 403 }) };
  }

  return { user: { id: user.id }, admin: createServiceRoleClient() };
}
