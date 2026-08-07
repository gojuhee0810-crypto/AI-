---
template: design
version: 1.3
---

# image-generation Design Document

> **Summary**: 오브젝트 입력 → 라이브러리 우선 매칭(없으면 동적 생성)으로 카카오페이 Fit 배너용 이미지 2종(스타일 1: 3D 아이콘 / 스타일 2: 2D 아이콘)을 생성한다.
>
> **Project**: AI 배너 스튜디오
> **Version**: 0.1.0
> **Author**: gojuhee
> **Date**: 2026-08-03 (v0.1 초안) / 2026-08-06 실제 구현 기준 전면 갱신
> **Status**: 백엔드·화면 모두 구현 완료(브라우저 라이브 검증됨, 2026-08-07)
> **Planning Doc**: [image-generation.plan.md](../../01-plan/features/image-generation.plan.md)
> **Screen Design**: [banner-studio-ui.design.md](banner-studio-ui.design.md) — 3단계 스테퍼 화면 전반

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 상품 시각화가 어려운 업종(보험/금융/증권)과 반복 수정이 잦은 업종(여행/커머스) 모두의 이미지 제작 부담을 줄인다 |
| **WHO** | 카카오페이 광고주 (비디자이너 포함), Fit 배너 소재를 등록하는 담당자 |
| **RISK** | 동적 생성 시 Gemini/OpenAI/Claude 호출 비용이 사용량에 비례해 증가하고, 라이브러리 미매칭 오브젝트는 매번 20~60초가 걸린다(20초 이내 완료가 목표인데 동적 생성은 이를 못 지킬 수 있음 — 라이브러리 커버리지 확대로 완화 중) |
| **SUCCESS** | 오브젝트 입력 1회로 2스타일 이미지가 모두 240×240px/PNG 스펙을 만족하며 생성됨. 라이브러리 매칭 시 1초 이내, 동적 생성 시 최대 ~60초 |
| **SCOPE** | 이번 feature는 "오브젝트 입력 → 이미지 2종 생성"까지이며, 카피 생성과 광고센터 등록은 별도 feature |

---

## 1. Overview

### 1.1 Design Goals

- 오브젝트 텍스트 입력 한 번으로 2가지 스타일 이미지를 병렬로 생성해 체감 대기시간을 최소화한다
- **자주 나오는 오브젝트는 사전 제작된 라이브러리 이미지를 즉시 반환**해 동적 생성 비용/지연을 회피한다(2026-08-06 기준 스타일1 22개, 스타일2 18개 캐시)
- 프롬프트 조립·API 호출 로직을 라이브러리 매칭 로직과 분리해 재사용 가능하게 한다

### 1.2 Design Principles

- 화면 1~2개짜리 단순 기능이므로 과설계를 피하고 필요한 만큼만 분리한다 (CLAUDE.md: 불필요한 라이브러리·대규모 리팩토링 지양)
- 서버 전용 시크릿(API 키 3종)은 Next.js API Route/lib 안에서만 다룬다
- 라이브러리 우선, 동적 생성은 폴백 — 스타일1과 스타일2는 서로 다른 이유로 이 전략을 쓴다(스타일1은 비용/속도, 스타일2는 API 결과 품질이 라이브러리 원본보다 떨어짐)

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | route.ts에 전부 인라인 | 레이어 완전 분리 | lib 여러 개 분리 + route는 얇게 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Risk** | Low (coupled) | Low (과설계) | Low (balanced) |
| **Recommendation** | Quick wins | Long-term projects | **Default choice (실제 선택)** |

**Selected**: Option C — 실제 구현은 `route.ts`를 얇게 유지하고, 스타일별 동적 생성(`style1-generate.ts`/`style2-generate.ts`), 라이브러리 매칭(`asset-library.ts`/`style2-asset-library.ts`), 프롬프트 조립(`image-style-patterns.ts`/`prompt-compiler.ts`)을 각각 분리했다. 원래 계획했던 `recraft.ts` 단일 API 클라이언트 대신, **제공사가 스타일별로 다르기 때문에**(스타일1=Gemini, 스타일2=OpenAI+Claude) 스타일별 파일로 나뉘었다.

### 2.1 Component Diagram

