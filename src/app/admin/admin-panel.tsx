"use client";

import { useState, useEffect } from "react";
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

interface DeletionRequest {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  requester: { display_name: string }[];
  target: { display_name: string; email: string }[];
}

interface NotificationConfig {
  enabled: boolean;
  skip_days: number[];
  message_prefix: string;
}

const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];

export default function AdminPanel({
  users,
  coaches,
  currentUserId,
  viewerRole,
  deletionRequests,
}: {
  users: User[];
  coaches: User[];
  currentUserId: string;
  viewerRole: string;
  deletionRequests: DeletionRequest[];
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>({
    enabled: true,
    skip_days: [0, 6],
    message_prefix: "📋 HOPE 日報提醒",
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const router = useRouter();

  const isAdmin = viewerRole === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    async function loadSettings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("notification_settings")
        .select("setting_value")
        .eq("setting_key", "daily_reminder")
        .single();
      if (data?.setting_value) {
        setNotifConfig(data.setting_value);
      }
    }
    loadSettings();
  }, [isAdmin]);

  async function updateRole(userId: string, newRole: string) {
    if (userId === currentUserId) {
      alert("無法變更自己的角色！");
      return;
    }
    // Master 不能設定 admin 或 master 角色
    if (!isAdmin && (newRole === "admin" || newRole === "master")) {
      alert("只有管理員可以指派此角色！");
      return;
    }
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

  async function requestDeletion(targetUserId: string) {
    if (!deleteReason.trim()) {
      alert("請填寫移除原因");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("deletion_requests").insert({
      requester_id: currentUserId,
      target_user_id: targetUserId,
      reason: deleteReason,
    });
    if (error) {
      alert("申請失敗：" + error.message);
    } else {
      alert("已送出移除申請，等待管理員審核");
      setDeleteTarget(null);
      setDeleteReason("");
      router.refresh();
    }
  }

  async function reviewDeletion(requestId: string, action: "approved" | "rejected") {
    const supabase = createClient();
    await supabase
      .from("deletion_requests")
      .update({
        status: action,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (action === "approved") {
      // Find the target user and deactivate (set role to a disabled state or delete)
      // For safety, we just mark the deletion request as approved
      // Admin can then manually remove the user in Supabase
      alert("已核准移除申請。請到 Supabase 後台刪除該用戶。");
    }
    router.refresh();
  }

  function toggleSkipDay(day: number) {
    setNotifConfig((prev) => ({
      ...prev,
      skip_days: prev.skip_days.includes(day)
        ? prev.skip_days.filter((d) => d !== day)
        : [...prev.skip_days, day].sort(),
    }));
  }

  async function saveNotifSettings() {
    setNotifSaving(true);
    setNotifMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from("notification_settings")
      .update({
        setting_value: notifConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("setting_key", "daily_reminder");

    if (error) {
      setNotifMessage("儲存失敗：" + error.message);
    } else {
      setNotifMessage("通知設定已儲存！");
    }
    setNotifSaving(false);
  }

  const roleLabels: Record<string, string> = {
    student: "學員",
    coach: "教練",
    admin: "管理員",
    master: "Master",
  };

  const roleColors: Record<string, string> = {
    student: "bg-blue-400/10 text-blue-400",
    coach: "bg-gold/10 text-gold",
    admin: "bg-purple-400/10 text-purple-400",
    master: "bg-emerald-400/10 text-emerald-400",
  };

  // Master only sees student/coach role options
  const availableRoles = isAdmin
    ? ["student", "coach", "master", "admin"]
    : ["student", "coach"];

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
          <p className="text-2xl font-bold text-gold">
            {users.filter((u) => u.role === "coach").length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-muted-foreground text-sm">學員</p>
          <p className="text-2xl font-bold text-gold">
            {users.filter((u) => u.role === "student").length}
          </p>
        </div>
      </div>

      {/* Pending Deletion Requests (Admin only) */}
      {isAdmin && deletionRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-red-400">待審核的移除申請</h2>
          <div className="space-y-3">
            {deletionRequests.map((req) => (
              <div key={req.id} className="p-4 rounded-xl border border-red-400/30 bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      申請移除：{req.target?.[0]?.display_name || "未知"} ({req.target?.[0]?.email})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      申請人：{req.requester?.[0]?.display_name || "未知"} ・{" "}
                      {new Date(req.created_at).toLocaleDateString("zh-TW")}
                    </p>
                    <p className="text-sm mt-1">原因：{req.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewDeletion(req.id, "approved")}
                      className="px-3 py-1.5 bg-red-400/20 text-red-400 rounded-lg text-sm hover:bg-red-400/30 transition-colors"
                    >
                      核准
                    </button>
                    <button
                      onClick={() => reviewDeletion(req.id, "rejected")}
                      className="px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                    >
                      駁回
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LINE Notification Settings (Admin only) */}
      {isAdmin && (
        <>
          <h2 className="text-lg font-semibold mb-4">LINE 通知設定</h2>
          <div className="p-6 rounded-xl border border-border bg-card mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">每日日報提醒</p>
                <p className="text-sm text-muted-foreground">每天 21:00（台灣時間）在 LINE 群組提醒</p>
              </div>
              <button
                onClick={() => setNotifConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifConfig.enabled ? "bg-gold" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    notifConfig.enabled ? "left-6" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {notifConfig.enabled && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">不發送通知的日子</p>
                  <div className="flex gap-2">
                    {dayLabels.map((label, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleSkipDay(idx)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          notifConfig.skip_days.includes(idx)
                            ? "bg-red-400/20 text-red-400 border border-red-400/30"
                            : "bg-green-400/10 text-green-400 border border-green-400/20"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    紅色 = 不發送，綠色 = 發送。目前設定：
                    {notifConfig.skip_days.length === 0
                      ? "每天都發送"
                      : `週${notifConfig.skip_days.map((d) => dayLabels[d]).join("、")}不發送`}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">訊息前綴</p>
                  <input
                    type="text"
                    value={notifConfig.message_prefix}
                    onChange={(e) => setNotifConfig((prev) => ({ ...prev, message_prefix: e.target.value }))}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={saveNotifSettings}
                disabled={notifSaving}
                className="px-4 py-2 bg-gold text-black rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {notifSaving ? "儲存中..." : "儲存通知設定"}
              </button>
              {notifMessage && (
                <span className={`text-sm ${notifMessage.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
                  {notifMessage}
                </span>
              )}
            </div>
          </div>
        </>
      )}

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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[user.role] || "bg-secondary text-muted-foreground"}`}>
                    {roleLabels[user.role] || user.role}
                  </span>
                  {user.id === currentUserId && (
                    <span className="text-xs text-muted-foreground">（你）</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Role Selector */}
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  disabled={updating === user.id || user.id === currentUserId}
                  className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
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

                {/* Delete / Request Deletion */}
                {user.id !== currentUserId && user.role !== "admin" && (
                  <>
                    {isAdmin ? (
                      <button
                        onClick={() => {
                          if (confirm(`確定要移除 ${user.display_name || user.email} 嗎？`)) {
                            // Admin can directly handle
                            alert("請到 Supabase 後台刪除此用戶");
                          }
                        }}
                        className="px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      >
                        移除
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(deleteTarget === user.id ? null : user.id)}
                        className="px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      >
                        申請移除
                      </button>
                    )}
                  </>
                )}

                {updating === user.id && (
                  <span className="text-xs text-muted-foreground">更新中...</span>
                )}
              </div>
            </div>

            {/* Deletion Request Form (Master) */}
            {deleteTarget === user.id && !isAdmin && (
              <div className="mt-3 pt-3 border-t border-border flex gap-2">
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="請填寫移除原因..."
                  className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => requestDeletion(user.id)}
                  className="px-3 py-1.5 bg-red-400/20 text-red-400 rounded-lg text-sm hover:bg-red-400/30 transition-colors"
                >
                  送出
                </button>
                <button
                  onClick={() => { setDeleteTarget(null); setDeleteReason(""); }}
                  className="px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg text-sm"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
