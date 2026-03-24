import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Verify the requester is admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "master", "tester"].includes(profile.role)) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { userId, display_name, nickname } = await request.json();
  if (!userId || !display_name) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  // Use service role to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const updateData: Record<string, string> = {
    display_name,
    updated_at: new Date().toISOString(),
  };
  if (nickname) {
    updateData.nickname = nickname;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