```
┌─────────────┐     ┌──────────────────┐
│   Client    │────▶│  Next.js API      │
│ (page.tsx,  │     │  Route (route.ts) │
│  미구현)     │     └──────────────────┘
└─────────────┘              │
                              ▼
                    ┌────────────────────────┐
                    │ 라이브러리 매칭 (우선)     │
                    │ asset-library.ts (스타일1)│
                    │ style2-asset-library.ts   │
                    │ (스타일2)                 │
                    └────────────────────────┘
                              │ 매칭 없을 때만
                              ▼
                    ┌────────────────────────────────┐
                    │ 동적 생성                         │
                    │ 스타일1: Gemini(이미지) →          │
                    │   imgly(배경 투명화) → sharp 리사이즈│
                    │ 스타일2: Claude(프롬프트 조립) →     │
                    │   OpenAI gpt-image-1 → sharp 리사이즈│
                    └────────────────────────────────┘
```

### 2.2 Data Flow

```
사용자 오브젝트 텍스트 입력 (image-research-agent의 사전 보강 단계는 런타임에 없음
  — 원본 텍스트를 그대로 라이브러리 매칭/동적 생성에 사용)
  → 클라이언트가 POST /api/generate-image 로 전송
  → route.ts: regenerateStyle 지정 시 라이브러리를 건너뛰고 해당 스타일만 항상 동적 생성

  → [스타일1] findLibraryAsset(primaryObject) 매칭 시
       → 라이브러리 PNG를 sharp로 240×240 리사이즈해 즉시 반환
     매칭 없으면 generateStyle1Dynamic():
       → Gemini(gemini-2.5-flash-image)로 생성
       → @imgly/background-removal-node로 배경 투명화
       → sharp로 240×240 리사이즈

  → [스타일2] findStyle2LibraryAsset(primaryObject) 매칭 시(다중 매칭이면 null) 라이브러리 PNG 반환
     매칭 없으면 generateStyle2Dynamic():
       → prompt-compiler.ts: OBJECTS/{slug}.md 블루프린트가 없으면 Claude가 새로 작성(실패 시 최소 블루프린트로 폴백)
       → Claude가 STYLE_GUIDE/SHAPE_GRAMMAR/COLOR_TOKEN/CAMERA/OUTPUT 문서 + 블루프린트를 최종 프롬프트 1개로 컴파일(실패 시 단순 텍스트 조립으로 폴백)
       → OpenAI gpt-image-1(images.generate, background: transparent)로 생성
       → sharp로 240×240 리사이즈

  → 스타일1/2를 Promise.allSettled로 병렬 처리 — 하나가 실패해도 성공한 결과는 버리지 않는다
  → images[](성공분) + partialErrors[](실패한 스타일만) + visualizationNote를 응답
  → 클라이언트가 결과를 화면에 표시 (컴포넌트 미구현)
```

> **원래 열린 질문이었던 부분 해소**: v0.1에서 "image-research-agent를 런타임에서 어떻게 트리거할지"를 Do 단계 첫 결정사항으로 남겨뒀는데, 실제로는 이 에이전트를 런타임 플로우에 넣지 않는 쪽으로 결정됐다. 대신 라이브러리 매칭(사전 등록된 오브젝트)과 `prompt-compiler.ts`의 Claude 자동 블루프린트 작성(미등록 오브젝트)이 그 역할을 대체한다. `image-research-agent`는 지금은 사람이 고품질 블루프린트를 수작업으로 미리 만들어둘 때 쓰는 보조 도구로 역할이 바뀌었다.

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `page.tsx` (미구현) | `/api/generate-image` | 오브젝트 입력 UI, 결과 2장 표시 |
| `route.ts` | `asset-library.ts`, `style2-asset-library.ts`, `style1-generate.ts`, `style2-generate.ts` | 요청 검증 → 라이브러리 매칭 → (없으면) 동적 생성 → 응답 |
| `style1-generate.ts` | Gemini API, `@imgly/background-removal-node`, `image-style-patterns.ts` | 스타일1 동적 생성 |
| `style2-generate.ts` | `prompt-compiler.ts`, OpenAI API | 스타일2 동적 생성 |
| `prompt-compiler.ts` | Claude API, `prompt-system/*.md` | 오브젝트 블루프린트 자동 작성 + 최종 프롬프트 컴파일(Claude 실패 시 결정적 조립 폴백) |
| `asset-library.ts` / `style2-asset-library.ts` | 정적 PNG(`public/images/library{,-2d}/`) | 키워드 매칭으로 사전 제작 이미지 즉시 반환 |
| `image-style-patterns.ts` | (없음, 순수 함수) | 스타일1/2 프롬프트 템플릿 조립 |

