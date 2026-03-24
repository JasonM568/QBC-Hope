import { requireRole } from "@/lib/auth-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import CoachList from "./coach-list";
import WeeklyReportSummary from "./weekly-report-summary";

export default async function CoachDashboard() {
  const { user, profile, supabase } = await requireRole(["coach", "admin", "master", "tester"]);

  const isMaster = profile.role === "master" || profile.role === "admin" || profile.role === "tester";

  // Master/admin sees all students, coach sees only assigned
  const studentsQuery = supabase
    .from("profiles")
    .select("id, display_name, email, created_at, coach_id")
    .eq("role", "student")
    .order("display_name");

  if (!isMaster) {
    studentsQuery.eq("coach_id", user.id);
  }

  const { data: students } = await studentsQuery;

  // Get today's date (Taiwan time UTC+8)
  const now = new Date();
  const taiwanDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const today = taiwanDate.toISOString().split("T")[0];

  // Use service role client for report queries to bypass RLS
  const reportClient = isMaster ? createServiceRoleClient() : supabase;

  // Get today's report status for each student
  const studentIds = students?.map((s) => s.id) || [];

  const { data: todayReports } = studentIds.length > 0
    ? await reportClient
        .from("daily_reports")
        .select("user_id")
        .in("user_id", studentIds)
        .eq("report_date", today)
    : { data: [] };

  const reportedToday = new Set(todayReports?.map((r) => r.user_id) || []);

  // Get total report counts per student
  const { data: reportCounts } = studentIds.length > 0
    ? await reportClient
        .from("daily_reports")
        .select("user_id")
        .in("user_id", studentIds)
    : { data: [] };

  const countMap: Record<string, number> = {};
  reportCounts?.forEach((r) => {
    countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
  });

  // Get recent 7 days report data
  const recentDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(taiwanDate.getTime() - i * 24 * 60 * 60 * 1000);
    const ds = d.toISOString().split("T")[0];
    if (ds >= "2026-03-23") recentDays.push(ds);
  }

  const { data: recentReports } = studentIds.length > 0 && recentDays.length > 0
    ? await reportClient
        .from("daily_reports")
        .select("user_id, report_date")
        .in("user_id", studentIds)
        .in("report_date", recentDays)
    : { data: [] };

  // Build per-day stats
  const recentDayStats = recentDays.map((date) => {
    const dayReports = (recentReports || []).filter((r) => r.report_date === date);
    const submittedIds = dayReports.map((r) => r.user_id);
    const submittedNames = (students || [])
      .filter((s) => submittedIds.includes(s.id))
      .map((s) => s.display_name || "未設定名稱")
      .sort();
    const missingNames = (students || [])
      .filter((s) => !submittedIds.includes(s.id))
      .map((s) => s.display_name || "未設定名稱")
      .sort();
    return {
      date,
      submitted: submittedIds.length,
      missing: (students?.length || 0) - submittedIds.length,
      total: students?.length || 0,
      submittedNames,
      missingNames,
    };
  });

  // Get coach list and names for master view
  const coachMap: Record<string, string> = {};
  let coachList: { id: string; display_name: string; email: string; created_at: string }[] = [];
  if (isMaster) {
    const { data: coaches } = await supabase
      .from("profiles")
      .select("id, display_name, email, created_at")
      .eq("role", "coach")
      .order("display_name");
    if (coaches) {
      coachList = coaches;
      coaches.forEach((c) => { coachMap[c.id] = c.display_name || "未設定"; });
    }
    // Also map coaches from student assignments
    if (students && students.length > 0) {
      const assignedCoachIds = Array.from(new Set(students.map((s) => s.coach_id).filter(Boolean)));
      for (const cid of assignedCoachIds) {
        if (!coachMap[cid]) {
          const match = coachList.find((c) => c.id === cid);
          if (match) coachMap[cid] = match.display_name || "未設定";
        }
      }
    }
  }

  // Get recent notes count
  const notesQuery = supabase
    .from("coach_notes")
    .select("*", { count: "exact", head: true });
  if (!isMaster) {
    notesQuery.eq("coach_id", user.id);
  }
  const { count: notesCount } = await notesQuery;

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name} userRole={profile.role} />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            {isMaster ? "總教練總覽" : "教練總覽"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isMaster ? "查看所有教練與學員的資料" : "管理你的學員進度"}
          </p>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-1 ${isMaster ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4 mb-8`}>
          {isMaster && (
            <div className="p-6 rounded-xl border border-border bg-card">
              <p className="text-muted-foreground text-sm">教練人數</p>
              <p className="text-3xl font-bold text-gold mt-1">{coachList.length}</p>
            </div>
          )}
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground text-sm">學員人數</p>
            <p className="text-3xl font-bold text-gold mt-1">{students?.length || 0}</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground text-sm">今日已填報</p>
            <p className="text-3xl font-bold mt-1">
              <span className="text-green-400">{reportedToday.size}</span>
              <span className="text-muted-foreground text-lg"> / {students?.length || 0}</span>
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-muted-foreground text-sm">回饋筆記</p>
            <p className="text-3xl font-bold text-gold mt-1">{notesCount || 0}</p>
          </div>
        </div>

        {/* Daily Report Detail */}
        <div className="mb-8 p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">今日日報繳交狀況（{today}）</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">總學員</p>
              <p className="text-2xl font-bold text-gold">{students?.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm">已繳交</p>
              <p className="text-2xl font-bold text-green-400">{reportedToday.size}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm">未繳交</p>
              <p className="text-2xl font-bold text-red-400">{(students?.length || 0) - reportedToday.size}</p>
            </div>
          </div>
          {reportedToday.size > 0 && reportedToday.size < (students?.length || 0) && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-green-400 font-medium mb-1">✅ 已繳交（{reportedToday.size} 人）</p>
                <p className="text-sm text-foreground/80">
                  {students?.filter((s) => reportedToday.has(s.id)).map((s) => s.display_name || "未設定名稱").sort().join("、")}
                </p>
              </div>
              <div>
                <p className="text-sm text-red-400 font-medium mb-1">❌ 未繳交（{(students?.length || 0) - reportedToday.size} 人）</p>
                <p className="text-sm text-foreground/80">
                  {students?.filter((s) => !reportedToday.has(s.id)).map((s) => s.display_name || "未設定名稱").sort().join("、")}
                </p>
              </div>
            </div>
          )}
          {reportedToday.size === (students?.length || 0) && (students?.length || 0) > 0 && (
            <p className="text-green-400 font-medium text-center">🎉 今天全員都已繳交！</p>
          )}
          {reportedToday.size === 0 && (students?.length || 0) > 0 && (
            <div>
              <p className="text-sm text-red-400 font-medium mb-1">❌ 未繳交（{students?.length || 0} 人）</p>
              <p className="text-sm text-foreground/80">
                {students?.map((s) => s.display_name || "未設定名稱").sort().join("、")}
              </p>
            </div>
          )}
        </div>

        {/* Weekly Report Summary */}
        <WeeklyReportSummary days={recentDayStats} today={today} />

        <CoachList
          students={students || []}
          coachList={coachList}
          coachMap={coachMap}
          countMap={countMap}
          reportedToday={Array.from(reportedToday)}
          isMaster={isMaster}
        />
      </main>
    </div>
  );
}
