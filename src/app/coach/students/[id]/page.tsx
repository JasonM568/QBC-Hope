import { requireRole } from "@/lib/auth-guard";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import CoachNoteForm from "./coach-note-form";
import PlanResetForm from "./plan-reset-form";

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, profile, supabase } = await requireRole(["coach", "admin"]);
  const studentId = params.id;

  // Verify this student is assigned to this coach
  const { data: student } = await supabase
    .from("profiles")
    .select("id, display_name, email, created_at, plan_start_date, plan_round")
    .eq("id", studentId)
    .eq("coach_id", user.id)
    .single();

  if (!student) {
    return (
      <div className="min-h-screen">
        <Navbar userName={profile.display_name} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">找不到此學員或你沒有權限查看</p>
          <Link href="/coach" className="text-gold hover:underline mt-4 inline-block">返回教練總覽</Link>
        </main>
      </div>
    );
  }

  // Get recent daily reports
  const { data: dailyReports } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", studentId)
    .order("report_date", { ascending: false })
    .limit(7);

  // Get latest monthly report
  const { data: latestMonthly } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("user_id", studentId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1);

  // Get latest weekly altruism
  const { data: latestWeekly } = await supabase
    .from("weekly_altruism")
    .select("*")
    .eq("user_id", studentId)
    .order("year", { ascending: false })
    .order("week_number", { ascending: false })
    .limit(1);

  // Get total report count
  const { count: totalReports } = await supabase
    .from("daily_reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", studentId);

  // Get coach notes for this student
  const { data: notes } = await supabase
    .from("coach_notes")
    .select("*")
    .eq("coach_id", user.id)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(10);

  const monthly = latestMonthly?.[0];
  const weekly = latestWeekly?.[0];

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/coach" className="text-sm text-muted-foreground hover:text-gold transition-colors">
            &larr; 返回教練總覽
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            {student.display_name || "未設定名稱"}
          </h1>
          <p className="text-muted-foreground text-sm">{student.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-border bg-card text-center">
            <p className="text-muted-foreground text-xs">累計天數</p>
            <p className="text-2xl font-bold text-gold">{totalReports || 0}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card text-center">
            <p className="text-muted-foreground text-xs">近7天填報</p>
            <p className="text-2xl font-bold text-gold">{dailyReports?.length || 0}</p>
          </div>
          {monthly && (
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <p className="text-muted-foreground text-xs">最新月報</p>
              <p className="text-2xl font-bold text-gold">{monthly.year}/{monthly.month}</p>
            </div>
          )}
          {weekly && (
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <p className="text-muted-foreground text-xs">利他總次數</p>
              <p className="text-2xl font-bold text-gold">
                {(weekly.shares_count || 0) + (weekly.helps_count || 0) + (weekly.referrals_count || 0)}
              </p>
            </div>
          )}
        </div>

        {/* 21天計畫管理 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">21 天行動計畫</h2>
          <PlanResetForm
            studentId={studentId}
            currentStartDate={student.plan_start_date || null}
            currentRound={student.plan_round || 1}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Daily Reports */}
          <div>
            <h2 className="text-lg font-semibold mb-3">近期日報</h2>
            {!dailyReports || dailyReports.length === 0 ? (
              <div className="p-6 rounded-xl border border-border bg-card">
                <p className="text-muted-foreground text-sm">尚無日報記錄</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyReports.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{r.report_date}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-gold">能量 {r.energy_state}</span>
                        <span className="text-blue-400">評分 {r.daily_score}</span>
                        {r.day_number && <span className="text-muted-foreground">第{r.day_number}天</span>}
                      </div>
                    </div>
                    {r.most_important_thing && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">今天最重要的一件事</p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.most_important_thing}</p>
                      </div>
                    )}
                    {r.awareness_improve && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">今日覺察</p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.awareness_improve}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Report Snapshot */}
          <div>
            {monthly && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">
                  最新月報 ({monthly.year}/{monthly.month})
                </h2>
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  {[
                    { label: "事業", score: monthly.career_score },
                    { label: "財富", score: monthly.wealth_score },
                    { label: "健康", score: monthly.health_score },
                    { label: "家庭", score: monthly.family_score },
                    { label: "關係", score: monthly.relation_score },
                  ].map((d) => (
                    <div key={d.label} className="flex items-center gap-3">
                      <span className="text-sm w-12 text-muted-foreground">{d.label}</span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold rounded-full"
                          style={{ width: `${((d.score || 0) / 20) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{d.score}/20</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coach Notes */}
            <h2 className="text-lg font-semibold mb-3">教練筆記</h2>
            <CoachNoteForm coachId={user.id} studentId={studentId} />

            {notes && notes.length > 0 && (
              <div className="mt-4 space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        n.note_type === "alert"
                          ? "bg-red-400/10 text-red-400"
                          : n.note_type === "memo"
                          ? "bg-blue-400/10 text-blue-400"
                          : "bg-gold/10 text-gold"
                      }`}>
                        {n.note_type === "alert" ? "提醒" : n.note_type === "memo" ? "備忘" : "回饋"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
