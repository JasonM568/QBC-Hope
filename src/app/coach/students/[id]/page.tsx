import { requireRole } from "@/lib/auth-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import CoachNoteForm from "./coach-note-form";
import PlanResetForm from "./plan-reset-form";
import AdvancedToggle from "./advanced-toggle";
import StudentNameForm from "./student-name-form";
import DailyReportCard from "./daily-report-card";
import { WeeklyCard, MonthlyCard, CapitalCard, StrategyCard } from "./form-cards";

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, profile, supabase } = await requireRole(["coach", "admin", "master", "tester"]);
  const studentId = params.id;
  const isMaster = profile.role === "master" || profile.role === "admin" || profile.role === "tester";

  // Verify access: master/admin can see any student, coach only their own
  const studentQuery = supabase
    .from("profiles")
    .select("id, display_name, email, created_at, plan_start_date, plan_round, advanced_modules_enabled")
    .eq("id", studentId);

  if (!isMaster) {
    studentQuery.eq("coach_id", user.id);
  }

  const { data: student } = await studentQuery.single();

  if (!student) {
    return (
      <div className="min-h-screen">
        <Navbar userName={profile.display_name} userRole={profile.role} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">找不到此學員或你沒有權限查看</p>
          <Link href="/coach" className="text-gold hover:underline mt-4 inline-block">返回教練總覽</Link>
        </main>
      </div>
    );
  }

  // Use service role client for admin/master to bypass RLS
  const reportClient = isMaster ? createServiceRoleClient() : supabase;

  // Get recent daily reports
  const { data: dailyReports } = await reportClient
    .from("daily_reports")
    .select("*")
    .eq("user_id", studentId)
    .order("report_date", { ascending: false })
    .limit(7);

  // Get latest monthly report
  const { data: latestMonthly } = await reportClient
    .from("monthly_reports")
    .select("*")
    .eq("user_id", studentId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1);

  // Get recent weekly altruism
  const { data: weeklyReports } = await reportClient
    .from("weekly_altruism")
    .select("*")
    .eq("user_id", studentId)
    .order("year", { ascending: false })
    .order("week_number", { ascending: false })
    .limit(5);

  // Get recent capital inventories
  const { data: capitalReports } = await reportClient
    .from("capital_inventories")
    .select("*")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(3);

  // Get recent strategic positions
  const { data: strategyReports } = await reportClient
    .from("strategic_positions")
    .select("*")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(3);

  // Get total report count
  const { count: totalReports } = await reportClient
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
  const weekly = weeklyReports?.[0];

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
          <StudentNameForm
            studentId={studentId}
            currentName={student.display_name || ""}
          />
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
          <div className="mt-3">
            <AdvancedToggle
              studentId={studentId}
              initialEnabled={student.advanced_modules_enabled || false}
            />
          </div>
        </div>

        {/* 提交狀態總覽 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "週報", has: weeklyReports && weeklyReports.length > 0 },
            { label: "月報", has: latestMonthly && latestMonthly.length > 0 },
            { label: "資本盤點", has: capitalReports && capitalReports.length > 0 },
            { label: "戰略定位", has: strategyReports && strategyReports.length > 0 },
          ].map((item) => (
            <div key={item.label} className={`p-3 rounded-xl border text-center ${item.has ? "border-gold/30 bg-gold/5" : "border-border bg-card"}`}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-sm font-semibold mt-1 ${item.has ? "text-gold" : "text-red-400"}`}>
                {item.has ? "已提交" : "未提交"}
              </p>
            </div>
          ))}
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
                  <DailyReportCard key={r.id} report={r} />
                ))}
              </div>
            )}
          </div>

          {/* Coach Notes */}
          <div>
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

        {/* 週報 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">利他週報</h2>
          {!weeklyReports || weeklyReports.length === 0 ? (
            <div className="p-6 rounded-xl border border-border bg-card">
              <p className="text-muted-foreground text-sm">尚無週報記錄</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {weeklyReports.map((r) => (
                <WeeklyCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>

        {/* 月報 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">五域平衡月報</h2>
          {!latestMonthly || latestMonthly.length === 0 ? (
            <div className="p-6 rounded-xl border border-border bg-card">
              <p className="text-muted-foreground text-sm">尚無月報記錄</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {latestMonthly.map((r) => (
                <MonthlyCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>

        {/* 資本盤點 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">人生資本盤點</h2>
          {!capitalReports || capitalReports.length === 0 ? (
            <div className="p-6 rounded-xl border border-border bg-card">
              <p className="text-muted-foreground text-sm">尚無資本盤點記錄</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {capitalReports.map((r) => (
                <CapitalCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>

        {/* 戰略定位 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">個人戰略定位</h2>
          {!strategyReports || strategyReports.length === 0 ? (
            <div className="p-6 rounded-xl border border-border bg-card">
              <p className="text-muted-foreground text-sm">尚無戰略定位記錄</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {strategyReports.map((r) => (
                <StrategyCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
