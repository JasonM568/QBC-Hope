"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hope.v2PointsBanner.dismissed";
const BANNER_VERSION = "2026-05-13";

export default function V2PointsBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissedVer = window.localStorage.getItem(STORAGE_KEY);
      if (dismissedVer !== BANNER_VERSION) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, BANNER_VERSION);
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="mb-6 rounded-xl border border-gold/40 bg-gradient-to-r from-gold/10 via-card to-gold/5 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0" aria-hidden>
          ✨
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gold">
            點數規則更新公告
          </p>
          <p className="text-sm text-foreground/85 mt-1 leading-relaxed">
            從即日起：日報送點調整為{" "}
            <span className="text-gold font-medium">+1 點</span>，新增{" "}
            <span className="text-gold font-medium">連續 7 天 +3 點</span>、{" "}
            <span className="text-gold font-medium">21 天里程碑 +10 點</span>{" "}
            的長期獎勵。連續打卡越久、回饋越多。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/points"
              className="inline-flex items-center rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-black hover:bg-gold/90 transition"
            >
              查看我的 streak
            </Link>
            <button
              onClick={dismiss}
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              我知道了
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="關閉公告"
          className="text-muted-foreground hover:text-foreground transition text-lg leading-none shrink-0 -mt-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
