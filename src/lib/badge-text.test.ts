import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitBadgeText } from '@/components/ai-banner/BenefitBadge';

test('공백이 없으면 한 줄로 둔다', () => {
  assert.deepEqual(splitBadgeText('50%'), { lines: ['50%'], emphasis: 0 });
});

test('빈 문구는 줄이 없다', () => {
  assert.deepEqual(splitBadgeText('   '), { lines: [], emphasis: 0 });
});

test('첫 조각에 숫자가 있으면 그쪽을 키운다', () => {
  // "5% 할인" — 눈이 먼저 가야 하는 건 5%다
  assert.deepEqual(splitBadgeText('5% 할인'), { lines: ['5%', '할인'], emphasis: 0 });
});

test('숫자가 뒤에 있으면 뒤쪽을 키운다', () => {
  // 순서는 사용자가 적은 그대로 두고 강조만 옮긴다
  assert.deepEqual(splitBadgeText('최대 50%'), { lines: ['최대', '50%'], emphasis: 1 });
});

test('세 조각 이상이면 두 줄로 합친다', () => {
  // 작은 원 안에 세 줄을 넣으면 어느 줄도 안 읽힌다
  assert.deepEqual(splitBadgeText('최대 50% 할인'), {
    lines: ['최대', '50% 할인'],
    emphasis: 1,
  });
});

test('공백이 여러 개여도 빈 줄을 만들지 않는다', () => {
  assert.deepEqual(splitBadgeText('  5%   할인  '), { lines: ['5%', '할인'], emphasis: 0 });
});

// ── 공백 없이 붙여 쓴 문구 ──────────────────────────────────────

test('붙여 쓴 문구도 숫자 경계에서 두 줄로 나눈다', () => {
  // "5%할인"을 한 줄로 두면 원 안에 맞추려고 글자가 작아진다
  assert.deepEqual(splitBadgeText('5%할인'), { lines: ['5%', '할인'], emphasis: 0 });
  assert.deepEqual(splitBadgeText('최대50%'), { lines: ['최대', '50%'], emphasis: 1 });
});

test('짧은 문구는 한 줄로 둔다', () => {
  // 3자 이하는 나눌 이유가 없다 — 나누면 오히려 두 줄 다 작아진다
  assert.deepEqual(splitBadgeText('50%'), { lines: ['50%'], emphasis: 0 });
  assert.deepEqual(splitBadgeText('무료'), { lines: ['무료'], emphasis: 0 });
});

test('숫자가 없으면 가운데에서 나눈다', () => {
  assert.deepEqual(splitBadgeText('첫구매혜택'), { lines: ['첫구매', '혜택'], emphasis: 1 });
});
