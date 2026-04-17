"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // 方式 1：URL query 中有 code（PKCE flow）
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          setSessionReady(true);
        } else {
          setError("連結已過期或無效，請重新申請重設密碼。");
        }
      });
      return;
    }

    // 方式 2：URL hash fragment 中有 access_token（implicit flow）
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      // Supabase client 會自動從 hash 讀取 token 建立 session
      // 但需要等它處理完，用 onAuthStateChange 監聽
    }

    // 監聯 auth state 變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
      }
    });

    // 額外檢查：如果 hash 存在但事件沒觸發，5 秒後嘗試直接取 session
    if (hash && hash.includes("access_token")) {
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !sessionReady) {
          setSessionReady(true);
        }
      }, 2000);
    }

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("密碼至少需要 6 個字元");
      return;
    }
    if (password !== confirmPassword) {
      setError("兩次密碼輸入不一致");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold text-gold-gradient mb-4">HOPE</h1>
          <div className="p-6 rounded-xl border border-green-400/30 bg-card">
            <p className="text-green-400 font-medium">密碼已重設成功！</p>
            <p className="text-sm text-muted-foreground mt-2">正在跳轉...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-gradient">HOPE</h1>
          <p className="text-muted-foreground mt-2">設定新密碼</p>
        </div>

        {!sessionReady ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">正在驗證連結...</p>
            <p className="text-xs text-muted-foreground">
              如果持續停留在此頁面，請重新從信中的連結進入。
            </p>
            <Link href="/auth/forgot-password" className="text-gold hover:underline text-sm">
              重新發送重設連結
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">新密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 個字元"
                required
                className="mt-1 bg-card border-border"
              />
            </div>
            <div>
              <Label htmlFor="confirm">確認新密碼</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入新密碼"
                required
                className="mt-1 bg-card border-border"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-black hover:bg-gold-light font-semibold"
            >
              {loading ? "重設中..." : "重設密碼"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
