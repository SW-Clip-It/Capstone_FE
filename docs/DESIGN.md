# CLIP-IT 디자인 시스템 & 페이지 구성 분석

> Literary Classics Video Platform — 다크 테마 기반 글래스모피즘(Liquid Glass) 디자인 시스템

---

## 1. 디자인 컨셉 개요

### 핵심 컨셉: **Liquid Glass × Dark Aesthetic**

CLIP-IT은 고전 문학의 **격조 있는 무드**와 AI 영상의 **현대적 시각 경험**을 동시에 표현하기 위해, 다음과 같은 디자인 방향을 채택했습니다:

| 요소 | 방향 |
|------|------|
| **무드** | 깊고 차분한 다크 톤 — 문학적 몰입감 강조 |
| **소재감** | 반투명 유리(Glassmorphism) + 백드롭 블러 — 영상이 깔리는 환경 고려 |
| **포인트** | 인디고/바이올렛 그라데이션 — 고전과 디지털의 교차점을 시각화 |
| **인터랙션** | 마이크로 애니메이션(Framer Motion) — 텍스트→영상 연결을 자연스럽게 |

---

## 2. 디자인 토큰 (Design Tokens)

### 2.1 컬러 팔레트

```typescript
// tailwind.config.js
colors: {
  // Surface (배경 계층)
  surface: {
    primary:   "#0a0a0f",  // 최하위 배경 (거의 블랙)
    secondary: "#12121a",  // 카드 배경
    tertiary:  "#1a1a25",  // 한 단계 위 배경
  },

  // Glass (반투명 유리)
  glass: {
    bg:             "rgba(255, 255, 255, 0.04)",  // 기본 유리
    "bg-hover":     "rgba(255, 255, 255, 0.08)",
    border:         "rgba(255, 255, 255, 0.08)",
    "border-hover": "rgba(255, 255, 255, 0.15)",
    highlight:      "rgba(255, 255, 255, 0.12)",
  },

  // Accent (포인트)
  accent: {
    primary:   "#6366f1",  // 인디고 (메인)
    secondary: "#8b5cf6",  // 바이올렛 (서브)
    glow:      "rgba(99, 102, 241, 0.3)",  // 글로우 효과
  },

  // Text (타이포)
  txt: {
    primary:   "#f0f0f5",  // 본문 (거의 흰색)
    secondary: "#a0a0b0",  // 부가 정보 (회색)
    muted:     "#606070",  // 비활성 (어두운 회색)
  },

  // Status
  success: "#22c55e",
  error:   "#ef4444",
  warning: "#f59e0b",
  info:    "#3b82f6",
}
```

### 2.2 타이포그래피
- **Font Family**: `Inter` (Google Fonts)
- **Weight Scale**: 400 (regular) / 500 (medium) / 600 (semibold) / 700 (bold)
- **Hero Title**: `text-7xl` (72px) bold + 그라데이션 텍스트
- **Page Title**: `text-3xl` (30px) bold
- **Section Title**: `text-xl` (20px) semibold
- **Body**: `text-sm` (14px)
- **Caption**: `text-xs` (12px)

### 2.3 간격 & 라운딩

| 토큰 | 값 |
|------|-----|
| 카드 라운딩 | `rounded-2xl` (16px) |
| 버튼 라운딩 | `rounded-xl` (12px) |
| 컨테이너 max-width | `max-w-7xl` (라이브러리), `max-w-5xl` (홈), `max-w-3xl` (북마크/프로필) |
| 섹션 vertical padding | `py-20 ~ py-32` |

### 2.4 애니메이션

```css
animation: {
  shimmer:      "shimmer 2s infinite linear",      /* 스켈레톤 로딩 */
  float:        "float 6s ease-in-out infinite",   /* 배경 그라데이션 */
  "glow-pulse": "glow-pulse 2s ease-in-out infinite", /* 강조 글로우 */
}
```
**Framer Motion 패턴:**
- **Stagger Children**: `staggerChildren: 0.08~0.15s` — 그리드 카드 순차 등장
- **fadeUp**: `y: 20 → 0, opacity: 0 → 1` — 진입 애니메이션
- **whileHover**: `scale: 1.02` / **whileTap**: `scale: 0.97~0.99`

---

## 3. Liquid Glass 시스템

CLIP-IT의 시그니처 시각 요소. `src/styles/liquid-glass.css`에 정의.

### 3.1 3단계 글래스 레벨

| 클래스 | 용도 | 블러 | 배경 투명도 |
|--------|------|------|-------------|
| `.glass-light` | 미묘한 강조 | `blur(8px)` | 2% |
| `.glass` | 기본 카드 | `blur(12px)` | 4% |
| `.glass-heavy` | 네비게이션·모달 | `blur(24px)` | 6% |

### 3.2 특수 효과

