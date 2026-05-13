"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  balance: number;
}

interface Props {
  students: Student[];
}

const PRESET_AMOUNTS = [20, 4, -2, -20];

function getPresetNote(amount: number): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  switch (amount) {
    case 20:
      return `月費 199 入帳 ${yyyymm}`;
    case 4:
      return "補發簽到禮";
    case -2:
      return "手動扣除";
    case -20:
      return "退費";
    default:
      return "";
  }
}

export default function AdminPointsPanel({ students }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(20);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => students.find((s) => s.id === selectedId) ?? null,
    [students, selectedId]
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.display_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  }, [students, filter]);

  async function handleGrant() {
    setError(null);
    setMessage(null);
    if (!selected) {
      setError("請先選一位學員");
      return;
    }
    if (!amount || amount === 0) {
      setError("點數不可為 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/points/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selected.id,
          amount,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加值失敗");

      setMessage(
        `已為 ${selected.display_name || selected.email} ${
          amount > 0 ? "加" : "扣"
        } ${Math.abs(amount)} 點，餘額 ${data.balance_after} 點`
      );
      setNote("");
      // Refresh server data to update balance display
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "加值失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 左：學員清單 */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">成員列表</h2>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜尋姓名或 email..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
        />
        <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-[480px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">查無成員</p>
          ) : (
            filtered.map((s) => {
              const isSelected = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-3 transition ${
                    isSelected
                      ? "bg-gold/10 border-l-2 border-gold"
                      : "hover:bg-card-foreground/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.display_name || "(未命名)"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.email} · {s.role}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gold">
                        {s.balance}
                      </p>
                      <p className="text-xs text-muted-foreground">點</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 右：加值表單 */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">加值 / 扣回</h2>
        <div className="rounded-lg border border-gold/40 bg-card p-5 space-y-4">
          {selected ? (
            <>
              <div className="rounded-md bg-background p-3">
                <p className="text-xs text-muted-foreground">已選擇</p>
                <p className="font-medium">
                  {selected.display_name || selected.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  目前餘額：{selected.balance} 點
                </p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">
                  點數變動（正數加值、負數扣回）
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_AMOUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setAmount(n);
                        setNote(getPresetNote(n));
                      }}
                      className={`rounded-md border px-3 py-1 text-xs transition ${
                        amount === n
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border hover:border-gold/50"
                      }`}
                    >
                      {n > 0 ? `+${n}` : n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">
                  備註（會顯示在學員的存摺）
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例如：2026-05 訂閱付款"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              <button
                onClick={handleGrant}
                disabled={saving || amount === 0}
                className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-black hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {saving
                  ? "處理中..."
                  : `送出${
                      amount >= 0 ? `加值 +${amount}` : `扣回 ${amount}`
                    } 點`}
              </button>

              {message && (
                <p className="text-sm text-green-400">{message}</p>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              請從左邊選一位成員開始
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
