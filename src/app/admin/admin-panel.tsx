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
  todayDate,
  totalStudents,
  reportedCount,
  reportedTodayIds,
}: {
  users: User[];
  coaches: User[];
  currentUserId: string;
  viewerRole: string;
  deletionRequests: DeletionRequest[];
  todayDate: string;
  totalStudents: number;
  reportedCount: number;
  reportedTodayIds: string[];
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>({
    enabled: true,
    skip_days: [0, 6],
    message_prefix: "📋 HOPE 日報提醒",
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // 推播功能
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastMode, setBroadcastMode] = useState<"immediate" | "scheduled">("immediate");
  const [broadcastDate, setBroadcastDate] = useState("");
  const [broadcastTime, setBroadcastTime] = useState("09:00");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState("");
  const [broadcastHistory, setBroadcastHistory] = useState<Array<{
    id: string; message: string; scheduled_at: string; status: string; sent_at: string | null; created_at: string;
  }>>([]);
  // 搜尋
  const [searchQuery, setSearchQuery] = useState("");
  // 批次指派
  const [batchMode, setBatchMode] = useState(false);
  const [batchCoachId, setBatchCoachId] = useState("");
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchUpdating, setBatchUpdating] = useState(false);
  const router = useRouter();

  const isAdmin = viewerRole === "admin";
  const canBroadcast = viewerRole === "admin" || viewerRole === "master";

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

  // 載入推播歷史
  useEffect(() => {
    if (!canBroadcast) return;
    async function loadBroadcasts() {
      const supabase = createClient();
      const { data } = await supabase
        .from("scheduled_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setBroadcastHistory(data);
    }
    loadBroadcasts();
  }, [canBroadcast]);

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

  function toggleBatchSelect(userId: string) {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    const studentIds = users.filter((u) => u.role === "student").map((u) => u.id);
    if (batchSelected.size === studentIds.length) {
      setBatchSelected(new Set());
    } else {
      setBatchSelected(new Set(studentIds));
    }
  }

  async function batchAssignCoach() {
    if (!batchCoachId) {
      alert("請先選擇要指派的教練");
      return;
    }
    if (batchSelected.size === 0) {
      alert("請勾選至少一位學員");
      return;
    }
    setBatchUpdating(true);
    const supabase = createClient();
    const ids = Array.from(batchSelected);
    await supabase
      .from("profiles")
      .update({ coach_id: batchCoachId })
      .in("id", ids);
    setBatchUpdating(false);
    setBatchMode(false);
    setBatchSelected(new Set());
    setBatchCoachId("");
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

  function startEditUser(user: User) {
    setEditingUser(user.id);
    setEditName(user.display_name || "");
    setEditNickname("");
    setEditMessage("");
    // Load nickname from auth metadata via profiles isn't available,
    // so we'll let the admin type it fresh or leave blank
  }

  async function saveUserInfo(userId: string) {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditMessage("姓名不可為空");
      return;
    }
    const chineseOnly = /^[\u4e00-\u9fff]{2,}$/;
    if (!chineseOnly.test(trimmedName)) {
      setEditMessage("姓名請輸入至少 2 個中文字");
      return;
    }

    setUpdating(userId);
    setEditMessage("");

    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        display_name: trimmedName,
        nickname: editNickname.trim() || undefined,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      setEditMessage("更新失敗：" + (result.error || "未知錯誤"));
      setUpdating(null);
      return;
    }

    setUpdating(null);
    setEditingUser(null);
    setEditMessage("");
    router.refresh();
  }

  async function sendBroadcast() {
    if (!broadcastMsg.trim()) {
      setBroadcastResult("請輸入公告訊息");
      return;
    }
    setBroadcastSending(true);
    setBroadcastResult("");

    let scheduledAt: string | undefined;
    if (broadcastMode === "scheduled") {
      if (!broadcastDate || !broadcastTime) {
        setBroadcastResult("請選擇排程日期和時間");
        setBroadcastSending(false);
        return;
      }
      // 將台灣時間轉為 UTC
      const localDate = new Date(`${broadcastDate}T${broadcastTime}:00+08:00`);
      scheduledAt = localDate.toISOString();
    }

    try {
      const res = await fetch("/api/line/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: broadcastMsg.trim(),
          scheduledAt,
          userId: currentUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastResult(
          data.type === "immediate"
            ? "公告已推播到群組！"
            : `已排程，將於 ${broadcastDate} ${broadcastTime} 推播`
        );
        setBroadcastMsg("");
        // 重新載入歷史
        const supabase = createClient();
        const { data: history } = await supabase
          .from("scheduled_broadcasts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        if (history) setBroadcastHistory(history);
      } else {
        setBroadcastResult("推播失敗：" + (data.error || "未知錯誤"));
      }
    } catch {
      setBroadcastResult("推播失敗：網路錯誤");
    }
    setBroadcastSending(false);
  }

  async function cancelBroadcast(id: string) {
    const supabase = createClient();
    await supabase
      .from("scheduled_broadcasts")
      .update({ status: "cancelled" })
      .eq("id", id);
    setBroadcastHistory((prev) =>
      prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b)
    );
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
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-muted-foreground text-sm">總用戶</p>
          <p className="text-2xl font-bold text-gold">{users.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-muted-foreground text-sm">Master</p>
          <p className="text-2xl font-bold text-gold">
            {users.filter((u) => u.role === "master").length}
          </p>
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

      {/* Daily Report Stats */}
      <div className="mb-8 p-6 rounded-xl border border-border bg-card">
        <h2 className="text-lg font-semibold mb-4">今日日報繳交狀況（{todayDate}）</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">總學員</p>
            <p className="text-2xl font-bold text-gold">{totalStudents}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">已繳交</p>
            <p className="text-2xl font-bold text-green-400">{reportedCount}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">未繳交</p>
            <p className="text-2xl font-bold text-red-400">{totalStudents - reportedCount}</p>
          </div>
        </div>
        {totalStudents - reportedCount > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">未繳交學員：</p>
            <p className="text-sm">
              {users
                .filter((u) => u.role === "student" && !reportedTodayIds.includes(u.id))
                .map((u) => u.display_name || "未設定名稱")
                .sort()
                .join("、")}
            </p>
          </div>
        )}
        {totalStudents > 0 && reportedCount === totalStudents && (
          <p className="text-green-400 font-medium text-center">🎉 今天全員都已繳交！</p>
        )}
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

      {/* LINE 公告推播 (master + admin) */}
      {canBroadcast && (
        <>
          <h2 className="text-lg font-semibold mb-4">LINE 公告推播</h2>
          <div className="p-6 rounded-xl border border-border bg-card mb-8 space-y-4">
            {/* 模式選擇 */}
            <div className="flex gap-2">
              <button
                onClick={() => setBroadcastMode("immediate")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  broadcastMode === "immediate"
                    ? "bg-gold text-black"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                即時推播
              </button>
              <button
                onClick={() => setBroadcastMode("scheduled")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  broadcastMode === "scheduled"
                    ? "bg-gold text-black"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                排程推播
              </button>
            </div>

            {/* 訊息輸入 */}
            <div>
              <label className="text-sm font-medium mb-1 block">公告訊息</label>
              <textarea
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="輸入要推播到 LINE 群組的公告內容..."
                rows={4}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm resize-y"
              />
            </div>

            {/* 排程時間 */}
            {broadcastMode === "scheduled" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">日期</label>
                  <input
                    type="date"
                    value={broadcastDate}
                    onChange={(e) => setBroadcastDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">時間（台灣時間）</label>
                  <input
                    type="time"
                    value={broadcastTime}
                    onChange={(e) => setBroadcastTime(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            {broadcastResult && (
              <p className={`text-sm ${broadcastResult.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
                {broadcastResult}
              </p>
            )}

            <button
              onClick={sendBroadcast}
              disabled={broadcastSending || !broadcastMsg.trim()}
              className="px-6 py-2 bg-gold text-black rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {broadcastSending
                ? "處理中..."
                : broadcastMode === "immediate"
                ? "立即推播"
                : "建立排程"}
            </button>

            {/* 推播歷史 */}
            {broadcastHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-medium mb-3">推播紀錄</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {broadcastHistory.map((b) => (
                    <div key={b.id} className="p-3 rounded-lg border border-border bg-background text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          b.status === "sent"
                            ? "bg-green-400/10 text-green-400"
                            : b.status === "pending"
                            ? "bg-gold/10 text-gold"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {b.status === "sent" ? "已發送" : b.status === "pending" ? "排程中" : "已取消"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(b.scheduled_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
                          </span>
                          {b.status === "pending" && (
                            <button
                              onClick={() => cancelBroadcast(b.id)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              取消
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-foreground/80 whitespace-pre-wrap line-clamp-2">{b.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Search + Batch Assignment */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">用戶管理</h2>
        <button
          onClick={() => { setBatchMode(!batchMode); setBatchSelected(new Set()); setBatchCoachId(""); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            batchMode
              ? "bg-red-400/20 text-red-400 hover:bg-red-400/30"
              : "bg-gold text-black hover:bg-gold-light"
          }`}
        >
          {batchMode ? "取消批次" : "批次指派教練"}
        </button>
      </div>

      {batchMode && (
        <div className="p-4 rounded-xl border border-gold/30 bg-card mb-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">指派教練：</span>
            <select
              value={batchCoachId}
              onChange={(e) => setBatchCoachId(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">選擇教練</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name || c.email}
                </option>
              ))}
            </select>
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 bg-secondary text-sm rounded-lg hover:bg-secondary/80 transition-colors"
            >
              {batchSelected.size === users.filter((u) => u.role === "student").length ? "取消全選" : "全選學員"}
            </button>
            <button
              onClick={batchAssignCoach}
              disabled={batchUpdating || !batchCoachId || batchSelected.size === 0}
              className="px-4 py-1.5 bg-gold text-black rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {batchUpdating ? "指派中..." : `指派 ${batchSelected.size} 位學員`}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            請勾選下方學員列表中要指派的學員，再按「指派」按鈕
          </p>
        </div>
      )}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋姓名或 Email..."
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-3">
        {users
          .filter((u) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              (u.display_name || "").toLowerCase().includes(q) ||
              (u.email || "").toLowerCase().includes(q)
            );
          })
          .map((user) => (
          <div
            key={user.id}
            className="p-4 rounded-xl border border-border bg-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                {batchMode && user.role === "student" && (
                  <input
                    type="checkbox"
                    checked={batchSelected.has(user.id)}
                    onChange={() => toggleBatchSelect(user.id)}
                    className="mt-1.5 w-4 h-4 accent-gold cursor-pointer"
                  />
                )}
                <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{user.display_name || "未設定"}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[user.role] || "bg-secondary text-muted-foreground"}`}>
                    {roleLabels[user.role] || user.role}
                  </span>
                  {user.id === currentUserId && (
                    <span className="text-xs text-muted-foreground">（你）</span>
                  )}
                  {user.id !== currentUserId && editingUser !== user.id && (
                    <button
                      onClick={() => startEditUser(user)}
                      className="text-xs text-gold hover:underline"
                    >
                      編輯
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
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
                        onClick={async () => {
                          if (!confirm(`確定要移除 ${user.display_name || user.email} 嗎？此操作無法復原！`)) return;
                          setUpdating(user.id);
                          try {
                            const res = await fetch("/api/admin/delete-user", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ targetUserId: user.id, adminUserId: currentUserId }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert("已成功移除該用戶");
                              router.refresh();
                            } else {
                              alert("移除失敗：" + (data.error || "未知錯誤"));
                            }
                          } catch {
                            alert("移除失敗：網路錯誤");
                          }
                          setUpdating(null);
                        }}
                        disabled={updating === user.id}
                        className="px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 rounded-md transition-colors disabled:opacity-50"
                      >
                        {updating === user.id ? "移除中..." : "移除"}
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

            {/* Edit Name / Nickname Form */}
            {editingUser === user.id && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">姓名（中文）</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="至少 2 個中文字"
                      className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">顯示暱稱（選填）</label>
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="留空則不修改"
                      className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm mt-1"
                    />
                  </div>
                </div>
                {editMessage && (
                  <p className={`text-xs ${editMessage.includes("失敗") ? "text-red-400" : "text-green-400"}`}>{editMessage}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveUserInfo(user.id)}
                    disabled={updating === user.id}
                    className="px-3 py-1.5 bg-gold text-black rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
                  >
                    {updating === user.id ? "儲存中..." : "儲存"}
                  </button>
                  <button
                    onClick={() => { setEditingUser(null); setEditMessage(""); }}
                    className="px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

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
