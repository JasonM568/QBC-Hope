import { requireRole } from "@/lib/auth-guard";
import Navbar from "@/components/layout/navbar";
import AdminPanel from "./admin-panel";

export default async function AdminPage() {
  const { profile, supabase } = await requireRole(["admin"]);

  const { data: users } = await supabase
    .from("profiles")
    .select("id, display_name, email, role, coach_id, created_at")
    .order("created_at", { ascending: false });

  const coaches = users?.filter((u) => u.role === "coach" || u.role === "admin") || [];

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name} userRole="admin" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">管理員後台</h1>
        <AdminPanel users={users || []} coaches={coaches} />
      </main>
    </div>
  );
}
