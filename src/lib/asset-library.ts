// Design Ref: 에셋 라이브러리 — 자주 나오는 오브젝트는 매번 생성하지 않고 사전 제작
// 이미지를 반환한다. 키워드/동의어 고정 매핑 방식(간단한 버전). 매칭 없으면 null을
// 반환하고 호출부(route.ts)가 Gemini 동적 생성으로 폴백한다.
// 원본 이미지는 /images/library/에 있다.
// 2026-08-04: 8개(공식 카카오페이풍 세트)로 시작, reference-3d/ 원본 7개 추가로 15개.
// 2026-08-05 (#3): 사용자 제공 레퍼런스 3장 추가 — event-benefit은 기존 파티/컨페티
// 이미지를 선물박스+포인트코인 이미지로 교체(더 핀테크 "혜택" 맥락에 맞음), convenience-store/
// coffee 신규 추가.
//
// ⚠️ 2026-08-04 (#2): 이 라이브러리는 스타일 1(3D)에만 쓴다. 스타일 2(2D 플랫)는
// 여기서 매칭을 시도하지 않고 항상 OpenAI 동적 생성(images.generate, 텍스트 전용)으로
// 품질을 보장한다 — 이유: 라이브러리 에셋들은 3D 클레이 렌더라 2D 슬롯에 레퍼런스로
// 붙이면 오히려 리얼리즘이 섞여 들어가 결과가 나빠짐이 실측으로 확인됨(2026-08-05 #6).
// route.ts에서 "스타일 1 슬롯 → findLibraryAsset 우선 시도, 스타일 2 슬롯 → 항상
// 텍스트 전용 동적 생성"으로 분기해야 한다.

export type AssetKey =
  // 공식 세트 8개
  | 'refund-receipt'
  | 'point-pouch'
  | 'coin-stack'
  | 'passbook'
  | 'discount-tag'
  | 'cash-refund'
  | 'event-benefit'
  | 'gift-box'
  // reference-3d/ 원본 7개
  | 'money-bag-coins'
  | 'calculator'
  | 'capsules'
  | 'car'
  | 'card'
  | 'piggy-bank'
  | 'wallet'
  | 'phone-repair-receipt'
  | 'convenience-store'
  | 'coffee'
  | 'phone'
  | 'stock'
  | 'umbrella'
  | 'calendar';

// 키워드가 여러 에셋에 걸치는 경우(예: "할인"이 discount-tag/coin-stack 둘 다와 관련,
// "저축"이 money-bag-coins/piggy-bank 둘 다와 관련), 가장 구체적이거나 관용적으로
// 더 잘 맞는 에셋 하나에만 배정했다. 겹치는 다른 에셋이 더 맞다고 판단되면 이 표를
// 조정할 것.
const ASSET_KEYWORDS: Record<AssetKey, string[]> = {
  'refund-receipt': ['환급영수증', '영수증', '환급증'],
  'point-pouch': ['포인트주머니', '복주머니', '포인트', '적립금'],
  'coin-stack': ['동전', '코인', '적립'],
  passbook: ['통장', '가계부', '거래내역'],
  'discount-tag': ['할인', '할인율', '쿠폰'],
  'cash-refund': ['환급', '현금환급', '캐시백'],
  'event-benefit': ['이벤트', '혜택', '파티'],
  'gift-box': ['선물', '상자', '축하', '이벤트선물'],
  'convenience-store': ['편의점'],
  coffee: ['커피', '커피숍', '카페'],
  phone: ['핸드폰', '휴대폰', '스마트폰'],
  stock: ['주식', '해외주식', '해외수수료', '증권'],
  umbrella: ['우산', '보험'],
  calendar: ['달력', '캘린더', '일정'],
  'money-bag-coins': ['돈주머니', '목돈'],
  calculator: ['계산기', '정산'],
  capsules: ['캡슐', '약', '영양제', '알약'],
  car: ['자동차', '차', '자동차보험'],
  card: ['카드', '신용카드', '체크카드'],
  'piggy-bank': ['저금통', '저축', '적금'],
  wallet: ['지갑', '지출'],
  'phone-repair-receipt': ['휴대폰수리비', '수리비', '폰수리'],
};

