import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";

export const metadata = {
  title: "功能介紹 | HOPE OS 人生升級系統",
  description: "HOPE 是一套幫助你盤點現況、找到方向、持續行動的人生成長系統。每天寫感恩日記累積點數，用點數抽量子牌卡獲得引導與覺察。",
};

const DAILY_PARTS = [
  { num: 1, title: "晨間信念打卡", desc: "今天能量狀態（1–10 分）、最重要的一件事、一句自我宣言" },
  { num: 2, title: "今日覺察", desc: "今天在哪裡可以更好？覺察到了什麼？" },
  { num: 3, title: "今日學習", desc: "今天學到的新觀念或事物" },
  { num: 4, title: "今日行動", desc: "今天做了什麼新行動" },
  { num: 5, title: "今日分享", desc: "今天對誰分享了什麼" },
  { num: 6, title: "感恩時刻", desc: "今天最感恩的一件事", highlight: true },
  { num: 7, title: "今日評分", desc: "給今天打分（1–10）、跟昨天比、自評說明" },
  { num: 8, title: "明日行動", desc: "明天最重要的一件事" },
];

const EARN_RULES = [
  { action: "註冊帳號", point: "+4", note: "一次性體驗額度，夠抽 2 次牌" },
  { action: "提交每日感恩日記", point: "+1", note: "每天送出感恩日記就 +1" },
  { action: "連續每滿 7 天", point: "+3", note: "第 7、14、21… 天額外加碼" },
  { action: "連續滿 21 天", point: "+10", note: "里程碑大獎（在當天 +3 之上再加）" },
];

const SPEND_RULES = [
  { action: "抽牌解讀", point: "−2", note: "每抽一次牌、取得 AI 解讀扣 2 點" },
];

const OTHER_FEATURES = [
  { href: "/dashboard", name: "儀表板", desc: "今日感恩日記狀態、連續天數、點數餘額、教練回饋" },
  { href: "/points", name: "點數存摺", desc: "查看餘額、賺點／花點統計、連續打卡天數" },
  { href: "/oracle/history", name: "牌卡歷史", desc: "回顧過去的抽牌解讀紀錄" },
  { href: "/history", name: "成長曲線", desc: "翻閱過往感恩日記、檢視成長軌跡" },
  { href: "/community", name: "打卡牆", desc: "社群打卡與互動" },
  { href: "/courses", name: "課程", desc: "查看與參與課程" },
  { href: "/profile", name: "個人資料", desc: "編輯姓名、暱稱等個人資訊" },
];

