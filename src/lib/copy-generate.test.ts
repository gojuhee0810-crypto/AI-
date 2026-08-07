// validateRecommendations() 회귀 테스트 — 라이브 테스트로 실제 발견된 4가지 위반
// 유형(글자수/문구반복/오브젝트명재노출/규제표현)을 코드가 빠짐없이 잡는지 확인한다.
// LLM 호출(generateCopy)은 비용이 들고 비결정적이라 이 파일에서는 다루지 않는다 —
// 여기서 테스트하는 건 순수 함수인 검증 로직뿐이다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecommendations } from './copy-generate';
import type { CopyRecommendation } from '@/types/copy-generation';

function rec(pattern: string, subtitle: string, maintitle: string): CopyRecommendation {
  return { pattern: pattern as CopyRecommendation['pattern'], subtitle, maintitle, reason: '' };
}

test('기준 내 정상 결과는 위반 없음', () => {
  const violations = validateRecommendations(
    [
      rec('상황기반+문제제기', '여름 옷 이미 샀나요?', '지금 사면 더 저렴해요'),
      rec('혜택조건+결과형', '여름 의류 구매 시', '10% 할인 받으세요'),
      rec('혜택+CTA형', '10% 할인 혜택', '지금 바로 받으세요!'),
    ],
    '쿠폰',
    '리워드/혜택',
  );
  assert.deepEqual(violations, []);
});

test('서브타이틀 15자, 메인타이틀 14자 초과를 잡는다', () => {
  const violations = validateRecommendations(
    [rec('상황기반+문제제기', '이건 열여섯글자가넘는서브타이틀', '이것도열다섯글자넘는메인타이틀임')],
    '쿠폰',
    '리워드/혜택',
  );
  const reasons = violations.flatMap((v) => v.reasons).join(' ');
  assert.equal(violations.length, 2);
  assert.match(reasons, /글자수 초과/);
});

test('6개 필드 중 완전 동일 문구 반복을 잡는다 (실제 발견 사례: benefit 값 중복 노출)', () => {
  const violations = validateRecommendations(
    [
      rec('상황기반+문제제기', '수수료 부담되시나요', '해외주식 수수료 0원'),
      rec('혜택조건+결과형', '지금 가입하시면', '해외주식 수수료 0원'),
      rec('혜택+CTA형', '수수료 0원 혜택', '지금 확인하세요!'),
    ],
    '카드',
    '금융/결제',
  );
  const duplicateFlag = violations.find((v) => v.pattern === '혜택조건+결과형' && v.field === 'maintitle');
  assert.ok(duplicateFlag, '두 번째로 등장한 중복 필드가 지목돼야 한다');
  assert.match(duplicateFlag!.reasons.join(' '), /동일 문구 반복/);
});

test('object_tag 사물명이 그대로 재노출되면 잡는다 (실제 발견 사례: "카드"가 문구에 그대로 노출)', () => {
  const violations = validateRecommendations(
    [rec('혜택조건+결과형', '이 카드로 결제하면', '수수료 0원')],
    '카드',
    '금융/결제',
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0].reasons.join(' '), /재노출/);
});

test('금융/증권 카테고리의 규제 위반 소지 표현을 잡는다', () => {
  const violations = validateRecommendations(
    [rec('혜택조건+결과형', '지금 가입하면', '확정 수익 보장')],
    '주식',
    '금융/증권',
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0].reasons.join(' '), /규제 위반/);
});

test('금융/증권이 아닌 카테고리에서는 규제 표현 검사를 하지 않는다', () => {
  const violations = validateRecommendations(
    [rec('혜택조건+결과형', '지금 가입하면', '무조건 받는 혜택')],
    '카드',
    '금융/결제',
  );
  assert.equal(violations.length, 0);
});

test('한 필드가 여러 규칙을 동시에 위반하면 reasons가 전부 누적된다', () => {
  const violations = validateRecommendations(
    [rec('혜택조건+결과형', '이 카드로 결제하면 매우 길게 초과하는 문구', '수수료 0원')],
    '카드',
    '금융/결제',
  );
  const flagged = violations.find((v) => v.field === 'subtitle');
  assert.ok(flagged);
  assert.equal(flagged!.reasons.length, 2); // 글자수 초과 + object_tag 재노출
});
