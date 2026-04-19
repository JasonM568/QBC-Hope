"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 直接用 supabase-js 建立 client（繞過 @supabase/ssr 的 cookie 處理）
function getRawSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = getRawSupabase();

    async function handleToken() {
      // 1. URL query 中有 code
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { setSessionReady(true); }
        else { setError("連結已過期或無效，請重新申請重設密碼。"); }
        setChecking(false);
        return;
      }

      // 2. URL hash 中有 access_token
      const hash = window.location.hash.substring(1);
      if (hash) {
        const hp = new URLSearchParams(hash);
        const at = hp.get("access_token");
        const rt = hp.get("refresh_token");
        const errDesc = hp.get("error_description");

        if (at) {
          const { error } = await supabase.auth.setSession({
            access_token: at,
            refresh_token: rt || "",
          });
          if (!error) { setSessionReady(true); }
          else { setError("連結已過期或無效，請重新申請重設密碼。"); }
          setChecking(false);
          return;
        }

        if (errDesc) {
          setError(decodeURIComponent(errDesc.replace(/\+/g, " ")));
          setChecking(false);
          return;
        }
      }

      // 3. 已有 session（從 callback 跳轉過來）
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        setChecking(false);
        return;
      }

      // 4. 什麼都沒有
      setError("找不到有效的驗證資訊，請重新從信中的連結進入。");
      setChecking(false);
    }

    handleToken();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) { setError("密碼至少需要 6 個字元"); return; }
    if (password !== confirmPassword) { setError("兩次密碼輸入不一致"); return; }

    setLoading(true);
    const supabase = getRawSupabase();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
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
            <p className="text-sm text-muted-foreground mt-2">正在跳轉到登入頁...</p>
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

        {checking ? (
          <p className="text-center text-muted-foreground text-sm">正在驗證連結...</p>
        ) : error && !sessionReady ? (
          <div className="text-center space-y-4">
            <p className="text-red-400 text-sm">{error}</p>
            <a href="/auth/forgot-password" className="text-gold hover:underline text-sm">
              重新發送重設連結
            </a>
          </div>
        ) : sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">新密碼</Label>
              <Input
                id="password" type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 個字元" required
                className="mt-1 bg-card border-border"
              />
            </div>
            <div>
              <Label htmlFor="confirm">確認新密碼</Label>
              <Input
                id="confirm" type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入新密碼" required
                className="mt-1 bg-card border-border"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit" disabled={loading}
              className="w-full bg-gold text-black hover:bg-gold-light font-semibold"
            >
              {loading ? "重設中..." : "重設密碼"}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
