"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gold-gradient">HOPE</h1>
        <p className="text-muted-foreground mt-2">登入你的帳號</p>
        {reason === "idle" && (
          <p className="mt-3 text-yellow-400 text-sm">因閒置過久已自動登出，請重新登入</p>
        )}
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-1 bg-card border-border"
          />
        </div>
        <div>
          <Label htmlFor="password">密碼</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mt-1 bg-card border-border"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-black hover:bg-gold-light font-semibold"
        >
          {loading ? "登入中..." : "登入"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-4">
        <a href="/auth/forgot-password" className="text-gold hover:underline">
          忘記密碼？
        </a>
      </p>
      <p className="text-center text-sm text-muted-foreground mt-3">
        還沒有帳號？{" "}
        <Link href="/auth/register" className="text-gold hover:underline">
          立即註冊
        </Link>
      </p>
      <p className="text-center mt-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; 返回首頁
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<p className="text-muted-foreground">載入中...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
