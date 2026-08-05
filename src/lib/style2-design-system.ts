// Design Ref: 스타일 2(2D) 공식 디자인 시스템. 2026-08-05 (#8) 19섹션 구조로 전면 재작성.
// 구조 (사용자가 지정한 순서 그대로):
//   ROLE → STYLE GUIDE → FORM LANGUAGE → SHAPE GRAMMAR → OBJECT → PURPOSE →
//   VISUAL IDENTITY → SILHOUETTE → CONSTRUCTION → PROPORTION → GEOMETRY →
//   SURFACE LANGUAGE → DETAIL DENSITY → CATEGORY → OBJECT COLOR MAP → DEPTH →
//   CAMERA → CONSISTENCY → AVOID
//
// 2026-08-05 (#8) 이력: 이전 버전(#5~#7)은 이 구조를 7개 섹션(ROLE/STYLE/SHAPE
// GRAMMAR/OBJECT BLUEPRINT PRINCIPLES/OBJECT BLUEPRINT/COLOR SYSTEM/NEGATIVE
// PROMPT/OUTPUT)으로 압축해서 썼다. PURPOSE~DETAIL DENSITY(8개)를 한 문단에 욱여넣고
// DEPTH/CAMERA는 아예 빠뜨린 채로 여러 라운드를 진행했고, 결과 품질 문제(자동차/폰
// 아이콘이 계속 망가짐)가 반복됐다. 이번에 압축을 풀고 사용자가 원래 지정한 19개
// 섹션을 각각 독립 상수/함수로 분리해서 그대로 조립한다.
//
// 아래 6개는 전역 고정 섹션(모든 오브젝트 공통), 나머지는 오브젝트별로 채워진다:
//   전역: ROLE, STYLE_GUIDE, FORM_LANGUAGE, SHAPE_GRAMMAR, PROPORTION, GEOMETRY,
//         SURFACE_LANGUAGE, DETAIL_DENSITY, DEPTH, CAMERA, CONSISTENCY, AVOID
//   오브젝트별(SemanticBlueprint에서 채움): OBJECT, PURPOSE, VISUAL_IDENTITY,
//         SILHOUETTE, CONSTRUCTION, CATEGORY, OBJECT_COLOR_MAP
//
// 색상 시스템(#7)과 텍스트 금지(₩/$ 예외), 아웃라인 없음(#6 이후 실측) 정책은 유지.

export const ROLE = `ROLE: Create a premium fintech illustration asset for a modern mobile application. The goal is not to create a beautiful standalone illustration, but to generate assets that belong to the same illustration library. Every illustration must share identical construction principles, proportions, perspective, visual weight, color logic, and design language.`;

export const STYLE_GUIDE = `STYLE GUIDE: Editorial vector illustration, Adobe Illustrator artwork, professional mobile product illustration, modern fintech illustration — friendly, minimal, clean, bold, highly recognizable. Every shape is filled with a single flat solid color — no gradients, no soft tonal shading, no glossy materials, no realistic lighting, no ambient occlusion. Shapes have no thick outline stroke — edges are defined only by the boundary between adjacent flat color shapes, or at most a very thin subtle self-tone edge. Not a 3D render, not clay, not plastic, not photorealistic. Transparent background, centered composition, high resolution.`;

export const FORM_LANGUAGE = `FORM LANGUAGE: Large simple geometric forms, chunky friendly silhouettes, minimal visual complexity. Favor readability over decorative detail. Every illustration should feel handcrafted in Adobe Illustrator, with construction that stays consistent across the whole library.`;

export const SHAPE_GRAMMAR = `SHAPE GRAMMAR: Use only rounded rectangles, rounded circles, capsules, soft curves — uniform corner radius throughout. Maximum three visible planes (front face, one thin side/edge sliver, optional small foreground accent group that slightly overlaps the primary shape's corner). Never use sharp angles, complex polygons, thin wiry elements, or tiny decorations.`;

