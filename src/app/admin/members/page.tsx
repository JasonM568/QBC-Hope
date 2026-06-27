import { requireRole } from "@/lib/auth-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import MembersManager, { type Member } from "./members-manager";

export const metadata = { title: "會員管理 | HOPE" };

export default async function MembersPage() {
  const { profile } = await requireRole(["admin", "master", "tester"]);

  // 用 service role 撈全部學員，避免 RLS 漏看
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, email, advanced_modules_enabled, current_streak, created_at")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const members: Member[] = (data ?? []).map((m) => ({
    id: m.id,
    display_name: m.display_name ?? "",
    email: m.email ?? "",
    advanced: m.advanced_modules_enabled === true,
    current_streak: m.current_streak ?? 0,
    created_at: m.created_at ?? "",
  }));

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name} userRole={profile.role as string} />
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">會員管理</h1>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← 回管理後台
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          開通「進階」後，會員才能使用月報、資本盤點、戰略定位。日報、利他週報、量子牌卡為初階會員即可使用。
        </p>
        <MembersManager members={members} />
      </main>
    </div>
  );
}
