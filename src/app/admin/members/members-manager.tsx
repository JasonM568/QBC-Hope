"use client";

import { useMemo, useState } from "react";

export interface Member {
  id: string;
  display_name: string;
  email: string;
  advanced: boolean;
  current_streak: number;
  created_at: string;
}

type Filter = "all" | "basic" | "advanced";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function MembersManager({ members: initial }: { members: Member[] }) {
  const [members, setMembers] = useState<Member[]>(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Email 名單比對
  const [emailInput, setEmailInput] = useState("");
  const [matchResult, setMatchResult] = useState<{ matched: Member[]; unmatched: string[] } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (filter === "basic" && m.advanced) return false;
      if (filter === "advanced" && !m.advanced) return false;
      if (!q) return true;
      return m.display_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [members, search, filter]);

  const advancedCount = members.filter((m) => m.advanced).length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    const ids = filtered.map((m) => m.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function applyAdvanced(userIds: string[], enable: boolean) {
    if (userIds.length === 0) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/members/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, enable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新失敗");

      const idSet = new Set(userIds);
      setMembers((prev) => prev.map((m) => (idSet.has(m.id) ? { ...m, advanced: enable } : m)));
      setMessage(`已${enable ? "開通" : "取消"} ${data.updated} 位會員的進階權限`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  }

  async function batchSelected(enable: boolean) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `確定要${enable ? "開通" : "取消"} ${ids.length} 位會員的進階權限嗎？`
    );
    if (!ok) return;
    await applyAdvanced(ids, enable);
    setSelected(new Set());
  }

  function runMatch() {
    const emails = emailInput
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const uniq = Array.from(new Set(emails));

    const byEmail = new Map(members.map((m) => [m.email.toLowerCase(), m]));
    const matched: Member[] = [];
    const unmatched: string[] = [];
    for (const e of uniq) {
      const m = byEmail.get(e);
      if (m) matched.push(m);
      else unmatched.push(e);
    }
    setMatchResult({ matched, unmatched });
    setMessage("");
  }

  async function enableMatched() {
    if (!matchResult || matchResult.matched.length === 0) return;
    const ok = window.confirm(`確定要將這 ${matchResult.matched.length} 位會員全部開通進階嗎？`);
    if (!ok) return;
    await applyAdvanced(matchResult.matched.map((m) => m.id), true);
    // 重新計算 matched 的 advanced 狀態（從更新後 members）
    setMatchResult(null);
    setEmailInput("");
  }

  const filteredAllSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  return (
    <div className="space-y-8">
      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">學員總數</p>
          <p className="text-2xl font-bold mt-1">{members.length}</p>
        </div>
        <div className="rounded-xl border border-gold/30 bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">進階會員</p>
          <p className="text-2xl font-bold text-gold mt-1">{advancedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">初階會員</p>
          <p className="text-2xl font-bold mt-1">{members.length - advancedCount}</p>
        </div>
      </div>

      {message && (
        <p className="text-sm text-gold border border-gold/30 bg-gold/5 rounded-md px-3 py-2">{message}</p>
      )}

      {/* 方式 2：Email 名單比對 */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="font-semibold">貼上「購買進階課程」的 Email 名單</h2>
          <p className="text-xs text-muted-foreground mt-1">
            一行一個（或用逗號分隔），系統會比對出對應的會員帳號。
          </p>
        </div>
        <textarea
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          rows={5}
          placeholder={"a@example.com\nb@example.com"}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
        />
        <button
          onClick={runMatch}
          disabled={!emailInput.trim()}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-40 transition"
        >
          比對名單
        </button>

        {matchResult && (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium text-green-400 mb-2">
                ✅ 找到 {matchResult.matched.length} 位會員
              </p>
              {matchResult.matched.length > 0 ? (
                <ul className="text-sm divide-y divide-border rounded-md border border-border">
                  {matchResult.matched.map((m) => (
                    <li key={m.id} className="flex items-center justify-between px-3 py-2">
                      <span>
                        {m.display_name || "（未填姓名）"}{" "}
                        <span className="text-muted-foreground">{m.email}</span>
                      </span>
                      {m.advanced ? (
                        <span className="text-xs text-gold">已是進階</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">初階</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">名單裡沒有任何 Email 對應到會員。</p>
              )}
            </div>

            {matchResult.unmatched.length > 0 && (
              <div>
                <p className="text-sm font-medium text-yellow-400 mb-2">
                  ⚠️ 找不到對應帳號 {matchResult.unmatched.length} 筆（可能還沒註冊或 Email 不同）
                </p>
                <div className="text-xs text-muted-foreground rounded-md border border-border bg-background px-3 py-2 break-all">
                  {matchResult.unmatched.join("、")}
                </div>
              </div>
            )}

            {matchResult.matched.length > 0 && (
              <button
                onClick={enableMatched}
                disabled={saving}
                className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-40 transition"
              >
                {saving ? "處理中..." : `將這 ${matchResult.matched.length} 位全部開通進階`}
              </button>
            )}
          </div>
        )}
      </section>

      {/* 方式 1：手動從列表挑 */}
      <section className="space-y-3">
        <h2 className="font-semibold">會員列表</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋姓名或 Email"
            className="flex-1 min-w-[180px] rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
          <div className="flex rounded-md border border-border overflow-hidden text-sm">
            {(["all", "basic", "advanced"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 transition ${
                  filter === f ? "bg-gold text-black font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "全部" : f === "basic" ? "初階" : "進階"}
              </button>
            ))}
          </div>
        </div>

        {/* 批次操作列 */}
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <button onClick={toggleAllFiltered} className="text-muted-foreground hover:text-foreground">
            {filteredAllSelected ? "取消全選" : "全選目前清單"}
          </button>
          <span className="text-muted-foreground">已選 {selected.size} 位</span>
          <div className="flex-1" />
          <button
            onClick={() => batchSelected(true)}
            disabled={saving || selected.size === 0}
            className="rounded-md bg-gold px-3 py-1.5 font-semibold text-black hover:bg-gold/90 disabled:opacity-40 transition"
          >
            批次開通進階
          </button>
          <button
            onClick={() => batchSelected(false)}
            disabled={saving || selected.size === 0}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-card disabled:opacity-40 transition"
          >
            批次取消進階
          </button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2.5rem_1fr_1.5fr_6rem_4rem_4rem] gap-2 px-3 py-2 text-xs text-muted-foreground border-b border-border bg-card">
            <span />
            <span>姓名</span>
            <span>Email</span>
            <span className="text-center">註冊日</span>
            <span className="text-center">連續</span>
            <span className="text-center">狀態</span>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((m) => (
              <label
                key={m.id}
                className="grid grid-cols-[2.5rem_1fr] sm:grid-cols-[2.5rem_1fr_1.5fr_6rem_4rem_4rem] gap-2 px-3 py-2.5 items-center text-sm hover:bg-card cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggleOne(m.id)}
                  className="w-4 h-4 accent-gold"
                />
                <span className="truncate">{m.display_name || "（未填姓名）"}</span>
                <span className="truncate text-muted-foreground hidden sm:block">{m.email}</span>
                <span className="text-center text-muted-foreground hidden sm:block">{fmtDate(m.created_at)}</span>
                <span className="text-center text-muted-foreground hidden sm:block">{m.current_streak}</span>
                <span className="text-center hidden sm:block">
                  {m.advanced ? (
                    <span className="text-xs text-gold font-medium">進階</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">初階</span>
                  )}
                </span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">沒有符合的會員</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
