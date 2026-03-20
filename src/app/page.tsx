import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold mb-4 text-gold-gradient">
          HOPE
        </h1>
        <p className="text-2xl text-foreground/80 mb-2">
          人生作業系統
        </p>
        <p className="text-muted-foreground mb-10">
          打造你的五大引擎，啟動有方向的人生
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

      {/* Features */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {[
          { title: "21天行動日報", desc: "每日四步循環，養成高效習慣" },
          { title: "五域平衡月報", desc: "全方位檢視人生五大領域" },
          { title: "社群打卡牆", desc: "與夥伴互相激勵，一起成長" },
        ].map((f) => (
          <div
            key={f.title}
            className="p-6 rounded-xl border border-border bg-card card-hover"
          >
            <h3 className="text-gold font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm">{f.desc}</p>
          </div>
        ))}
      </div>

      <footer className="mt-20 mb-8 text-muted-foreground text-sm">
        &copy; {new Date().getFullYear()} 希望學院 HOPE Academy
      </footer>
    </div>
  );
}
