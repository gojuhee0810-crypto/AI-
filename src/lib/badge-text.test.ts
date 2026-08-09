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
