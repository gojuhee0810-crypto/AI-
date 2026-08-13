---
template: plan
version: 1.3
---

# image-generation Planning Document

> **Summary**: 광고주가 오브젝트(상품/서비스)를 입력하면, Gemini(Google AI Studio) API로 스타일 1(3D 기본 아이콘)과 스타일 2(2D 플랫 아이콘) 배너 이미지 2장을 사전 선택 없이 동시 자동 생성한다. 다시 만들 때는 2장을 함께 새로 만든다.
>
> **Project**: AI 배너 스튜디오
> **Version**: 0.4.0
> **Author**: gojuhee
> **Date**: 2026-08-13
> **Status**: 구현 완료 — FR 9개 중 4개 완료 · 1개 부분 · 4개 폐기(§3.1)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 보험·금융·증권처럼 상품을 시각화하기 어려운 업종은 이미지 방향을 잡기 어렵고, 비디자이너 광고주는 매체 규격에 맞는 이미지를 직접 제작하기 어렵다 |
| **Solution** | 오브젝트 텍스트 입력만으로 Gemini API가 스타일 1(3D)+2(2D) 2장을 사전 선택 없이 자동 생성 — 미리보기 없는 "생성 전 스타일 선택"은 비디자이너에게 판단 부담이라 배제 |
| **Function/UX Effect** | 이미지 제작 시간 단축, 은유적 오브젝트 표현, 결과 2장을 바로 비교(A/B) 가능 |
| **Core Value** | 비디자이너 광고주도 카카오페이 매체 가이드에 맞는 전문적인 배너 이미지를 즉시 확보 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 상품 시각화가 어려운 업종(보험/금융/증권)과 반복 수정이 잦은 업종(여행/커머스) 모두의 이미지 제작 부담을 줄인다 |
| **WHO** | 카카오페이 광고주 (비디자이너 포함), Fit 배너 소재를 등록하는 담당자 |
| **RISK** | Gemini가 투명 배경을 프롬프트만으로 만족 못해 배경제거 후처리가 필수 의존성이 됨, 종량제 비용이 사용량에 비례해 계속 증가 |
| **SUCCESS** | 오브젝트 입력 1회로 스타일 1+2 이미지 2장이 240×240px/PNG/500KB 이하 스펙을 만족하며 생성됨 |
| **SCOPE** | 이번 feature는 "오브젝트 입력 → 이미지 2장 자동 생성 → 다시 생성"까지이며, 카피 생성(copy-recommendation)과 광고센터 등록(adcenter-register)은 별도 feature |

---

## 1. Overview

### 1.1 Purpose

오브젝트(상품/서비스) 텍스트 입력만으로, 카카오페이 Fit 배너 규격(240×240px, PNG, 500KB 이하, 투명 배경)에 맞는 스타일 1(3D 기본 아이콘)+스타일 2(2D 플랫 아이콘) 이미지 2장을 자동 생성한다. 다시 만들 때는 2장을 함께 새로 만든다.

> **Update (2026-08-03)**: 최초 계획은 3스타일(기본 3D/2D 플랫/3D 듀얼)을 한 번에 모두 생성하는 것이었다. 이후 "생성 전 스타일 1개 선택" 방식도 검토했으나, 미리보기 없이 추상적인 스타일 이름만 보고 고르게 하는 건 비디자이너에게 나쁜 UX로 판단해 폐기했다. 3D 듀얼 오브젝트 믹스 스타일은 이번 feature 범위에서 폐기한다.
>
> **Update (2026-08-04, Gemini 전환)**: 이미지 생성 API를 Recraft에서 Google AI Studio(Gemini, `gemini-2.5-flash-image`)로 변경. 당시 계획한 UX: 오브젝트 입력 → 스타일 1+2 두 장을 동시 자동 생성 → 1장만 재생성 → 이력 탐색. 뒤의 둘은 이후 폐기됐다(§3.1 FR-07~09).

### 1.2 Background

