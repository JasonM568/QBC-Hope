import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except for public routes)
  const publicRoutes = ["/auth/login", "/auth/register", "/auth/callback", "/auth/confirm", "/auth/forgot-password", "/auth/reset-password", "/guide", "/api/"];
  const isPublicRoute =
    publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route)) ||
    request.nextUrl.pathname === "/";

  if (!user && !isPublicRoute) {
    // 用請求當下的 origin（localhost 跑本機、prod 跑 prod），避免本機 dev 被踢到正式站
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
