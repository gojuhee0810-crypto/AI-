---
name: generate-copy
description: >
  사용자가 캠페인 혜택(혜택/조건/기한 자유 텍스트)을 입력하면, 카카오페이 Fit
  배너용 카피 4종(프레임워크별 서브타이틀+메인타이틀)을 생성한다. "카피 추천",
  "혜택 입력", "서브타이틀/메인타이틀 생성" 요청 시 사용.
---

# generate-copy

혜택 입력 → 카피 4종 추천 흐름의 실행 스킬. 원문은
[copy-patterns-v2.md](../../../docs/patterns/copy-patterns-v2.md)에 있다 — v1은
남아 있지만 기준이 아니다(`CLAUDE.md` 참조).

> 실제 구현은 [copy-generate.ts](../../../src/lib/copy-generate.ts)다. 아래 절차는
> 그 코드가 하는 일이다 — 서브에이전트 호출이나 LLM 자체 검증은 없다. **LLM은 글자를
> 못 세므로**, 검사는 전부 코드가 한다(`validateRecommendations`).

## 절차

1. 사용자가 입력한 혜택 텍스트(자유 텍스트: 혜택/조건/기한이 섞여 있을 수 있음)를 받는다.
2. `docs/patterns/copy-patterns-v2.md`의 시스템 프롬프트로 Claude를 1콜 호출해 4개
   프레임워크 각각 subtitle(≤15자, 공백 포함)·main_title(≤14자, 공백 포함)을 생성한다.
3. **코드가 검사한다** — `validateRecommendations()`가 글자수·문구 반복·오브젝트명
   재노출·규제 표현 4가지를 기계적으로 확인한다.
4. 위반이 없으면 그대로 반환한다 — **정상 케이스는 여기서 끝, 1콜.**
5. 위반이 있으면 위반 필드만 지목한 보정 프롬프트로 Claude를 한 번 더 호출하고,
   다시 3번으로 검사한다. 그래도 남으면 경고만 남기고 반환한다(무한 루프 방지).
6. 아래 스키마의 순수 JSON으로만 결과를 반환한다 (마크다운/설명 텍스트 금지).
   패턴은 4종 정의돼 있지만 **입력값에 가장 맞는 3개만** 고른다 — pattern4(조건+혜택강조형)는
   pattern2(혜택조건+결과형)와 구조가 겹치므로, benefit이 조건부(예: "~하면 ~%할인")일
   때만 pattern2 대신 채택한다.

```json
{
  "recommendations": [
    { "pattern": "상황기반+문제제기", "subtitle": "...", "maintitle": "...", "reason": "..." },
    { "pattern": "혜택조건+결과형", "subtitle": "...", "maintitle": "...", "reason": "..." },
    { "pattern": "혜택+CTA형", "subtitle": "...", "maintitle": "...", "reason": "..." }
  ],
  "warning": null
}
```

`reason`은 검수용 근거 한 줄이다. `pattern`은 `CopyPattern` 타입(4종) 중 하나이고,
`framework`·`main_title` 같은 이름은 쓰지 않는다 — [copy-generation.ts](../../../src/types/copy-generation.ts)의
`CopyRecommendation`이 실제 계약이다.

## 실제 구현

Next.js API Route(`/api/generate-copy`)에서 Anthropic Claude API(`@anthropic-ai/sdk`,
모델 `claude-sonnet-4-5`)로 호출한다. 시스템 프롬프트 전문과 보정 프롬프트는
[copy-generate.ts](../../../src/lib/copy-generate.ts)에 있다 — `copy-patterns-v2.md`는
그 설계 근거를 남긴 문서지 실행되는 프롬프트 원문이 아니다.
`ANTHROPIC_API_KEY` 환경변수 필요 (`.env.local`).

## 참조 파일

- [copy-generate.ts](../../../src/lib/copy-generate.ts) — 시스템 프롬프트 원문, 검증 로직, Claude 호출
- [copy-generation.ts](../../../src/types/copy-generation.ts) — 요청/응답 타입 (실제 계약)
- [docs/patterns/copy-patterns-v2.md](../../../docs/patterns/copy-patterns-v2.md) — 왜 이렇게 설계했는지
- [docs/guides/kakaopay-banner-guide.md](../../../docs/guides/kakaopay-banner-guide.md) — 금칙어/업종별 유의사항
