// Design Ref: §2.1, §9.4 Infrastructure — 순수 함수, 외부 의존성 없음
// 원본 프롬프트 출처: docs/patterns/image-style-patterns.md (수정 시 두 파일을 함께 갱신할 것)
// 2026-08-04: 스타일 3(듀얼 오브젝트) 범위 제외 — 스타일 1(3D)+2(2D) 두 장만 생성

import type { ImageStyleKey } from '@/types/image-generation';

// 2026-08-03: Recraft prompt 길이 제한(1000자)을 실제 API 테스트로 발견 — 원래 베이스
// 프롬프트(1101자)는 그 자체만으로 제한을 초과해 항상 실패했다. 취지는 유지하고 압축함.
// Gemini로 전환하면서 길이 제약이 없어졌다고 가정하고 스타일 1은 더 정교한 구조로 확장함.
const BASE_PROMPT = `Isolate the subject as a single professional icon on a strictly transparent background with a full alpha channel — no floor, shadow, studio backdrop, checkerboard, or background elements of any kind. Output must be a clean PNG cutout with perfectly clipped edges and zero background bleed.`;

// 2026-08-04: 순수 매트 클레이가 "촌스럽다"는 피드백 — 완전 무광 대신 은은한 광택을
// 살짝만 섞은 세미매트 새틴으로 조정 (매트 80% / 광택 20% 정도의 배합).
//
// 한때 glossy(광택+반투명) 재질을 골라 쓸 수 있는 material 파라미터가 있었으나
// 2026-08-13에 걷어냈다 — 화면이 재질을 물어본 적이 없어 항상 clay로만 돌았고,
// glossy 프롬프트는 도달할 수 없는 코드였다. 필요해지면 git 이력에 남아 있다.
function materialClay(): string {
  return `The material is a refined semi-matte satin finish — mostly soft and smooth like premium matte polymer, but with a subtle, restrained sheen along the highlight areas only (roughly 80% matte, 20% soft gloss). Avoid a fully flat, chalky clay look and avoid a strongly reflective glossy look — the result should read as premium and sophisticated, not toy-like. Soft diffuse highlights only, no hard specular hotspots, no metallic, no glass, no fabric, no scratches.`;
}

// 브랜드 컬러 지정 분기는 2026-08-13에 걷어냈다 — 생성 스타일이 고정돼 실효가 없어
// 2026-08-07에 화면에서 뺐고, 그 뒤로 아무도 색을 넘기지 않아 이 조건은 항상 거짓이었다.
function colorInstruction(): string {
  return `The color palette must combine 2-3 distinct, harmonious colors across the object's parts — a dominant vivid color for the main body, and a clearly different accent color for secondary or functional parts (e.g. a bright complementary tone for wheels, joints, hardware, or mechanical details, a soft light tone for glass/window-like surfaces). Do not render the entire object in a single monochrome hue — different parts must be distinguishable by color, not only by shading. Colors must be highly saturated, bright, and vivid (e.g. bright sky blue, vivid green, bold coral, sunny yellow) — never muted, dusty, pastel, or desaturated, and never use black, near-black, or charcoal/graphite tones anywhere on the object. Colors should feel modern, bold, and brand-appropriate for a fintech product, with smooth transitions and no harsh clashing.`;
}

