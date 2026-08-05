// Design Ref: 스타일 2(2D) 전용 에셋 라이브러리. `asset-library.ts`(스타일 1/3D)와
// 동일한 패턴 — 자주 나오는 오브젝트는 매번 GPT-Image로 새로 생성하지 않고 사전
// 검증된 이미지를 반환한다. 매칭 없으면 null을 반환하고 호출부가
// `prompt-system/compile.ts` → OpenAI images.generate 동적 생성으로 폴백한다.
//
// 2026-08-05 도입 배경: ChatGPT 앱에서 직접 생성한 결과가 이 세션 내내 API
// (images.generate)로 생성한 결과보다 일관되게 더 깨끗했다(아웃라인/halo/구성 오류가
// 훨씬 적음). 프롬프트를 아무리 정교하게 짜도 API 쪽 결과가 이 격차를 못 따라잡아서,
// 스타일 1처럼 "검증된 이미지는 캐시해서 재사용" 전략으로 전환했다.
//
// 여기 등록된 이미지들은 이 세션에서 생성한 것 중 가장 나은 버전이며, 완벽하지
// 않을 수 있다 — 더 나은 소스(예: ChatGPT 앱에서 직접 만든 결과)가 확보되면 같은
// 경로의 파일만 교체하면 된다.

export type Style2AssetKey =
  | 'passbook'
  | 'suitcase'
  | 'coin'
  | 'gift-box'
  | 'refund-receipt'
  | 'card'
  | 'phone'
  | 'car';

const STYLE2_ASSET_KEYWORDS: Record<Style2AssetKey, string[]> = {
  passbook: ['통장', '입출금통장', '가계부', '거래내역'],
  suitcase: ['여행가방', '캐리어', '수트케이스', '캐리어가방'],
  coin: ['동전', '코인', '적립'],
  'gift-box': ['선물', '상자', '축하', '이벤트선물'],
  'refund-receipt': ['환급영수증', '영수증', '환급증'],
  card: ['카드', '신용카드', '체크카드'],
  phone: ['핸드폰', '휴대폰', '스마트폰', '폰'],
  car: ['자동차', '차', '자동차보험'],
};

const STYLE2_ASSET_PATHS: Record<Style2AssetKey, string> = {
  passbook: 'docs/patterns/assets/library-2d/passbook.png',
  suitcase: 'docs/patterns/assets/library-2d/suitcase.png',
  coin: 'docs/patterns/assets/library-2d/coin.png',
  'gift-box': 'docs/patterns/assets/library-2d/gift-box.png',
  'refund-receipt': 'docs/patterns/assets/library-2d/refund-receipt.png',
  card: 'docs/patterns/assets/library-2d/card.png',
  phone: 'docs/patterns/assets/library-2d/phone.png',
  car: 'docs/patterns/assets/library-2d/car.png',
};

// 스타일 1의 OVERRIDE_MODIFIERS와 동일한 취지 — 수식어가 있으면 라이브러리를
// 건너뛰고 동적 생성으로 보낸다.
const OVERRIDE_MODIFIERS = ['고장난', '고장 난', '파손된', '낡은', '새로운', '특별한', '깨진', '빈'];

export interface Style2LibraryMatch {
  key: Style2AssetKey;
  path: string;
}

/**
 * 사용자 입력이 스타일 2 라이브러리 키워드와 매칭되면 해당 이미지를 반환한다.
 * "+"/","/"&" 등 복합 입력이거나 여러 키가 동시에 매칭되면 null(동적 생성 폴백).
 */
export function findStyle2LibraryAsset(input: string): Style2LibraryMatch | null {
  const normalized = input.replace(/\s+/g, '');

  if (OVERRIDE_MODIFIERS.some((modifier) => normalized.includes(modifier))) {
    return null;
  }
  if (input.includes('+') || input.includes(',') || input.includes('&')) {
    return null;
  }

  const matches: Style2LibraryMatch[] = [];
  for (const [key, keywords] of Object.entries(STYLE2_ASSET_KEYWORDS) as [Style2AssetKey, string[]][]) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      matches.push({ key, path: STYLE2_ASSET_PATHS[key] });
    }
  }

  return matches.length === 1 ? matches[0] : null;
}
