---
name: generate-copy
description: >
  사용자가 캠페인 혜택(혜택/조건/기한 자유 텍스트)을 입력하면, 카카오페이 Fit
  배너용 카피 4종(프레임워크별 서브타이틀+메인타이틀)을 생성한다. "카피 추천",
  "혜택 입력", "서브타이틀/메인타이틀 생성" 요청 시 사용.
---

# generate-copy

혜택 입력 → 카피 4종 추천 흐름의 실행 스킬. 원문은
[copy-patterns.md](../../../docs/patterns/copy-patterns.md)에 있다.

## 절차

1. 사용자가 입력한 혜택 텍스트(자유 텍스트: 혜택/조건/기한이 섞여 있을 수 있음)를 받는다.
2. **copy-research-agent**를 호출해 업종/혜택유형/키워드/톤/컴플라이언스 주의사항을 보강받는다.
3. `docs/patterns/copy-patterns.md`의 시스템 프롬프트를 그대로 적용하되, 2번에서 받은 보강 컨텍스트(keywords, tone_suggestion)를 참고 정보로 함께 제공한다.
4. 4개 프레임워크 각각 subtitle(≤15자, 공백 포함)·main_title(≤14자, 공백 포함)을 생성한다.
5. **글자수 직접 검증**: 생성된 각 subtitle/main_title의 글자수(공백 포함)를 세어, 제한을 초과하면 의미를 유지하며 줄여서 다시 출력한다. 이 검증을 통과하기 전까지 결과를 확정하지 않는다.
6. `compliance_flags`에 주의사항이 있으면, 해당 프레임워크 카피가 그 표현을 쓰지 않았는지 다시 확인한다.
7. 아래 스키마의 순수 JSON으로만 결과를 반환한다 (마크다운/설명 텍스트 금지).

```json
{
  "copies": [
    { "framework": "상황 기반 + 문제 제기", "subtitle": "...", "main_title": "..." },
    { "framework": "혜택 조건 + 결과형(보상)", "subtitle": "...", "main_title": "..." },
    { "framework": "혜택 + 행동 유도 CTA형", "subtitle": "...", "main_title": "..." },
    { "framework": "조건 + 혜택 강조형", "subtitle": "...", "main_title": "..." }
  ]
}
```

## 실제 구현

Next.js API Route에서 Anthropic Claude API(`@anthropic-ai/sdk`, 모델 `claude-sonnet-5`)로 호출한다.
구현 코드 예시와 파라미터(effort, output_config.format 등)는
[copy-patterns.md의 "Claude API 연동"](../../../docs/patterns/copy-patterns.md#claude-api-연동) 참고.
`ANTHROPIC_API_KEY` 환경변수 필요 (`.env.local`).

## 참조 파일

- [docs/patterns/copy-patterns.md](../../../docs/patterns/copy-patterns.md) — 시스템 프롬프트 원본, 글자수 스펙, Claude API 연동 코드
- [docs/guides/kakaopay-banner-guide.md](../../../docs/guides/kakaopay-banner-guide.md) — 금칙어/업종별 유의사항
- `.claude/agents/copy-research-agent.md` — 사전 리서치 서브에이전트
