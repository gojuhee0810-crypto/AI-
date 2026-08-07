// 회귀 테스트 — 이 세션에서 라이브 테스트로 실제로 발견했던 버그들을 고정한다.
// 새 키워드를 추가하다가 같은 종류의 충돌이 재발하면 여기서 바로 잡힌다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findLibraryAsset } from './asset-library';

test('기본 키워드 매칭', () => {
  assert.equal(findLibraryAsset('우산')?.key, 'umbrella');
  assert.equal(findLibraryAsset('카드')?.key, 'card');
  assert.equal(findLibraryAsset('쿠폰')?.key, 'discount-tag');
});

test('자동차보험은 umbrella가 아니라 car로 매칭돼야 한다 (ASSET_EXCLUDE 회귀)', () => {
  assert.equal(findLibraryAsset('자동차보험')?.key, 'car');
});

test('카드뉴스는 card로 오매칭되면 안 된다 (ASSET_EXCLUDE 회귀)', () => {
  assert.equal(findLibraryAsset('카드뉴스'), null);
});

test('휴대폰수리비는 phone이 아니라 phone-repair-receipt로 매칭돼야 한다', () => {
  assert.equal(findLibraryAsset('휴대폰수리비')?.key, 'phone-repair-receipt');
});

test('복주머니는 point-pouch로 매칭돼야 한다', () => {
  assert.equal(findLibraryAsset('복주머니')?.key, 'point-pouch');
});

test('OVERRIDE_MODIFIERS가 있으면 라이브러리를 건너뛰고 null을 반환한다', () => {
  assert.equal(findLibraryAsset('고장난 자동차'), null);
  assert.equal(findLibraryAsset('낡은 지갑'), null);
});

test('매칭되는 키워드가 없으면 null을 반환한다', () => {
  assert.equal(findLibraryAsset('존재하지않는오브젝트'), null);
});
