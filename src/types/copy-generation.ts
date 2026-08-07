// Design Ref: docs/patterns/copy-patterns-v2.md — object_tag + benefit(+target) → 문구 3안 생성
// 2026-08-06: 이미지 생성과 동일하게 실제 라우트로 구현. category는 object_tag에서
// 자동 도출하므로 요청값에 포함하지 않는다(object-category-map.ts 참고).

export type CopyPattern =
  | '상황기반+문제제기'
  | '혜택조건+결과형'
  | '혜택+CTA형'
  | '조건+혜택강조형';

export interface GenerateCopyRequest {
  /** 1단계 오브젝트 선택에서 자동 부여된 태그 (asset-library.ts/style2-asset-library.ts 키 또는 원본 한글 입력) */
  objectTag: string;
  /** 사용자 입력 혜택 텍스트 (필수) */
  benefit: string;
  /** 타겟층 (선택). 있으면 패턴1(상황기반) 서브타이틀에 반영된다. 별도 입력 폼이 없는
   * 동안은 서버에서 "2030세대"로 기본값 처리된다(copy-generate.ts DEFAULT_TARGET 참고) */
  target?: string;
}

export interface CopyRecommendation {
  pattern: CopyPattern;
  subtitle: string;
  maintitle: string;
  reason: string;
}

export interface GenerateCopyResponse {
  recommendations: CopyRecommendation[];
  /** object_tag로부터 자동 도출된 카테고리 (예: "금융/증권") */
  category: string;
  /** object_tag가 암시하는 업종과 benefit이 명백히 다를 때만 채워짐 */
  warning?: string;
}

export interface GenerateCopyErrorResponse {
  error: {
    code: 'INVALID_INPUT' | 'COPY_GENERATION_FAILED';
    message: string;
    details?: Record<string, unknown>;
  };
}
