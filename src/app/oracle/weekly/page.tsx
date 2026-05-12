import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import { isOracleUnlimited } from "@/lib/oracle/access";
import WeeklyOracleClient, {
  type ExistingWeeklyReading,
} from "./WeeklyOracleClient";

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

  // 學員：預查本週是否已抽（過去 7 天有沒有 weekly 紀錄）
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString();

  const { data: existing } = isUnlimited
    ? { data: null }
    : await supabase
        .from("card_readings")
        .select(
          "id, ai_response, created_at, card:oracle_cards(id, card_number, card_name, card_message, card_image_url, keywords)"
        )
        .eq("user_id", user.id)
        .eq("reading_type", "weekly")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const normalized: ExistingWeeklyReading | null = existing
    ? {
        ...existing,
        card: Array.isArray(existing.card) ? existing.card[0] : existing.card,
      }
    : null;

  // 預覽用：抓 7 天日報數量
  const sevenAgoDateStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const { count: reportCount } = await supabase
    .from("daily_reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("report_date", sevenAgoDateStr);

  return (
    <div className="min-h-screen">
      <Navbar
        userName={profile?.display_name || user.email || ""}
        userRole={profile?.role}
      />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <WeeklyOracleClient
          initialReading={normalized}
          reportCount={reportCount ?? 0}
        />
      </main>
    </div>
  );
}
