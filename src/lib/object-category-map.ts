// Design Ref: docs/patterns/copy-patterns-v2.md §0 — object_tag → category 매핑.
// asset-library.ts(스타일1)/style2-asset-library.ts(스타일2)의 ASSET_KEYWORDS를 카테고리
// 단위로 재그룹한 것. 두 라이브러리의 키 이름이 서로 달라도(예: coin vs coin-stack) 카테고리
// 버킷은 동일하므로, 정확한 키가 아니라 사용자가 실제로 입력한 원문 텍스트를 그대로
// 키워드 매칭해서 카테고리를 구한다 — 이미지 매칭 로직과 별개로 독립 동작한다.

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '금융/결제': ['카드', '신용카드', '체크카드', '핸드폰', '휴대폰', '스마트폰', '휴대폰수리비', '수리비', '폰수리'],
  '금융/증권': ['주식', '해외주식', '해외수수료', '증권', '동전', '코인', '목돈', '돈주머니'],
  '금융/보험': ['우산', '보험', '자동차보험', '자동차', '차'],
  '금융/저축': ['통장', '가계부', '거래내역', '저금통', '저축', '적금', '지갑', '지출', '계산기', '정산', '달력', '캘린더', '일정'],
  '리워드/혜택': [
    '포인트주머니', '복주머니', '포인트', '적립금', '적립', '선물', '상자', '축하', '이벤트선물', '이벤트', '혜택',
    '할인', '할인율', '쿠폰', '환급', '현금환급', '캐시백', '환급영수증', '영수증', '환급증',
  ],
  '커머스/생활': ['편의점', '커피', '커피숍', '카페'],
  여행: ['여행가방', '캐리어', '수트케이스', '캐리어가방'],
  건강: ['캡슐', '영양제', '알약'],
};

/**
 * object_tag(사용자가 이미지 생성 단계에서 입력한 원문 텍스트)로부터 카테고리를 도출한다.
 * 매칭되는 키워드가 없으면 '일반'을 반환한다(톤 제약 없이 진행).
 */
export function resolveObjectCategory(objectTag: string): string {
  const normalized = objectTag.replace(/\s+/g, '');
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }
  return '일반';
}
