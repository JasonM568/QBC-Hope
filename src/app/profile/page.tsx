"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      setDisplayName(prof?.display_name || user.user_metadata?.display_name || "");
      setNickname(user.user_metadata?.nickname || "");
      setEmail(user.email || "");
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        nickname: nickname.trim() || null,
      },
    });

    // Also update profiles table
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName,
          email: user.email,
          updated_at: new Date().toISOString(),
        });
    }

    if (error) {
      setMessage("更新失敗：" + error.message);
    } else {
      setMessage("已更新！");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={displayName} />

      <main className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">個人資料</h1>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="mt-1 bg-background border-border opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={displayName}
                disabled
                className="mt-1 bg-background border-border opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">姓名如需修改請聯繫教練</p>
            </div>
            <div>
              <Label htmlFor="nickname">顯示暱稱 <span className="text-muted-foreground font-normal">（選填）</span></Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="留空則顯示姓名"
                className="mt-1 bg-background border-border"
              />
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-gold text-black hover:bg-gold-light font-semibold"
          >
            {saving ? "儲存中..." : "儲存變更"}
          </Button>
        </form>
      </main>
    </div>
  );
}
