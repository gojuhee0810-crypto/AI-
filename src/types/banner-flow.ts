// Design Ref: docs/02-design/features/banner-studio-ui.design.md §2 — 3단계 플로우가
// 들고 다니는 상태. 화면(page.tsx)에 있던 것을 src/types로 옮겼다 — 저장/복원 로직이
// src/lib에서 이 타입을 써야 하는데, lib이 app을 import하는 건 방향이 거꾸로다.

import type { GeneratedImage, ImageStyleKey } from '@/types/image-generation';
import type { CopyPattern, CopyRecommendation } from '@/types/copy-generation';

/** 이미지를 AI로 그릴지(그래픽 아이콘), 실제 상품 사진을 올릴지(제품 이미지). */
export type ImageSourceType = 'graphic' | 'product';

/** 혜택 배지 색상. 값은 디자인 시스템 토큰에 매핑된다(BADGE_STYLES 참고). */
export type BadgeStyle = 'brand' | 'red' | 'blue';

/**
 * 선택지 표시 문구.
 *
 * 1단계는 "고르는 화면"이고 3단계는 "고른 걸 확인하는 화면"이라, 두 곳이 같은 것을
 * 다르게 부르면 사용자는 자기가 뭘 골랐는지 대조할 수 없다. 그래서 문구를 한 곳에 둔다.
 */
export const IMAGE_TYPE_LABEL: Record<ImageSourceType, string> = {
  graphic: '그래픽 아이콘',
  product: '제품 이미지',
};

export const IMAGE_STYLE_LABEL: Record<ImageStyleKey, string> = {
  'style-1-3d-basic': '3D 아이콘',
  'style-2-2d-flat': '2D 아이콘',
};

/**
 * 카피 패턴의 화면 이름.
 *
 * 내부 이름(`상황기반+문제제기`)은 카피 생성 규칙의 분류 코드다. `+`로 이어 붙인
 * 조어라 사람이 쓰는 말이 아니고, 셋을 나란히 놓아도 무엇이 다른지 안 보인다.
 * 고르는 자리에 필요한 건 "이 카피가 읽는 사람에게 무엇을 하는가"다.
 *
 * 내부 이름은 API 응답이자 테스트가 쓰는 값이라 그대로 둔다 — 표시용만 여기 둔다.
 */
export const COPY_PATTERN_LABEL: Record<CopyPattern, string> = {
  '상황기반+문제제기': '공감형',
  '혜택조건+결과형': '조건 안내형',
  '혜택+CTA형': '행동 유도형',
  '조건+혜택강조형': '혜택 강조형',
};

/**
 * 배지 색상 프리셋. 임의 색을 받지 않고 셋 중에서만 고르게 한다 —
 * 광고 소재라 브랜드 톤을 벗어나면 매체 심사에서 걸린다.
 *
 * 배지는 SVG 그래픽이라 Tailwind 클래스가 아니라 색상 값이 필요하다.
 * 값을 직접 적지 않고 토큰을 참조한다 — globals.css가 유일한 진실이다.
 */
export const BADGE_STYLES: Record<
  BadgeStyle,
  { label: string; fill: string; textColor: string }
> = {
  brand: { label: '옐로우', fill: 'var(--color-brand)', textColor: 'var(--color-ink)' },
  red: { label: '레드', fill: 'var(--color-required)', textColor: '#ffffff' },
  blue: { label: '블루', fill: 'var(--color-accent)', textColor: '#ffffff' },
};

export const BADGE_TEXT_LIMIT = 8;
export const MATERIAL_NAME_LIMIT = 25;

/**
 * 카카오페이 Fit 배너 카피 글자수 (docs/guides/kakaopay-banner-guide.md).
 * 2단계 인라인 수정과 3단계 편집 모달이 같은 값을 써야 한다.
 */
export const SUBTITLE_LIMIT = 15;
export const MAINTITLE_LIMIT = 14;