카카오페이 광고주는 캠페인 생성 후 소재(이미지)를 직접 제작해 등록해야 한다. 보험·금융·증권처럼 상품을 시각화하기 어려운 업종은 적절한 이미지 방향을 찾기 어렵고, 여행·커머스 업종은 매체 규격에 맞는 오브젝트형 이미지를 만드는 데 반복적인 수정이 발생한다. 이 feature는 이 문제를 이미지 생성 자동화로 해결한다.

### 1.3 Related Documents

- [docs/patterns/image-style-patterns.md](../../patterns/image-style-patterns.md) — 베이스 프롬프트, 스타일 1(3D)/2(2D) 정의
- [docs/patterns/assets/reference-2d/, reference-3d/](../../patterns/assets/) — 스타일 레퍼런스 이미지
- [docs/guides/kakaopay-banner-guide.md](../../guides/kakaopay-banner-guide.md) — 이미지 규격, 업종별 유의사항
- [src/lib/prompt-compiler.ts](../../../src/lib/prompt-compiler.ts) — 오브젝트 블루프린트 생성·캐시 (`resolveObjectBlueprint`)
- `prompt-system/OBJECTS/` — 오브젝트별 블루프린트 캐시
- `.claude/agents/image-research-agent.md` — 같은 절차의 개발용 서브에이전트. **런타임에서는 호출되지 않는다**

---

## 2. Scope

### 2.1 In Scope

- [x] 오브젝트 입력 UI (텍스트 입력 + 업종 선택 옵션 + "생성" 버튼, **스타일 사전 선택 없음**)
- [x] 오브젝트 블루프린트 보강 (`resolveObjectBlueprint` — 캐시 우선, 없으면 Claude가 작성해 저장)
- [x] Gemini API 연동 (Next.js API Route `/api/generate-image`)
- [x] 스타일 1(3D)+2(2D) 2장 동시 생성 및 결과 화면 표시
- [~] ~~스타일별 개별 "다시 생성하기"~~ — 폐기, 2장을 함께 다시 만든다
- [~] ~~재생성 이력 탐색 UI~~ — 폐기
- [x] 에셋 라이브러리 — 자주 나오는 오브젝트는 매번 생성하지 않고 사전 제작 이미지를 키워드 매칭으로 반환 (`src/lib/asset-library.ts`, 17개 등록, 수식어 오버라이드·제외어 처리 포함). **스타일 1(3D)에만 적용** — 매칭 없으면 동적 생성으로 폴백
- [x] 스타일 2(2D)는 라이브러리를 타지 않고 항상 **OpenAI `gpt-image-1`** 동적 생성. **레퍼런스 이미지를 붙이지 않는다** — 스타일 1(3D 클레이)을 참고로 첨부하면 리얼리즘이 섞여 결과가 나빠짐을 2026-08-05 실측으로 확인

### 2.2 Out of Scope

- 카피(서브타이틀/메인타이틀) 생성 — `copy-recommendation` feature에서 별도 처리
- 광고센터 어드민 등록 — `adcenter-register` feature에서 별도 처리
- Full Screen 배너용 이미지 스펙 (현재 Fit 배너만 대상, `screen-decisions.md`에도 Full Screen 소재 폼은 TBD)
- 생성된 이미지의 수동 편집/리터치 기능 (컬러는 "다시 생성" 방식으로 지원, 픽셀 단위 편집은 미지원)
- **3D 듀얼 오브젝트 믹스 스타일** — 2026-08-03 방향 변경으로 폐기, 스타일은 3D 기본/2D 플랫 2종만 지원
- **스타일 2용 에셋 라이브러리** — 2D 버전 사전 제작 이미지는 만들지 않음, 항상 동적 생성(레퍼런스 첨부)으로 처리

---

## 3. Requirements

### 3.1 Functional Requirements

