import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // 將 Vercel 子網域轉向到正式網域
  const host = request.headers.get("host") || "";
  if (host.includes("vercel.app")) {
    const url = new URL(request.url);
    url.host = "hope.huangxi.info";
    url.protocol = "https";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  // 重設密碼頁面完全跳過 session 處理，避免干擾 token
  if (request.nextUrl.pathname.startsWith("/auth/reset-password")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
