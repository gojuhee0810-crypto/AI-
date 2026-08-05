---
template: design
version: 1.3
---

# image-generation Design Document

> **Summary**: 오브젝트 입력 → `image-research-agent` 보강 → Recraft API 3회 병렬 호출로 카카오페이 Fit 배너용 이미지 3종(기본 3D 아이콘 / 2D 플랫 아이콘 / 3D 듀얼 오브젝트 믹스)을 생성한다.
>
> **Project**: AI 배너 스튜디오
> **Version**: 0.1.0
> **Author**: gojuhee
> **Date**: 2026-08-03
> **Status**: Draft
> **Planning Doc**: [image-generation.plan.md](../../01-plan/features/image-generation.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 상품 시각화가 어려운 업종(보험/금융/증권)과 반복 수정이 잦은 업종(여행/커머스) 모두의 이미지 제작 부담을 줄인다 |
| **WHO** | 카카오페이 광고주 (비디자이너 포함), Fit 배너 소재를 등록하는 담당자 |
| **RISK** | Recraft API가 레퍼런스 스타일을 정확히 재현하지 못하거나, 종량제 비용이 사용량에 비례해 계속 증가 |
| **SUCCESS** | 오브젝트 입력 1회로 3스타일 이미지가 모두 240×240px/PNG/500KB 이하 스펙을 만족하며 생성됨 |
| **SCOPE** | 이번 feature는 "오브젝트 입력 → 이미지 3종 생성"까지이며, 카피 생성과 광고센터 등록은 별도 feature |

---

## 1. Overview

### 1.1 Design Goals

- 오브젝트 텍스트 입력 한 번으로 3가지 스타일 이미지를 병렬로 생성해 체감 대기시간을 최소화한다
- Recraft 호출 로직과 프롬프트 조립 로직을 분리해 향후 카피 생성 등 다른 feature에서도 재사용 가능하게 한다
- 스타일 3(듀얼 오브젝트)처럼 보조 오브젝트가 없는 예외 케이스를 UI에서 명확히 안내한다

### 1.2 Design Principles

- 화면 1개짜리 단순 기능이므로 과설계를 피하고 필요한 만큼만 분리한다 (CLAUDE.md: 불필요한 라이브러리·대규모 리팩토링 지양)
- 서버 전용 시크릿(Recraft API Key)은 Next.js API Route 안에서만 다룬다
- 프롬프트 템플릿은 `docs/patterns/image-style-patterns.md`를 단일 출처(single source of truth)로 코드에 옮긴다

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | route.ts에 전부 인라인 | 레이어 완전 분리 | lib 2개 분리 + route는 얇게 |
| **New Files** | 2 | 7+ | 4 |
| **Modified Files** | 0 | 0 | 0 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | Low (coupled) | Low (과설계) | Low (balanced) |
| **Recommendation** | Quick wins | Long-term projects | **Default choice** |

**Selected**: Option C — **Rationale**: 화면 1개짜리 기능에 완전한 레이어 분리(Option B)는 과설계이지만, Recraft 호출과 프롬프트 조립을 `route.ts`에 전부 인라인(Option A)하면 카피 생성 등 다른 feature에서 재사용이 어렵다. `lib/recraft.ts`(API 클라이언트)와 `lib/image-style-patterns.ts`(프롬프트 조립)만 분리해 재사용성과 단순함을 동시에 확보한다.

### 2.1 Component Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client    │────▶│  Next.js API      │────▶│ Recraft API │
│ (page.tsx)  │     │  Route (server)   │     │  (external) │
└─────────────┘     └──────────────────┘     └─────────────┘
                            │
                            ▼
                     image-research-agent
                     (Claude Code 세션 내 호출,
                      오브젝트 보강 컨텍스트 생성)
```

### 2.2 Data Flow

```
사용자 오브젝트 입력
  → (세션 내) image-research-agent 호출
     → primary_object / secondary_object / visualization_note / closest_reference
  → 클라이언트가 보강된 오브젝트 정보를 POST /api/generate-image 로 전송
  → route.ts: image-style-patterns.ts로 스타일 1/2/3 프롬프트 조립
  → recraft.ts: 3개 스타일 ID로 Recraft API 병렬 호출 (Promise.allSettled, 1024×1024로 생성)
  → route.ts: sharp로 각 이미지를 1024×1024 → 240×240 PNG로 리사이즈
  → 3개 이미지(URL) + visualization_note를 응답
  → 클라이언트가 3장을 화면에 표시
```

> **Update (2026-08-03, module-1 구현 중 API 리서치로 발견)**: Recraft는 1:1 비율에서
> 1024×1024(일반) / 2048×2048(Pro) 프리셋만 지원하고 240×240을 직접 생성할 수 없다.
> `recraft.ts`는 1024×1024로만 생성하고, **240×240 리사이즈는 route.ts(module-2)에서
> `sharp`로 처리**하기로 결정 (sharp를 `package.json`에 추가 완료).

> **Note**: `image-research-agent`는 Claude Code 세션 내에서 호출되는 서브에이전트이며, 런타임 웹 애플리케이션 코드가 아니다. 실제 프로덕션 UI에서 이 보강 단계를 어떻게 트리거할지(예: 사용자가 오브젝트 입력 시 별도 "분석" API를 호출할지, 혹은 이 feature 범위 밖에서 Claude Code로 사전 준비된 값을 쓸지)는 Do 단계 착수 시 첫 번째로 확정해야 한다. Plan §2.1의 "image-research-agent 호출 로직"이 이 부분이며, 현재 Design 단계에서는 열린 질문(open question)으로 남긴다.

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `page.tsx` | `/api/generate-image` | 오브젝트 입력 UI, 결과 3장 표시 |
| `route.ts` | `lib/recraft.ts`, `lib/image-style-patterns.ts` | 요청 검증 → 프롬프트 조립 → Recraft 호출 → 응답 반환 |
| `lib/recraft.ts` | Recraft REST API | 스타일 ID + 프롬프트로 이미지 생성 요청 |
| `lib/image-style-patterns.ts` | (없음, 순수 함수) | 스타일 1/2/3 프롬프트 + 베이스 프롬프트 조립 |

---

## 3. Data Model

이 feature는 별도 DB 저장이 없다 (Plan §7.2: Supabase는 "필요 시"이며 이번 최소 범위에서는 필수 아님). 요청/응답은 아래 타입으로만 정의한다.

### 3.1 Entity Definition

```typescript
// src/types/image-generation.ts

export type ImageStyleKey = 'style-1-3d-basic' | 'style-2-2d-flat' | 'style-3-3d-dual';

export interface GenerateImageRequest {
  primaryObject: string;        // image-research-agent가 보강한 실물/은유 오브젝트
  secondaryObject?: string;     // 스타일 3용 보조 오브젝트, 없으면 스타일 3 스킵
  visualizationNote?: string;   // 근거 노트 (검수용, 화면 표시)
}

export interface GeneratedImage {
  style: ImageStyleKey;
  imageUrl: string;             // Recraft 응답 URL 또는 base64 data URI
  widthPx: 240;
  heightPx: 240;
  sizeBytes: number;
}

export interface GenerateImageResponse {
  images: GeneratedImage[];     // 스타일 3 스킵 시 최대 2개
  skippedStyles: ImageStyleKey[];
  visualizationNote?: string;
}
```

### 3.2 Entity Relationships

이 feature는 단일 요청-응답 구조로, 엔티티 간 영속적 관계가 없다 (N/A).

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/generate-image | 오브젝트 정보를 받아 3스타일 이미지 병렬 생성 | 없음 (내부 스튜디오 도구, 인증 요구사항 Plan에 없음) |

### 4.2 Detailed Specification

#### `POST /api/generate-image`

**Request:**
```json
{
  "primaryObject": "우산과 여권",
  "secondaryObject": "비행기",
  "visualizationNote": "여행자보험을 여권+우산으로 은유"
}
```

**Response (200 OK):**
```json
{
  "images": [
    { "style": "style-1-3d-basic", "imageUrl": "https://...", "widthPx": 240, "heightPx": 240, "sizeBytes": 123456 },
    { "style": "style-2-2d-flat", "imageUrl": "https://...", "widthPx": 240, "heightPx": 240, "sizeBytes": 98765 },
    { "style": "style-3-3d-dual", "imageUrl": "https://...", "widthPx": 240, "heightPx": 240, "sizeBytes": 145000 }
  ],
  "skippedStyles": [],
  "visualizationNote": "여행자보험을 여권+우산으로 은유"
}
```

**Response — secondaryObject 없음 (200 OK, 스타일 3 스킵):**
```json
{
  "images": [ { "style": "style-1-3d-basic", "...": "..." }, { "style": "style-2-2d-flat", "...": "..." } ],
  "skippedStyles": ["style-3-3d-dual"],
  "visualizationNote": "보조 오브젝트가 없어 듀얼 오브젝트 스타일을 건너뛰었습니다"
}
```

**Error Responses:**
- `400 Bad Request`: `primaryObject` 누락
- `413 Payload Too Large` / `422`: Recraft 응답 이미지가 500KB 스펙 초과 (FR-04 위반 감지 시)
- `502 Bad Gateway`: Recraft API 호출 실패 (전체 또는 일부 스타일)

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌────────────────────────────────────────────┐
│  AI 배너 스튜디오 — 이미지 생성               │
├────────────────────────────────────────────┤
│  오브젝트 입력: [___________________]        │
│  업종 선택(선택): [드롭다운]                  │
│                          [생성 버튼]         │
├────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ 스타일 1 │  │ 스타일 2 │  │ 스타일 3 │      │
│  │ (3D 기본)│  │(2D 플랫) │  │(듀얼믹스)│      │
│  └─────────┘  └─────────┘  └─────────┘      │
│  (스타일 3은 보조 오브젝트 없으면 안내 문구로 대체) │
└────────────────────────────────────────────┘
```

### 5.2 User Flow

```
오브젝트 입력 → 생성 버튼 클릭 → 로딩(3장 동시 진행) → 3장 표시(또는 2장+안내) → (실패 시) 에러+재시도 버튼
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ImageGenerationPage` | `src/app/(studio)/image-generation/page.tsx` | 페이지 컨테이너, 상태 관리(useState) |
| `ObjectInputForm` | `src/components/image-generation/` | 오브젝트 텍스트 입력 + 생성 버튼 |
| `ImageResultGrid` | `src/components/image-generation/` | 3장(또는 2장) 결과 카드 그리드 |
| `ImageResultCard` | `src/components/image-generation/` | 이미지 1장 + 스타일 라벨 표시 |

### 5.4 Page UI Checklist

#### 이미지 생성 페이지 (`/image-generation`)

- [ ] Input: 오브젝트 텍스트 입력 필드 (placeholder: "상품/서비스명을 입력하세요")
- [ ] Button: 생성 버튼 (오브젝트 미입력 시 비활성화)
- [ ] Loading: 생성 중 로딩 상태 (3개 카드 각각 스켈레톤 또는 스피너)
- [ ] Card: 스타일 1(기본 3D 아이콘) 결과 이미지 카드
- [ ] Card: 스타일 2(2D 플랫 아이콘) 결과 이미지 카드
- [ ] Card: 스타일 3(3D 듀얼 오브젝트 믹스) 결과 이미지 카드 — 스킵 시 "보조 오브젝트가 없어 생성하지 않았습니다" 안내 문구로 대체
- [ ] Text: `visualizationNote` 표시 (어떤 오브젝트/근거로 만들어졌는지 검수용)
- [ ] Error: Recraft API 실패 시 에러 메시지 + 재시도 버튼 (FR-06)

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | 오브젝트를 입력해주세요 | `primaryObject` 누락 | 클라이언트에서 버튼 비활성화로 우선 방지, 서버도 재검증 |
| 502 | 이미지 생성에 실패했습니다 | Recraft API 호출 실패 | 재시도 버튼 표시 (FR-06) |
| 422 | 일부 이미지가 규격을 벗어났습니다 | 500KB 초과 등 스펙 위반 | 해당 스타일만 실패로 표시, 나머지는 정상 표시 |

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "RECRAFT_CALL_FAILED",
    "message": "이미지 생성에 실패했습니다. 다시 시도해주세요.",
    "details": { "failedStyles": ["style-2-2d-flat"] }
  }
}
```

---

## 7. Security Considerations

- [ ] `RECRAFT_API_KEY`는 서버(API Route)에서만 사용, 클라이언트로 절대 노출 금지 (`NEXT_PUBLIC_` 접두사 사용 안 함)
- [ ] 오브젝트 입력값 길이 제한 및 기본 sanitize (프롬프트 인젝션성 입력 방지)
- [ ] Rate Limiting: 생성 버튼 연타로 인한 Recraft 종량제 비용 남용 방지 (Plan §3.2 Cost 항목) — 간단한 클라이언트 debounce + 서버 측 초당 요청 제한 고려
- [ ] HTTPS는 Vercel 배포 시 기본 적용

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: API Tests | `/api/generate-image` — status, 응답 shape | curl | Do |
| L2: UI Action Tests | 입력 → 생성 → 결과 표시 | 수동 확인 (Playwright 미설치 시) | Do |
| L3: E2E Scenario Tests | 전체 흐름 | 수동 확인 | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test Description | Expected Status | Expected Response |
|---|----------|--------|-----------------|:--------------:|-------------------|
| 1 | /api/generate-image | POST | primaryObject + secondaryObject 모두 전달 | 200 | `.images.length === 3`, `.skippedStyles.length === 0` |
| 2 | /api/generate-image | POST | secondaryObject 없이 전달 | 200 | `.images.length === 2`, `.skippedStyles` 에 `style-3-3d-dual` 포함 |
| 3 | /api/generate-image | POST | primaryObject 누락 | 400 | `.error.code === "INVALID_INPUT"` |
| 4 | /api/generate-image | POST | Recraft API 응답 실패 시뮬레이션 | 502 | `.error.code === "RECRAFT_CALL_FAILED"` |
| 5 | /api/generate-image | POST | 정상 응답 이미지 스펙 검증 | 200 | 각 image의 `widthPx === 240`, `heightPx === 240`, `sizeBytes <= 500000` |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Data Verification |
|---|------|--------|----------------|-------------------|
| 1 | /image-generation | 페이지 로드 | §5.4 체크리스트 요소 모두 표시 | - |
| 2 | /image-generation | 오브젝트 미입력 상태 | 생성 버튼 비활성화 | - |
| 3 | /image-generation | 오브젝트 입력 후 생성 클릭 | 로딩 → 3장(또는 2장+안내) 표시 | API 응답이 실제로 카드에 반영됨 |
| 4 | /image-generation | Recraft 실패 상황 | 에러 메시지 + 재시도 버튼 표시 | 재시도 클릭 시 재요청 발생 |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | 정상 생성 흐름 | 오브젝트 입력 → 생성 → 3장 확인 | 3장 모두 240×240/PNG/500KB 이하 |
| 2 | 보조 오브젝트 없음 | 오브젝트만 입력(보조 없음) → 생성 | 2장 + 스타일 3 스킵 안내 표시 |
| 3 | API 실패 후 재시도 | 실패 응답 → 재시도 → 성공 응답 | 최종적으로 이미지 표시됨 |

### 8.5 Seed Data Requirements

DB 저장이 없는 feature이므로 seed data 불필요 (N/A). 테스트는 Recraft API 응답을 목(mock)하거나 실제 등록된 스타일 ID로 수행한다.

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | 입력 폼, 결과 그리드 | `src/app/(studio)/image-generation/`, `src/components/image-generation/` |
| **Application/Infrastructure (합침)** | Recraft 호출, 프롬프트 조립 — 화면 1개 규모라 별도 Application 레이어 없이 lib에서 처리 | `src/lib/recraft.ts`, `src/lib/image-style-patterns.ts` |
| **Domain** | 요청/응답 타입 | `src/types/image-generation.ts` |

> Option C 선택에 따라 Plan §7.3 구조를 그대로 따르며, Option B의 4-레이어 완전 분리는 적용하지 않는다.

### 9.2 Dependency Rules

```
page.tsx (Presentation)
   │
   ▼
