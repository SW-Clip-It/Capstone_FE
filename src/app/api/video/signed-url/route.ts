import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPresignedUrl } from "@/lib/aws/s3";
import { SIGNED_URL_TTL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Verify authenticated
  const cookieStore = cookies();
  const token = cookieStore.get("cognitoIdToken")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storagePath } = await request.json();
  if (!storagePath || typeof storagePath !== "string") {
    return NextResponse.json(
      { error: "storagePath is required" },
      { status: 400 }
    );
  }

  // External URLs (https://) — pass through as-is.
  // Useful for demo/sample videos hosted outside S3 (Wikipedia, Google CDN, etc.)
  // In production, videos will be S3 keys like "jane-eyre/ch1/block-1.mp4"
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return NextResponse.json({ signedUrl: storagePath });
  }

  try {
    const signedUrl = await createPresignedUrl(storagePath, SIGNED_URL_TTL);
    return NextResponse.json({ signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
