# 이미지 생성 패턴 (오브젝트 → 3스타일)

> `generate-banner-image` 스킬이 참조하는 프롬프트 템플릿입니다.
> 레퍼런스 이미지는 `assets/reference-2d/`, `assets/reference-3d/`에 있습니다.

## 베이스 프롬프트 (공통, 모든 스타일에 항상 결합)

모든 스타일 프롬프트 뒤에 아래 텍스트를 그대로 이어붙여 실행합니다.

```
Combine Icon Details - Objective: Create a single, highly detailed central subject for an image generation tool to produce an icon.
Mandatory: The icon must be isolated on a pure transparent background, include an alpha channel, have no background or studio backdrop, and have clean edges.
The final output must be a professional cutout isolated on a pure transparent background. No floor, no shadows, no studio backdrop, and NO checkerboard patterns. Use a high-quality alpha channel for seamless integration into web banners.
Generate a high-quality, professional icon image.
Essential: Render this icon on a transparent alpha-channel background with zero background elements.
Format: Pure PNG cutout, transparent background, no shadows or floor planes behind the object, perfectly clipped edges.
CRITICAL INSTRUCTION: Generate the object on a strictly transparent background with a 100% alpha channel. Do NOT render a checkerboard, grid, or any 'fake' transparency pattern. The background must be mathematically empty (null/transparent). Ensure perfectly clipped edges without any background bleed.
```

> ⚠️ **배경 처리 결정 사항**: `reference-3d/` 원본 6장은 전부 색 있는 블러+글로우 배경을 쓰고 있어 위 "배경 완전 투명" 규칙과 충돌합니다. 협의 결과, **배경은 100% 투명으로 유지하고, 글로우는 오브젝트 가장자리의 림라이트(rim light)로만 표현**하기로 했습니다. 아래 스타일 1·3 프롬프트는 이 결정을 반영했습니다.

---

## 스타일 1: 기본 3D 아이콘

**레퍼런스**: `assets/reference-3d/` (계산기, 자동차, 카드, 캡슐 오브젝트 등 — 단일 오브젝트 예시)

**관찰된 특징**: 광택 있는 플라스틱/러버 재질, 둥글둥글한 장난감 같은 형태, 부드러운 스튜디오 하이라이트, 오브젝트 테두리를 따라 은은한 림라이트 글로우, 채도 높은 브랜드 컬러, 3/4 각도의 중앙 배치 구도.

```
A single {object}, rendered as a glossy, rounded, toy-like 3D icon.
Smooth plastic/rubber material with soft studio highlights and a gentle
rim-light glow along the silhouette edges only (no colored background
blur). Bright, saturated, brand-safe colors. Centered composition,
slight 3/4 perspective angle, soft shadow-free lighting. Clean, polished,
app-icon aesthetic similar to modern fintech app iconography.
```
(+ 베이스 프롬프트 결합)

---

## 스타일 2: 2D 플랫 아이콘

> ⚠️ 처음에 "2D 웹툰 일러스트"라고 부르셨는데, 실제 `reference-2d/` 레퍼런스는 웹툰(만화 캐릭터)풍이 아니라 **카카오페이 공식 서비스 그래픽 같은 플랫 벡터 아이콘** 스타일이었습니다. 아래 프롬프트는 레퍼런스 기준으로 작성했습니다 — 원래 의도하신 게 캐릭터/webtoon 그림체라면 알려주세요, 프롬프트를 다시 짜겠습니다.

**레퍼런스**: `assets/reference-2d/` (여권+우산 조합 = 여행자보험, 컨페티, 추상 블롭 등)

**관찰된 특징**: 단색 플랫 컬러, 그라데이션 없음, 최소한의 부드러운 그림자, 오브젝트 1~2개를 겹치거나 조합해서 하나의 혜택/개념을 표현, 둥근 모서리의 단순화된 도형.

```
A flat 2D vector icon representing {object/benefit}, composed of 1-2
simplified geometric shapes combined into one clean graphic (e.g. two
overlapping objects that together convey the benefit). Solid flat colors
only, no gradients, no outlines, minimal soft drop shadow if needed,
rounded soft corners. Centered composition. Clean, friendly, modern
flat-illustration aesthetic in the style of a fintech app's service
graphics.
```
(+ 베이스 프롬프트 결합)

---

## 스타일 3: 3D 듀얼 오브젝트 믹스

**레퍼런스**: `assets/reference-3d/` (저금통+동전, 지갑+카드+현금 — 2개 이상 오브젝트 조합 예시)

**관찰된 특징**: 스타일 1과 동일한 글로시 3D 재질이지만, 주요 오브젝트 1개 + 보조 오브젝트 1개를 함께 배치해 하나의 혜택 스토리를 표현 (예: 저금통+동전=저축, 지갑+카드+현금=결제).

```
Two related objects, {main_object} (larger, primary) and {secondary_object}
(smaller, complementary), composed together in one balanced 3D icon
scene that visually tells a single benefit story. Same glossy toy-like
plastic material, soft rim-light glow along edges only, bright saturated
colors as a matching single-object icon. Slight 3/4 perspective,
centered composition, no colored background blur — glow stays attached
to the objects only.
```
(+ 베이스 프롬프트 결합)

---

## TBD

- 실제 이미지 생성 API 확정에 따라 negative prompt 문법, 파라미터(aspect ratio 등) 조정 필요
- 스타일 2 컨셉(플랫 아이콘 vs 웹툰 캐릭터) 최종 확인 필요
