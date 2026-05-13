import { requireRole } from "@/lib/auth-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import AdminPointsPanel from "./admin-points-panel";

export const dynamic = "force-dynamic";

export default async function AdminPointsPage() {
  const { user, profile } = await requireRole(["admin", "master"]);

  const admin = createServiceRoleClient();

  // 取所有成員 + 點數餘額（含 admin / master / tester，方便管理員調整內部帳號）
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, email, role")
    .in("role", ["student", "coach", "admin", "master", "tester"])
    .order("created_at", { ascending: false });

  const ids = (profiles ?? []).map((p) => p.id);
  const { data: balances } = ids.length
    ? await admin
        .from("point_balances")
        .select("user_id, balance, updated_at")
        .in("user_id", ids)
    : { data: [] };

  const balanceMap = new Map(
    (balances ?? []).map((b) => [b.user_id, b.balance])
  );

  const students = (profiles ?? []).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    email: p.email,
    role: p.role,
    balance: balanceMap.get(p.id) ?? 0,
  }));

  // 最近 30 筆異動（全平台）
  const { data: recentTxs } = await admin
    .from("point_transactions")
    .select("id, user_id, type, amount, balance_after, note, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const txWithNames = (recentTxs ?? []).map((t) => ({
    ...t,
    display_name:
      students.find((s) => s.id === t.user_id)?.display_name ?? "(未知)",
  }));

  return (
    <div className="min-h-screen">
      <Navbar
        userName={profile.display_name || user.email || ""}
        userRole={profile.role}
      />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">點數管理</h1>
          <p className="text-sm text-muted-foreground">
            每月訂閱付款後在這裡幫成員加 20 點（type = admin_adjust），所有異動寫入流水可追溯。
          </p>
        </header>

        <AdminPointsPanel students={students} />

        {/* 最近異動 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">最近 30 筆異動（全平台）</h2>
          {txWithNames.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">尚無異動紀錄</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {txWithNames.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.type}
                      {t.note && ` · ${t.note}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("zh-TW", {
                        timeZone: "Asia/Taipei",
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={
                        t.amount > 0
                          ? "text-green-400 font-semibold"
                          : "text-red-400 font-semibold"
                      }
                    >
                      {t.amount > 0 ? "+" : ""}
                      {t.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      餘 {t.balance_after}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