/api/generate-image (route.ts)
   │
   ├──▶ lib/image-style-patterns.ts (프롬프트 조립, 순수 함수)
   └──▶ lib/recraft.ts (외부 API 호출)
   │
   ▼
types/image-generation.ts (양쪽에서 참조하는 공유 타입)
```

### 9.3 File Import Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| `page.tsx` | `types/image-generation.ts` | `lib/recraft.ts` (서버 시크릿 포함, 클라이언트에서 직접 import 금지) |
| `route.ts` | `lib/recraft.ts`, `lib/image-style-patterns.ts`, `types/image-generation.ts` | (route가 최상위이므로 제한 없음) |
| `lib/recraft.ts` | `types/image-generation.ts` | 다른 lib 파일 |
| `lib/image-style-patterns.ts` | 없음 (순수 함수) | 외부 의존성 일체 |

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `ImageGenerationPage`, `ObjectInputForm`, `ImageResultGrid` | Presentation | `src/app/(studio)/image-generation/`, `src/components/image-generation/` |
| `route.ts` | Application (얇음) | `src/app/api/generate-image/route.ts` |
| `recraft.ts`, `image-style-patterns.ts` | Infrastructure | `src/lib/` |
| `image-generation.ts` (types) | Domain | `src/types/` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `ImageResultCard.tsx` |
| Functions | camelCase | `generateImageSet()`, `buildStylePrompt()` |
| Constants | UPPER_SNAKE_CASE | `IMAGE_MAX_SIZE_BYTES`, `IMAGE_SIZE_PX` |
| Types/Interfaces | PascalCase | `GenerateImageRequest`, `GeneratedImage` |
| Files (component) | PascalCase.tsx | `ObjectInputForm.tsx` |
| Files (utility) | camelCase.ts | `recraft.ts`, `imageStylePatterns.ts` |
| Folders | kebab-case | `image-generation/` |

### 10.2 Import Order

```typescript
// 1. External libraries
import { useState } from 'react'

