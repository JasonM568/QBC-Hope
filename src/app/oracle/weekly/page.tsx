import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import { isOracleUnlimited } from "@/lib/oracle/access";
import WeeklyOracleClient from "./WeeklyOracleClient";

const TIMEZONE = "Asia/Taipei";

export default async function OracleWeeklyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  const isUnlimited = isOracleUnlimited(profile?.role);

  // 預覽用：抓 7 天日報數量
  const sevenAgoDateStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const { count: reportCount } = await supabase
    .from("daily_reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("report_date", sevenAgoDateStr);

  const { data: balanceRow } = await supabase
    .from("point_balances")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();
  const balance = balanceRow?.balance ?? 0;

  return (
    <div className="min-h-screen">
      <Navbar
        userName={profile?.display_name || user.email || ""}
        userRole={profile?.role}
      />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <WeeklyOracleClient
          reportCount={reportCount ?? 0}
          initialBalance={balance}
          isUnlimited={isUnlimited}
        />
      </main>
    </div>
  );
}
