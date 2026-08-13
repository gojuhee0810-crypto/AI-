// Design Ref: §3.1 Data Model — 오브젝트 입력 → 이미지 2종(스타일1+2) 생성 요청/응답 타입
// 2026-08-04: 스타일 3(듀얼 오브젝트) 범위 제외, 항상 스타일1+2 두 장을 함께 생성

export type ImageStyleKey = 'style-1-3d-basic' | 'style-2-2d-flat';

export interface GenerateImageRequest {
  /** prompt-compiler가 블루프린트로 보강할 실물/은유 오브젝트 */
  primaryObject: string;
}

export interface GeneratedImage {
  style: ImageStyleKey;
  imageUrl: string;
  widthPx: 240;
  heightPx: 240;
  sizeBytes: number;
}

export interface GenerateImageResponse {
  images: GeneratedImage[];
  visualizationNote?: string;
  /** 요청한 스타일 중 일부만 실패했을 때, 성공한 이미지는 그대로 반환하고 실패한 스타일만 여기 담는다. */
  partialErrors?: Array<{ style: ImageStyleKey; message: string }>;
}

export interface GenerateImageErrorResponse {
  error: {
    code: 'INVALID_INPUT' | 'IMAGE_GENERATION_FAILED' | 'IMAGE_SPEC_VIOLATION';
    message: string;
    details?: Record<string, unknown>;
  };
}