export const PROPORTION = `PROPORTION: Primary shape ~70-75% of the composition, a foreground accent group ~15-20%, small identifying marks (icon/symbol) ~10%. The dominant shape should visually define the object at a glance.`;

export const GEOMETRY = `GEOMETRY: Large rounded geometry, uniform corner radius, no sharp edges, no thin wiry details. Depth exists only to separate the few visible planes — never to simulate true 3D volume.`;

export const SURFACE_LANGUAGE = `SURFACE LANGUAGE: Large uninterrupted flat color areas, minimal segmentation, minimal internal panel lines, no textures, no material simulation, no gradients.`;

export const DETAIL_DENSITY = `DETAIL DENSITY: Mostly clean uninterrupted surfaces — roughly 70% clean surface, 20% functional detail, 10% accent/identifying mark. Only include the few marks needed for recognition. No readable text or words anywhere on the object — a currency symbol (₩, $) or a simple amount/value icon mark is the only exception.`;

export const DEPTH = `DEPTH: Illustrator-style layered flat shapes with extremely shallow depth, created only by slight offset/overlap between 2-3 planes at a slight forward 3/4 tilt (not fully frontal, not a strong isometric angle). No volumetric rendering, no 3D shading, no ambient occlusion, no directional studio lighting.`;

export const CAMERA = `CAMERA: Slight front three-quarter view, minimal perspective, near-orthographic, centered. Every asset in the library uses this same consistent viewing angle.`;

export const CONSISTENCY = `CONSISTENCY: Every illustration must use identical perspective, corner radius, outline treatment, depth, surface construction, visual weight, shape grammar, color logic, and proportions. If two assets are placed side by side, they should look designed by the same illustrator.`;

export const COLOR_RULES = `COLOR RULES: Each illustration uses only one dominant primary color, one supporting secondary color, and one accent color — never more than three primary colors total. Flat colors only — no gradients, no glossy materials, no realistic lighting. Use neutral colors (gray/white) only for supporting elements, never as a main color. Colors must be highly saturated and vivid — bright, punchy, candy-like tones, never muted, dusty, pastel, or desaturated. Objects within the same category must share identical color logic — never randomly swap primary and secondary. All illustrations must look like they belong to the same fintech illustration library, and the color system should communicate the product category before the object details.`;

export const COLOR_DISTRIBUTION = `COLOR DISTRIBUTION: Primary color ~70%, Secondary color ~20%, Accent color ~10% of the visible surface. Accent colors should only emphasize important elements — avoid an equal distribution of colors.`;

export const AVOID = `AVOID: notebook, spiral binding, coil rings, passport, passport stamp texture, diary, ribbon bookmark, thick outline stroke, hard black outline, gradient, soft tonal shading, drop shadow, cast shadow, contact shadow, ground shadow ellipse, glow, halo, vignette, radial background glow, checkerboard transparency pattern, dark or colored background of any kind, plastic toy render, clay render, photorealistic render, 3D CGI render, metallic material, glossy highlight, complex texture, extra parts not listed in Must Have or Should Have, game asset style, watermark, readable text, words, letters, brand names — a currency symbol (₩, $) or a simple amount/value icon mark is allowed, nothing else.`;

export const OUTPUT = `OUTPUT: Square 1:1 canvas. Truly transparent background (alpha channel), not a checkerboard or colored fill. Centered composition filling most of the frame. High resolution, crisp clean edges, no watermark, no signature, no extra text beyond what the object blueprint specifies.`;

export type IconCategory =
  | 'finance'
  | 'payment'
  | 'reward'
  | 'travel'
  | 'insurance'
  | 'map'
  | 'medical'
  | 'commerce'
  | 'coupon'
  | 'investment'
  | 'security';

interface ColorToken {
  primary: string;
  primaryHex: string;
  secondary: string;
  secondaryHex: string;
  accent: string;
  accentHex: string;
}

