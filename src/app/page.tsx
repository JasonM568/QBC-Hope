import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center px-4">
      {/* Hero */}
      <div className="text-center max-w-2xl mt-24 mb-16">
        <h1 className="text-5xl font-bold mb-2 text-gold-gradient">
          HOPE
        </h1>
        <p className="text-2xl text-foreground/80 mb-4">
          人生作業系統
        </p>
        <p className="text-muted-foreground text-lg leading-relaxed mb-10">
          Hope Operating Platform for Empowerment<br />
          一套幫助你盤點現況、找到方向、持續行動的人生成長系統
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-gold text-black font-semibold rounded-lg hover:bg-gold-light transition-colors"
          >
            立即註冊
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3 border border-gold/30 text-gold rounded-lg hover:border-gold/60 transition-colors"
          >
            登入
          </Link>
        </div>
      </div>

      {/* Core Philosophy */}
      <div className="max-w-3xl w-full mb-16">
        <h2 className="text-xl font-bold text-center mb-8 text-gold">核心理念</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-2xl mb-3">1</p>
            <p className="text-foreground font-medium">人生不是被環境決定</p>
            <p className="text-gold font-semibold mt-1">而是被認知決定</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-2xl mb-3">2</p>
            <p className="text-foreground font-medium">每天都在升級自己</p>
            <p className="text-gold font-semibold mt-1">找到方法，看見希望</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-2xl mb-3">3</p>
            <p className="text-foreground font-medium">真正的成功</p>
            <p className="text-gold font-semibold mt-1">不是單一領域，而是整體人生的成長</p>
          </div>
        </div>
      </div>

      {/* Four Capital */}
      <div className="max-w-3xl w-full mb-16">
        <h2 className="text-xl font-bold text-center mb-2 text-gold">四大資本</h2>
        <p className="text-center text-muted-foreground mb-8">每個人都是一個經濟體，你的價值來自四種資本</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "經濟資本", desc: "收入、資產、財務穩定度" },
            { title: "智識資本", desc: "核心專業、學習能力" },
            { title: "社會資本", desc: "人脈、合作、信任關係" },
            { title: "心理資本", desc: "韌性、信心、恢復力" },
          ].map((c) => (
            <div key={c.title} className="p-5 rounded-xl border border-gold/20 bg-card text-center">
              <h3 className="text-gold font-semibold mb-2">{c.title}</h3>
              <p className="text-muted-foreground text-xs">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Five Engines */}
      <div className="max-w-4xl w-full mb-16">
        <h2 className="text-xl font-bold text-center mb-2 text-gold">五大引擎</h2>
        <p className="text-center text-muted-foreground mb-8">系統化工具，驅動你的人生成長</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "21天行動日報", desc: "每日八大 PART 循環：信念、覺察、學習、行動、分享、感恩、評分、明日計劃" },
            { title: "人生資本盤點", desc: "經濟 / 智識 / 社會 / 心理四大資本雙維度評分，掌握你的人生現況" },
            { title: "個人戰略定位", desc: "優勢分析、戰場選擇、機會判斷、一句話定位，找到你的方向" },
            { title: "五域平衡月報", desc: "事業 / 財富 / 健康 / 家庭 / 關係，每月 1-20 分全方位檢視" },
            { title: "利他影響力週報", desc: "記錄分享、幫助、引薦，成為照亮他人的人" },
            { title: "成長曲線分析", desc: "雷達圖 + 趨勢圖，視覺化你的成長軌跡" },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-xl border border-border bg-card card-hover">
              <h3 className="text-gold font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Principle */}
      <div className="max-w-2xl w-full mb-16 text-center">
        <div className="p-8 rounded-xl border border-gold/30 bg-card">
          <p className="text-gold text-xl font-bold mb-4">成功不是更努力，而是選對戰場。</p>
          <p className="text-muted-foreground leading-relaxed">
            HOPE 系統幫助你從盤點現況開始，找到核心優勢，選定戰場，
            透過 21 天的持續行動與覺察，建立屬於你的人生作業系統。
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mb-16">
        <Link
          href="/auth/register"
          className="px-10 py-4 bg-gold text-black font-bold text-lg rounded-lg hover:bg-gold-light transition-colors"
        >
          開始你的 HOPE 旅程
        </Link>
      </div>

      <footer className="mb-8 text-muted-foreground text-sm">
        &copy; {new Date().getFullYear()} 希望學院 HOPE Academy
      </footer>
    </div>
  );
}
