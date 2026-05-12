import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import { isOracleUnlimited } from "@/lib/oracle/access";
import OracleClient, { type ExistingReading } from "./OracleClient";

const TIMEZONE = "Asia/Taipei";

export default async function OraclePage() {
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

  // admin / master / tester 免每日限制：跳過預查，永遠進可抽狀態
  // 一般學員：預查當天是否已抽
  const todayLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
  }).format(new Date());
  const dayStart = new Date(`${todayLocal}T00:00:00+08:00`).toISOString();
  const dayEnd = new Date(`${todayLocal}T23:59:59.999+08:00`).toISOString();

  const { data: existingReading } = isUnlimited
    ? { data: null }
    : await supabase
        .from("card_readings")
        .select(
          "id, question, ai_response, created_at, card:oracle_cards(id, card_number, card_name, card_message, card_image_url, keywords)"
        )
        .eq("user_id", user.id)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  // Supabase 回傳的 card 在 select 巢狀後可能是 array — 統一處理成 single object
  const normalized: ExistingReading | null = existingReading
    ? {
        ...existingReading,
        card: Array.isArray(existingReading.card)
          ? existingReading.card[0]
          : existingReading.card,
      }
    : null;

  return (
    <div className="min-h-screen">
      <Navbar
        userName={profile?.display_name || user.email || ""}
        userRole={profile?.role}
      />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <OracleClient initialReading={normalized} />
      </main>
    </div>
  );
}
