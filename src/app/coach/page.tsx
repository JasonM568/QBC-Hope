import { requireRole } from "@/lib/auth-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import CoachList from "./coach-list";

export default async function CoachDashboard() {
  const { user, profile, supabase } = await requireRole(["coach", "admin", "master"]);

  const isMaster = profile.role === "master" || profile.role === "admin";

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