상태는 2026-08-13에 코드를 읽어 맞췄다. 전에는 9개 전부 `Pending`이었는데
그 사이 4개가 폐기됐고 나머지는 동작하고 있었다.

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사용자가 오브젝트(상품/서비스명)를 텍스트로 입력할 수 있다 | High | **Done** |
| FR-02 | 입력한 오브젝트를 블루프린트(Must Have/Should Have/Avoid/Recognition Cue)로 보강한 뒤 프롬프트에 넣는다 | High | **Done** |
| FR-03 | 오브젝트 입력 시 사전 선택 없이 스타일 1(기본 3D 아이콘)+스타일 2(2D 플랫 아이콘) 2장을 동시 자동 생성한다 | High | **Done** |
| FR-04 | 생성된 이미지는 240×240px, PNG, 500KB 이하, 투명 배경(알파 채널) 스펙을 만족한다 | High | **Done** (테스트 19개) |
| FR-05 | ~~스타일 3(듀얼 오브젝트)~~ — 2026-08-03 폐기, 스타일은 2종만 지원 | - | Removed |
| FR-06 | Gemini API 호출 실패 시 사용자에게 에러를 표시하고 재시도할 수 있다 | Medium | **Done** |
| FR-07 | ~~결과 화면에서 스타일 1장만 골라 "다시 생성하기"~~ — 2026-08-11 폐기 | - | Removed |
| FR-08 | ~~재생성 시 브랜드 컬러(hex)를 반영~~ — 2026-08-07 폐기 | - | Removed |
| FR-09 | ~~스타일별 재생성 이력을 이전/다음으로~~ — FR-07 폐기로 성립하지 않음 | - | Removed |

**FR-02는 서브에이전트가 아니라 코드가 한다.** 원래 문구는
`image-research-agent`가 호출된다고 적혀 있었는데, `.claude/agents/`의 에이전트는
개발할 때 Claude Code에만 보이고 Next.js 라우트에서 부를 수 없다.
실제로는 [prompt-compiler.ts](../../../src/lib/prompt-compiler.ts)의
`resolveObjectBlueprint()`가 같은 절차를 Claude API 직접 호출로 수행한다 —
`prompt-system/OBJECTS/{slug}.md`가 있으면 읽고, 없으면 새로 작성해 저장한다.
실패하면(크레딧 부족 등) 최소 블루프린트로 폴백해 낮은 품질로라도 진행한다.

**500KB는 검사가 아니라 구조로 지킨다.** 240×240 RGBA의 비압축 크기가 225KB이고,
압축이 전혀 안 되는 무작위 노이즈를 넣어도 226KB였다(2026-08-13 실측). 규격에 맞춘
이미지는 상한을 **넘을 수 없다** — 그래서 생성 경로에 상한 검사를 두지 않았다.
발동할 수 없는 검사가 있으면 읽는 사람이 "여기서 걸러진다"고 믿게 된다.

**상한이 실제로 문제되던 곳은 업로드였다.** 업로드 규칙은 JPEG·400×400·1MB까지
받는데 `resolveBannerImageUrl`이 그 원본을 **가공 없이 그대로** 배너로 썼다 —
형식·크기·용량 셋 다 매체 규격 위반이고, 사용자는 소재를 다 만든 뒤 등록 단계에서야
거절당한다. 이제 [banner-image-client.ts](../../../src/lib/banner-image-client.ts)의
`fitToBannerSpec()`이 업로드 직후 같은 규격으로 맞춘다(브라우저 확인: 424KB JPEG
400×400 → 188KB PNG 240×240).

규격 값은 [banner-image-spec.ts](../../../src/lib/banner-image-spec.ts) 한 곳에 있고
서버(sharp)와 브라우저(canvas) 두 구현이 그걸 읽는다. 2026-08-13까지 서버 쪽
파이프라인은 세 곳에 복사돼 있었고 아무도 검사하지 않았다.

**FR-07~09를 함께 뺀 경위** — 카드마다 있던 "다시 생성하기"를 하나로 합치면서
(design §2 "다시 만드는 자리는 하나") FR-07이 사라졌고, 이력(FR-09)은 그 위에
얹혀 있어 함께 성립하지 않게 됐다. 브랜드 컬러(FR-08)는 생성 스타일이 이미
고정돼 실효가 없어 2026-08-07에 화면에서 뺐다.

