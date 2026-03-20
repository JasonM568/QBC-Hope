import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const displayName = user.user_metadata?.display_name || user.email;
  const today = new Date().toISOString().split("T")[0];

  // Check if today's daily report exists
  const { data: todayReport } = await supabase
    .from("daily_reports")
    .select("id")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .single();

  // Get total daily report count
  const { count: totalReports } = await supabase
    .from("daily_reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get streak (consecutive days)
  const { data: recentReports } = await supabase
    .from("daily_reports")
    .select("report_date")
    .eq("user_id", user.id)
    .order("report_date", { ascending: false })
    .limit(30);

  let streak = 0;
  if (recentReports && recentReports.length > 0) {
    const dates = recentReports.map((r) => r.report_date);
    const checkDate = new Date();
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(checkDate);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split("T")[0];
      if (dates.includes(expectedStr)) {
        streak++;
      } else {
        break;
      }
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={displayName} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            歡迎回來，<span className="text-gold">{displayName}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {today}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground text-sm">累計天數</p>
            <p className="text-3xl font-bold text-gold mt-1">{totalReports || 0}</p>
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

        {/* Five Engines */}
        <h2 className="text-lg font-semibold mt-2 mb-4">五大引擎</h2>
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

        {/* Community */}
        <Link href="/community" className="block mt-6 p-5 rounded-xl border border-border bg-card card-hover group">
          <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">社群打卡牆</h3>
          <p className="text-muted-foreground text-sm mt-1">看看夥伴們的進度，互相激勵</p>
        </Link>
      </main>
    </div>
  );
}
