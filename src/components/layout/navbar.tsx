"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import IdleTimeout from "@/components/idle-timeout";

const studentItems = [
  { href: "/dashboard", label: "儀表板" },
  { href: "/forms/daily", label: "日報表" },
  { href: "/forms/monthly", label: "月報" },
  { href: "/forms/weekly", label: "週報" },
  { href: "/forms/capital", label: "資本盤點" },
  { href: "/forms/strategy", label: "戰略定位" },
  { href: "/history", label: "成長曲線" },
  { href: "/community", label: "打卡牆" },
];

const coachItems = [
  { href: "/coach", label: "教練總覽" },
  { href: "/coach/notes", label: "筆記" },
];

export default function Navbar({ userName, userRole }: { userName?: string; userRole?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState(userRole || "");

  useEffect(() => {
    if (userRole) { setRole(userRole); return; }
    async function loadRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data) setRole(data.role);
      }
    }
    loadRole();
  }, [userRole]);

  const isCoachOrAdmin = role === "coach" || role === "admin";
  const isAdmin = role === "admin";
  const isOnCoachPage = pathname.startsWith("/coach") || pathname.startsWith("/admin");

  const navItems = isOnCoachPage && isCoachOrAdmin
    ? [...coachItems, ...(isAdmin ? [{ href: "/admin", label: "管理後台" }] : []), { href: "/dashboard", label: "學員端" }]
    : [
        ...studentItems,
        ...(isCoachOrAdmin ? [{ href: "/coach", label: "教練後台" }] : []),
        ...(isAdmin ? [{ href: "/admin", label: "管理後台" }] : []),
      ];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <IdleTimeout />
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-gold-gradient">
          HOPE
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors ${
                pathname === item.href
                  ? "text-gold font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-border">
            {userName && (
              <Link href="/profile" className="text-foreground text-sm hover:text-gold transition-colors">
                {userName}
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-red-400 transition-colors"
            >
              登出
            </button>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-foreground p-2"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 text-sm ${
                pathname === item.href
                  ? "text-gold font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-sm text-foreground">
              {userName || "個人資料"}
            </Link>
            <button onClick={handleLogout} className="text-sm text-red-400">
              登出
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
