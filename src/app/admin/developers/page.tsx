"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";

export default function DevelopersPage() {
  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-10">
      <h1 className="text-3xl font-bold text-on-background mb-2">
        Developer API
      </h1>
      <p className="text-sm text-on-surface-variant mb-5">
        LLM·영상 개발자가 CLIP-IT 서버에 직접 GET/POST 하는 방법. 모든 요청에{" "}
        <code className="text-accent-primary">Authorization: Bearer &lt;ADMIN_API_KEY&gt;</code>{" "}
        헤더가 필요합니다.
      </p>

      {/* Mapping rule callout */}
      <div className="mb-8 p-4 rounded-xl border border-accent-primary/30 bg-accent-primary/5">
        <h3 className="text-sm font-bold text-accent-primary mb-2 flex items-center gap-2">
          <Icon name="link" size={16} />
          매핑 규칙 (단 하나)
        </h3>
        <ul className="text-xs text-on-surface-variant leading-relaxed space-y-1 list-disc pl-4">
          <li>
            <b>S3 경로(사람이 읽기 좋게):</b>{" "}
            <code className="text-accent-primary">videos/&#123;slug&#125;/&#123;chapter&#125;_&#123;scene&#125;.mp4</code>
            {" "}— 예: <code>videos/sign-of-four/1_1.mp4</code> (책별 폴더로 정리)
          </li>
          <li>
            <b>DB 연결:</b> 등록 시 경로의 <code>(slug, chapter, scene)</code> 를{" "}
            text_block 으로 자동 조회해서 연결. (영상 개발자는 UUID 몰라도 됨)
          </li>
          <li>
            <code>slug</code> = 책의 S3-안전 식별자 (예{" "}
            <code>sign-of-four</code>). 책 폴더 이름이라고 보면 됩니다.
          </li>
          <li>
            AWS 콘솔/CLI로 위 경로에 올리면 → S3 웹훅이 자동 등록, 또는{" "}
            <code>register-uploaded-videos.js</code> 로 일괄 등록.
          </li>
        </ul>
      </div>

      <Section
        role="LLM 개발자"
        icon="auto_stories"
        desc="책 본문(JSONL)을 서버에 적재합니다."
      >
        <Endpoint
          method="POST"
          path="/api/admin/books"
          desc="책 한 권 적재/갱신 (slug 같으면 덮어쓰기)"
          body={`{
  "title": "The Sign of the Four",
  "title_ko": "네 사람의 서명",
  "author": "Arthur Conan Doyle",
  "slug": "sign-of-four",
  "cover_image": "https://covers.openlibrary.org/b/isbn/9780140439083-L.jpg",
  "scenes": [
    { "Chapter": 1, "Scene number": 1, "Content": "...", "Content_kor": "..." }
  ]
}`}
          curl={`curl -X POST https://YOUR_DOMAIN/api/admin/books \\
  -H "Authorization: Bearer $ADMIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d @book.json`}
        />
        <Endpoint
          method="GET"
          path="/api/admin/books"
          desc="적재된 모든 책 + 영상 커버리지 조회"
        />
      </Section>

      <Section
        role="영상 개발자"
        icon="movie"
        desc="만들어야 할 장면을 조회하고, 영상을 업로드·연결합니다."
      >
        <Endpoint
          method="GET"
          path="/api/admin/books/{slug}/pending"
          desc="아직 영상이 없는 장면 목록 (각 장면의 text_block_id + 업로드 S3 키)"
          curl={`curl https://YOUR_DOMAIN/api/admin/books/sign-of-four/pending \\
  -H "Authorization: Bearer $ADMIN_API_KEY"`}
          resp={`{
  "slug": "sign-of-four",
  "pending_count": 279,
  "pending": [
    { "chapter": 1, "scene": 1,
      "text_block_id": "58714e86-...",
      "storage_key": "videos/sign-of-four/1_1.mp4" }
  ]
}`}
        />
        <Endpoint
          method="POST"
          path="/api/admin/videos/upload-url"
          desc="Presigned PUT URL 발급 — AWS 키 없이 S3에 직접 업로드"
          body={`{ "slug": "sign-of-four", "chapter": 1, "scene": 1 }
// 또는: { "text_block_id": "58714e86-..." }`}
          resp={`{ "upload_url": "https://...s3...",
  "storage_key": "videos/sign-of-four/1_1.mp4",
  "text_block_id": "58714e86-...", "expires_in": 3600 }`}
          curl={`# 1) URL 발급 (slug + chapter + scene)
curl -X POST https://YOUR_DOMAIN/api/admin/videos/upload-url \\
  -H "Authorization: Bearer $ADMIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"sign-of-four","chapter":1,"scene":1}'

# 2) 받은 URL로 영상 PUT 업로드 (자격증명 불필요)
curl -X PUT "$UPLOAD_URL" -H "Content-Type: video/mp4" --data-binary @1_1.mp4`}
        />
        <Endpoint
          method="POST"
          path="/api/admin/videos"
          desc="업로드한 영상을 장면에 연결 (S3 웹훅이 자동 처리하면 생략 가능)"
          body={`{ "slug": "sign-of-four", "chapter": 1, "scene": 1,
  "storage_path": "videos/sign-of-four/1_1.mp4" }`}
        />
        <div className="rounded-xl border border-glass-border bg-background p-4 text-xs text-on-surface-variant leading-relaxed">
          <b className="text-on-surface">AWS 콘솔/CLI로 직접 올리는 경우</b> — 파일명을{" "}
          <code className="text-accent-primary">videos/&#123;slug&#125;/&#123;chapter&#125;_&#123;scene&#125;.mp4</code>{" "}
          로 올리면 됩니다.
          <pre className="mt-2 p-2 rounded bg-surface-secondary overflow-x-auto">{`aws s3 cp ./1_1.mp4 \\
  s3://clipit-videos-2026/videos/sign-of-four/1_1.mp4 \\
  --content-type video/mp4`}</pre>
          업로드 후 S3 웹훅이 자동 등록하거나, 관리자가{" "}
          <code>node scripts/register-uploaded-videos.js</code> 한 번 실행.
        </div>
      </Section>

      <div className="mt-8 p-4 rounded-xl border border-glass-border bg-glass-bg">
        <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
          <Icon name="key" size={16} className="text-accent-primary" />
          ADMIN_API_KEY 발급
        </h3>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          서버 환경변수 <code>ADMIN_API_KEY</code> 에 임의의 긴 문자열을 설정하고,
          그 값을 개발자에게 전달하세요. (Vercel → Settings → Environment Variables)
          개발자는 이 키를 자기 서버 환경변수에 넣고 위 요청의 Bearer 토큰으로 사용합니다.
        </p>
      </div>
    </div>
  );
}

