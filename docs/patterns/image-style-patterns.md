# 이미지 생성 패턴 (오브젝트 → 2스타일)

> `generate-banner-image` 스킬이 참조하는 프롬프트 템플릿입니다.
> 레퍼런스 이미지는 `assets/reference-2d/`, `assets/reference-3d/`에 있습니다.
>
> **Update (2026-08-04)**: 스타일 3(3D 듀얼 오브젝트)은 리소스 절감 + UX 단순화 이유로
> 범위에서 제외. 오브젝트 입력 시 사전 선택 없이 **스타일 1(3D)+2(2D) 두 장을 항상 함께
> 자동 생성**하고, 결과 화면에서 마음에 안 드는 쪽만 개별로 "다시 생성하기" 할 수 있다.
> 재생성 시 브랜드 컬러(hex)를 지정하면 그 색을 반영해서 다시 만든다.

## 베이스 프롬프트 (공통, 모든 스타일에 항상 결합)

모든 스타일 프롬프트 뒤에 아래 텍스트를 그대로 이어붙여 실행합니다.

```
Isolate the subject as a single professional icon on a strictly transparent background with a full alpha channel — no floor, shadow, studio backdrop, checkerboard, or background elements of any kind. Output must be a clean PNG cutout with perfectly clipped edges and zero background bleed.
```

> **Update (2026-08-03)**: Recraft 이미지 생성 API의 prompt 길이 제한은 1000자다. 원래 베이스
> 프롬프트(1101자)는 이 제한을 그 자체만으로 초과해 실제 호출이 항상 실패했다 — 실제 API
> 테스트로 발견. 위 문구는 "투명 배경 강제" 취지는 그대로 유지하면서 반복 표현만 줄인
> 압축판(289자)이다. 스타일 1/2/3 문구와 합쳐도 734자 이내로 여유가 있다.

> ⚠️ **배경 처리 결정 사항**: `reference-3d/` 원본 6장은 전부 색 있는 블러+글로우 배경을 쓰고 있어 위 "배경 완전 투명" 규칙과 충돌합니다. 협의 결과, **배경은 100% 투명으로 유지하고, 글로우는 오브젝트 가장자리의 림라이트(rim light)로만 표현**하기로 했습니다. 아래 스타일 1·3 프롬프트는 이 결정을 반영했습니다.

---

## 스타일 1: 기본 3D 아이콘

**레퍼런스**: `assets/reference-3d/` (계산기, 자동차, 카드, 캡슐 오브젝트 등 — 단일 오브젝트 예시)

**관찰된 특징**: 매트한 클레이(clay) 재질, 둥글둥글한 부드러운 형태, 광택 없는 은은한 앰비언트 오클루전 음영, 오브젝트 테두리를 따라 은은한 림라이트 글로우, 채도 높은 브랜드 컬러, 3/4 각도의 중앙 배치 구도.