**2026-08-13에 이들의 코드도 걷어냈다.** 기능은 폐기했는데 파라미터와 분기가
그대로 남아 있었다 — `brandColor`(5개 파일) · `regenerateStyle`(라우트 분기) ·
`visualizationNote`(받아서 그대로 돌려주기만 함) · `material`/`glossy`(화면이 물어본
적이 없어 항상 clay). 요청 타입이 필드 5개에서 `primaryObject` 하나가 됐다.
지운 필드를 보내도 400이 아니라 무시한다.

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 스타일 1+2 병렬 생성으로 체감 대기시간 최소화 | `Promise.allSettled`로 2개 동시 실행 — 한쪽이 실패해도 다른 쪽은 반환한다 |
| Cost | Gemini 종량제 비용을 사용자에게 노출하지 않되, 재생성 남용 방지 | **미구현** — rate limit 없음. 화면을 다듬는 동안은 `MOCK_AI=1`로 호출 자체를 막는다 |
| Compliance | 생성 이미지가 `kakaopay-banner-guide.md`의 업종별 유의사항을 위반하지 않음 | **미구현** — 생성 결과를 검사하는 장치가 없다. 규격(240×240)만 `sharp`가 강제한다 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] 오브젝트 입력 → 스타일 1+2 이미지 2장이 실제로 생성되어 화면에 표시됨 (Gemini API로 검증 완료, route.ts 구현 전)
- [ ] 생성 이미지가 240×240px/PNG/500KB 이하 스펙 충족 (리사이즈 단계 미구현)
- [x] 배경제거 후처리로 실제 투명 PNG 확보 (Gemini 원본은 체크무늬/불투명 배경으로 나옴 — 별도 후처리 필수 확인됨)
- [ ] 개별 스타일 재생성 + 브랜드 컬러 반영 동작
- [ ] `generate-banner-image` SKILL.md의 TBD(API 연동부)가 실제 코드로 대체됨

### 4.2 Quality Criteria

- [ ] 보험/금융/증권 등 실물 시각화 어려운 업종 입력 시 은유적 오브젝트로 자연스럽게 대체됨
- [x] 색상/재질 톤이 과하게 유치하지 않고 프리미엄하게 나옴 (톤 다운 팔레트 + 세미매트 새틴으로 조정 완료)
- [x] 오브젝트 인식에 필요한 디테일(눈/바퀴 등)이 누락되지 않음 (Geometry 지시 보강 완료)
- [ ] Build 성공 (`npm run build`)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Gemini가 프롬프트만으로 투명 배경을 만족 못함 (체크무늬/불투명 배경으로 나옴 — 실제 확인됨) | High | Confirmed | 배경제거 후처리(rembg 방식)를 필수 파이프라인 단계로 고정. Node 환경엔 `@imgly/background-removal-node` 등 동등 라이브러리 도입 필요 |
| 종량제 비용이 예상보다 빠르게 증가 | Medium | Medium | 3장→2장으로 축소. 횟수 제한은 **미도입** — 개발 중에는 `MOCK_AI=1`로 호출을 막는다 |
| 은유적 오브젝트 매핑이 부적절하게 나올 수 있음 (예: 업종 오분류) | Medium | Low | 블루프린트를 `prompt-system/OBJECTS/{slug}.md`로 남겨 사람이 열어볼 수 있게 함. **자동 검수는 없다** |
| **생성 결과가 오브젝트를 맞게 그렸는지 아무도 안 본다** | High | Confirmed | 미해결. 규격(240×240)은 `sharp`가 강제하지만 내용 검증 장치가 없고 생성 3모듈에 테스트도 없다 |

---

## 6. Impact Analysis

