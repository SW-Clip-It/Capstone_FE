import { NextResponse } from "next/server";

// Cognito에서는 이메일 확인이 자동으로 처리되므로
// 확인 완료 후 로그인 페이지로 리다이렉트
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login?verified=true`);
}