// 2. Internal absolute imports
import { GenerateImageRequest } from '@/types/image-generation'

// 3. Relative imports
import { ObjectInputForm } from './ObjectInputForm'

// 4. Type imports
import type { GeneratedImage } from '@/types/image-generation'
```

### 10.3 Environment Variables

| Prefix | Purpose | Scope | Example |
|--------|---------|-------|---------|
| (없음, 서버 전용) | Recraft 인증/스타일 ID | Server only | `RECRAFT_API_KEY`, `RECRAFT_STYLE_ID_3D_BASIC`, `RECRAFT_STYLE_ID_2D_FLAT`, `RECRAFT_STYLE_ID_3D_DUAL` |

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase, `image-generation/` 폴더 아래 배치 |
| File organization | Plan §7.3 구조 그대로 (`app/`, `lib/`) |
| State management | React 기본 `useState` (전역 상태 불필요) |
| Error handling | §6 Error Response Format 통일, 클라이언트는 재시도 버튼 제공 |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── app/
│   ├── (studio)/image-generation/page.tsx
│   └── api/generate-image/route.ts
├── components/image-generation/
│   ├── ObjectInputForm.tsx
│   ├── ImageResultGrid.tsx
│   └── ImageResultCard.tsx
├── lib/
│   ├── recraft.ts
│   └── image-style-patterns.ts
└── types/
    └── image-generation.ts
```

