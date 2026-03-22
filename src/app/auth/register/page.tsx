"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // 驗證姓名：至少 2 個中文字
    const chineseOnly = /^[\u4e00-\u9fff]{2,}$/;
    if (!chineseOnly.test(name.trim())) {
      setError("姓名請輸入至少 2 個中文字（僅限繁體中文）");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name.trim(),
          nickname: nickname.trim() || null,
          role: "student",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-3xl font-bold text-gold-gradient mb-4">
            註冊成功！
          </h1>
          <p className="text-muted-foreground mb-6">
            帳號已建立，現在可以登入了。
          </p>
          <Link
            href="/auth/login"
            className="text-gold hover:underline"
          >
            前往登入
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-gradient">HOPE</h1>
          <p className="text-muted-foreground mt-2">建立你的帳號</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="name">姓名（中文）</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入中文姓名（至少 2 個字）"
              required
              className="mt-1 bg-card border-border"
            />
          </div>
          <div>
            <Label htmlFor="nickname">顯示暱稱 <span className="text-muted-foreground font-normal">（選填）</span></Label>
            <Input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="群組中顯示的暱稱，留空則使用姓名"
              className="mt-1 bg-card border-border"
            />
          </div>
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
              placeholder="至少 6 個字元"
              minLength={6}
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
            {loading ? "註冊中..." : "註冊"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          已有帳號？{" "}
          <Link href="/auth/login" className="text-gold hover:underline">
            前往登入
          </Link>
        </p>
        <p className="text-center mt-3">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; 返回首頁
          </Link>
        </p>
      </div>
    </div>
  );
}