---

## 3. Data Model

이 feature는 별도 DB 저장이 없다. 요청/응답은 `src/types/image-generation.ts`에 정의된 아래 타입을 그대로 쓴다.

### 3.1 Entity Definition

```typescript
// src/types/image-generation.ts

export type ImageStyleKey = 'style-1-3d-basic' | 'style-2-2d-flat';

export type IconMaterial = 'clay' | 'glossy';

export interface GenerateImageRequest {
  primaryObject: string;
  visualizationNote?: string;
  /** 3D 스타일(style-1) 재질. 기본값 'clay' */
  material?: IconMaterial;
  /** "다시 생성하기"에서 지정하는 브랜드 컬러(hex) */
  brandColor?: string;
  /** 특정 스타일 1장만 재생성할 때 지정 (없으면 2장 모두 생성, 라이브러리 매칭도 스킵하고 항상 동적 생성) */
  regenerateStyle?: ImageStyleKey;
}

export interface GeneratedImage {
  style: ImageStyleKey;
  imageUrl: string;   // base64 data URL (Supabase Storage 연동 전까지는 URL이 아니라 데이터 자체)
  widthPx: 240;
  heightPx: 240;
  sizeBytes: number;
}

export interface GenerateImageResponse {
  images: GeneratedImage[];        // 실패한 스타일은 제외, 최대 2개
  visualizationNote?: string;
  /** 요청한 스타일 중 일부만 실패했을 때, 성공한 이미지는 그대로 반환하고 실패한 스타일만 여기 담는다 */
  partialErrors?: Array<{ style: ImageStyleKey; message: string }>;
}

export interface GenerateImageErrorResponse {
  error: {
    code: 'INVALID_INPUT' | 'IMAGE_GENERATION_FAILED' | 'IMAGE_SPEC_VIOLATION';
    message: string;
    details?: Record<string, unknown>;
  };
}
```

> v0.1 대비 변경: `secondaryObject`/`skippedStyles`(스타일3용) 제거, `material`/`brandColor`/`regenerateStyle`/`partialErrors` 추가.

### 3.2 Entity Relationships

단일 요청-응답 구조로, 엔티티 간 영속적 관계 없음 (N/A).

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/generate-image | 오브젝트 정보를 받아 2스타일 이미지 병렬 생성 | 없음 (내부 스튜디오 도구) |

### 4.2 Detailed Specification

#### `POST /api/generate-image`

**Request (신규 생성):**
```json
{ "primaryObject": "쿠폰", "brandColor": "#2B4C3F" }
```

**Request (개별 재생성):**
```json
{ "primaryObject": "쿠폰", "regenerateStyle": "style-2-2d-flat", "brandColor": "#2B4C3F" }
```

**Response (200 OK, 둘 다 성공):**
```json
{
  "images": [
    { "style": "style-1-3d-basic", "imageUrl": "data:image/png;base64,...", "widthPx": 240, "heightPx": 240, "sizeBytes": 23352 },
    { "style": "style-2-2d-flat", "imageUrl": "data:image/png;base64,...", "widthPx": 240, "heightPx": 240, "sizeBytes": 17706 }
  ]
}
```

**Response (200 OK, 스타일2만 실패 — 부분 실패):**
```json
{
  "images": [
    { "style": "style-1-3d-basic", "imageUrl": "data:image/png;base64,...", "widthPx": 240, "heightPx": 240, "sizeBytes": 23352 }
  ],
  "partialErrors": [
    { "style": "style-2-2d-flat", "message": "OpenAI가 이미지를 반환하지 않았습니다." }
  ]
}
```

