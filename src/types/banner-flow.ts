// Design Ref: docs/02-design/features/banner-studio-ui.design.md §2 — 3단계 플로우가
// 들고 다니는 상태. 화면(page.tsx)에 있던 것을 src/types로 옮겼다 — 저장/복원 로직이
// src/lib에서 이 타입을 써야 하는데, lib이 app을 import하는 건 방향이 거꾸로다.

import type { GeneratedImage, ImageStyleKey } from '@/types/image-generation';
import type { CopyRecommendation } from '@/types/copy-generation';

/** 이미지를 AI로 그릴지(그래픽 아이콘), 실제 상품 사진을 올릴지(제품 이미지). */
export type ImageSourceType = 'graphic' | 'product';

/** 혜택 배지 색상. 값은 디자인 시스템 토큰에 매핑된다(BADGE_STYLES 참고). */
export type BadgeStyle = 'brand' | 'red' | 'blue';

/**
 * 배지 색상 프리셋. 임의 색을 받지 않고 셋 중에서만 고르게 한다 —
 * 광고 소재라 브랜드 톤을 벗어나면 매체 심사에서 걸린다.
 */
export const BADGE_STYLES: Record<BadgeStyle, { label: string; className: string }> = {
  brand: { label: '옐로우', className: 'bg-brand text-ink' },
  red: { label: '레드', className: 'bg-required text-white' },
  blue: { label: '블루', className: 'bg-accent-soft text-accent' },
};

export const BADGE_TEXT_LIMIT = 8;

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
}

export const INITIAL_FLOW_STATE: AiBannerFlowState = {
  step: 1,
  materialName: '',
  imageType: null,
  productImageUrl: null,
  primaryObject: '',
  accentType: 'none',
  badgeText: '',
  badgeStyle: 'brand',
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
};

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
  return true; // 3단계는 검토만 한다
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