// 2026-08-05: "코인" 레퍼런스 이미지(고채도 골드/옐로우)를 기준으로 이름만으로는
// 재현이 불안정해 카테고리별 헥스값을 못박음. 전체적으로 카카오페이풍 고채도(비비드)
// 팔레트를 유지한다 — 톤 다운/뮤트 금지.
export const COLOR_TOKENS: Record<IconCategory, ColorToken> = {
  finance: { primary: 'blue', primaryHex: '#2F6BFF', secondary: 'yellow', secondaryHex: '#FFD400', accent: 'gray', accentHex: '#B0B8C1' },
  payment: { primary: 'yellow', primaryHex: '#FFD400', secondary: 'gray', secondaryHex: '#B0B8C1', accent: 'blue', accentHex: '#2F6BFF' },
  reward: { primary: 'yellow', primaryHex: '#FFD500', secondary: 'orange', secondaryHex: '#FF9500', accent: 'red', accentHex: '#FF3B30' },
  travel: { primary: 'blue', primaryHex: '#2F6BFF', secondary: 'yellow', secondaryHex: '#FFD400', accent: 'orange', accentHex: '#FF9500' },
  insurance: { primary: 'green', primaryHex: '#2ECC71', secondary: 'blue', secondaryHex: '#2F6BFF', accent: 'white', accentHex: '#FFFFFF' },
  map: { primary: 'blue', primaryHex: '#2F6BFF', secondary: 'gray', secondaryHex: '#B0B8C1', accent: 'red', accentHex: '#FF3B30' },
  medical: { primary: 'white', primaryHex: '#FFFFFF', secondary: 'blue', secondaryHex: '#2F6BFF', accent: 'red', accentHex: '#FF3B30' },
  commerce: { primary: 'yellow', primaryHex: '#FFD400', secondary: 'orange', secondaryHex: '#FF9500', accent: 'gray', accentHex: '#B0B8C1' },
  coupon: { primary: 'red', primaryHex: '#FF3B30', secondary: 'pink', secondaryHex: '#FF6FA0', accent: 'white', accentHex: '#FFFFFF' },
  investment: { primary: 'green', primaryHex: '#2ECC71', secondary: 'mint', secondaryHex: '#2ED9C3', accent: 'blue', accentHex: '#2F6BFF' },
  security: { primary: 'green', primaryHex: '#2ECC71', secondary: 'mint', secondaryHex: '#2ED9C3', accent: 'gray', accentHex: '#B0B8C1' },
};

// 2026-08-04: 실물을 그대로 베끼는 대신 "인식에 필요한 핵심만" 정리하는 구조.
// image-research-agent가 이 형식으로 채워서 넘긴다.
export interface SemanticBlueprint {
  /** 오브젝트 이름, 예: "Bankbook" */
  name: string;
  category: IconCategory;
  /** 오브젝트의 본질적 구조만 1~2문장으로. 리얼리즘 디테일 금지. */
  description: string;
  /** 필수 요소 — 없으면 인식이 안 되는 것만 */
  mustHave: string[];
  /** 권장 요소 — 있으면 좋지만 없어도 인식 가능 (짧은 라벨 텍스트 포함 가능) */
  shouldHave: string[];
  /** 이 오브젝트 한정 금지 요소 (전역 AVOID에 추가로) */
  avoid: string[];
  /** 한눈에 이 오브젝트를 인식시키는 단 하나의 핵심 특징 */
  recognitionCue: string;
  /** 라이브러리에 스타일 참고용으로 쓸 만한 유사 카테고리 이미지 경로 (현재 미사용 — #6 참고) */
  referenceImagePath?: string;
}

/** OBJECT: 오브젝트 이름 한 줄. */
export function objectSection(blueprint: SemanticBlueprint): string {
  return `OBJECT: ${blueprint.name}`;
}