> 2026-08-04 작성 당시에는 그린필드였다. 지금은 구현이 끝나 3단계 화면이 이 API를 쓴다 — 아래 6.2를 함께 본다.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| [style1-generate.ts](../../../src/lib/style1-generate.ts) | 구현됨 | Gemini `gemini-2.5-flash-image`로 3D 아이콘 생성 → `@imgly/background-removal-node` 배경제거 → 240×240 |
| [style2-generate.ts](../../../src/lib/style2-generate.ts) | 구현됨 | OpenAI `gpt-image-1` + `background:"transparent"`로 후처리 없이 네이티브 투명 배경 → 240×240 |
| [prompt-compiler.ts](../../../src/lib/prompt-compiler.ts) | 구현됨 | 블루프린트 캐시 조회 → 없으면 Claude로 작성·저장 → 프롬프트 조립 |

### 6.2 Current Consumers

[Step1ImagePanel.tsx](../../../src/components/ai-banner/Step1ImagePanel.tsx) — 1단계 화면이 `/api/generate-image`를 호출한다. 응답 형태를 바꾸면 이 화면이 함께 깨진다.

### 6.3 Verification

- [x] 테스트 81개 통과 (`npm test`)
- [x] 규격 파이프라인(`banner-image`) 테스트 11개 · 프롬프트 컴파일러 폴백 테스트 13개
- [ ] `style1-generate` · `style2-generate`의 **외부 API 호출부는 미검증** — `mock.module`이 tsx 로더와 안 맞아 가짜로 바꿀 수 없다. 호출부를 주입 가능하게 바꾸면 열린다
- [ ] 실제 API 경로 미검증 — 개발 서버가 `MOCK_AI=1`로 돈다

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, 백엔드/외부 API 연동 | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, microservices | 고트래픽/복잡 시스템 | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js | Next.js | CLAUDE.md 지정 스택 |
| State Management | Context / Zustand / 없음 | React 기본 상태(useState) | 화면 1개, 전역 상태 불필요 — 불필요한 라이브러리 추가 지양 원칙 |
| API Client | fetch | fetch | 별도 라이브러리 불필요 |
| Styling | Tailwind CSS | Tailwind CSS | CLAUDE.md 지정 스택 |
| Backend | Next.js API Route → Gemini(스타일1) + OpenAI(스타일2) | Next.js API Route, 듀얼 프로바이더 | bkend.ai 대신 Next.js 서버 라우트에서 직접 호출. 스타일별로 결과 품질이 더 좋은 모델을 각각 선택 (Gemini=3D 조형, OpenAI=2D 디자인시스템 정확도) |
| DB | Supabase | Supabase (필요 시) | 생성 이미지/메타데이터 저장이 필요해지면 사용, 이번 feature 최소 범위에서는 필수 아님 |
| 배경제거 (스타일 1만) | rembg(Python, 검증용) → Node 라이브러리 | `@imgly/background-removal-node` 등 (module-2에서 확정) | Gemini가 프롬프트만으로 투명 배경을 못 만족해서 후처리 필수. **스타일 2(OpenAI)는 `background:"transparent"`가 네이티브로 되므로 후처리 불필요** — rembg를 스타일 2에 적용해봤더니 바퀴 같은 디테일까지 잘려나가는 부작용 확인, 사용 안 하기로 결정 |
| 스타일 2 아웃라인/그림자 | 프롬프트로 완전 제거 시도 → 실패, 그대로 수용 | 스타일 일부로 수용 | "절대 금지" 수준 지시에도 Gemini·OpenAI 둘 다 아이콘 생성 시 아웃라인+은은한 그림자를 계속 그려 넣음 — 모델 공통의 스타일 편향으로 판단, 더 이상 제거 시도 안 함 |

### 7.3 Clean Architecture Approach