**Error Responses:**
- `400 Bad Request` (`INVALID_INPUT`): `primaryObject` 누락
- `502 Bad Gateway` (`IMAGE_GENERATION_FAILED`): 스타일1/2 **둘 다** 실패했을 때만 (하나라도 성공하면 200 + partialErrors)

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌──────────────────────────────────────────────────────────┐
│  AI 배너 스튜디오 — 이미지 생성                              │
├──────────────────────────────────────────────────────────┤
│  오브젝트 입력: [___________________]  브랜드컬러(선택): [🎨]  │
│                                            [생성 버튼]      │
├──────────────────────────────────────────────────────────┤
│  ┌───────────────────┐   ┌───────────────────┐            │
│  │   스타일 1 (3D)     │   │   스타일 2 (2D)     │            │
│  │   [이미지]          │   │   [이미지]          │            │
│  │   [다시 생성하기]    │   │   [다시 생성하기]    │            │
│  └───────────────────┘   └───────────────────┘            │
│  근거 노트: (visualizationNote가 있으면 표시)                  │
├──────────────────────────────────────────────────────────┤
│                          [다음: 혜택 입력하고 카피 만들기 →]   │
└──────────────────────────────────────────────────────────┘
```

### 5.2 User Flow

```
오브젝트 입력(+ 선택: 브랜드컬러) → 생성 클릭
  → 로딩(스타일1/2 독립적 — 라이브러리 매칭이면 즉시, 동적 생성이면 최대 ~60초까지 따로 걸릴 수 있음)
  → 결과 표시: 성공한 스타일은 이미지 카드, 실패한 스타일(partialErrors)만 에러+재시도 카드
  → (선택) 카드별 "다시 생성하기" 클릭 → brandColor 지정 후 해당 스타일만 regenerateStyle로 재요청
  → 이미지 1장 이상 확보되면 "다음: 카피 만들기" 활성화
  → 클릭 시 카피 생성 화면으로 이동, primaryObject를 objectTag로 전달
```

### 5.3 State / 데이터 계약

```typescript
// ImageGenerationPage 상태
interface PageState {
  primaryObject: string;
  brandColor?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  images: GeneratedImage[];                                   // 성공한 스타일만
  partialErrors: Array<{ style: ImageStyleKey; message: string }>;
  regeneratingStyle: ImageStyleKey | null;                    // 개별 재생성 중인 스타일(버튼 로딩 표시용)
}
```

| Component | Props | Callback |
|-----------|-------|----------|
| `ObjectInputForm` | `value`, `brandColor` | `onSubmit(primaryObject, brandColor)` |
| `ImageResultGrid` | `images`, `partialErrors`, `regeneratingStyle` | `onRegenerate(style, brandColor)` |
| `ImageResultCard` | `image \| error`, `style`, `isRegenerating` | `onRegenerateClick()` |
| `NextStepButton` | `disabled`(이미지 0장이면 true) | `onNext(primaryObject)` → 카피 생성 화면으로 이동 |

### 5.4 Page UI Checklist

#### 이미지 생성 페이지 (`/image-generation`)

- [ ] Input: 오브젝트 텍스트 입력 필드 (placeholder: "상품/서비스명을 입력하세요")
- [ ] Input: 브랜드컬러 선택 (선택, hex 컬러피커)
- [ ] Button: 생성 버튼 (오브젝트 미입력 시 비활성화)
- [ ] Loading: 스타일1/2 각각 독립적인 로딩 상태
- [ ] Card: 스타일1(3D) 결과 이미지 + "다시 생성하기" 버튼
- [ ] Card: 스타일2(2D) 결과 이미지 + "다시 생성하기" 버튼
- [ ] Text: `visualizationNote` 표시 (있을 때만)
- [ ] Error: `partialErrors`에 담긴 스타일만 개별 에러+재시도 (나머지는 정상 표시 유지)
- [ ] Button: "다음: 카피 만들기" — 이미지 1장 이상 성공 시 활성화, `primaryObject`를 카피 생성 화면에 전달

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| `INVALID_INPUT` | primaryObject는 필수입니다 | `primaryObject` 누락 | 클라이언트 버튼 비활성화로 우선 방지, 서버도 재검증 |
| `IMAGE_GENERATION_FAILED` | (동적, 실패 사유 조합) | 스타일1/2 **둘 다** 실패 | 502, 전체 에러 화면 + 재시도 버튼 |
| (부분 실패) | `partialErrors[]`에 담김, 최상위 에러 아님 | 스타일 중 하나만 실패 | 200 OK로 응답, 성공한 이미지는 그대로 쓰고 실패한 카드만 에러+재시도 |

> `IMAGE_SPEC_VIOLATION`은 타입에는 정의돼 있으나 현재 코드에서 실제로 던지는 경로가 없다 (TBD — 이미지 크기/용량 스펙 위반을 사후 검증하는 로직은 아직 없음, sharp 리사이즈로 크기는 항상 240×240 보장되지만 용량 상한 체크는 없음).

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "IMAGE_GENERATION_FAILED",
    "message": "style-1-3d-basic: Gemini가 이미지를 반환하지 않았습니다. / style-2-2d-flat: OpenAI가 이미지를 반환하지 않았습니다.",
    "details": {}
  }
}
```

