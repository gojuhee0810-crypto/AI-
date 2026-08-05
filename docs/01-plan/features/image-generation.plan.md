---
template: plan
version: 1.3
---

# image-generation Planning Document

> **Summary**: 광고주가 오브젝트(상품/서비스)를 입력하면, Gemini(Google AI Studio) API로 스타일 1(3D 기본 아이콘)과 스타일 2(2D 플랫 아이콘) 배너 이미지 2장을 사전 선택 없이 동시 자동 생성한다. 마음에 안 드는 쪽만 개별로 "다시 생성하기" 할 수 있고, 이때 브랜드 컬러를 지정할 수 있다.
>
> **Project**: AI 배너 스튜디오
> **Version**: 0.3.0
> **Author**: gojuhee
> **Date**: 2026-08-04
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 보험·금융·증권처럼 상품을 시각화하기 어려운 업종은 이미지 방향을 잡기 어렵고, 비디자이너 광고주는 매체 규격에 맞는 이미지를 직접 제작하기 어렵다 |
| **Solution** | 오브젝트 텍스트 입력만으로 Gemini API가 스타일 1(3D)+2(2D) 2장을 사전 선택 없이 자동 생성 — 미리보기 없는 "생성 전 스타일 선택"은 비디자이너에게 판단 부담이라 배제 |
| **Function/UX Effect** | 이미지 제작 시간 단축, 은유적 오브젝트 표현, 결과 2장을 바로 비교(A/B) 가능, 마음에 안 드는 스타일만 개별 재생성 + 브랜드 컬러 반영으로 3장 대비 리소스 절감 |
| **Core Value** | 비디자이너 광고주도 카카오페이 매체 가이드에 맞는 전문적인 배너 이미지를 즉시 확보 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 상품 시각화가 어려운 업종(보험/금융/증권)과 반복 수정이 잦은 업종(여행/커머스) 모두의 이미지 제작 부담을 줄인다 |
| **WHO** | 카카오페이 광고주 (비디자이너 포함), Fit 배너 소재를 등록하는 담당자 |
| **RISK** | Gemini가 투명 배경을 프롬프트만으로 만족 못해 배경제거 후처리가 필수 의존성이 됨, 종량제 비용이 사용량에 비례해 계속 증가 |
| **SUCCESS** | 오브젝트 입력 1회로 스타일 1+2 이미지 2장이 240×240px/PNG/500KB 이하 스펙을 만족하며 생성됨 |
| **SCOPE** | 이번 feature는 "오브젝트 입력 → 이미지 2장 자동 생성 → 개별 재생성/브랜드 컬러 조정"까지이며, 카피 생성(copy-recommendation)과 광고센터 등록(adcenter-register)은 별도 feature |

---

## 1. Overview

### 1.1 Purpose

오브젝트(상품/서비스) 텍스트 입력만으로, 카카오페이 Fit 배너 규격(240×240px, PNG, 500KB 이하, 투명 배경)에 맞는 스타일 1(3D 기본 아이콘)+스타일 2(2D 플랫 아이콘) 이미지 2장을 자동 생성한다. 결과 화면에서 마음에 안 드는 스타일만 개별로 다시 생성할 수 있고, 이때 브랜드 컬러(hex)를 지정할 수 있다.

> **Update (2026-08-03)**: 최초 계획은 3스타일(기본 3D/2D 플랫/3D 듀얼)을 한 번에 모두 생성하는 것이었다. 이후 "생성 전 스타일 1개 선택" 방식도 검토했으나, 미리보기 없이 추상적인 스타일 이름만 보고 고르게 하는 건 비디자이너에게 나쁜 UX로 판단해 폐기했다. 3D 듀얼 오브젝트 믹스 스타일은 이번 feature 범위에서 폐기한다.
>
> **Update (2026-08-04, Gemini 전환)**: 이미지 생성 API를 Recraft에서 Google AI Studio(Gemini, `gemini-2.5-flash-image`)로 변경. 최종 UX: 오브젝트 입력 → 스타일 1+2 두 장을 사전 선택 없이 동시 자동 생성 → 결과 화면에서 마음에 안 드는 1장만 "다시 생성하기"(+ 브랜드 컬러 지정 가능) → 재생성 이력은 이전/다음으로 넘겨볼 수 있음(버튼 문구 미정).

### 1.2 Background