// 스타일 1: object별로 바뀌는 부분(Subject, Geometry)과 고정인 부분(Icon Style, Material,
// Lighting, Camera)을 분리. object는 단일 명사("umbrella")뿐 아니라 수식어가 붙은
// 구("a broken car")도 그대로 들어갈 수 있다.
function style1Basic3d(object: string): string {
  return `A premium 3D icon, presented as a single, unified 3D object that represents ${object}. This object abstracts the essence of its subject into a cohesive volumetric form. Depict at most two objects total (a primary object plus at most one small secondary/accent object) — never combine three or more separate, distinct objects into the same icon.
The icon style is a modern 3D icon, with cohesive volumetric 3D, friendly proportions, a simple silhouette, consistent volumetric form, high visual weight, and a single, integrated construction without external background elements, all with slightly rounded edges and minimal industrial design.
${colorInstruction()}
The geometry is a single, prominent, rounded, and organically shaped 3D mass that abstracts the core elements of ${object} into one continuous, simplified form. Its shape should be clearly recognizable as ${object}, with implied details seamlessly integrated into the solid, rounded form, not as intricate or sharp elements. Every feature normally expected when recognizing this specific object — whether functional (e.g. wheels on a vehicle, a handle on a tool) or purely iconic/decorative (e.g. eyes, ears, or a nose on an animal-shaped object) — must be present and keep its real-world silhouette, position, and proportion so it reads correctly, even while staying simplified and rounded. Do not omit small but expected details just because they are non-functional. All elements have soft edges, continuous curvature, and large corner radii.
${materialClay()}
Lighting is a large soft studio light with a top-left key light and ambient fill, creating no contact shadow, consistent with premium product rendering.
Camera view is front-three-quarter, 15° perspective, slight top angle, centered, orthographic-like, focusing tightly on the object.`;
}

// 2026-08-04 (#4): 레퍼런스 6장(저금통/선물상자/지갑/코인/돈주머니/카드)에서 스타일 추출.
// 완전 플랫(#3)이 아니라 얇은 아웃라인 + 부드러운 그라디언트 음영이 있는 "세미플랫"
// 스타일로 교체. 레퍼런스 원본엔 네이버 "N" 로고/그린 컬러가 있었는데, 그건 타사
// 브랜드라 그대로 못 쓰고 스타일만 추출 — 컬러는 카카오페이풍 고채도 팔레트로 대체.
const KAKAO_COLOR_POOL = [
  '#FFCD00', // yellow
  '#FF5A5F', // coral
  '#4EA8FF', // sky blue
  '#2ED9C3', // mint
  '#A78BFA', // purple
  '#FF7AC6', // pink
  '#FF9D45', // orange
];

function style2Flat2d(objectOrBenefit: string): string {
  const colorLine = `Use bright, high-brightness, highly saturated colors combined across 2-3 tones from a KakaoPay-appropriate palette (e.g. ${KAKAO_COLOR_POOL.slice(0, 4).join(', ')}) — vary the combination per icon. Do not use any green tone resembling a well-known green tech-brand logo color.`;
  return `A 2D icon of ${objectOrBenefit}.
Semi-flat illustration style: bold, rounded, simplified shapes with soft, subtle gradient shading within each flat area for a gentle glassy, dimensional feel — not fully flat, not fully 3D. No outline or stroke around any shape — edges are defined only by the color/shading transition, not a drawn line.
${colorLine} Minimal geometric construction, rounded corners, friendly proportions, balanced composition, consistent visual weight.
If a currency symbol appears anywhere, it must be the Korean Won symbol (₩) only — never any other letter, initial, or logo mark.
Clean vector-quality edges, professional fintech app icon style.
Centered composition, isolated on a plain background.`;
}

export interface BuildStylePromptsInput {
  primaryObject: string;
  /** 지정 시 해당 스타일 1장만 프롬프트를 만든다. 없으면 스타일 1+2 둘 다 */
  onlyStyle?: ImageStyleKey;
}

export interface StylePrompt {
  style: ImageStyleKey;
  prompt: string;
}

/**
 * 오브젝트 정보로 스타일별 최종 프롬프트(스타일 프롬프트 + 베이스 프롬프트)를 조립한다.
 * onlyStyle이 지정되면 그 스타일 1장만 반환한다.
 */
export function buildStylePrompts({ primaryObject, onlyStyle }: BuildStylePromptsInput): StylePrompt[] {
  const all: StylePrompt[] = [
    {
      style: 'style-1-3d-basic',
      prompt: `${style1Basic3d(primaryObject)}\n${BASE_PROMPT}`,
    },
    {
      style: 'style-2-2d-flat',
      prompt: `${style2Flat2d(primaryObject)}\n${BASE_PROMPT}`,
    },
  ];

  return onlyStyle ? all.filter((p) => p.style === onlyStyle) : all;
}