---

## 7. Security Considerations

- [x] `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`는 서버(API Route/lib)에서만 사용, 클라이언트로 노출 안 함
- [ ] 오브젝트 입력값 길이 제한 및 기본 sanitize (프롬프트 인젝션성 입력 방지) — 미구현
- [ ] Rate Limiting: 생성 버튼 연타로 인한 API 비용 남용 방지 — 미구현, 화면 구현 시 우선순위 검토 필요
- [ ] HTTPS는 Vercel 배포 시 기본 적용 (Vercel 배포 자체가 아직 미검증 — `@imgly/background-removal-node`가 서버리스 환경에서 작동하는지 확인 필요)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | 상태 |
|------|--------|------|:---:|
| 자동 회귀 테스트 | `asset-library.ts`/`style2-asset-library.ts` 키워드 매칭 로직 | `node:test` + `tsx` (`npm test`) | ✅ 7개+7개, 완료 |
| L1: API 테스트 | `/api/generate-image` — 라이브러리 매칭/동적 생성/부분실패/재생성 | curl (라이브) | ✅ 수동 라이브 검증 완료 |
| L2: UI Action Tests | 입력 → 생성 → 결과 표시 | 미구현 (화면 없음) | ❌ |
| L3: E2E Scenario Tests | 전체 흐름 | 미구현 | ❌ |

### 8.2 L1: 실제로 검증된 시나리오 (curl 기반)

| # | 시나리오 | 결과 |
|---|---------|------|
| 1 | 라이브러리 매칭 오브젝트(예: "쿠폰") 입력 | 스타일1/2 모두 0.03~0.05초 내 응답, 캐시된 이미지 반환 확인 |
| 2 | 라이브러리 미매칭 오브젝트 입력 | 스타일1/2 동적 생성, 약 20~60초 소요 확인 |
| 3 | `regenerateStyle` 지정 | 라이브러리 매칭이었더라도 항상 동적 생성으로 전환됨을 확인 |
| 4 | 스타일2만 강제 실패(`FORCE_STYLE2_FAIL` 임시 스위치로 테스트 후 제거) | 200 OK + 스타일1만 `images`에, 스타일2는 `partialErrors`에 담김을 확인 |
| 5 | `primaryObject` 누락 | 400 + `INVALID_INPUT` 확인 |

### 8.3 L2/L3 — 화면 구현 후 작성 예정 (TBD)

화면 컴포넌트가 없어 아직 작성 불가. §5.4 체크리스트를 기준으로 화면 구현과 함께 채운다.

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | 입력 폼, 결과 그리드 (미구현) | `src/app/(studio)/image-generation/`, `src/components/image-generation/` |
| **Application** | 요청 검증, 라이브러리 매칭 우선순위 결정, 병렬 처리 | `src/app/api/generate-image/route.ts` |
| **Infrastructure** | 외부 API 호출(Gemini/OpenAI/Claude), 라이브러리 매칭, 프롬프트 조립 | `src/lib/style1-generate.ts`, `style2-generate.ts`, `prompt-compiler.ts`, `asset-library.ts`, `style2-asset-library.ts`, `image-style-patterns.ts` |
| **Domain** | 요청/응답 타입 | `src/types/image-generation.ts` |

### 9.2 Dependency Rules

```
page.tsx (Presentation, 미구현)
   │
   ▼
/api/generate-image (route.ts)
   │
   ├──▶ lib/asset-library.ts, lib/style2-asset-library.ts (라이브러리 매칭, 순수 함수 + 정적 PNG)
   ├──▶ lib/style1-generate.ts (Gemini + imgly)
   └──▶ lib/style2-generate.ts (Claude 프롬프트 조립 + OpenAI)
   │
   ▼
types/image-generation.ts (양쪽에서 참조하는 공유 타입)
```