카카오페이 광고주는 캠페인 생성 후 소재(이미지)를 직접 제작해 등록해야 한다. 보험·금융·증권처럼 상품을 시각화하기 어려운 업종은 적절한 이미지 방향을 찾기 어렵고, 여행·커머스 업종은 매체 규격에 맞는 오브젝트형 이미지를 만드는 데 반복적인 수정이 발생한다. 이 feature는 이 문제를 이미지 생성 자동화로 해결한다.

### 1.3 Related Documents

- [docs/patterns/image-style-patterns.md](../../patterns/image-style-patterns.md) — 베이스 프롬프트, 스타일 1(3D)/2(2D) 정의
- [docs/patterns/assets/reference-2d/, reference-3d/](../../patterns/assets/) — 스타일 레퍼런스 이미지
- [docs/guides/kakaopay-banner-guide.md](../../guides/kakaopay-banner-guide.md) — 이미지 규격, 업종별 유의사항
- `.claude/agents/image-research-agent.md` — 사전 리서치 서브에이전트
- `.claude/skills/generate-banner-image/SKILL.md` — 실행 스킬 (현재 API 연동부 TBD)

---

## 2. Scope

### 2.1 In Scope

- [ ] 오브젝트 입력 UI (텍스트 입력 + 업종 선택 옵션 + "생성" 버튼, **스타일 사전 선택 없음**)
- [ ] `image-research-agent` 호출 로직 (오브젝트 분석, 은유적 대체 오브젝트 제안)
- [ ] `generate-banner-image` 스킬의 실제 Gemini API 연동 (Next.js API Route)
- [ ] 스타일 1(3D)+2(2D) 2장 동시 생성 및 결과 화면 표시
- [ ] 결과 화면에서 스타일별 "다시 생성하기" (개별, 브랜드 컬러 hex 입력 가능)
- [ ] 재생성 이력을 이전/다음으로 넘겨보는 버전 탐색 UI
- [x] 에셋 라이브러리 — 자주 나오는 오브젝트는 매번 생성하지 않고 사전 제작 이미지를 키워드 매칭으로 반환 (`src/lib/asset-library.ts`, 17개 등록, 수식어 오버라이드·제외어 처리 포함). **스타일 1(3D)에만 적용** — 매칭 없으면 동적 생성으로 폴백
- [x] 스타일 2(2D)는 라이브러리를 타지 않고 항상 Gemini 동적 생성 + 레퍼런스 이미지 3장(멀티모달 첨부, `src/lib/style2-anchors.ts`)으로 품질 보장

### 2.2 Out of Scope

- 카피(서브타이틀/메인타이틀) 생성 — `copy-recommendation` feature에서 별도 처리
- 광고센터 어드민 등록 — `adcenter-register` feature에서 별도 처리
- Full Screen 배너용 이미지 스펙 (현재 Fit 배너만 대상, `admin-design-system.md`에도 Full Screen 소재 폼은 TBD)
- 생성된 이미지의 수동 편집/리터치 기능 (컬러는 "다시 생성" 방식으로 지원, 픽셀 단위 편집은 미지원)
- **3D 듀얼 오브젝트 믹스 스타일** — 2026-08-03 방향 변경으로 폐기, 스타일은 3D 기본/2D 플랫 2종만 지원
- **스타일 2용 에셋 라이브러리** — 2D 버전 사전 제작 이미지는 만들지 않음, 항상 동적 생성(레퍼런스 첨부)으로 처리

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사용자가 오브젝트(상품/서비스명)를 텍스트로 입력할 수 있다 | High | Pending |
| FR-02 | 입력 시 `image-research-agent`가 실물 시각화 가능 여부를 판단해 오브젝트를 보정한다 | High | Pending |
| FR-03 | 오브젝트 입력 시 사전 선택 없이 스타일 1(기본 3D 아이콘)+스타일 2(2D 플랫 아이콘) 2장을 동시 자동 생성한다 | High | Pending |
| FR-04 | 생성된 이미지는 240×240px, PNG, 500KB 이하, 투명 배경(알파 채널) 스펙을 만족한다 | High | Pending |
| FR-05 | ~~스타일 3(듀얼 오브젝트)~~ — 2026-08-03 폐기, 스타일은 2종만 지원 | - | Removed |
| FR-06 | Gemini API 호출 실패 시 사용자에게 에러를 표시하고 재시도할 수 있다 | Medium | Pending |
| FR-07 | 결과 화면에서 스타일 1장만 골라 "다시 생성하기" 할 수 있다 (다른 1장은 그대로 유지) | High | Pending |
| FR-08 | 재생성 시 브랜드 컬러(hex)를 입력하면 해당 색을 반영해 다시 생성한다 | Medium | Pending |
| FR-09 | 스타일별로 재생성 이력을 이전/다음으로 넘겨볼 수 있다 (재생성해도 이전 결과가 사라지지 않음) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 스타일 1+2 병렬 생성으로 체감 대기시간 최소화, 개별 재생성은 해당 스타일 1건만 호출 | `Promise.all`로 2개 동시 실행, 재생성은 단건 호출 |
| Cost | Gemini 종량제 비용을 사용자에게 노출하지 않되, 재생성 남용 방지 | 재생성 버튼에 rate limit 또는 세션당 재생성 횟수 제한 고려 |
| Compliance | 생성 이미지가 `kakaopay-banner-guide.md`의 업종별 유의사항을 위반하지 않음 | `image-research-agent`의 `industry_caution` 필드로 사전 점검 |

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
| Gemini 종량제 비용이 예상보다 빠르게 증가 | Medium | Medium | 3장→2장으로 축소, 재생성은 개별 스타일만, 세션당 재생성 횟수 제한 고려 |
| 은유적 오브젝트 매핑이 부적절하게 나올 수 있음 (예: 업종 오분류) | Medium | Low | `image-research-agent`가 `visualization_note`로 근거를 남겨 검수 가능하게 함 |
| 브랜드 컬러 지정 재생성이 형태/구도까지 바꿔버릴 수 있음 (재생성은 매번 새로 그리는 방식) | Medium | Medium | 프롬프트에 "색만 바꾸고 나머지는 유지" 지시 강화, 필요시 seed 고정 검토 |