export interface AiBannerFlowState {
  step: 1 | 2 | 3;
  /** 광고센터에 등록될 소재 이름 (25자) */
  materialName: string;
  /** null = 아직 안 고름. 소재 이름을 먼저 입력해야 고를 수 있다. */
  imageType: ImageSourceType | null;
  /** imageType이 'product'일 때 사용자가 올린 이미지 (data URL) */
  productImageUrl: string | null;
  primaryObject: string;
  accentType: 'logo' | 'badge' | 'none';
  /** accentType이 'badge'일 때 배너에 얹을 문구 (8자) */
  badgeText: string;
  badgeStyle: BadgeStyle;
  /** accentType이 'logo'일 때 올린 로고 (data URL). 배너 이미지 좌하단에 1/4 크기로 얹는다. */
  logoUrl: string | null;
  images: GeneratedImage[];
  /** 생성된 2종 중 실제로 쓸 스타일 */
  selectedImageStyle: ImageStyleKey | null;
  partialErrors: Array<{ style: ImageStyleKey; message: string }>;
  isGeneratingImages: boolean;
  regeneratingStyle: ImageStyleKey | null;
  benefit: string;
  copyRecommendations: CopyRecommendation[];
  copyCategory: string;
  isGeneratingCopy: boolean;
  selectedCopyIndex: number | null;

  // ── 등록 정보 (3단계) ───────────────────────────────────────────────
  /** 심의필 등 배너 하단에 함께 노출할 안내 문구 (60자, 선택) */
  noticeText: string;
  /** 배너를 눌렀을 때 이동할 주소. 등록의 필수값이다. */
  landingUrl: string;
  /** 소재 심사 담당자에게 전달할 의견 (500자, 선택) */
  reviewNote: string;
}

export const NOTICE_TEXT_LIMIT = 60;
export const REVIEW_NOTE_LIMIT = 500;

export const INITIAL_FLOW_STATE: AiBannerFlowState = {
  step: 1,
  materialName: '',
  imageType: null,
  productImageUrl: null,
  primaryObject: '',
  accentType: 'none',
  badgeText: '',
  badgeStyle: 'brand',
  logoUrl: null,
  images: [],
  selectedImageStyle: null,
  partialErrors: [],
  isGeneratingImages: false,
  regeneratingStyle: null,
  benefit: '',
  copyRecommendations: [],
  copyCategory: '',
  isGeneratingCopy: false,
  selectedCopyIndex: null,
  noticeText: '',
  landingUrl: '',
  reviewNote: '',
};

/**
 * 랜딩 URL 검사.
 *
 * 형식 검사는 코드가 한다 — 사람은 오타를 못 보고, 심사에서 반려되면 하루가 날아간다.
 * https만 받는다: 광고 소재의 랜딩은 https가 매체 요구사항이고, http를 통과시키면
 * 등록까지 간 다음에 반려된다.
 */
export function isValidLandingUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    return new URL(trimmed).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 각 단계를 끝냈는지. 하단 "다음 단계" 버튼의 활성 여부가 여기서만 결정된다.
 *
 * 이미지 유형에 따라 완료 조건이 갈린다는 게 핵심이다 — 그래픽은 생성 후 스타일을
 * 고르면 되고, 제품은 업로드하면 된다. 이 분기를 화면 쪽에 흩어놓으면 한쪽 경로만
 * 고치고 다른 쪽을 빠뜨리게 된다(실제로 그렇게 해서 업로드 후 다음 버튼이
 * 안 켜지는 버그가 났다).
 */
export function isStepComplete(state: AiBannerFlowState, step: 1 | 2 | 3): boolean {
  if (step === 1) {
    if (!state.materialName.trim()) return false;
    if (state.imageType === 'graphic') return state.selectedImageStyle !== null;
    if (state.imageType === 'product') return Boolean(state.productImageUrl);
    return false; // 아직 유형을 안 골랐다
  }
  if (step === 2) {
    return state.benefit.trim().length > 0 && state.selectedCopyIndex !== null;
  }
  // 3단계는 확인만 하는 화면이 아니다 — 랜딩 URL이 없으면 등록 자체가 안 된다.
  return isValidLandingUrl(state.landingUrl);
}

/** 색을 판단해야 하는 버튼들. */
export type BrandButton = 'generate-image' | 'generate-copy' | 'submit';

/**
 * 버튼 색은 셋뿐이고, 셋의 뜻이 겹치지 않는다 (2026-08-11 사용자 버튼 가이드).
 *
 *   brand     #FFEB00 · 라벨 100%   지금 눌러야 진행된다. **화면에 하나만.**
 *   support   #EFF2F4 · 라벨 100%   누를 수 있지만 주인공은 아니다.
 *   disabled  #FFF9AD · 라벨  32%   정말 못 누른다.
 *
 * 셋을 섞으면 뜻이 사라진다. 실제로 "누를 수 있는 다시 생성하기"에 옅은 노랑을
 * 썼다가 못 누르는 버튼과 같은 색이 됐다.
 */
