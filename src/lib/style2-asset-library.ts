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
  | 'car'
  | 'wallet'
  | 'calculator'
  | 'calendar'
  | 'point-pouch'
  | 'umbrella'
  | 'piggy-bank'
  | 'stock'
  | 'discount-tag'
  | 'disease'
  | 'dental';

// 2026-08-06: phone 키워드에 있던 한 글자짜리 '폰'을 제거함 — "쿠폰"이 "폰"을 부분
// 문자열로 포함해서 잘못 phone으로 매칭되는 버그를 라이브 테스트로 발견(discount-tag가
// 매칭됐어야 하는데 phone 이미지가 나감). 한 글자 키워드는 다른 단어에 우연히 포함될
// 위험이 크므로 앞으로도 새 키워드 추가 시 2글자 이상으로 유지할 것.
const STYLE2_ASSET_KEYWORDS: Record<Style2AssetKey, string[]> = {
  passbook: ['통장', '입출금통장', '가계부', '거래내역'],
  suitcase: ['여행가방', '캐리어', '수트케이스', '캐리어가방'],
  coin: ['동전', '코인', '적립'],
  'gift-box': ['선물', '상자', '축하', '이벤트선물'],
  'refund-receipt': ['환급영수증', '영수증', '환급증'],
  card: ['카드', '신용카드', '체크카드'],
  phone: ['핸드폰', '휴대폰', '스마트폰'],
  car: ['자동차', '차', '자동차보험'],
  wallet: ['지갑', '지출'],
  calculator: ['계산기', '정산'],
  calendar: ['달력', '캘린더', '일정'],
  'point-pouch': ['복주머니', '포인트주머니', '포인트'],
  umbrella: ['우산', '보험'],
  'piggy-bank': ['저금통', '저축', '적금'],
  stock: ['주식', '해외주식', '해외수수료', '증권'],
  // 2026-08-06: "쿠폰" 입력이 phone과 오매칭되던 버그를 고친 뒤 실제로 동적 생성해서
  // 확인한 이미지를 그대로 등록. 키워드는 style1 asset-library.ts의 discount-tag와 동일.
  'discount-tag': ['할인', '할인율', '쿠폰'],
  // 2026-08-06: 사용자 레퍼런스(UI 스크린샷) 카드에서 배경/텍스트("암 치료")를 지우고
  // 아이콘만 남긴 이미지. "암보험"은 "보험"을 포함해 umbrella와도 겹치므로
  // STYLE2_ASSET_EXCLUDE로 umbrella 쪽에서 제외 처리했다.
  disease: ['질병', '암보험', '암치료', '질환'],
  // 2026-08-06: 사용자 레퍼런스(치아+충치를 계란후라이로 표현한 일러스트) 그대로 등록.
  // 아웃라인이 있어 스타일2의 "테두리선 없음" 규칙과는 안 맞지만, 라이브러리 톤
  // 일관성보다 이 레퍼런스를 쓰는 걸 사용자가 직접 선택함(2026-08-06 확인).
  // "치아보험"도 "보험"을 포함해 umbrella와 겹치므로 동일하게 제외 처리했다.
  dental: ['치아', '치아보험', '충치', '이빨'],
};

const STYLE2_ASSET_PATHS: Record<Style2AssetKey, string> = {
  passbook: '/images/library-2d/passbook.png',
  suitcase: '/images/library-2d/suitcase.png',
  coin: '/images/library-2d/coin.png',
  'gift-box': '/images/library-2d/gift-box.png',
  'refund-receipt': '/images/library-2d/refund-receipt.png',
  card: '/images/library-2d/card.png',
  phone: '/images/library-2d/phone.png',
  car: '/images/library-2d/car.png',
  wallet: '/images/library-2d/wallet.png',
  calculator: '/images/library-2d/calculator.png',
  calendar: '/images/library-2d/calendar.png',
  'point-pouch': '/images/library-2d/point-pouch.png',
  umbrella: '/images/library-2d/umbrella.png',
  'piggy-bank': '/images/library-2d/piggy-bank.png',
  stock: '/images/library-2d/stock.png',
  'discount-tag': '/images/library-2d/discount-tag.png',
  disease: '/images/library-2d/disease.png',
  dental: '/images/library-2d/dental.png',
};

// 스타일 1의 OVERRIDE_MODIFIERS와 동일한 취지 — 수식어가 있으면 라이브러리를
// 건너뛰고 동적 생성으로 보낸다.
const OVERRIDE_MODIFIERS = ['고장난', '고장 난', '파손된', '낡은', '새로운', '특별한', '깨진', '빈'];

// 2026-08-06: 스타일 1의 ASSET_EXCLUDE와 동일한 취지로 도입 — "암보험"이 disease의
// 키워드이면서 동시에 umbrella의 "보험" 키워드도 부분 문자열로 포함해 다중매칭→null로
// 빠지는 걸 막는다. umbrella는 범용 "보험" 아이콘이므로, 전용 아이콘이 있는 특정
// 보험 종류가 나타나면 umbrella 쪽에서 양보한다.
const STYLE2_ASSET_EXCLUDE: Partial<Record<Style2AssetKey, string[]>> = {
  umbrella: ['암', '치아'],
};

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
    const excludes = STYLE2_ASSET_EXCLUDE[key] ?? [];
    if (excludes.some((exclude) => normalized.includes(exclude))) {
      continue;
    }
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      matches.push({ key, path: STYLE2_ASSET_PATHS[key] });
    }
  }

  return matches.length === 1 ? matches[0] : null;
}
