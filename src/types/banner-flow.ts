// Design Ref: docs/02-design/features/banner-studio-ui.design.md §2 — 3단계 플로우가
// 들고 다니는 상태. 화면(page.tsx)에 있던 것을 src/types로 옮겼다 — 저장/복원 로직이
// src/lib에서 이 타입을 써야 하는데, lib이 app을 import하는 건 방향이 거꾸로다.

import type { GeneratedImage, ImageStyleKey } from '@/types/image-generation';
import type { CopyRecommendation } from '@/types/copy-generation';

/** 이미지를 AI로 그릴지(그래픽 아이콘), 실제 상품 사진을 올릴지(제품 이미지). */
export type ImageSourceType = 'graphic' | 'product';

export interface AiBannerFlowState {
  step: 1 | 2 | 3;
  /** 광고센터에 등록될 소재 이름 (25자) */
  materialName: string;
  imageType: ImageSourceType;
  primaryObject: string;
  accentType: 'logo' | 'badge' | 'none';
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
  imageType: 'graphic',
  primaryObject: '',
  accentType: 'none',
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
 * 새로고침해도 살아남으면 안 되는 필드.
 * 진행 중 플래그를 복원하면 이미 죽은 요청을 기다리는 스피너가 영원히 돈다.
 */
export const TRANSIENT_FLOW_KEYS = [
  'isGeneratingImages',
  'isGeneratingCopy',
  'regeneratingStyle',
] as const satisfies ReadonlyArray<keyof AiBannerFlowState>;