> **Update (2026-08-03)**: "글로시(glossy)"가 아니라 **클레이(clay) 3D** 재질로 정정. 반짝이는
> 하이라이트/반사 없이 매트하고 부드러운 클레이 질감으로 렌더링한다.
>
> **Update (2026-08-03, Gemini 전환)**: object별로 바뀌는 부분(Subject/Geometry)과 항상
> 고정인 부분(Icon Style/Material/Lighting/Camera)을 분리한 구조로 재작성. `{object}`
> 자리에는 단일 명사("umbrella")뿐 아니라 수식어가 붙은 구("a broken car", "a vintage
> car")도 그대로 넣을 수 있다 — 별도 오브젝트 조합 로직 불필요. 완전히 다른 오브젝트
> 2개를 합치는 경우(예: 자동차+열쇠)는 아래 스타일 3(듀얼 오브젝트)이 담당한다.
>
> **Update (2026-08-04)**: Gemini 실제 생성 테스트("car") 결과 재질/형태는 좋았지만 전체가
> 단일 색조(파란색 계열)로만 나오고, 바퀴처럼 실물에서 중요한 기능적 파츠가 몸체와 색이
> 안 구분돼 바퀴처럼 안 보이는 문제 발견. Color palette를 "본체 색 1개 + 기능적 파츠용
> 뚜렷한 강조색"으로 명시하고, Geometry에 "바퀴/손잡이 같은 필수 파츠는 실루엣 유지"
> 조건을 추가해 수정.
>
> **Update (2026-08-04, #2)**: 우산/저금통 테스트 결과 색상이 "촌스럽다"는 피드백 — 채도
> 높은 원색 위주였던 게 원인으로 판단, 톤 다운된 프리미엄 컬러(네이비/틸/샌드/로즈/차콜
> 계열)로 변경. 재질도 완전 무광 클레이 대신 은은한 광택 20%가 섞인 세미매트 새틴으로
> 조정 (materialClay 함수).
>
> **Update (2026-08-04, #3)**: 재질/색상은 좋아졌지만 저금통에 눈이 빠지는 문제 발견 —
> Geometry 지시가 "기능적 파츠"만 챙기라고 해서 눈처럼 기능은 없어도 인식에 필수인
> 디테일을 모델이 생략함. "기능적이든 순전히 장식적/도상적이든(눈, 귀, 코 등) 해당
> 오브젝트에서 정상적으로 기대되는 모든 특징을 반드시 포함하라"로 범위를 넓혀 수정.

```
A premium 3D icon, presented as a single, unified 3D object that represents {object}. This object abstracts the essence of its subject into a cohesive volumetric form.
The icon style is a modern 3D icon, rendered in soft matte plastic, with cohesive volumetric 3D, friendly proportions, a simple silhouette, consistent volumetric form, high visual weight, and a single, integrated construction without distinct layers or external background elements, all with slightly rounded edges and minimal industrial design.
The color palette must combine 2-3 distinct, harmonious colors across the object's parts — a dominant refined color for the main body, and a clearly different accent color for secondary or functional parts (e.g. a dark neutral tone for wheels, joints, hardware, or mechanical details, a soft light tone for glass/window-like surfaces). Do not render the entire object in a single monochrome hue — different parts must be distinguishable by color, not only by shading. Use sophisticated, slightly muted, premium tones (e.g. soft navy, dusty teal, warm sand, muted rose, deep charcoal) — avoid bright, highly saturated, candy-like, or overly playful primary colors. Colors should feel modern and brand-appropriate for a fintech product, with smooth transitions and no harsh clashing.
The geometry is a single, prominent, rounded, and organically shaped 3D mass that abstracts the core elements of {object} into one continuous, simplified form. Its shape should be clearly recognizable as {object}, with implied details seamlessly integrated into the solid, rounded form, not as intricate or sharp elements. Every feature normally expected when recognizing this specific object — whether functional (e.g. wheels on a vehicle, a handle on a tool) or purely iconic/decorative (e.g. eyes, ears, or a nose on an animal-shaped object) — must be present and keep its real-world silhouette, position, and proportion so it reads correctly, even while staying simplified and rounded. Do not omit small but expected details just because they are non-functional. All elements have soft edges, continuous curvature, and large corner radii.
The material is a refined semi-matte satin finish — mostly soft and smooth like premium matte polymer, but with a subtle, restrained sheen along the highlight areas only (roughly 80% matte, 20% soft gloss). Avoid a fully flat, chalky clay look and avoid a strongly reflective glossy look — the result should read as premium and sophisticated, not toy-like. Soft diffuse highlights only, no hard specular hotspots, no metallic, no glass, no fabric, no scratches.
Lighting is a large soft studio light with a top-left key light and ambient fill, creating no contact shadow, consistent with premium product rendering.
Camera view is front-three-quarter, 15° perspective, slight top angle, centered, orthographic-like, focusing tightly on the object.
```
(+ 베이스 프롬프트 결합)

> **브랜드 컬러 지정 시**: 위 Color palette 문단이 아래로 대체된다 (`colorInstruction()` 참고).
> ```
> The dominant body color must closely match the brand color {hex}. Add 1-2 additional
> harmonious accent colors (a darker/lighter shade of {hex}, or a neutral like soft
> charcoal or off-white) for secondary or functional parts — do not render the entire
> object in {hex} alone, different parts must still be distinguishable by color. Keep
> transitions smooth and avoid harsh clashing.
> ```

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

## TBD

- 스타일 2 컨셉(플랫 아이콘 vs 웹툰 캐릭터) 최종 확인 필요
- "다시 생성하기"를 눌러도 이전 생성물로 되돌아갈 수 있게 하는 이력 탐색 UI — 메커니즘(스타일
  슬롯마다 버전 이력을 남기고 이전/다음으로 넘겨보기)은 정해짐, 버튼 문구는 미정
