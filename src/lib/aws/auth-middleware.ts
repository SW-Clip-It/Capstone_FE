import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Cognito JWT는 "cognitoIdToken" 쿠키에 저장
  const idToken = request.cookies.get("cognitoIdToken")?.value;

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/library") ||
    request.nextUrl.pathname.startsWith("/works") ||
    request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/bookmarks") ||
    request.nextUrl.pathname.startsWith("/notes") ||
    request.nextUrl.pathname.startsWith("/admin");
  // 보안 중요

  const isAuthRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup";

  // 미인증 사용자 → 보호 라우트 접근 시 로그인 페이지로 리다이렉트
  if (!idToken && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 인증된 사용자 → 인증 페이지 접근 시 라이브러리로 리다이렉트
  if (idToken && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/library";
    return NextResponse.redirect(url);
  }

  return response;
}