- **`.glass-glow`**: 인디고 외곽 빛 — 활성 상태 강조
- **`.glass-glow-active`**: 더 강한 다층 글로우 — 현재 재생 중인 텍스트 블록
- **`.glass-gradient-border`**: 회전하는 그라데이션 보더 — 활성 요소 어트랙터
- **`.glass-noise`**: SVG fractalNoise 텍스처 오버레이 — 유리 질감 추가

---

## 4. 컴포넌트 라이브러리

### 4.1 UI 프리미티브 (`src/components/ui/`)

| 컴포넌트 | 역할 | 주요 prop |
|---------|------|----------|
| `GlassCard` | 모든 카드 컨테이너의 기본형 | `variant`, `glow`, `hover`, `tilt` (3D 마우스 추적) |
| `GlassButton` | 버튼 통합 | `variant: primary/secondary/ghost`, `size: sm/md/lg`, `icon`, `iconRight`, `loading` |
| `GlassInput` | 입력 필드 | `label`, `error`, `icon` (포커스 시 글로우) |
| `Icon` | Material Symbols 래퍼 | `name`, `size`, `fill`, `className` |
| `Skeleton` | 로딩 플레이스홀더 | `variant: text/card/avatar/video` (shimmer 애니메이션) |
| `Toast` | 알림 메시지 | `success/error/info` |
| `LanguageSwitcher` | 한↔EN 토글 | i18next 연동 |

### 4.2 레이아웃 컴포넌트 (`src/components/layout/`)

- **`Navbar`**: `glass-heavy` sticky 네비게이션바
  - 좌측: 로고 + 서비스명
  - 중앙: Library / Bookmarks 링크 (active 시 인디고 강조)
  - 우측: 언어 스위처 + 사용자 메뉴(드롭다운) / 로그인·회원가입 버튼
  - 모바일: 햄버거 메뉴 토글

### 4.3 기능 컴포넌트 (`src/components/features/reader/`)

- **`TextPanel`**: 좌측 텍스트 영역 — 챕터 네비게이션 + 텍스트 블록 리스트 + 자동 스크롤
- **`TextBlock`**: 개별 텍스트 단락
  - **영상 있음**: 클릭 가능, `play_arrow` 아이콘
  - **영상 없음**: 비활성화 (opacity 70%), `text_snippet` 아이콘
  - **활성 상태**: `glass-glow-active` + `glass-gradient-border` + 상단 "Now Playing" 배지
- **`VideoPanel`**: 우측 영상 영역 — 활성 블록의 S3 Presigned URL 가져와 재생 + 다음 블록 prefetch
- **`VideoPlayer`**: ReactPlayer 기반 커스텀 플레이어
  - 진행 바 클릭 시크
  - 자동 컨트롤 숨김 (3초)
  - 볼륨/뮤트/풀스크린/버퍼링 인디케이터

---

## 5. 페이지별 구성 분석

### 5.1 사이트맵 & 라우트 구조

```
/                                    → 홈 (히어로 + How It Works)
├── (auth)/                          → 인증 그룹 (Navbar 없음, 그라데이션 배경)
│   ├── /login                       → 로그인
│   ├── /signup                      → 회원가입
│   └── /confirm?email=…             → 이메일 인증 (6자리 코드)
│
└── (main)/                          → 메인 그룹 (Navbar 포함)
    ├── /library                     → 작품 라이브러리 (그리드)
    ├── /works/[workId]              → 작품 상세 + 챕터 목록
    ├── /works/[workId]/reader       → 텍스트 + 영상 리더 (2분할)
    ├── /bookmarks                   → 북마크 모음
    └── /profile                     → 프로필 + 독서 기록
```

### 5.2 페이지별 상세 구성

---

#### 🏠 **홈 (`/`)** — `src/app/page.tsx`

| 영역 | 구성 |
|------|------|
| **Navbar** | 상단 sticky |
| **Hero Section** | `py-24~40` 풀스크린 — 중앙 정렬 |
| └─ 배경 효과 | 좌상단·우하단 거대한 인디고/바이올렛 블러 원 (`blur-[160px]`) |
| └─ 타이틀 | "고전 문학," (white) + "영상으로 되살아나다" (그라데이션 텍스트) — `text-7xl` |
| └─ 서브타이틀 | 회색 본문 (`text-txt-secondary`) |
| └─ CTA | "라이브러리 탐색" (primary) + "시작하기" (secondary) 2개 버튼 |
| **How It Works** | 3컬럼 그리드 — Read / Watch / Experience |
| └─ 카드 구조 | 아이콘 원형 배경(인디고 10%) + 제목 + 설명, `tilt` 효과 활성화 |
| **Footer** | 상단 보더 + Copyright |

**디자인 의도**: 고전적 진지함을 흰색 타이포로, 영상 컨셉을 그라데이션 텍스트로 동시 전달.

