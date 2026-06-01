/**
 * Resolves a video's playable URL.
 *
 * - For S3 storage keys → asks our own `/api/video/signed-url` route to mint
 *   a short-lived presigned URL (server holds the AWS credentials).
 * - For external demo URLs (https://…) → the API route passes them through.
 *
 * URLs are cached client-side for 50 minutes (presigned URLs live 60).
 */
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getSignedVideoUrl(storagePath: string): Promise<string> {
  const cached = urlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const res = await fetch("/api/video/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath }),
  });

  if (!res.ok) throw new Error("Failed to get signed URL");

  const { signedUrl } = await res.json();

  urlCache.set(storagePath, {
    url: signedUrl,
    expiresAt: Date.now() + 50 * 60 * 1000,
  });

  return signedUrl;
}
