import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";

interface PointTx {
  id: string;
  type: "signup_bonus" | "daily_report" | "oracle_draw" | "admin_adjust";
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}

const TYPE_META: Record<
  PointTx["type"],
  { label: string; tone: "earn" | "spend" }
> = {
  signup_bonus: { label: "新註冊體驗額度", tone: "earn" },
  daily_report: { label: "提交日報", tone: "earn" },
  admin_adjust: { label: "管理員加值", tone: "earn" },
  oracle_draw: { label: "牌卡抽牌", tone: "spend" },
};

export default async function PointsPage() {
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

  const { data: balanceRow } = await supabase
    .from("point_balances")
    .select("balance, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const balance = balanceRow?.balance ?? 0;

  const { data: txs } = await supabase
    .from("point_transactions")
    .select("id, type, amount, balance_after, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const transactions = (txs ?? []) as PointTx[];

  // 統計
  const totalEarned = transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalSpent = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen">
      <Navbar
        userName={profile?.display_name || user.email || ""}
        userRole={profile?.role}
      />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gold-gradient">點數存摺</h1>
          <p className="text-sm text-muted-foreground">
            抽牌 −2 點｜提交日報 +2 點｜每月訂閱可由管理員加 20 點
          </p>
        </header>

        {/* 餘額卡片 */}
        <section className="rounded-xl border border-gold/40 bg-gradient-to-r from-card via-gold/5 to-card p-8 text-center">
          <p className="text-sm text-muted-foreground">目前餘額</p>
          <p className="text-6xl font-bold text-gold mt-2">{balance}</p>
          <p className="text-sm text-muted-foreground mt-1">點</p>
          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <p className="text-muted-foreground">累計獲得</p>
              <p className="text-lg font-semibold text-green-400">
                +{totalEarned}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">累計使用</p>
              <p className="text-lg font-semibold text-red-400">
                −{totalSpent}
              </p>
            </div>
          </div>
        </section>

        <div className="flex gap-3 justify-center">
          <Link
            href="/oracle"
            className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-black hover:bg-gold/90 transition"
          >
            去抽牌
          </Link>
          <Link
            href="/forms/daily"
            className="rounded-md border border-gold/50 bg-card px-4 py-2 text-sm text-gold hover:bg-gold/10 transition"
          >
            去寫日報
          </Link>
        </div>

        {/* 流水紀錄 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">收支明細</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              還沒有任何紀錄
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {transactions.map((t) => {
                const meta = TYPE_META[t.type];
                const isEarn = t.amount > 0;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            meta?.tone === "spend"
                              ? "bg-red-400/10 text-red-400"
                              : "bg-green-400/10 text-green-400"
                          }`}
                        >
                          {meta?.label ?? t.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("zh-TW", {
                            timeZone: "Asia/Taipei",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {t.note && (
                        <p className="text-sm text-foreground/80 mt-1 truncate">
                          {t.note}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-lg font-semibold ${
                          isEarn ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isEarn ? "+" : ""}
                        {t.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        餘 {t.balance_after}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
