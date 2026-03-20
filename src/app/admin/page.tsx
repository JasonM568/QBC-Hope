import { requireRole } from "@/lib/auth-guard";
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

  // Load pending deletion requests (admin sees all, master sees own)
  const { data: deletionRequests } = await supabase
    .from("deletion_requests")
    .select("*, requester:profiles!deletion_requests_requester_id_fkey(display_name), target:profiles!deletion_requests_target_user_id_fkey(display_name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name} userRole={viewerRole} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {viewerRole === "admin" ? "管理員後台" : "管理後台"}
        </h1>
        <AdminPanel
          users={users || []}
          coaches={coaches}
          currentUserId={user.id}
          viewerRole={viewerRole}
          deletionRequests={deletionRequests || []}
        />
      </main>
    </div>
  );
}