### 9.3 File Import Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| `page.tsx` | `types/image-generation.ts` | `lib/*-generate.ts`(서버 시크릿 포함, 클라이언트에서 직접 import 금지) |
| `route.ts` | 모든 `lib/`, `types/image-generation.ts` | (route가 최상위이므로 제한 없음) |
| `lib/style1-generate.ts` | `types/image-generation.ts`, `image-style-patterns.ts` | 다른 lib 파일 |
| `lib/style2-generate.ts` | `prompt-compiler.ts` | 다른 lib 파일(asset-library 계열 제외) |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `ImageResultCard.tsx` |
| Functions | camelCase | `generateStyle1Dynamic()`, `findLibraryAsset()` |
| Types/Interfaces | PascalCase | `GenerateImageRequest`, `GeneratedImage` |
| Files (component) | PascalCase.tsx | `ObjectInputForm.tsx` |
| Files (utility) | kebab-case.ts | `style1-generate.ts`, `asset-library.ts` |
| Folders | kebab-case | `image-generation/` |

### 10.2 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `GEMINI_API_KEY` | 스타일1 동적 생성 (Gemini) | Server only |
| `OPENAI_API_KEY` | 스타일2 동적 생성 (gpt-image-1) | Server only |
| `ANTHROPIC_API_KEY` | 스타일2 프롬프트 조립, 오브젝트 블루프린트 작성 (Claude) | Server only |

> v0.1의 `RECRAFT_API_KEY`, `RECRAFT_STYLE_ID_*`는 실제로 쓰인 적 없음 — 삭제.

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| State management | React 기본 `useState` (전역 상태 불필요) |
| Error handling | §6 Error Response Format 통일, 부분 실패는 200+`partialErrors`로 구분 |
| 테스트 | 결정적 로직(키워드 매칭)은 `node:test`로 자동화, LLM 호출은 라이브 curl로 수동 검증 |

---

## 11. Implementation Guide

### 11.1 File Structure (실제)

```
src/
├── app/
│   ├── (studio)/image-generation/page.tsx   ← 미구현
│   └── api/generate-image/route.ts          ← 완료
├── components/image-generation/             ← 미구현
│   ├── ObjectInputForm.tsx
│   ├── ImageResultGrid.tsx
│   └── ImageResultCard.tsx
├── lib/
│   ├── asset-library.ts                     ← 완료 (스타일1 라이브러리)
│   ├── style2-asset-library.ts              ← 완료 (스타일2 라이브러리)
│   ├── style1-generate.ts                   ← 완료 (Gemini 동적 생성)
│   ├── style2-generate.ts                   ← 완료 (OpenAI 동적 생성)
│   ├── prompt-compiler.ts                   ← 완료 (Claude 프롬프트 조립)
│   ├── image-style-patterns.ts              ← 완료
│   ├── asset-library.test.ts                ← 완료 (회귀 테스트)
│   └── style2-asset-library.test.ts         ← 완료 (회귀 테스트)
└── types/
    └── image-generation.ts                  ← 완료
```

### 11.2 Implementation Order

1. [x] `types/image-generation.ts` 정의
2. [x] `lib/image-style-patterns.ts`, `lib/asset-library.ts`, `lib/style2-asset-library.ts`
3. [x] `lib/style1-generate.ts`, `lib/style2-generate.ts`, `lib/prompt-compiler.ts`
4. [x] `app/api/generate-image/route.ts` — 라이브러리 우선 + 동적 생성 폴백 + 부분실패 처리
5. [x] 자동 회귀 테스트 (`npm test`) + 라이브 curl 검증
6. [ ] `components/image-generation/*` — 입력 폼, 결과 그리드/카드 **← 다음 작업**
7. [ ] `app/(studio)/image-generation/page.tsx` — 페이지 조립
8. [ ] §8.3 L2/L3 테스트 시나리오 작성 및 통과 확인

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-03 | Initial draft (Option C 선택, Recraft/스타일3 기준) | gojuhee |
| 0.2 | 2026-08-03 | module-1 구현 중 발견: 240×240 직접 생성 불가 → sharp 리사이즈 단계 추가 | gojuhee |
| 0.3 | 2026-08-06 | 실제 구현(Recraft→Gemini/OpenAI/Claude, 스타일3 제외, 라이브러리 캐싱, brandColor/regenerateStyle/partialErrors) 기준으로 2~11번 섹션 전면 갱신. 화면 설계에 상태 계약(§5.3), 재생성 UI, 카피 생성으로의 다음 단계 전환 추가 | gojuhee |
