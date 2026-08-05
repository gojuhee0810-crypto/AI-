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

## 절차 (2026-08-05 #3 — route.ts 구현 완료 반영)

실제 구현체: `POST /api/generate-image` ([route.ts](../../../src/app/api/generate-image/route.ts)). 아래는 그 내부 동작이다.

1. 사용자가 입력한 오브젝트(`primaryObject`)를 받는다.
2. **스타일 1(3D)**: `src/lib/asset-library.ts`의 `findLibraryAsset()`으로 매칭 시도 → 매칭되면 생성 없이 그 이미지를 240×240으로 리사이즈해 반환. 매칭 없으면 [`src/lib/style1-generate.ts`](../../../src/lib/style1-generate.ts)가 `image-style-patterns.ts`로 프롬프트를 조립해 Gemini(`gemini-2.5-flash-image`)로 생성하고, `@imgly/background-removal-node`로 배경을 제거한 뒤 240×240으로 리사이즈한다 (Gemini는 투명 배경을 못 만들어줘서 후처리 필수).
3. **스타일 2(2D)**: `src/lib/style2-asset-library.ts`의 `findStyle2LibraryAsset()`으로 매칭 시도 → 매칭되면 생성 없이 그 이미지를 240×240으로 리사이즈해 반환. 매칭 없으면 [`src/lib/style2-generate.ts`](../../../src/lib/style2-generate.ts)가:
   - a. [`src/lib/prompt-compiler.ts`](../../../src/lib/prompt-compiler.ts)의 `resolveObjectBlueprint()`로 `prompt-system/OBJECTS/{object}.md`를 읽거나(없으면 Claude가 새로 작성해 저장), `compilePrompt()`로 `prompt-system/`의 전역 규칙(`SYSTEM.md`/`STYLE_GUIDE.md`/`SHAPE_GRAMMAR.md`/`COLOR_TOKEN.md`/`CAMERA.md`/`OUTPUT.md`)과 함께 Claude(`claude-sonnet-4-5`)로 자연어 프롬프트 1개로 컴파일한다.
   - b. **Claude 호출이 실패하면(크레딧 부족 등) 자동으로 폴백** — 블루프린트는 범용 최소 템플릿으로, 컴파일은 MD 섹션 단순 이어붙이기로 대체한다. 폴백이어도 파이프라인은 계속 동작한다(품질만 약간 낮음).
   - c. 컴파일된 프롬프트를 OpenAI(`gpt-image-1`, `images.generate`, `background: "transparent"`, 레퍼런스 이미지 미첨부)로 렌더링하고 240×240으로 리사이즈한다.
   - 2026-08-05 실측: 스타일 1(3D 클레이) 이미지를 `images.edit`에 레퍼런스로 붙이면 리얼리즘이 섞여 결과가 나빠지므로 붙이지 않는다. API 결과가 ChatGPT 앱 직접 생성보다 품질이 들쭉날쭉해서, 검증된 좋은 결과는 `style2-asset-library.ts`에 캐시해 재사용한다.
4. **재생성**: `regenerateStyle`이 지정되면 라이브러리 매칭을 건너뛰고 항상 동적 생성으로 전환한다. `brandColor`(hex)가 주어지면 Primary 컬러를 그 값으로 교체한다.
5. 두 스타일 결과를 함께 반환한다(`GenerateImageResponse.images`).

## 참조 파일

- [route.ts](../../../src/app/api/generate-image/route.ts) — API 엔드포인트 본체
- [prompt-system/](../../../prompt-system/) — 스타일 2 디자인 시스템 단일 진실 공급원(SYSTEM.md + STYLE_GUIDE.md + SHAPE_GRAMMAR.md + COLOR_TOKEN.md + CAMERA.md + OUTPUT.md + OBJECTS/*.md)
- [docs/patterns/image-style-patterns.md](../../../docs/patterns/image-style-patterns.md) — 스타일 1 프롬프트, 베이스 프롬프트
- `src/lib/asset-library.ts` / `src/lib/style2-asset-library.ts` — 스타일 1/2 각각의 사전 제작 에셋 키워드 매칭 (완전히 분리된 라이브러리, 서로 참조 안 함)
- [docs/guides/kakaopay-banner-guide.md](../../../docs/guides/kakaopay-banner-guide.md) — 이미지 규격(240×240px, PNG, 500KB), 업종별 유의사항

## 알려진 한계 (2026-08-05 감사 결과)

- Claude(`ANTHROPIC_API_KEY`) 정상 경로(진짜 자연어 컴파일)는 크레딧 부족으로 실측 검증 안 됨 — 폴백 경로만 검증됨.
- `resolveObjectBlueprint`가 동의어 정규화를 안 해서 "핸드폰"/"휴대폰"처럼 같은 오브젝트가 다른 블루프린트 파일로 쌓일 수 있음.
- 스타일1/2 중 하나만 실패해도 route.ts가 전체를 502로 버림 — 부분 성공을 살리지 못함.
- 과금되는 외부 API(Gemini/OpenAI/Claude) 호출에 rate limit이 없음.
- 자동화된 테스트 없음 — 전부 수동 curl 검증.