export type ButtonTone = 'brand' | 'support' | 'disabled';

/**
 * AI 생성 버튼의 4단계 — 사용자가 준 표 그대로다.
 *
 *   ① 입력 전   disabled   못 누름
 *   ② 입력 후   brand      지금 할 일
 *   ③ 생성 중   brand      + 로딩 표시
 *   ④ 완료 후   support    누를 수 있지만 주인공 아님
 */
function generateTone(hasInput: boolean, isGenerating: boolean, isDone: boolean): ButtonTone {
  if (isGenerating) return 'brand'; // ③ — 진행 중인 일이 화면의 주인공이다
  if (isDone) return 'support'; // ④ — 주인공은 하단 CTA로 넘어갔다
  if (hasInput) return 'brand'; // ②
  return 'disabled'; // ①
}

/**
 * 버튼 하나의 색. 화면은 이 함수만 부르고 스스로 판단하지 않는다.
 *
 * 이 판단을 화면마다 따로 쓰다가 세 번 깨졌다. 규칙이 문서와 주석에만 있으면
 * 고치는 사람이 기억해야만 지켜진다. 여기 모아두면 "옐로우가 동시에 둘이 되는
 * 상태가 있는가"를 테스트가 대신 확인한다.
 */
export function resolveButtonTone(state: AiBannerFlowState, button: BrandButton): ButtonTone {
  if (button === 'generate-image') {
    // 제품 업로드 경로에는 이 버튼이 없다.
    if (state.step !== 1 || state.imageType !== 'graphic') return 'disabled';
    return generateTone(
      state.primaryObject.trim().length > 0,
      state.isGeneratingImages,
      // 단계가 끝났는데도 여기가 옐로우면 하단 CTA와 둘이 된다. 결과가 아직
      // 없더라도(복원된 상태 등) 단계가 찼으면 주인공은 넘어간 것으로 본다.
      state.images.length > 0 || isStepComplete(state, 1),
    );
  }

  if (button === 'generate-copy') {
    if (state.step !== 2) return 'disabled';
    return generateTone(
      state.benefit.trim().length > 0,
      state.isGeneratingCopy,
      state.copyRecommendations.length > 0 || isStepComplete(state, 2),
    );
  }

  // 하단 CTA. 생성이 도는 동안은 넘어갈 수 없다 — 그 사이 옐로우는 생성 버튼 몫이다.
  if (state.isGeneratingImages || state.isGeneratingCopy) return 'disabled';
  return isStepComplete(state, state.step) ? 'brand' : 'disabled';
}

/** 지금 옐로우인 버튼들 — 언제나 0개 또는 1개여야 한다(디자인 시스템 §4). */
export function resolveBrandButtons(state: AiBannerFlowState): BrandButton[] {
  const buttons: BrandButton[] = ['generate-image', 'generate-copy', 'submit'];
  return buttons.filter((b) => resolveButtonTone(state, b) === 'brand');
}

/** 미리보기·최종 확인에 쓸 배너 이미지. 유형에 따라 출처가 다르다. */
export function resolveBannerImageUrl(state: AiBannerFlowState): string | null {
  if (state.imageType === 'product') return state.productImageUrl;
  const selected = state.images.find((img) => img.style === state.selectedImageStyle);
  return (selected ?? state.images[0])?.imageUrl ?? null;
}

/**
 * 카피 생성 API에 넘길 오브젝트 태그.
 * 제품 이미지 경로에는 오브젝트 명칭이 없으므로 소재 이름으로 대신한다 —
 * 비워 보내면 API가 400을 돌려준다(objectTag는 필수).
 */
export function resolveObjectTag(state: AiBannerFlowState): string {
  return state.primaryObject.trim() || state.materialName.trim();
}

/**
 * 새로고침해도 살아남으면 안 되는 필드.
 * 진행 중 플래그를 복원하면 이미 죽은 요청을 기다리는 스피너가 영원히 돈다.
 */
export const TRANSIENT_FLOW_KEYS = [
  'isGeneratingImages',
  'isGeneratingCopy',
  'regeneratingStyle',
] as const satisfies ReadonlyArray<keyof AiBannerFlowState>;