---

#### 🔐 **인증 페이지** — `src/app/(auth)/`

| 페이지 | 구성 |
|--------|------|
| **레이아웃** (`/auth/layout.tsx`) | Navbar 없음, 화면 중앙 정렬, **부드러운 떠다니는 그라데이션 배경** (`animate-float`, 6s loop) |
| **로그인** (`/login`) | `GlassCard variant="heavy"` 단일 카드 — 로고 아이콘 + 이메일/비밀번호 입력 + 로그인 버튼 + 회원가입 링크 |
| **회원가입** (`/signup`) | 이메일 + 비밀번호 + 비밀번호 확인 — 클라이언트 측 유효성 검증 (passwordMismatch / passwordMinLength) |
| **이메일 인증** (`/confirm`) | `mark_email_read` 아이콘 + 이메일(prefill) + 6자리 코드 입력 — Cognito `confirmSignUp` 호출 |

**디자인 의도**: Navbar 제거로 집중도 ↑, 떠다니는 빛 효과로 시각적 즐거움 제공.

---

#### 📚 **라이브러리 (`/library`)** — `src/app/(main)/library/page.tsx`

| 영역 | 구성 |
|------|------|
| **헤더** | 좌측: 페이지 타이틀 + 서브타이틀 / 우측: 검색 인풋(아이콘) |
| **컨텐츠** | 그리드 — 1/2/3/4 컬럼 (모바일/태블릿/lg/xl) |
| **로딩 상태** | 8개 `Skeleton variant="card"` (shimmer 애니메이션) |
| **빈 상태** | `search_off` 아이콘 + 메시지 |
| **카드 구조** | `aspect-[3/4]` 표지 이미지 (호버 시 1.05배 줌) + 제목/저자/장르 칩/연도 |

**클라이언트 사이드 필터링**: 제목 또는 저자에 검색어 포함 여부.

**디자인 의도**: 책 표지 비율(3:4)을 그대로 살린 카드 — 서점 책장 같은 시각.

---

#### 📖 **작품 상세 (`/works/[workId]`)** — `src/app/(main)/works/[workId]/page.tsx`

| 영역 | 구성 |
|------|------|
| **Hero 영역** | 표지 이미지 블러 처리(`opacity-20 blur-lg scale-110`)를 배경으로 깔고, 위에 메타 정보 오버레이 |
| └─ 좌측 | `160×224` 표지 이미지 (`glass` 카드) |
| └─ 우측 | 제목 / 저자 / 장르 칩 / 연도 / 챕터 수 / 설명(3줄 truncate) / "Start Reading" 버튼 |
| **챕터 리스트** | 세로 리스트 — 챕터 번호 (인디고 원형 배지) + 제목 + 블록 수 + arrow_forward |
| └─ 애니메이션 | stagger `0.05s` + `x: -10 → 0` 슬라이드 인 |

**디자인 의도**: 표지 자체를 분위기 배경으로 활용 — 책 상세 페이지의 분위기 즉시 전달.

---

#### 🎬 **리더 (`/works/[workId]/reader`)** — `src/app/(main)/works/[workId]/reader/page.tsx`

> **CLIP-IT의 핵심 페이지** — 텍스트와 영상이 동기화되는 인터랙티브 리딩 경험.

| 영역 | 구성 |
|------|------|
| **레이아웃** | 모바일: 세로 분할 / `lg+`: 좌우 2분할 (`lg:w-1/2` ↔ `xl:w-[45%] : xl:w-[55%]`) |
| **좌측: TextPanel** | |
| └─ 상단 챕터 네비 | `← 이전 챕터` / 중앙: "Chapter N + 제목" / `다음 챕터 →` |
| └─ 본문 | 스크롤 영역, 텍스트 블록 리스트 (`space-y-3`) |
| └─ 활성 블록 표시 | `glass-glow-active` + 회전하는 그라데이션 보더 + "Now Playing" 배지 + 활성 시 스크롤 자동 센터링 |
| **우측: VideoPanel** | |
| └─ 상단 | `aspect-video` 영상 플레이어 (`sticky top-0`) |
| └─ 하단 | "Now Playing" 정보 카드 (현재 텍스트 첫 문장 강조 + 나머지 회색) |
| └─ 빈 상태 | `movie` 아이콘 + "텍스트 블록을 선택하면 장면이 재생됩니다" |

**핵심 인터랙션 흐름:**
1. 사용자가 좌측 텍스트 블록 클릭
2. `useReaderStore` Zustand 상태에서 `activeBlockId` 업데이트
3. VideoPanel이 활성 블록의 `storage_path`로 S3 Presigned URL fetch
4. 영상 자동 재생 시작 + 다음 블록 URL prefetch
5. 영상 종료 시 다음 영상 있는 블록으로 자동 이동

