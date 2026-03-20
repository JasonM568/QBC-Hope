import { requireRole } from "@/lib/auth-guard";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";

export default async function CoachNotesPage() {
  const { user, profile, supabase } = await requireRole(["coach", "admin"]);

  const { data: notes } = await supabase
    .from("coach_notes")
    .select(`
      id, content, note_type, created_at, student_id,
      profiles!coach_notes_student_id_fkey(display_name)
    `)
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.display_name} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/coach" className="text-sm text-muted-foreground hover:text-gold transition-colors">
            &larr; 返回教練總覽
          </Link>
          <h1 className="text-2xl font-bold mt-2">所有筆記</h1>
        </div>

        {!notes || notes.length === 0 ? (
          <div className="p-8 rounded-xl border border-border bg-card text-center">
            <p className="text-muted-foreground">還沒有任何筆記</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => {
              const studentProfile = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles;
              return (
                <Link
                  key={n.id}
                  href={`/coach/students/${n.student_id}`}
                  className="block p-4 rounded-xl border border-border bg-card card-hover"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {studentProfile?.display_name || "學員"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        n.note_type === "alert"
                          ? "bg-red-400/10 text-red-400"
                          : n.note_type === "memo"
                          ? "bg-blue-400/10 text-blue-400"
                          : "bg-gold/10 text-gold"
                      }`}>
                        {n.note_type === "alert" ? "提醒" : n.note_type === "memo" ? "備忘" : "回饋"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("zh-TW")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{n.content}</p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