function Section({
  role,
  icon,
  desc,
  children,
}: {
  role: string;
  icon: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size={20} className="text-accent-primary" />
        <h2 className="text-lg font-bold text-on-surface">{role}</h2>
      </div>
      <p className="text-sm text-on-surface-variant mb-4">{desc}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Endpoint({
  method,
  path,
  desc,
  body,
  resp,
  curl,
}: {
  method: string;
  path: string;
  desc: string;
  body?: string;
  resp?: string;
  curl?: string;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"body" | "resp" | "curl">(
    curl ? "curl" : body ? "body" : "resp"
  );
  const methodColor =
    method === "GET"
      ? "bg-info/15 text-info"
      : method === "POST"
        ? "bg-success/15 text-success"
        : "bg-error/15 text-error";

  const tabs = [
    body && { id: "body" as const, label: "Request" },
    resp && { id: "resp" as const, label: "Response" },
    curl && { id: "curl" as const, label: "curl" },
  ].filter(Boolean) as { id: "body" | "resp" | "curl"; label: string }[];

  const content = tab === "body" ? body : tab === "resp" ? resp : curl;

  return (
    <div className="rounded-xl border border-glass-border bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-glass-border">
        <span
          className={cn(
            "px-2 py-0.5 rounded text-xs font-bold shrink-0",
            methodColor
          )}
        >
          {method}
        </span>
        <code className="text-sm text-on-surface font-mono truncate">{path}</code>
      </div>
      <div className="px-4 py-2 text-xs text-on-surface-variant">{desc}</div>
      {content && (
        <div>
          <div className="flex items-center gap-1 px-4">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-t-md font-medium",
                  tab === tb.id
                    ? "text-accent-primary border-b-2 border-accent-primary"
                    : "text-on-surface-variant"
                )}
              >
                {tb.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => {
                navigator.clipboard.writeText(content);
                toast("복사됨", "success");
              }}
              className="text-[11px] text-on-surface-variant hover:text-accent-primary flex items-center gap-1 py-1"
            >
              <Icon name="content_copy" size={12} /> 복사
            </button>
          </div>
          <pre className="px-4 py-3 bg-surface-secondary text-[11px] leading-relaxed text-on-surface overflow-x-auto whitespace-pre">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
