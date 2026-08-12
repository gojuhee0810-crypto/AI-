// API 입력 검사 — 두 생성 라우트가 같은 규칙을 본다.
//
// 화면은 maxLength로 막지만 라우트는 브라우저를 거치지 않은 요청도 받는다. 검사가
// 없으면 요청 하나로 Claude에 임의 길이를 넘길 수 있고, 그건 곧 토큰 비용과 지연이다.
// "화면에서 막으니까 괜찮다"는 클라이언트를 신뢰하는 것이고, 클라이언트는 신뢰할 수 없다.

/**
 * 한도는 화면 입력칸과 같은 값이다. 다르면 화면에서 통과한 값이 서버에서 막히거나
 * 그 반대가 된다. 여유를 두지 않는다 — 여유는 곧 검사하지 않는 구간이다.
 */
export const API_LIMITS = {
  /** 오브젝트 명칭 (Step1ImagePanel의 OBJECT_LIMIT) */
  objectTag: 15,
  /** 캠페인 혜택 (Step2CopyPanel의 BENEFIT_LIMIT) */
  benefit: 25,
  /** 타겟 — 화면 입력이 없고 서버 기본값이라 넉넉히 둔다 */
  target: 50,
  /** 재질·브랜드컬러·시각화 노트 — 화면에 없는 선택 입력 */
  optional: 100,
} as const;

/**
 * 필수 문자열 검사. 통과하면 null, 아니면 사용자에게 보일 사유.
 *
 * 길이를 넘겨도 자르지 않고 거절한다. 잘라서 넘기면 사용자가 적은 것과 다른 결과가
 * 나오는데, 왜 다른지 화면 어디에도 안 나온다.
 */
export function checkRequired(name: string, value: unknown, limit: number): string | null {
  if (typeof value !== 'string' || !value.trim()) return `${name}는 필수입니다.`;
  if (value.length > limit) return `${name}는 ${limit}자를 넘을 수 없습니다.`;
  return null;
}

/** 선택 문자열 검사. 없으면 통과. */
export function checkOptional(name: string, value: unknown, limit: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return `${name}는 문자열이어야 합니다.`;
  if (value.length > limit) return `${name}는 ${limit}자를 넘을 수 없습니다.`;
  return null;
}

/**
 * 생성 실패를 사용자에게 알릴 문구.
 *
 * 업스트림 에러 메시지를 그대로 돌려주지 않는다 — SDK가 던지는 문장에는 상위 URL,
 * 조직 ID, 키 조각이 섞일 수 있고 그게 브라우저까지 간다. 원문은 서버 로그에만 남긴다.
 *
 * 사용자가 할 수 있는 일이 "다시 시도"뿐이라 문구도 그것만 말한다.
 */
export const GENERATION_FAILED_MESSAGE = '생성에 실패했어요. 잠시 후 다시 시도해주세요.';
