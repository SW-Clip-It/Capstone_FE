# CLIP-IT — S3 비디오 파이프라인 가이드

> AI Video Gen 개발자가 생성한 영상을 CLIP-IT S3 버킷에 등록하고, 자동으로 DB와 연결되도록 하는 파이프라인 명세서.

---

## 1. 개요

CLIP-IT은 텍스트 블록(text_block) 단위로 AI 영상을 매핑합니다. AI Video Gen 개발자가 영상을 생성하면, 그 영상이 **자동으로 S3에 업로드 → DB에 등록 → 프론트엔드에서 즉시 재생** 가능해야 합니다.

### 데이터 흐름

```
┌─────────────────┐                    ┌──────────────┐
│ Video Gen 개발자│                    │  AWS S3      │
│ (외부 파이프라인)│  ───PUT object───▶ │  clipit-videos
└────────┬────────┘    (Presigned URL) └──────┬───────┘
         │                                     │
         │ POST /api/admin/videos              │
         │   { text_block_id, key, duration }  │
         ▼                                     │
┌─────────────────┐                            │
│ CLIP-IT Backend │                            │
│ (Next.js API)   │ ──INSERT video_clips───┐   │
└────────┬────────┘                        ▼   │
         │                          ┌──────────┴───┐
         │                          │  AWS RDS     │
         └──signed URL on read───── │  video_clips │
                                    └──────────────┘
```

---

## 2. S3 버킷 구조

### 버킷명
- **운영**: `clipit-videos-2026` (현재 운영 중)
- **리전**: `ap-northeast-1` (도쿄)

### 디렉터리 컨벤션

```
clipit-videos-2026/
├── works/
│   ├── jane-eyre/
│   │   ├── ch1/
│   │   │   ├── block-1.mp4              ← 영상
│   │   │   ├── block-1.thumbnail.jpg    ← 썸네일 (선택)
│   │   │   ├── block-2.mp4
│   │   │   └── ...
│   │   └── ch2/
│   │       └── ...
│   ├── pride-and-prejudice/
│   └── moby-dick/
│
├── covers/                              ← 작품 표지 (선택, public-read 가능)
│   ├── jane-eyre.jpg
│   └── ...
│
└── _staging/                            ← Video Gen이 업로드하는 임시 영역
    └── {uuid}.mp4                       ← 검수 후 works/로 이동
```

### 키(Key) 명명 규칙

```
works/{work-slug}/ch{chapter_number}/block-{block_order}.mp4
```

예시:
- `works/jane-eyre/ch1/block-3.mp4` → Jane Eyre의 1챕터 3번째 블록
- `works/moby-dick/ch1/block-1.mp4` → Moby Dick의 1챕터 1번째 블록

---

## 3. Video Gen 개발자 업로드 방법

### 옵션 A: Presigned PUT URL 사용 (권장)

CLIP-IT 백엔드가 일회용 업로드 URL을 발급하면, 개발자는 그 URL로 직접 PUT 업로드합니다.
- ✅ AWS 자격증명을 외부에 노출하지 않음
- ✅ 만료 시간 제한 가능 (1시간)
- ✅ 업로드 완료 후 백엔드가 메타데이터 자동 등록

#### 1) 업로드 URL 발급 받기

```http
POST https://clipit.app/api/admin/videos/upload-url
Authorization: Bearer <ADMIN_API_KEY>
Content-Type: application/json

{
  "text_block_id": "550e8400-e29b-41d4-a716-446655440000",
  "content_type": "video/mp4",
  "duration_seconds": 45.5
}
```

응답:
```json
{
  "upload_url": "https://clipit-videos-2026.s3.ap-northeast-1.amazonaws.com/...?X-Amz-Signature=...",
  "storage_key": "works/jane-eyre/ch1/block-3.mp4",
  "expires_in": 3600
}
```

#### 2) 영상 업로드 (PUT)

```bash
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary @scene.mp4
```

#### 3) 업로드 완료 통지 (DB 등록)

```http
POST https://clipit.app/api/admin/videos/complete
Authorization: Bearer <ADMIN_API_KEY>

{
  "text_block_id": "550e8400-e29b-41d4-a716-446655440000",
  "storage_key": "works/jane-eyre/ch1/block-3.mp4",
  "duration_seconds": 45.5,
  "file_size_bytes": 12345678
}
```

→ 백엔드가 `video_clips` 테이블에 INSERT/UPSERT 합니다.

---

### 옵션 B: AWS CLI / Boto3 (운영자/개발자 직접 업로드)

테스트나 일괄 마이그레이션 시 사용. IAM 사용자 자격증명 필요.

```bash
# 1) AWS CLI 설정
aws configure --profile clipit-uploader
# Access key ID, Secret access key, region=ap-northeast-1 입력

# 2) 영상 업로드
aws s3 cp scene.mp4 \
  s3://clipit-videos-2026/works/jane-eyre/ch1/block-3.mp4 \
  --profile clipit-uploader \
  --content-type video/mp4

# 3) DB에 메타데이터 등록 (psql 또는 API 호출)
psql $DATABASE_URL -c "
  INSERT INTO video_clips (text_block_id, storage_path, duration_seconds)
  VALUES ('550e8400-...', 'works/jane-eyre/ch1/block-3.mp4', 45.5)
  ON CONFLICT (text_block_id) DO UPDATE
    SET storage_path = EXCLUDED.storage_path,
        duration_seconds = EXCLUDED.duration_seconds;
"
```

---

### 옵션 C: 자동화된 파이프라인 (Production 권장)

Video Gen 개발자가 **자체 워크플로우에 통합**할 수 있도록 SDK/CLI 제공:

