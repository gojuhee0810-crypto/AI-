// 업로드 실패 안내 — 광고센터 알럿 모달 문구(2026-08-09 사용자 제공 패턴).
//
// 문구를 화면에 흩어놓지 않고 여기 모은다. 제품 이미지와 로고가 같은 종류의 실패를
// 겪는데 각자 문장을 적어두면, 한쪽만 고쳐서 같은 상황을 다르게 설명하게 된다.
//
// 제목이 두 줄인 것은 원본 그대로다 — 줄바꿈 위치를 브라우저에 맡기면 "업로드 가능한
// 파일 형식이" / "아니에요"처럼 어색하게 끊긴다.

export type UploadErrorKind =
  | 'format'
  | 'dimension'
  | 'size'
  | 'failed'
  | 'unknown';

export interface UploadErrorMessage {
  title: string;
  description: string;
}

export const UPLOAD_ERROR_MESSAGES: Record<UploadErrorKind, UploadErrorMessage> = {
  format: {
    title: '업로드 가능한\n파일 형식이 아니에요',
    description: 'PNG 형식의 이미지로\n다시 시도해주세요.',
  },
  dimension: {
    title: '이미지 크기를 초과했어요',
    description: '업로드 가능한 이미지 크기를 확인 후\n다시 시도해주세요.',
  },
  size: {
    title: '이미지 용량을 초과했어요',
    description: '업로드 가능한 이미지 용량을 확인 후\n다시 시도해주세요.',
  },
  failed: {
    title: '이미지 업로드에 실패했어요',
    description: '다시 시도해주세요.',
  },
  unknown: {
    title: '알 수 없는 오류가\n발생했어요',
    description: '잠시 후 다시 시도해주세요.',
  },
};

export interface UploadRule {
  /** 허용 MIME 타입 */
  accept: string[];
  maxBytes: number;
  /** 가로·세로 최대 픽셀. 없으면 크기는 검사하지 않는다. */
  maxPixels?: { width: number; height: number };
}

/**
 * 파일이 규격에 맞는지 본다. 맞으면 null.
 *
 * 검사 순서가 중요하다 — 형식이 틀린 파일은 용량·크기를 재봐야 의미가 없고,
 * 사용자에게도 가장 바깥쪽 문제부터 알려주는 편이 고치기 쉽다.
 */
export function checkUploadFile(
  file: { type: string; size: number },
  rule: UploadRule,
): UploadErrorKind | null {
  if (!rule.accept.includes(file.type)) return 'format';
  if (file.size > rule.maxBytes) return 'size';
  return null;
}

/** 픽셀 크기 검사. 이미지를 실제로 읽어봐야 알 수 있어 파일 검사와 나눠 둔다. */
export function checkUploadPixels(
  pixels: { width: number; height: number },
  rule: UploadRule,
): UploadErrorKind | null {
  if (!rule.maxPixels) return null;
  if (pixels.width > rule.maxPixels.width || pixels.height > rule.maxPixels.height) {
    return 'dimension';
  }
  return null;
}