// 2026-08-05: public/images/library/로 이동 완료 — Next.js가 정적으로 서빙한다.
const ASSET_PATHS: Record<AssetKey, string> = {
  'refund-receipt': '/images/library/refund-receipt.png',
  'point-pouch': '/images/library/point-pouch.png',
  'coin-stack': '/images/library/coin-stack.png',
  passbook: '/images/library/passbook.png',
  'discount-tag': '/images/library/discount-tag.png',
  'cash-refund': '/images/library/cash-refund.png',
  'event-benefit': '/images/library/event-benefit.png',
  'gift-box': '/images/library/gift-box.png',
  'money-bag-coins': '/images/library/money-bag-coins.png',
  calculator: '/images/library/calculator.png',
  capsules: '/images/library/capsules.png',
  car: '/images/library/car.png',
  card: '/images/library/card.png',
  'piggy-bank': '/images/library/piggy-bank.png',
  wallet: '/images/library/wallet.png',
  'phone-repair-receipt': '/images/library/phone-repair-receipt.png',
  'convenience-store': '/images/library/convenience-store.png',
  coffee: '/images/library/coffee.png',
  phone: '/images/library/phone.png',
  stock: '/images/library/stock.png',
  umbrella: '/images/library/umbrella.png',
  calendar: '/images/library/calendar.png',
};

// 2026-08-04: 두 가지 오탐/뉘앙스 손실 문제를 발견해서 보강함.
//
// 1) 수식어 오버라이드 — "고장난 자동차"가 "자동차" 키워드에 걸려 멀쩡한 차 이미지가
//    나가버리는 문제. 아래 단어가 입력에 있으면 키워드 매칭과 무관하게 라이브러리를
//    건너뛰고 동적 생성으로 보낸다 (Gemini가 수식어 뉘앙스를 실제로 반영해줌).
const OVERRIDE_MODIFIERS = ['고장난', '고장 난', '파손된', '낡은', '새로운', '특별한', '깨진', '빈'];

// 2) 에셋별 제외어 — "카드뉴스"가 "카드" 키워드를 포함해서 신용카드 이미지로 오매칭되는
//    것처럼, 특정 조합이 문제될 때 그 에셋에서만 제외 처리한다. 발견될 때마다 추가할 것.
const ASSET_EXCLUDE: Partial<Record<AssetKey, string[]>> = {
  card: ['뉴스'],
  // "휴대폰수리비"가 phone 키워드("휴대폰")에 먼저 걸려 phone-repair-receipt로
  // 못 가는 문제 방지 — phone 키는 "수리" 관련 입력을 제외한다.
  phone: ['수리'],
  // "자동차보험"이 umbrella 키워드("보험")에 먼저 걸려 car로 못 가는 문제 방지 —
  // umbrella 키는 "자동차" 관련 입력을 제외한다(umbrella가 car보다 먼저 순회됨).
  umbrella: ['자동차'],
};

export interface LibraryMatch {
  key: AssetKey;
  path: string;
}

/**
 * 사용자 입력(오브젝트 텍스트)이 라이브러리 키워드와 매칭되면 해당 에셋을 반환한다.
 * 공백을 제거하고 부분 문자열 포함 여부로 판단하는 단순 매칭이다.
 * 수식어(OVERRIDE_MODIFIERS)가 있으면 항상 null(동적 생성 폴백)을 반환한다.
 */
export function findLibraryAsset(input: string): LibraryMatch | null {
  const normalized = input.replace(/\s+/g, '');

  if (OVERRIDE_MODIFIERS.some((modifier) => normalized.includes(modifier))) {
    return null;
  }

  for (const [key, keywords] of Object.entries(ASSET_KEYWORDS) as [AssetKey, string[]][]) {
    const excludes = ASSET_EXCLUDE[key] ?? [];
    if (excludes.some((exclude) => normalized.includes(exclude))) {
      continue;
    }
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return { key, path: ASSET_PATHS[key] };
    }
  }
  return null;
}
