---
name: generate-banner-image
description: >
  사용자가 오브젝트(상품/서비스)를 입력하면, 카카오페이 Fit 배너용 이미지 2종
  (스타일 1: 3D 아이콘 / 스타일 2: 2D 디자인 시스템 아이콘)을 사전 선택 없이 동시
  생성한다. "이미지 생성", "오브젝트 입력", "배너 이미지 추천" 요청 시 사용.
---

# generate-banner-image

오브젝트 입력 → 이미지 2스타일(3D+2D) 동시 생성 흐름의 실행 스킬.

> 2026-08-04: 스타일 3(3D 듀얼 오브젝트)는 리소스 절감 + UX 단순화로 범위에서 제외.
> **듀얼 프로바이더 확정**: 스타일 1은 Gemini(`gemini-2.5-flash-image`), 스타일 2는
> OpenAI(`gpt-image-1`)로 각각 다른 모델을 쓴다 — 스타일별로 더 정확한 쪽을 선택.

## 절차

1. 사용자가 입력한 오브젝트(상품/서비스명)와 업종(선택)을 받는다.
2. **image-research-agent**를 호출해 `primary_object`, `material`, `category`, `semantic_blueprint`(mustHave/shouldHave/avoid/recognitionCue), `visualization_note`, `closest_reference`를 보강받는다. 실물을 그대로 베끼려 하지 않고 인식에 필요한 핵심 특징만 정리한다 (형태 조사는 Recognition Cue 판단용으로만 최소한 사용).
3. **스타일 1(3D)**: `docs/patterns/image-style-patterns.md`의 `{object}` = primary_object, material = 2번 결과. 라이브러리 우선 — `src/lib/asset-library.ts`의 `findLibraryAsset()`으로 매칭 시도, 매칭되면 생성 없이 그 이미지 반환. 매칭 없으면 Gemini 동적 생성.
4. **스타일 2(2D)**: `src/lib/style2-design-system.ts`의 `buildStyle2DesignSystemPrompt(semantic_blueprint, brandColor?)`로 프롬프트 조립 (ROLE→STYLE→SHAPE GRAMMAR→OBJECT BLUEPRINT→COLOR SYSTEM→NEGATIVE PROMPT→OUTPUT). **항상 텍스트 전용 생성** — 스타일 1(3D 클레이 렌더) 이미지를 레퍼런스로 첨부하지 않는다. 2026-08-05 실측: 스타일 1 이미지를 `images.edit`에 참고로 붙이면 3D/리얼리즘 質감이 섞여 들어와 결과가 더 나빠졌고, `images.generate`로 텍스트 프롬프트만 준 케이스가 더 하우스 스타일에 맞았다. 항상 OpenAI(`gpt-image-1`, `images.generate`, `background: "transparent"`), 라이브러리 매칭은 타지 않고 매번 동적 생성 — 후처리 불필요(네이티브 투명 배경).
   - **검증 루프 필수**: 오브젝트 블루프린트는 바로 최종본으로 쓰지 않는다. (1)초안 작성 → (2)조형성/컬러·채도/금지요소+인식성 3기준으로 자체 검사 → (3)부족한 점 표로 정리 → (4)기준에 맞게 수정 → (5)최종본과 수정 이유를 분리해서 제시, 순서로 진행한다.
5. 두 스타일 결과 이미지와, 어떤 오브젝트/근거로 만들어졌는지(`visualization_note`)를 함께 반환한다.
6. **재생성**: 사용자가 특정 스타일 1장만 "다시 생성"을 요청하면, 3(스타일1) 또는 4(스타일2)만 해당 스타일로 재실행한다 — 라이브러리 매칭이었더라도 재생성은 항상 동적 생성으로 전환한다. 브랜드 컬러(hex)가 주어지면 각 스타일의 컬러 지시를 브랜드 컬러 기준으로 교체한다.

## 참조 파일

- [docs/patterns/image-style-patterns.md](../../../docs/patterns/image-style-patterns.md) — 스타일 1 프롬프트, 베이스 프롬프트
- `src/lib/style2-design-system.ts` — 스타일 2 디자인 시스템 (ROLE~OUTPUT 7섹션, 카테고리별 컬러 토큰, `SemanticBlueprint`)
- `src/lib/asset-library.ts` — 스타일 1 전용 사전 제작 에셋 키워드 매칭 (스타일 2의 `images.edit` 레퍼런스 이미지도 여기서 카테고리 매칭해 재사용)
- `src/lib/style2-anchors.ts` — 구버전 앵커 방식(3장 고정 첨부), 현재는 라이브러리 카테고리 매칭 방식으로 대체돼 미사용
- [docs/guides/kakaopay-banner-guide.md](../../../docs/guides/kakaopay-banner-guide.md) — 이미지 규격(240×240px, PNG, 500KB), 업종별 유의사항
- `.claude/agents/image-research-agent.md` — 사전 리서치 서브에이전트 (형태 조사 포함)

## TBD

- 240×240 리사이즈 단계 구현 필요 (두 모델 다 1024×1024로 생성)
- 스타일 1 배경제거용 Node 라이브러리 확정 필요