---

## 6. Impact Analysis

> 그린필드 신규 feature이며, 아직 구현된 코드가 없는 프로젝트 초기 단계다. 기존 소비자(consumer)가 없으므로 6.2/6.3은 해당 없음(N/A).

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| Gemini API 연동 모듈 (스타일 1) | 신규 API Route | 오브젝트+재질+브랜드컬러를 받아 3D 아이콘 생성 요청. 배경제거 후처리 필요 |
| OpenAI API 연동 모듈 (스타일 2) | 신규 API Route | 디자인 시스템 프롬프트(ROLE~OBJECT BLUEPRINT)로 2D 아이콘 생성. `gpt-image-1` + `background:"transparent"`로 후처리 없이 네이티브 투명 배경 확보 |
| `image-research-agent` 호출 로직 | 신규 | 오브젝트 입력을 보강 컨텍스트로 변환 |

### 6.2 Current Consumers

N/A (신규 기능, 기존 소비 코드 없음)

### 6.3 Verification

- [ ] N/A — 그린필드 구현이므로 회귀 검증 대상 없음

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
| `GEMINI_API_KEY` | Google AI Studio(Gemini) API 인증 | Server | ☑ |
| ~~`RECRAFT_*`~~ | 폐기됨 (Recraft → Gemini 전환) | - | Removed |

---

## 9. Next Steps

1. [x] Gemini API 키 발급 (사용자 직접, Google AI Studio)
2. [x] Gemini 실제 호출로 스타일 1(3D)/2(2D) 검증 — 재질(clay/glossy), 색상 팔레트, 필수 디테일(눈/바퀴) 프롬프트 튜닝 완료
3. [x] Next.js 프로젝트 스캐폴딩 완료 (module-1)
4. [ ] Design document를 이번 변경사항(Gemini, 2스타일, 재생성, 브랜드컬러)에 맞춰 갱신
5. [ ] module-2: `/api/generate-image` route.ts 구현 (Gemini 호출 + 배경제거 + 리사이즈)
6. [ ] module-3: 결과 화면 UI (2장 표시, 개별 재생성 버튼, 브랜드 컬러 입력, 버전 이전/다음 탐색)
7. [x] 에셋 라이브러리(스타일 1) 17개 등록 완료 + 스타일 2 레퍼런스 앵커 3장 확정
8. [ ] 실사용 로그 기반으로 라이브러리 확장 (보험/여행 업종 등 빈 카테고리 채우기)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-03 | Initial draft (스타일 3종, Recraft) | gojuhee |
| 0.2 | 2026-08-03 | 스타일 3(듀얼) 폐기, 사전 선택 후 1장 생성으로 변경 | gojuhee |
| 0.3 | 2026-08-04 | Recraft → Gemini 전환, 사전 선택 UX 폐기 → 스타일1+2 동시 자동생성, 개별 재생성 + 브랜드 컬러, 재생성 이력 탐색, 에셋 라이브러리 스코프 추가 | gojuhee |
