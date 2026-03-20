"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CheckIn {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string } | null;
  like_count: number;
  user_liked: boolean;
}

export default function CommunityPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const router = useRouter();

  const loadCheckins = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setUserId(user.id);
    setUserName(user.user_metadata?.display_name || user.email || "");

    const { data } = await supabase
      .from("daily_checkins")
      .select(`
        id, user_id, content, created_at,
        profiles!daily_checkins_user_id_fkey(display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      // Get like counts and user's likes
      const checkinIds = data.map((c) => c.id);

      const { data: likes } = await supabase
        .from("checkin_likes")
        .select("checkin_id, user_id")
        .in("checkin_id", checkinIds);

      const enriched = data.map((c) => {
        const checkinLikes = likes?.filter((l) => l.checkin_id === c.id) || [];
        return {
          ...c,
          profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
          like_count: checkinLikes.length,
          user_liked: checkinLikes.some((l) => l.user_id === user.id),
        };
      });

      setCheckins(enriched);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);

    const supabase = createClient();
    await supabase.from("daily_checkins").insert({
      user_id: userId,
      content: content.trim(),
    });

    setContent("");
    setPosting(false);
    loadCheckins();
  }

  async function handleLike(checkinId: string, liked: boolean) {
    const supabase = createClient();
    if (liked) {
      await supabase
        .from("checkin_likes")
        .delete()
        .eq("checkin_id", checkinId)
        .eq("user_id", userId);
    } else {
      await supabase.from("checkin_likes").insert({
        checkin_id: checkinId,
        user_id: userId,
      });
    }
    loadCheckins();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "剛剛";
    if (mins < 60) return `${mins} 分鐘前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小時前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={userName} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">社群打卡牆</h1>

        {/* Post Form */}
        <form onSubmit={handlePost} className="mb-8">
          <div className="p-4 rounded-xl border border-border bg-card">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享你今天的進步、感悟或鼓勵..."
              rows={3}
              className="bg-background border-border mb-3"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={posting || !content.trim()}
                className="bg-gold text-black hover:bg-gold-light font-semibold"
              >
                {posting ? "發送中..." : "發佈打卡"}
              </Button>
            </div>
          </div>
        </form>

        {/* Check-in Feed */}
        {loading ? (
          <p className="text-center text-muted-foreground">載入中...</p>
        ) : checkins.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            還沒有人打卡，成為第一個吧！
          </p>
        ) : (
          <div className="space-y-4">
            {checkins.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">
                    {c.profiles?.display_name || "匿名學員"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-foreground/90 text-sm whitespace-pre-wrap">
                  {c.content}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleLike(c.id, c.user_liked)}
                    className={`text-sm flex items-center gap-1 transition-colors ${
                      c.user_liked
                        ? "text-gold"
                        : "text-muted-foreground hover:text-gold"
                    }`}
                  >
                    {c.user_liked ? "★" : "☆"} {c.like_count > 0 && c.like_count}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
