import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveObjectCategory } from './object-category-map';

test('카테고리별 대표 키워드 매핑', () => {
  assert.equal(resolveObjectCategory('카드'), '금융/결제');
  assert.equal(resolveObjectCategory('주식'), '금융/증권');
  assert.equal(resolveObjectCategory('우산'), '금융/보험');
  assert.equal(resolveObjectCategory('저금통'), '금융/저축');
  assert.equal(resolveObjectCategory('쿠폰'), '리워드/혜택');
  assert.equal(resolveObjectCategory('커피'), '커머스/생활');
});

test('매칭되는 키워드가 없으면 일반으로 폴백한다', () => {
  assert.equal(resolveObjectCategory('존재하지않는오브젝트'), '일반');
});
