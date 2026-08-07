// 회귀 테스트 — style2는 다중매칭→null 시맨틱이라 style1과 검사 관점이 다르다.
// "폰" 한 글자 키워드 충돌, umbrella와 disease/dental 간 "보험" 겹침은 실제로
// 라이브 테스트에서 발견된 버그였다 — 재발하면 여기서 바로 잡힌다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findStyle2LibraryAsset } from './style2-asset-library';

test('쿠폰은 phone이 아니라 discount-tag로 매칭돼야 한다 ("폰" 부분문자열 충돌 회귀)', () => {
  assert.equal(findStyle2LibraryAsset('쿠폰')?.key, 'discount-tag');
});

test('phone 키워드는 "폰" 제거 후에도 정상 매칭된다', () => {
  assert.equal(findStyle2LibraryAsset('핸드폰')?.key, 'phone');
  assert.equal(findStyle2LibraryAsset('휴대폰')?.key, 'phone');
  assert.equal(findStyle2LibraryAsset('스마트폰')?.key, 'phone');
});

test('암보험은 umbrella가 아니라 disease로 매칭돼야 한다 (STYLE2_ASSET_EXCLUDE 회귀)', () => {
  assert.equal(findStyle2LibraryAsset('암보험')?.key, 'disease');
});

test('치아보험은 umbrella가 아니라 dental로 매칭돼야 한다 (STYLE2_ASSET_EXCLUDE 회귀)', () => {
  assert.equal(findStyle2LibraryAsset('치아보험')?.key, 'dental');
  assert.equal(findStyle2LibraryAsset('충치')?.key, 'dental');
});

test('일반 보험/우산은 여전히 umbrella로 매칭된다', () => {
  assert.equal(findStyle2LibraryAsset('보험')?.key, 'umbrella');
  assert.equal(findStyle2LibraryAsset('우산')?.key, 'umbrella');
});

test('자동차보험은 umbrella/car 다중매칭이라 null이다 (기존 설계, 손대지 않음)', () => {
  assert.equal(findStyle2LibraryAsset('자동차보험'), null);
});

test('+ 등 복합 입력은 항상 null이다', () => {
  assert.equal(findStyle2LibraryAsset('카드+쿠폰'), null);
  assert.equal(findStyle2LibraryAsset('카드,쿠폰'), null);
});