**디자인 의도**: 좌(읽기) ↔ 우(보기) 분할로 **동시성 강조** — "텍스트와 영상이 함께 흐르는" 경험.

---

#### 🔖 **북마크 (`/bookmarks`)** — `src/app/(main)/bookmarks/page.tsx`

| 영역 | 구성 |
|------|------|
| **헤더** | "북마크" 타이틀 + 서브타이틀 |
| **컨텐츠** | 단일 컬럼 리스트 (`max-w-3xl`) |
| **카드 구조** | 작품·챕터 정보(인디고 캡션) + 본문 발췌(150자 truncate) + 메모(이탤릭) + 우측 북마크 아이콘 |
| **클릭 동작** | 해당 챕터 리더로 직접 이동 |
| **빈 상태** | `bookmark` 아이콘 + 안내 메시지 |

**디자인 의도**: 저장한 구절을 빠르게 다시 펼쳐볼 수 있도록 모든 카드가 리더로 직접 점프하는 1-클릭 UX.

---

#### 👤 **프로필 (`/profile`)** — `src/app/(main)/profile/page.tsx`

| 영역 | 구성 |
|------|------|
| **사용자 정보 카드** | `hover={false}` (정보용) — 인디고 원형 아바타 + 이메일 + 가입일 + 로그아웃 버튼 |
| **독서 기록** | "독서 기록" 섹션 헤더 + 리스트 |
| └─ 카드 | 작품 제목 + 마지막 접속 날짜 + arrow_forward (해당 작품 상세로 이동) |
| └─ 빈 상태 | `history` 아이콘 + 안내 |

**디자인 의도**: 단순 명료 — 사용자 정보와 독서 활동만 보여주는 미니멀 프로필.

---

## 6. UX 인터랙션 패턴

### 6.1 페이지 전환
- `template.tsx`로 페이지 진입 시 fade-in 적용
- `motion.div` 단위 stagger 애니메이션

### 6.2 로딩 상태
- 모든 데이터 fetch 페이지는 `Skeleton` 컴포넌트로 첫 렌더 — shimmer 애니메이션
- 영상 로딩 중에는 `progress_activity` 회전 아이콘

### 6.3 빈 상태(Empty State)
- 모든 빈 리스트는 **아이콘 + 안내 텍스트** 쌍으로 통일
- 사용 아이콘: `search_off` (검색 결과 없음), `bookmark` (북마크 없음), `history` (기록 없음), `movie` (영상 미선택)

### 6.4 피드백
- 액션 후 `Toast` 알림 (success/error/info)
- 버튼 로딩 중 `progress_activity` 스핀 아이콘 + disabled

### 6.5 다국어
- 모든 사용자 보임 텍스트는 `useTranslation()` + `t("...")` 키
- `LanguageSwitcher`로 한↔EN 토글, `<html lang>` 동기화

---

## 7. 반응형 브레이크포인트

| 브레이크포인트 | 용도 |
|---------------|------|
| 기본(모바일) | 단일 컬럼, 햄버거 메뉴 |
| `sm:` (640px+) | 라이브러리 2컬럼, 검색 인라인 |
| `md:` (768px+) | Navbar 데스크톱 메뉴 노출 |
| `lg:` (1024px+) | 라이브러리 3컬럼, 리더 좌우 분할 |
| `xl:` (1280px+) | 라이브러리 4컬럼, 리더 45:55 비율 |

---

## 8. 디자인 시스템 강점

1. **컴포넌트 재사용성**: `GlassCard` 하나로 8개 페이지 모든 카드 처리
2. **시각적 일관성**: 3단계 글래스(light/default/heavy)로 hierarchy 자동 형성
3. **다크 친화 컬러**: 모든 토큰이 다크 배경에서 가독성 검증됨
4. **접근성**: `cursor-pointer`, `disabled:` 상태, ARIA 친화 키보드 포커스 보존
5. **성능**: 영상 prefetch, 이미지 지연 로딩, 스켈레톤으로 체감 성능 최적화

---

## 9. 향후 디자인 확장 계획

| 항목 | 계획 |
|------|------|
| 라이트 테마 | 현재 다크 전용 → 라이트 테마 토큰 추가 검토 (텍스트 힙 트렌드 반영, 종이책 무드) |
| 모바일 리더 UX | 좌우 분할 → 텍스트 우선 + 영상 모달 슬라이드업 |
| AI 영상 스타일 셀렉터 | 수채화/실사/애니메이션 스타일 칩 UI |
| 텍스트 폰트 옵션 | 본문 시리프 폰트 옵션(Georgia/Garamond) — 문학 분위기 강화 |
| 다국어 확장 | 한/영 → 일본어 추가 |

---

*Last updated: 2026-04 · Maintainer: 이규민*
