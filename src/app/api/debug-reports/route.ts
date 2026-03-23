import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) || "NOT SET";

  const now = new Date();
  const taiwanDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const today = taiwanDate.toISOString().split("T")[0];

  if (!hasKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set", hasKey, keyPrefix });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: reports, error } = await supabase
    .from("daily_reports")
    .select("user_id")
    .eq("report_date", today);

  return NextResponse.json({
    hasKey,
    keyPrefix,
    today,
    reportsCount: reports?.length || 0,
    error: error?.message || null,
  });
}
