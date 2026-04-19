"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://hope.huangxi.info"}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-gradient">HOPE</h1>
          <p className="text-muted-foreground mt-2">重設密碼</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="p-6 rounded-xl border border-green-400/30 bg-card">
              <p className="text-green-400 font-medium mb-2">重設密碼信已寄出</p>
              <p className="text-sm text-muted-foreground">
                請到 <span className="text-foreground">{email}</span> 收信，點擊信中的連結來重設密碼。
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                沒收到？請檢查垃圾信件匣，或稍後再試。
              </p>
            </div>
            <Link href="/auth/login" className="text-gold hover:underline text-sm">
              返回登入
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              輸入你的 Email，我們會寄送重設密碼的連結給你。
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-black hover:bg-gold-light font-semibold"
              >
                {loading ? "發送中..." : "發送重設連結"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link href="/auth/login" className="text-gold hover:underline">
                返回登入
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
