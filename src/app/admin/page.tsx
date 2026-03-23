import { requireRole } from "@/lib/auth-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import AdminPanel from "./admin-panel";

export default async function AdminPage() {
  const { user, profile, supabase } = await requireRole(["admin", "master"]);

  const viewerRole = profile.role as string;

  // Master only sees students and coaches; Admin sees everyone
  let query = supabase
    .from("profiles")
    .select("id, display_name, email, role, coach_id, created_at")
    .order("created_at", { ascending: false });

  if (viewerRole === "master") {
    query = query.in("role", ["student", "coach"]);
  }

  const { data: users } = await query;

  const coaches = users?.filter((u) => u.role === "coach" || u.role === "admin" || u.role === "master") || [];

  // Get today's daily report stats (Taiwan time UTC+8)
  const now = new Date();
  const taiwanDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const today = taiwanDate.toISOString().split("T")[0];

  const allStudents = users?.filter((u) => u.role === "student") || [];
  const studentIds = allStudents.map((s) => s.id);

  const serviceClient = createServiceRoleClient();

  const { data: todayReports } = studentIds.length > 0
    ? await serviceClient
        .from("daily_reports")
        .select("user_id")
        .in("user_id", studentIds)
        .eq("report_date", today)
    : { data: [] };

  const reportedTodaySet = new Set(todayReports?.map((r) => r.user_id) || []);

  // Load pending deletion requests (admin sees all, master sees own)
  const { data: deletionRequests } = await supabase
    .from("deletion_requests")
    .select("*, requester:profiles!deletion_requests_requester_id_fkey(display_name), target:profiles!deletion_requests_target_user_id_fkey(display_name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name} userRole={viewerRole} />
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-2xl font-bold mb-6">
          {viewerRole === "admin" ? "管理員後台" : "管理後台"}
        </h1>
        <AdminPanel
          users={users || []}
          coaches={coaches}
          currentUserId={user.id}
          viewerRole={viewerRole}
          deletionRequests={deletionRequests || []}
          todayDate={today}
          totalStudents={allStudents.length}
          reportedCount={reportedTodaySet.size}
          reportedTodayIds={Array.from(reportedTodaySet)}
        />
      </main>
    </div>
  );
}
