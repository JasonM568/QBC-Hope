import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import V2PointsBanner from "@/components/v2-points-banner";
import Link from "next/link";
import {
  computeCompletion,
  findRecoverableMiss,
  rateTone,
} from "@/lib/plan/completion";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, plan_start_date, plan_round")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.user_metadata?.display_name || user.email;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
  const planStartDate = profile?.plan_start_date || null;
  const planRound = profile?.plan_round || 1;

  // Check if today's daily report exists
  const { data: todayReport } = await supabase
    .from("daily_reports")
    .select("id")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .single();

  // Get current round daily report count (only count from plan_start_date)
  let totalReportsQuery = supabase
    .from("daily_reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (planStartDate) {
    totalReportsQuery = totalReportsQuery.gte("report_date", planStartDate);
  }
  const { count: totalReports } = await totalReportsQuery;

  // Get streak (consecutive days) — only within current round
  let streakQuery = supabase
    .from("daily_reports")
    .select("report_date")
    .eq("user_id", user.id)
    .order("report_date", { ascending: false })
    .limit(30);
  if (planStartDate) {
    streakQuery = streakQuery.gte("report_date", planStartDate);
  }
  const { data: recentReports } = await streakQuery;

  // 計算連續打卡（用台灣時區的純日期字串比對，避免 server UTC 時區誤差）
  let streak = 0;
  if (recentReports && recentReports.length > 0) {
    const dates = new Set(recentReports.map((r) => r.report_date));
    // 從今天往前推
    const [y, m, d] = today.split("-").map(Number);
    const baseUTC = Date.UTC(y, m - 1, d);
    for (let i = 0; i < 30; i++) {
      const t = new Date(baseUTC - i * 86400000);
      const ds = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
      if (dates.has(ds)) {
        streak++;
      } else {
        break;
      }
    }
  }

  // 本輪達成率（分子分母都只算到昨天；今天還沒過完不列入分母）
  const roundDates = (recentReports ?? []).map((r) => r.report_date);
  const completion = planStartDate
    ? computeCompletion(planStartDate, today, roundDates)
    : null;

  // 漏填提醒：昨天空著，而且只剩今天能補
  const missedYesterday = findRecoverableMiss(planStartDate, today, roundDates);

  // 歷屆輪程（達成率在封存時已定格）
  const { data: archivedRounds } = await supabase
    .from("plan_rounds")
    .select("round_number, start_date, end_date, completed_days, completion_rate")
    .eq("user_id", user.id)
    .eq("status", "archived")
    .order("round_number", { ascending: false })
    .limit(12);

  // Get recent coach feedback
  const { data: coachFeedback } = await supabase
    .from("coach_notes")
    .select("id, content, note_type, created_at, coach_id, profiles!coach_notes_coach_id_fkey(display_name)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get current point balance (新註冊 trigger 會建一筆；舊用戶會在 SQL migration 補 0）
  const { data: balanceRow } = await supabase
    .from("point_balances")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();
  const pointBalance = balanceRow?.balance ?? 0;

  return (
    <div className="min-h-screen">
      <Navbar userName={displayName} userRole={profile?.role} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* v2 點數規則一次性公告 */}
        <V2PointsBanner />

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            歡迎回來，<span className="text-gold">{displayName}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {today}
          </p>
        </div>

        {/* 漏填提醒：昨天沒填，只剩今天能補 */}
        {missedYesterday && (
          <div className="mb-8 p-4 rounded-xl border border-yellow-400/40 bg-yellow-400/5">
            <p className="text-sm font-semibold text-yellow-400">
              昨天（{missedYesterday}）的日報還沒填
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              補填期限只到今天結束。過了今天，這一天就補不回來，會計入本輪達成率的缺漏。
            </p>
            <Link
              href="/forms/daily"
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-yellow-400 text-black text-sm font-semibold hover:bg-yellow-300 transition-colors"
            >
              立即補填
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground text-sm">
              {planStartDate ? `第 ${planRound} 輪累計` : "累計天數"}
            </p>
            <p className="text-3xl font-bold text-gold mt-1">{totalReports || 0}<span className="text-base font-normal text-muted-foreground"> / 21 天</span></p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground text-sm">本輪達成率</p>
            {completion && completion.rate !== null ? (
              <>
                <p className={`text-3xl font-bold mt-1 ${rateTone(completion.rate)}`}>
                  {completion.rate}<span className="text-base font-normal">%</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completion.completed}/{completion.expected} 天
                  {completion.missed > 0 && `・缺 ${completion.missed} 天`}
                  {!completion.isFinished && "・統計至昨日"}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-muted-foreground mt-1">—</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {planStartDate ? "今天是 Day 1，明天開始統計" : "尚未啟動計畫"}
                </p>
              </>
            )}
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground text-sm">連續打卡</p>
            <p className="text-3xl font-bold text-gold mt-1">{streak} 天</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground text-sm">今日狀態</p>
            <p className="text-3xl font-bold mt-1">
              {todayReport ? (
                <span className="text-green-400">已完成</span>
              ) : (
                <span className="text-yellow-400">待填寫</span>
              )}
            </p>
          </div>
        </div>

        {/* 量子能量牌卡入口 + 點數存摺 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/oracle"
            className="block p-5 rounded-xl border border-gold/40 bg-gradient-to-r from-card via-gold/5 to-card card-hover group"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gold group-hover:text-gold/90 transition-colors">
                  ✦ 量子能量牌卡抽牌 ✦
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  AI 結合量子思維與你的日報，為今天的提問做能量解讀
                </p>
              </div>
              <span className="text-gold/60 group-hover:text-gold transition text-xl shrink-0">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/points"
            className="block p-5 rounded-xl border border-gold/40 bg-gradient-to-r from-card via-gold/5 to-card card-hover group"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gold group-hover:text-gold/90 transition-colors">
                  ✦ 點數存摺 ✦
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  抽牌 −2 點｜提交日報 +2 點｜訂閱可加 20 點
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-gold">{pointBalance}</p>
                <p className="text-xs text-muted-foreground">點</p>
              </div>
            </div>
          </Link>
        </div>

        {/* 歷屆 21 天 */}
        {archivedRounds && archivedRounds.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">歷屆 21 天</h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {archivedRounds.map((r) => (
                <div key={r.round_number} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">第 {r.round_number} 輪</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.start_date} ~ {r.end_date}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-bold ${rateTone(Number(r.completion_rate))}`}>
                      {Number(r.completion_rate)}<span className="text-sm font-normal">%</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.completed_days}/21 天
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Five Engines */}
        <h2 className="text-lg font-semibold mt-6 mb-4">五大引擎</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/forms/daily" className="p-5 rounded-xl border border-border bg-card card-hover group">
            <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">21天行動日報表</h3>
            <p className="text-muted-foreground text-sm mt-1">{todayReport ? "今日已完成" : "每日八大 PART"}</p>
          </Link>
          <Link href="/forms/capital" className="p-5 rounded-xl border border-border bg-card card-hover group">
            <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">人生資本盤點表</h3>
            <p className="text-muted-foreground text-sm mt-1">四種資本評分</p>
          </Link>
          <Link href="/forms/strategy" className="p-5 rounded-xl border border-border bg-card card-hover group">
            <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">個人戰略定位</h3>
            <p className="text-muted-foreground text-sm mt-1">優勢 → 戰場 → 定位</p>
          </Link>
          <Link href="/forms/monthly" className="p-5 rounded-xl border border-border bg-card card-hover group">
            <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">五域平衡月報</h3>
            <p className="text-muted-foreground text-sm mt-1">每月五域評分與反思</p>
          </Link>
          <Link href="/forms/weekly" className="p-5 rounded-xl border border-border bg-card card-hover group">
            <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">利他影響力週報</h3>
            <p className="text-muted-foreground text-sm mt-1">分享 / 幫助 / 引薦</p>
          </Link>
          <Link href="/history" className="p-5 rounded-xl border border-gold/30 bg-card card-hover group">
            <h3 className="font-semibold text-gold">成長曲線</h3>
            <p className="text-muted-foreground text-sm mt-1">雷達圖與趨勢分析</p>
          </Link>
        </div>

        {/* Coach Feedback */}
        {coachFeedback && coachFeedback.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">教練回饋</h2>
            <div className="space-y-3">
              {coachFeedback.map((note: { id: string; content: string; note_type: string; created_at: string; profiles: { display_name: string }[] }) => (
                <div key={note.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        note.note_type === "alert"
                          ? "bg-red-400/10 text-red-400"
                          : note.note_type === "memo"
                          ? "bg-blue-400/10 text-blue-400"
                          : "bg-gold/10 text-gold"
                      }`}>
                        {note.note_type === "alert" ? "提醒" : note.note_type === "memo" ? "備忘" : "回饋"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        來自 {note.profiles?.[0]?.display_name || "教練"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString("zh-TW")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community */}
        <Link href="/community" className="block mt-6 p-5 rounded-xl border border-border bg-card card-hover group">
          <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">社群打卡牆</h3>
          <p className="text-muted-foreground text-sm mt-1">看看夥伴們的進度，互相激勵</p>
        </Link>
      </main>
    </div>
  );
}
