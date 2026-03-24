"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Reply {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string; role: string } | null;
}

interface CheckIn {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string } | null;
  like_count: number;
  user_liked: boolean;
  replies: Reply[];
}

export default function CommunityPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);
  const router = useRouter();

  const canReply = userRole === "coach" || userRole === "admin" || userRole === "master" || userRole === "tester";

  const loadCheckins = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setUserId(user.id);

    // 取得用戶角色與姓名
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();
    if (profile) {
      setUserRole(profile.role);
      setUserName(profile.display_name || user.user_metadata?.display_name || user.email || "");
    } else {
      setUserName(user.user_metadata?.display_name || user.email || "");
    }

    const { data } = await supabase
      .from("daily_checkins")
      .select(`
        id, user_id, content, created_at,
        profiles!daily_checkins_user_id_fkey(display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const checkinIds = data.map((c) => c.id);

      // 取得按讚和回覆
      const [likesResult, repliesResult] = await Promise.all([
        supabase
          .from("checkin_likes")
          .select("checkin_id, user_id")
          .in("checkin_id", checkinIds),
        supabase
          .from("checkin_replies")
          .select(`
            id, checkin_id, user_id, content, created_at,
            profiles!checkin_replies_user_id_fkey(display_name, role)
          `)
          .in("checkin_id", checkinIds)
          .order("created_at", { ascending: true }),
      ]);

      const likes = likesResult.data || [];
      const replies = repliesResult.data || [];

      const enriched = data.map((c) => {
        const checkinLikes = likes.filter((l) => l.checkin_id === c.id);
        const checkinReplies = replies
          .filter((r) => r.checkin_id === c.id)
          .map((r) => ({
            ...r,
            profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
          }));
        return {
          ...c,
          profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
          like_count: checkinLikes.length,
          user_liked: checkinLikes.some((l) => l.user_id === user.id),
          replies: checkinReplies as Reply[],
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

  async function handleReply(checkinId: string) {
    if (!replyContent.trim()) return;
    setReplyPosting(true);

    const supabase = createClient();
    await supabase.from("checkin_replies").insert({
      checkin_id: checkinId,
      user_id: userId,
      content: replyContent.trim(),
    });

    setReplyContent("");
    setReplyingTo(null);
    setReplyPosting(false);
    loadCheckins();
  }

  async function handleDeleteReply(replyId: string) {
    const supabase = createClient();
    await supabase.from("checkin_replies").delete().eq("id", replyId);
    loadCheckins();
  }

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "剛剛";
    if (mins < 60) return `${mins} 分鐘前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小時前`;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${d} ${h}:${min}`;
  }

  const roleLabel: Record<string, string> = {
    coach: "教練",
    admin: "管理員",
    master: "總教練",
    tester: "測試人員",
  };

  const roleBadgeColor: Record<string, string> = {
    coach: "bg-gold/10 text-gold",
    admin: "bg-purple-400/10 text-purple-400",
    master: "bg-emerald-400/10 text-emerald-400",
    tester: "bg-orange-400/10 text-orange-400",
  };

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
                <div className="mt-3 flex items-center gap-3">
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
                  {canReply && (
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === c.id ? null : c.id);
                        setReplyContent("");
                      }}
                      className="text-sm text-muted-foreground hover:text-gold transition-colors"
                    >
                      回覆
                    </button>
                  )}
                </div>

                {/* Replies */}
                {c.replies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {c.replies.map((r) => (
                      <div key={r.id} className="pl-3 border-l-2 border-gold/30">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">
                            {r.profiles?.display_name || "未知"}
                          </span>
                          {r.profiles?.role && roleLabel[r.profiles.role] && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleBadgeColor[r.profiles.role] || ""}`}>
                              {roleLabel[r.profiles.role]}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(r.created_at)}
                          </span>
                          {r.user_id === userId && (
                            <button
                              onClick={() => handleDeleteReply(r.id)}
                              className="text-xs text-muted-foreground hover:text-red-400 transition-colors ml-auto"
                            >
                              刪除
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                          {r.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyingTo === c.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="回覆這則打卡..."
                      rows={2}
                      className="bg-background border-border mb-2 text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        取消
                      </button>
                      <Button
                        onClick={() => handleReply(c.id)}
                        disabled={replyPosting || !replyContent.trim()}
                        className="bg-gold text-black hover:bg-gold-light font-semibold text-sm h-8 px-4"
                      >
                        {replyPosting ? "發送中..." : "送出回覆"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