```
Selected Level: Dynamic

src/
  app/
    (studio)/image-generation/page.tsx   ← 오브젝트 입력 화면 (스타일 선택 없음)
    api/generate-image/route.ts          ← 스타일1(Gemini+배경제거) + 스타일2(OpenAI) 병렬 호출 라우트
  lib/
    gemini-image.ts                      ← Gemini API 클라이언트 (스타일 1)
    openai-image.ts                      ← OpenAI API 클라이언트 (스타일 2, gpt-image-1)
    image-style-patterns.ts              ← 스타일 1 프롬프트 조립 (재질/브랜드컬러 파라미터화)
    style2-design-system.ts              ← 스타일 2 디자인 시스템(ROLE~OBJECT BLUEPRINT), 카테고리별 컬러 토큰
    asset-library.ts                     ← 스타일 1 전용 사전 제작 이미지 키워드 매칭
    background-removal.ts                ← 배경제거 후처리 (스타일 1 전용, TBD 라이브러리)
  agents 호출은 Claude Code 세션 내에서 처리 (런타임 코드와 별개)
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists
- [ ] ESLint / Prettier / tsconfig — 아직 Next.js 프로젝트 자체가 스캐폴딩되지 않음 (Do 단계에서 함께 처리)

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| Naming | missing | 컴포넌트/파일 네이밍 규칙 | Medium |
| Folder structure | missing | 위 7.3 구조를 기준으로 확정 | High |
| Error handling | missing | Gemini API 실패 시 에러 응답 포맷 | Medium |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `GEMINI_API_KEY` | 스타일 1(3D) 생성 | Server | ☑ |
| `OPENAI_API_KEY` | 스타일 2(2D) 생성 (`gpt-image-1`) | Server | ☑ |
| `ANTHROPIC_API_KEY` | 오브젝트 블루프린트 작성 · 카피 생성 | Server | ☑ |
| `MOCK_AI` | `1`이면 외부 호출 없이 목업 응답. 개발 서버 기본값 | Server | ☑ |
| ~~`RECRAFT_*`~~ | 폐기됨 (Recraft → Gemini 전환) | - | Removed |

---

## 9. Next Steps

1. [x] Gemini API 키 발급 (사용자 직접, Google AI Studio)
2. [x] Gemini 실제 호출로 스타일 1(3D)/2(2D) 검증 — 재질(clay/glossy), 색상 팔레트, 필수 디테일(눈/바퀴) 프롬프트 튜닝 완료
3. [x] Next.js 프로젝트 스캐폴딩 완료 (module-1)
4. [x] Design document 갱신 ([image-generation.design.md](../../02-design/features/image-generation.design.md))
5. [x] module-2: `/api/generate-image` route.ts 구현 (생성 + 배경제거 + 리사이즈)
6. [x] module-3: 결과 화면 UI (2장 표시). 개별 재생성·브랜드 컬러·이력 탐색은 폐기(§3.1)
7. [x] 에셋 라이브러리(스타일 1) 17개 등록 완료
8. [ ] 실사용 로그 기반으로 라이브러리 확장 (보험/여행 업종 등 빈 카테고리 채우기)
9. [~] 생성 모듈 테스트 — `banner-image` 11개 · `banner-image-client` 8개 · `prompt-compiler` 13개 추가(2026-08-13). `style1/style2-generate`의 외부 API 호출부는 여전히 미검증
10. [ ] **실제 API 경로 검증** — 지금까지 목업으로만 돌렸다

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-03 | Initial draft (스타일 3종, Recraft) | gojuhee |
| 0.2 | 2026-08-03 | 스타일 3(듀얼) 폐기, 사전 선택 후 1장 생성으로 변경 | gojuhee |
| 0.3 | 2026-08-04 | Recraft → Gemini 전환, 사전 선택 UX 폐기 → 스타일1+2 동시 자동생성, 개별 재생성 + 브랜드 컬러, 재생성 이력 탐색, 에셋 라이브러리 스코프 추가 | gojuhee |
| 0.4 | 2026-08-13 | **코드를 읽어 문서를 실제와 맞췄다.** FR 9개가 전부 `Pending`이었는데 4개 완료·1개 부분·4개 폐기였다. FR-02는 서브에이전트가 아니라 `resolveObjectBlueprint()`가 한다는 점, 스타일 2가 Gemini가 아니라 OpenAI `gpt-image-1`이고 레퍼런스를 첨부하지 않는다는 점을 바로잡았다. 미구현으로 남은 것(비용 제한·결과 검증·생성 모듈 테스트)을 감추지 않고 표시 | gojuhee |
