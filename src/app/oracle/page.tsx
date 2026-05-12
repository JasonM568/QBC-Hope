import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import { isOracleUnlimited } from "@/lib/oracle/access";
import OracleClient from "./OracleClient";

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
        <OracleClient initialBalance={balance} isUnlimited={isUnlimited} />
      </main>
    </div>
  );
}