const FAQ = [
  { q: "註冊後有送點數嗎？", a: "有，自動送 4 點體驗額度，夠抽 2 次牌。" },
  { q: "寫感恩日記會扣點嗎？", a: "不會。提交感恩日記反而 +1 點，是賺點不是花點。" },
  { q: "哪些動作會扣點？", a: "目前只有「抽牌解讀」會扣點，每次 −2 點。" },
  { q: "點數會過期或清零嗎？", a: "不會。點數永久有效、不清零，餘額也不會變成負數。" },
  { q: "點數不夠抽牌怎麼辦？", a: "回去填寫每日感恩日記賺點（每天 +1，連續還有加碼），或聯絡管理員加值。" },
  { q: "連續天數中斷會怎樣？", a: "連續天數會歸零重新計算，但已領到的點數不會被收回。建議盡量每天回來打卡。" },
  { q: "太久沒操作被登出了？", a: "這是安全機制，重新登入即可。想減少重登，登入時勾選「保持登入 21 天」。" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-gold border-l-2 border-gold pl-3">{children}</h2>;
}

function PublicHeader() {
  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gold-gradient">
          HOPE
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors">
            登入
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-1.5 bg-gold text-black font-medium rounded-md hover:bg-gold-light transition-colors"
          >
            免費註冊
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default async function GuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name, role").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="min-h-screen">
      {user ? (
        <Navbar userName={profile?.display_name || user.email || ""} userRole={profile?.role} />
      ) : (
        <PublicHeader />
      )}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <header className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gold-gradient">HOPE OS 人生升級系統是什麼？</h1>
          <p className="text-foreground/80">
            人生作業系統 — 一套幫助你盤點現況、找到方向、持續行動的人生成長系統。
          </p>
          <p className="text-sm text-muted-foreground">
            從每天打卡、抽牌解讀到點數規則，一次看懂 HOPE 怎麼用。
          </p>
          {!user && (
            <div className="flex gap-3 justify-center pt-2">
              <Link
                href="/auth/register"
                className="px-6 py-2.5 bg-gold text-black font-semibold rounded-lg hover:bg-gold-light transition-colors"
              >
                免費註冊（送 4 點）
              </Link>
              <Link
                href="/auth/login"
                className="px-6 py-2.5 border border-gold/30 text-gold rounded-lg hover:border-gold/60 transition-colors"
              >
                登入
              </Link>
            </div>
          )}
        </header>

        {/* 核心循環 */}
        <section className="rounded-xl border border-gold/40 bg-gradient-to-r from-card via-gold/5 to-card p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">HOPE 的核心循環</p>
          <p className="text-base sm:text-lg font-medium leading-relaxed">
            每天<span className="text-gold">寫感恩日記</span> →
            累積<span className="text-gold">點數與連續天數</span> →
            用點數<span className="text-gold">抽量子牌卡</span>，獲得引導與覺察。
          </p>
          <p className="text-xs text-muted-foreground">
            養成「每天回來打卡」的習慣，系統會自動記錄成長、發放獎勵點數。
          </p>
        </section>

        {/* 點數規則 */}
        <section className="space-y-4">
          <SectionTitle>點數規則（最重要）</SectionTitle>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">寫感恩日記賺量子點數</span>，點數可用來抽<span className="text-gold">量子牌卡</span>，永久有效、不清零、不會變成負數。
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* 賺點 */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="font-semibold text-green-400">點數怎麼賺？</p>
              <ul className="space-y-2">
                {EARN_RULES.map((r) => (
                  <li key={r.action} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="text-foreground">{r.action}</p>
                      <p className="text-xs text-muted-foreground">{r.note}</p>
                    </div>
                    <span className="font-bold text-green-400 shrink-0">{r.point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 花點 */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="font-semibold text-red-400">點數怎麼花？</p>
              <ul className="space-y-2">
                {SPEND_RULES.map((r) => (
                  <li key={r.action} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="text-foreground">{r.action}</p>
                      <p className="text-xs text-muted-foreground">{r.note}</p>
                    </div>
                    <span className="font-bold text-red-400 shrink-0">{r.point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 text-sm">
            <p className="font-medium text-gold mb-1">寫感恩日記會扣點嗎？</p>
            <p className="text-muted-foreground">
              <span className="text-foreground">不會！</span>寫感恩日記不但不扣點，每天提交還會 <span className="text-green-400 font-medium">+1 點</span>。簡單說——<span className="text-foreground">寫感恩日記是賺點，抽牌才是花點。</span>
            </p>
          </div>
        </section>

        {/* 感恩日記 */}
        <section className="space-y-4">
          <SectionTitle>每天該做的事：感恩日記</SectionTitle>
          <p className="text-sm text-muted-foreground">
            這是 HOPE 的核心功能。每天填一份感恩日記，共 8 個段落，完成後自動 +1 點、連續天數 +1。
          </p>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {DAILY_PARTS.map((p) => (
              <div
                key={p.num}
                className={`flex items-start gap-4 p-4 ${p.highlight ? "bg-gold/5" : ""}`}
              >
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    p.highlight ? "bg-gold text-black" : "bg-background text-gold border border-gold/40"
                  }`}
                >
                  {p.num}
                </span>
                <div>
                  <p className="font-medium">
                    {p.title}
                    {p.highlight && <span className="ml-2 text-xs text-gold">← 每天必寫的核心</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href={user ? "/forms/daily" : "/auth/register"}
            className="inline-block rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 transition"
          >
            {user ? "去寫今日感恩日記 →" : "免費註冊，開始打卡 →"}
          </Link>
        </section>

        {/* 抽牌解讀 */}
        <section className="space-y-4">
          <SectionTitle>量子牌卡：抽牌解讀</SectionTitle>
          <p className="text-sm text-muted-foreground">
            需要靈感、想釐清問題時可以抽牌。每次抽牌取得 AI 解讀扣 <span className="text-red-400 font-medium">2 點</span>。
          </p>
          <ol className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm list-decimal list-inside marker:text-gold">
            <li>寫下你的問題（或從畫面上的主題快速選一個）。</li>
            <li>按「展開牌堆（−2 點）」，出現 3 張背面的牌。</li>
            <li>憑直覺點選其中一張，牌會翻面顯示。</li>
            <li>AI 即時為你串流解讀這張牌與問題的關聯。</li>
            <li>解讀完成後自動扣 2 點，餘額同步更新。</li>
          </ol>
          <Link
            href={user ? "/oracle" : "/auth/register"}
            className="inline-block rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/10 transition"
          >
            {user ? "前往能量牌卡 →" : "註冊後即可抽牌 →"}
          </Link>
        </section>

        {/* 其他功能 */}
        <section className="space-y-4">
          <SectionTitle>其他功能</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            {OTHER_FEATURES.map((f) =>
              user ? (
                <Link
                  key={f.href}
                  href={f.href}
                  className="rounded-xl border border-border bg-card p-4 hover:border-gold/40 transition group"
                >
                  <p className="font-medium group-hover:text-gold transition-colors">{f.name}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </Link>
              ) : (
                <div key={f.href} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              )
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <SectionTitle>常見問題</SectionTitle>
          <div className="space-y-2">
            {FAQ.map((item) => (
              <details key={item.q} className="rounded-xl border border-border bg-card p-4 group">
                <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
                  <span>{item.q}</span>
                  <span className="text-gold transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {!user && (
          <section className="rounded-xl border border-gold/30 bg-card p-8 text-center space-y-4">
            <p className="text-gold text-lg font-bold">準備好開始你的 HOPE 旅程了嗎？</p>
            <p className="text-sm text-muted-foreground">
              免費註冊即送 4 點體驗額度，立刻開始每日打卡、抽牌解讀。
            </p>
            <Link
              href="/auth/register"
              className="inline-block px-8 py-3 bg-gold text-black font-bold rounded-lg hover:bg-gold-light transition-colors"
            >
              免費註冊
            </Link>
          </section>
        )}

        <footer className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          {user ? "有其他問題，請聯絡你的教練或管理員。" : "© 希望學院 HOPE Academy"}
        </footer>
      </main>
    </div>
  );
}
