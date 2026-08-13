// containBox() — 업로드 이미지를 240×240에 맞출 때의 배치 계산.
//
// fitToBannerSpec 자체는 canvas가 필요해 여기서 다루지 않는다(브라우저 전용).
// 대신 그 안의 판단 — 얼마나 줄이고 어디에 놓을지 — 만 떼어내 검사한다.
// 서버의 sharp `fit: 'contain'`과 같은 규칙이어야 두 경로가 갈라지지 않는다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containBox } from './banner-image-client';
import { BANNER_IMAGE_PX } from './banner-image-spec';

test('정사각 원본은 꽉 채우고 여백이 없다', () => {
  const box = containBox(400, 400);
  assert.equal(box.width, BANNER_IMAGE_PX);
  assert.equal(box.height, BANNER_IMAGE_PX);
  assert.equal(box.x, 0);
  assert.equal(box.y, 0);
});

test('세로로 긴 원본은 높이가 240이 되고 좌우에 여백이 생긴다', () => {
  const box = containBox(120, 480);
  assert.equal(box.height, BANNER_IMAGE_PX);
  assert.equal(box.width, 60);
  assert.equal(box.x, 90, '좌우 여백이 같아야 한다');
  assert.equal(box.y, 0);
});

test('가로로 긴 원본은 너비가 240이 되고 상하에 여백이 생긴다', () => {
  const box = containBox(480, 120);
  assert.equal(box.width, BANNER_IMAGE_PX);
  assert.equal(box.height, 60);
  assert.equal(box.x, 0);
  assert.equal(box.y, 90);
});

test('잘라내지 않는다 — 결과가 240을 넘는 변이 없다', () => {
  for (const [w, h] of [[1000, 3], [3, 1000], [1920, 1080], [17, 300]] as const) {
    const box = containBox(w, h);
    assert.ok(box.width <= BANNER_IMAGE_PX + 1e-9, `${w}x${h} 너비 초과`);
    assert.ok(box.height <= BANNER_IMAGE_PX + 1e-9, `${w}x${h} 높이 초과`);
  }
});

test('비율을 유지한다', () => {
  const box = containBox(1600, 900);
  assert.ok(Math.abs(box.width / box.height - 1600 / 900) < 1e-9);
});

test('240보다 작은 원본은 키운다 — 배너 자리를 비워두지 않는다', () => {
  const box = containBox(60, 60);
  assert.equal(box.width, BANNER_IMAGE_PX);
});

test('가운데 정렬이다', () => {
  const box = containBox(300, 100);
  assert.equal(box.x * 2 + box.width, BANNER_IMAGE_PX);
  assert.equal(box.y * 2 + box.height, BANNER_IMAGE_PX);
});

test('크기가 0이거나 음수면 빈 상자로 떨어진다 — NaN을 canvas에 넘기지 않는다', () => {
  for (const [w, h] of [[0, 100], [100, 0], [0, 0], [-5, 100]] as const) {
    const box = containBox(w, h);
    assert.ok(Number.isFinite(box.width) && Number.isFinite(box.height), `${w}x${h}`);
    assert.ok(Number.isFinite(box.x) && Number.isFinite(box.y), `${w}x${h}`);
  }
});
