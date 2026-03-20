"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
interface User {
  id: string;
  display_name: string;
  email: string;
  role: string;
  coach_id: string | null;
  created_at: string;
}

export default function AdminPanel({
  users,
  coaches,
}: {
  users: User[];
  coaches: User[];
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  async function updateRole(userId: string, newRole: string) {
    setUpdating(userId);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    setUpdating(null);
    router.refresh();
  }

  async function assignCoach(studentId: string, coachId: string | null) {
    setUpdating(studentId);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ coach_id: coachId || null })
      .eq("id", studentId);
    setUpdating(null);
    router.refresh();
  }

  const roleLabels: Record<string, string> = {
    student: "學員",
    coach: "教練",
    admin: "管理員",
  };

  const roleColors: Record<string, string> = {
    student: "bg-blue-400/10 text-blue-400",
    coach: "bg-gold/10 text-gold",
    admin: "bg-purple-400/10 text-purple-400",
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-muted-foreground text-sm">總用戶</p>
          <p className="text-2xl font-bold text-gold">{users.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-muted-foreground text-sm">教練</p>
          <p className="text-2xl font-bold text-gold">{coaches.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-muted-foreground text-sm">學員</p>
          <p className="text-2xl font-bold text-gold">
            {users.filter((u) => u.role === "student").length}
          </p>
        </div>
      </div>

      {/* User List */}
      <h2 className="text-lg font-semibold mb-4">用戶管理</h2>
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 rounded-xl border border-border bg-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{user.display_name || "未設定"}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[user.role]}`}>
                    {roleLabels[user.role]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Role Selector */}
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  disabled={updating === user.id}
                  className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                >
                  <option value="student">學員</option>
                  <option value="coach">教練</option>
                  <option value="admin">管理員</option>
                </select>

                {/* Coach Assignment (only for students) */}
                {user.role === "student" && (
                  <select
                    value={user.coach_id || ""}
                    onChange={(e) => assignCoach(user.id, e.target.value || null)}
                    disabled={updating === user.id}
                    className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                  >
                    <option value="">未指派教練</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || c.email}
                      </option>
                    ))}
                  </select>
                )}

                {updating === user.id && (
                  <span className="text-xs text-muted-foreground">更新中...</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