```python
# video_gen_pipeline.py
from clipit_sdk import ClipItClient

client = ClipItClient(
    api_key=os.environ["CLIPIT_API_KEY"],
    base_url="https://clipit.app",
)

# 영상 생성 후 자동 업로드 + DB 등록
client.upload_video(
    text_block_id="550e8400-...",
    file_path="output/scene.mp4",
    duration_seconds=45.5,
    thumbnail_path="output/scene_thumb.jpg",  # optional
)
```

---

## 4. 프론트엔드 재생 흐름

업로드된 영상이 어떻게 재생되는지:

1. 사용자가 텍스트 블록 클릭 → `activeBlockId` 변경
2. `VideoPanel`이 `/api/video/signed-url` 호출
   ```json
   POST /api/video/signed-url
   { "storagePath": "works/jane-eyre/ch1/block-3.mp4" }
   ```
3. 백엔드(`src/lib/aws/s3.ts`)가 `getSignedUrl(GetObjectCommand)`로 **1시간 유효** Presigned URL 생성
4. `<ReactPlayer>`가 해당 URL로 영상 재생
5. 재생 중 진행률을 `useReaderStore.setVideoProgress(0..1)`로 push
6. 활성 텍스트 블록의 **이퀄라이저 테두리**가 진행률에 맞춰 채워짐
7. 영상 종료 시 `onEnded` 콜백 → 다음 영상 있는 블록으로 `activeBlock` 자동 이동
8. 다음 영상이 prefetch 되어 있으므로 끊김 없이 재생

---

## 5. S3 버킷 정책 설정

### CORS 설정 (필수)

브라우저에서 직접 PUT/GET 하려면 CORS 허용 필요.

```json
[
  {
    "AllowedOrigins": [
      "https://clipit.app",
      "https://www.clipit.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 버킷 정책 (Public read 없음, Presigned URL 전용)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::clipit-videos-2026/*",
      "Condition": {
        "StringNotEquals": {
          "s3:authType": "REST-QUERY-STRING"
        }
      }
    }
  ]
}
```

→ Presigned URL이 아닌 직접 접근은 거부.

### IAM 사용자 권한 (Video Gen 업로드용)

별도 IAM 사용자 `clipit-video-uploader` 생성, 다음 정책 부여:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::clipit-videos-2026/works/*"
    }
  ]
}
```

→ `works/` 하위에만 업로드 가능. 삭제·읽기 권한 없음.

---

## 6. 미들웨어 / 검증

### 백엔드 API 측 검증 항목

`/api/admin/videos/complete` 핸들러:

1. **API Key 검증**: `ADMIN_API_KEY` 환경변수와 일치하는지
2. **text_block_id 존재 확인**: DB에 해당 블록이 있는지
3. **S3 객체 존재 확인**: `HeadObjectCommand`로 실제 업로드됐는지 확인
4. **MIME 타입 검증**: `video/mp4` 또는 `video/webm`인지
5. **파일 크기 제한**: 200MB 이하 (Free Tier 고려)
6. **DB UPSERT**:
   ```sql
   INSERT INTO video_clips (text_block_id, storage_path, duration_seconds, file_size_bytes)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (text_block_id) DO UPDATE
   SET storage_path = EXCLUDED.storage_path,
       duration_seconds = EXCLUDED.duration_seconds,
       file_size_bytes = EXCLUDED.file_size_bytes,
       created_at = NOW();
   ```

---

## 7. 테스트(Demo) 환경

**현재 운영 중인 테스트 데이터:**
- DB의 `video_clips.storage_path`는 **외부 URL**도 허용
- 시드 데이터(`scripts/seed-demo.sql`)는 Google 공개 샘플 영상(`commondatastorage.googleapis.com/gtv-videos-bucket/...`)을 사용
- `/api/video/signed-url`은 `https://`로 시작하는 storage_path는 **그대로 pass-through**
- 따라서 실제 S3 업로드 없이도 즉시 재생 테스트 가능

**프로덕션 전환 시:**
1. AI Video Gen 개발자가 위 옵션 A/B/C 중 하나로 영상 업로드
2. `video_clips.storage_path`가 외부 URL → S3 키로 자연스럽게 교체
3. 프론트엔드 코드 변경 불필요 (storage_path 종류 자동 감지)

---

## 8. 향후 확장 계획

| 기능 | 설명 | 우선순위 |
|------|------|---------|
| **CloudFront CDN** | S3 앞단에 CloudFront 배치 → 전 세계 캐싱·고속 스트리밍 | 높음 |
| **다중 해상도(HLS)** | MP4 → HLS(.m3u8) 변환으로 적응형 비트레이트 스트리밍 | 중간 |
| **자동 썸네일 생성** | 영상 업로드 시 Lambda로 첫 프레임 추출 | 중간 |
| **영상 검수 대시보드** | 운영자가 업로드된 영상을 검수·승인하는 UI | 낮음 |
| **삭제 정책** | 30일 이상 미사용 staging 영상 자동 정리 (S3 Lifecycle) | 낮음 |

---

## 9. 환경 변수 체크리스트

`.env.local` (백엔드)에 필요한 환경 변수:

```bash
# S3
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=clipit-videos-2026

# Admin API (영상 업로드용)
ADMIN_API_KEY=<랜덤 64자 문자열>

# DB
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

Video Gen 개발자에게 전달할 정보:
- `ADMIN_API_KEY` (위와 동일한 값)
- API endpoint: `https://clipit.app/api/admin/videos/...`
- 또는 IAM 사용자 자격증명 (옵션 B)

---

*Last updated: 2026-04 · Maintainer: 이규민*