/** PURPOSE: 이 오브젝트가 무엇을 전달해야 하는지. */
export function purposeSection(blueprint: SemanticBlueprint): string {
  return `PURPOSE: Clearly communicate "${blueprint.name}" at small sizes, avoid ambiguity with visually similar objects. ${blueprint.recognitionCue}`;
}

/** VISUAL IDENTITY: 이 오브젝트의 핵심 시각 특징(mustHave). */
export function visualIdentitySection(blueprint: SemanticBlueprint): string {
  return `VISUAL IDENTITY: Emphasize the object's defining visual characteristics rather than realistic appearance; do not attempt to replicate exact real-world proportions or construction details. Defining features: ${blueprint.mustHave.join(', ')}.`;
}

/** SILHOUETTE: 실루엣만으로 인식되는지. */
export function silhouetteSection(blueprint: SemanticBlueprint): string {
  return `SILHOUETTE: Instantly recognizable, simple outline, large readable forms. The silhouette alone (no internal detail) should already suggest ${blueprint.name}.`;
}

/** CONSTRUCTION: 필수 요소만으로 구성, should-have/avoid. */
export function constructionSection(blueprint: SemanticBlueprint): string {
  return `CONSTRUCTION: Build the object using only its essential parts, avoid unnecessary accessories. Should have (optional, only if space allows): ${blueprint.shouldHave.join(', ')}. Do not include: ${blueprint.avoid.join(', ')}.`;
}

/** CATEGORY: 컬러 토큰 결정에 쓰이는 카테고리. */
export function categorySection(blueprint: SemanticBlueprint): string {
  return `CATEGORY: ${blueprint.category}`;
}

/** OBJECT COLOR MAP: 카테고리 컬러 토큰 + 파츠별 매핑을 오브젝트에 적용. */
export function objectColorMapSection(category: IconCategory, brandColor?: string): string {
  const token = COLOR_TOKENS[category];
  const primary = brandColor ?? `${token.primary} (${token.primaryHex})`;
  return `OBJECT COLOR MAP (${category}): Primary ${primary}${brandColor ? ' (brand color override)' : ''} → Main Body. Secondary ${token.secondary} (${token.secondaryHex}) → Functional Parts (handles, straps, covers, secondary surfaces). Accent ${token.accent} (${token.accentHex}) → Accent Elements (coins, chips, badges, tags, buttons). Neutral gray/white → Neutral Elements (text lines, paper, wheels, outlines).`;
}

/** 전체 스타일 2 프롬프트를 사용자가 지정한 19섹션 순서 그대로 조립한다:
 * ROLE → STYLE GUIDE → FORM LANGUAGE → SHAPE GRAMMAR → OBJECT → PURPOSE →
 * VISUAL IDENTITY → SILHOUETTE → CONSTRUCTION → PROPORTION → GEOMETRY →
 * SURFACE LANGUAGE → DETAIL DENSITY → CATEGORY → OBJECT COLOR MAP → DEPTH →
 * CAMERA → CONSISTENCY → AVOID (+ OUTPUT, COLOR RULES/DISTRIBUTION 보조 규칙) */
export function buildStyle2DesignSystemPrompt(blueprint: SemanticBlueprint, brandColor?: string): string {
  return [
    ROLE,
    STYLE_GUIDE,
    FORM_LANGUAGE,
    SHAPE_GRAMMAR,
    objectSection(blueprint),
    purposeSection(blueprint),
    visualIdentitySection(blueprint),
    silhouetteSection(blueprint),
    constructionSection(blueprint),
    PROPORTION,
    GEOMETRY,
    SURFACE_LANGUAGE,
    DETAIL_DENSITY,
    categorySection(blueprint),
    objectColorMapSection(blueprint.category, brandColor),
    COLOR_RULES,
    COLOR_DISTRIBUTION,
    DEPTH,
    CAMERA,
    CONSISTENCY,
    AVOID,
    OUTPUT,
  ].join('\n\n');
}
