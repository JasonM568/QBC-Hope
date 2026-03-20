"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface MonthlyData {
  label: string;
  career: number;
  wealth: number;
  health: number;
  family: number;
  relation: number;
}

interface DailyData {
  date: string;
  energy: number;
  score: number;
}

export default function HistoryPage() {
  const [userName, setUserName] = useState("");
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [radarData, setRadarData] = useState<Array<{ domain: string; score: number }>>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"radar" | "trend" | "daily">("radar");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserName(user.user_metadata?.display_name || user.email || "");

      // Load monthly reports for radar + trend
      const { data: monthly } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true });

      if (monthly && monthly.length > 0) {
        const trend = monthly.map((m) => ({
          label: `${m.year}/${m.month}`,
          career: m.career_score,
          wealth: m.wealth_score,
          health: m.health_score,
          family: m.family_score,
          relation: m.relation_score,
        }));
        setMonthlyData(trend);

        // Latest month for radar
        const latest = monthly[monthly.length - 1];
        setRadarData([
          { domain: "事業", score: latest.career_score },
          { domain: "財富", score: latest.wealth_score },
          { domain: "健康", score: latest.health_score },
          { domain: "家庭", score: latest.family_score },
          { domain: "關係", score: latest.relation_score },
        ]);
      }

      // Load daily reports for energy/score trend
      const { data: daily } = await supabase
        .from("daily_reports")
        .select("report_date, energy_state, daily_score")
        .eq("user_id", user.id)
        .order("report_date", { ascending: true })
        .limit(30);

      if (daily) {
        setDailyData(daily.map((d) => ({
          date: d.report_date,
          energy: d.energy_state,
          score: d.daily_score,
        })));
      }

      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar userName={userName} />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "radar" as const, label: "五域雷達圖" },
    { key: "trend" as const, label: "五域趨勢" },
    { key: "daily" as const, label: "每日能量" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar userName={userName} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">歷史記錄與成長曲線</h1>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "bg-gold text-black"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Radar Chart */}
        {activeTab === "radar" && (
          <div className="p-6 rounded-xl border border-border bg-card">
            {radarData.length > 0 ? (
              <>
                <h2 className="font-semibold mb-4">最新月份 — 五域雷達圖</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(0 0% 25%)" />
                    <PolarAngleAxis dataKey="domain" tick={{ fill: "hsl(40 10% 70%)", fontSize: 14 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 20]} tick={{ fill: "hsl(40 5% 55%)", fontSize: 11 }} />
                    <Radar name="評分" dataKey="score" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-12">尚無月報資料，請先填寫五域平衡月報告</p>
            )}
          </div>
        )}

        {/* Trend Chart */}
        {activeTab === "trend" && (
          <div className="p-6 rounded-xl border border-border bg-card">
            {monthlyData.length > 0 ? (
              <>
                <h2 className="font-semibold mb-4">五域趨勢變化</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(40 5% 55%)", fontSize: 12 }} />
                    <YAxis domain={[0, 20]} tick={{ fill: "hsl(40 5% 55%)", fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="career" name="事業" stroke="#D4AF37" strokeWidth={2} />
                    <Line type="monotone" dataKey="wealth" name="財富" stroke="#F472B6" strokeWidth={2} />
                    <Line type="monotone" dataKey="health" name="健康" stroke="#34D399" strokeWidth={2} />
                    <Line type="monotone" dataKey="family" name="家庭" stroke="#60A5FA" strokeWidth={2} />
                    <Line type="monotone" dataKey="relation" name="關係" stroke="#A78BFA" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-12">尚無月報資料</p>
            )}
          </div>
        )}

        {/* Daily Energy/Score */}
        {activeTab === "daily" && (
          <div className="p-6 rounded-xl border border-border bg-card">
            {dailyData.length > 0 ? (
              <>
                <h2 className="font-semibold mb-4">每日能量 & 評分曲線（近 30 天）</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(40 5% 55%)", fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fill: "hsl(40 5% 55%)", fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="energy" name="能量狀態" stroke="#D4AF37" strokeWidth={2} dot={{ fill: "#D4AF37" }} />
                    <Line type="monotone" dataKey="score" name="今日評分" stroke="#60A5FA" strokeWidth={2} dot={{ fill: "#60A5FA" }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-12">尚無日報資料，請先填寫 21 天行動日報表</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
