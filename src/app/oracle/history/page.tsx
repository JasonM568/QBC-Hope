import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";

interface ReadingRow {
  id: string;
  question: string;
  ai_response: string;
  created_at: string;
  card:
    | {
        card_number: number;
        card_name: string;
        card_image_url: string | null;
      }
    | Array<{
        card_number: number;
        card_name: string;
        card_image_url: string | null;
      }>
    | null;
}

const PAGE_SIZE = 30;

export default async function OracleHistoryPage() {
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

  const { data, count } = await supabase
    .from("card_readings")
    .select(
      "id, question, ai_response, created_at, card:oracle_cards(card_number, card_name, card_image_url)",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const readings: ReadingRow[] = (data ?? []) as ReadingRow[];

  return (
    <div className="min-h-screen">
      <Navbar
        userName={profile?.display_name || user.email || ""}
        userRole={profile?.role}
      />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gold-gradient">
              抽牌歷史
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              共 {count ?? 0} 次解讀
            </p>
          </div>
          <Link
            href="/oracle"
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-card transition"
          >
            ← 回牌卡
          </Link>
        </header>

        {readings.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              還沒有抽牌紀錄。回去抽你的第一張牌吧。
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {readings.map((r) => {
              const card = Array.isArray(r.card) ? r.card[0] : r.card;
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <details className="group">
                    <summary className="cursor-pointer list-none flex items-start gap-4">
                      <div className="relative w-16 h-24 shrink-0 rounded overflow-hidden border border-gold/40 bg-background">
                        {card?.card_image_url ? (
                          <Image
                            src={card.card_image_url}
                            alt={card.card_name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gold">
                            #{card?.card_number}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gold">
                            {card?.card_name ?? "—"}
                          </p>
                          <time className="text-xs text-muted-foreground shrink-0">
                            {formatDate(r.created_at)}
                          </time>
                        </div>
                        <p className="text-sm mt-1 line-clamp-2 text-muted-foreground">
                          {r.question}
                        </p>
                        <p className="text-xs text-gold/60 mt-2 group-open:hidden">
                          點擊展開解讀 ↓
                        </p>
                      </div>
                    </summary>
                    <div className="mt-4 pt-4 border-t border-border text-sm leading-relaxed whitespace-pre-wrap">
                      {r.ai_response}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