### 11.2 Implementation Order

1. [ ] Next.js 프로젝트 스캐폴딩 (없음, Plan §9.4)
2. [ ] `types/image-generation.ts` 정의
3. [ ] `lib/image-style-patterns.ts` — `docs/patterns/image-style-patterns.md`의 3개 템플릿 + 베이스 프롬프트를 코드로 이식
4. [ ] `lib/recraft.ts` — Recraft API 클라이언트 (스타일 ID + 프롬프트 → 이미지 URL)
5. [ ] `app/api/generate-image/route.ts` — 요청 검증 → 프롬프트 조립 → `Promise.all` 병렬 호출 → 응답
6. [ ] `components/image-generation/*` — 입력 폼, 결과 그리드/카드
7. [ ] `app/(studio)/image-generation/page.tsx` — 페이지 조립
8. [ ] 위 §8 테스트 시나리오 구현 및 통과 확인

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 스캐폴딩 + lib | `module-1` | Next.js 초기화, types, recraft.ts, image-style-patterns.ts | 20-25 |
| API Route | `module-2` | `/api/generate-image` 구현 + L1 테스트 | 15-20 |
| UI 컴포넌트 | `module-3` | 입력 폼 + 결과 그리드 + 페이지 조립 + L2/L3 확인 | 25-30 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 완료 |
| Session 2 | Do | `--scope module-1` | 20-25 |
| Session 3 | Do | `--scope module-2` | 15-20 |
| Session 4 | Do | `--scope module-3` | 25-30 |
| Session 5 | Check + Report | 전체 | 30-40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-03 | Initial draft (Option C 선택) | gojuhee |
| 0.2 | 2026-08-03 | module-1 구현 중 발견: Recraft 240×240 직접 생성 불가 → sharp 리사이즈 단계 추가 | gojuhee |
