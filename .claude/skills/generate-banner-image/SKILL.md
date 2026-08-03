---
name: generate-banner-image
description: >
  사용자가 오브젝트(상품/서비스)를 입력하면, 카카오페이 Fit 배너용 이미지 3종
  (기본 3D 아이콘 / 2D 플랫 아이콘 / 3D 듀얼 오브젝트 믹스)을 생성한다.
  "이미지 생성", "오브젝트 입력", "배너 이미지 추천" 요청 시 사용.
---

# generate-banner-image

오브젝트 입력 → 이미지 3스타일 생성 흐름의 실행 스킬. 원본 프롬프트는
[image-style-patterns.md](../../../docs/patterns/image-style-patterns.md)에 있다.

## 절차

1. 사용자가 입력한 오브젝트(상품/서비스명)와 업종(선택)을 받는다.
2. **image-research-agent**를 호출해 `primary_object`(실물 또는 은유적 대체 오브젝트), `secondary_object`(스타일 3용 보조 오브젝트), `visualization_note`, `closest_reference`를 보강받는다.
3. `docs/patterns/image-style-patterns.md`의 스타일별 프롬프트 템플릿에 2번 결과를 채워 넣는다.
   - 스타일 1(기본 3D 아이콘): `{object}` = primary_object
   - 스타일 2(2D 플랫 아이콘): `{object/benefit}` = primary_object (+ 혜택 맥락이 있으면 함께)
   - 스타일 3(3D 듀얼 오브젝트 믹스): `{main_object}` = primary_object, `{secondary_object}` = secondary_object (없으면 스타일 3은 스킵하고 사용자에게 안내)
4. 완성된 3개 스타일 프롬프트 각각 뒤에 **베이스 프롬프트**(투명 배경 강제)를 그대로 이어붙인다.
5. 이미지 생성 API를 3회 호출한다 (API 확정 전까지는 TBD — 호출부는 실제 API 연동 시 구현).
6. 생성된 3개 이미지 후보와, 어떤 오브젝트/근거로 만들어졌는지(`visualization_note`)를 함께 반환한다.

## 참조 파일

- [docs/patterns/image-style-patterns.md](../../../docs/patterns/image-style-patterns.md) — 베이스 프롬프트, 스타일별 템플릿
- [docs/guides/kakaopay-banner-guide.md](../../../docs/guides/kakaopay-banner-guide.md) — 이미지 규격(240×240px, PNG, 500KB), 업종별 유의사항
- `.claude/agents/image-research-agent.md` — 사전 리서치 서브에이전트

## TBD

- 실제 이미지 생성 API 확정 후 5번 호출부 구현 필요
