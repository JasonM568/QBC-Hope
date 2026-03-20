import { requireRole } from "@/lib/auth-guard";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";

export default async function CoachDashboard() {
  const { user, profile, supabase } = await requireRole(["coach", "admin"]);

  // Get assigned students
  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name, email, created_at")
    .eq("coach_id", user.id)
    .order("display_name");

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Get today's report status for each student
  const studentIds = students?.map((s) => s.id) || [];

  const { data: todayReports } = studentIds.length > 0
    ? await supabase
        .from("daily_reports")
        .select("user_id")
        .in("user_id", studentIds)
        .eq("report_date", today)
    : { data: [] };

  const reportedToday = new Set(todayReports?.map((r) => r.user_id) || []);

  // Get total report counts per student
  const { data: reportCounts } = studentIds.length > 0
    ? await supabase
        .from("daily_reports")
        .select("user_id")
        .in("user_id", studentIds)
    : { data: [] };

  const countMap: Record<string, number> = {};
  reportCounts?.forEach((r) => {
    countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
  });

  // Get recent notes count
  const { count: notesCount } = await supabase
    .from("coach_notes")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user.id);

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            教練總覽
          </h1>
          <p className="text-muted-foreground mt-1">管理你的學員進度</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

        {/* Student List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">學員列表</h2>
          <Link
            href="/coach/notes"
            className="text-sm text-gold hover:underline"
          >
            查看所有筆記
          </Link>
        </div>

        {!students || students.length === 0 ? (
          <div className="p-8 rounded-xl border border-border bg-card text-center">
            <p className="text-muted-foreground">目前沒有指派的學員</p>
            <p className="text-muted-foreground text-sm mt-1">請聯繫管理員指派學員</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/coach/students/${student.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card card-hover"
              >
                <div>
                  <p className="font-semibold">{student.display_name || "未設定名稱"}</p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-muted-foreground">累計天數</p>
                    <p className="font-semibold text-gold">{countMap[student.id] || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">今日</p>
                    <p className={`font-semibold ${reportedToday.has(student.id) ? "text-green-400" : "text-yellow-400"}`}>
                      {reportedToday.has(student.id) ? "已填" : "未填"}
                    </p>
                  </div>
                  <span className="text-muted-foreground ml-2">&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
