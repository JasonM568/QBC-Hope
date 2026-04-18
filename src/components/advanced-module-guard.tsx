"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";

export default function AdvancedModuleGuard({
  children,
  moduleName,
}: {
  children: React.ReactNode;
  moduleName: string;
}) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role, advanced_modules_enabled")
        .eq("id", user.id)
        .single();

      setUserName(profile?.display_name || user.email || "");

      // master / admin / coach / tester 不受限制
      const freeRoles = ["master", "admin", "coach", "tester"];
      if (freeRoles.includes(profile?.role)) {
        setAllowed(true);
        return;
      }

      setAllowed(profile?.advanced_modules_enabled === true);
    }
    check();
  }, [router]);

  if (allowed === null) {
    return (
      <div className="min-h-screen">
        <Navbar userName={userName} />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <Navbar userName={userName} />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="p-8 rounded-xl border border-gold/30 bg-card text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-xl font-bold">{moduleName}</h1>
            <p className="text-muted-foreground">
              此功能為進階模組，須由教練開通
            </p>
            <p className="text-xs text-muted-foreground">
              請聯繫你的教練或院長，開通後即可使用此模組
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-4 px-6 py-2 rounded-full bg-gold text-black font-semibold text-sm hover:bg-gold-light transition-colors"
            >
              返回儀表板
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
