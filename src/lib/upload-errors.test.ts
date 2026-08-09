import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UPLOAD_ERROR_MESSAGES,
  checkUploadFile,
  checkUploadPixels,
  type UploadErrorKind,
  type UploadRule,
} from '@/lib/upload-errors';

const PRODUCT: UploadRule = {
  accept: ['image/png', 'image/jpeg'],
  maxBytes: 1024 * 1024,
  maxPixels: { width: 400, height: 400 },
};

test('규격에 맞으면 통과한다', () => {
  assert.equal(checkUploadFile({ type: 'image/png', size: 500_000 }, PRODUCT), null);
  assert.equal(checkUploadPixels({ width: 400, height: 400 }, PRODUCT), null);
});

test('허용하지 않는 형식은 format', () => {
  assert.equal(checkUploadFile({ type: 'image/gif', size: 100 }, PRODUCT), 'format');
  assert.equal(checkUploadFile({ type: 'application/pdf', size: 100 }, PRODUCT), 'format');
});

test('용량 초과는 size', () => {
  assert.equal(checkUploadFile({ type: 'image/png', size: 1024 * 1024 + 1 }, PRODUCT), 'size');
});

test('형식이 틀리면 용량보다 형식을 먼저 알린다', () => {
  // 형식이 틀린 파일은 용량을 재봐야 의미가 없다. 사용자에게도 바깥쪽 문제부터.
  const wrongBoth = { type: 'image/gif', size: 99 * 1024 * 1024 };
  assert.equal(checkUploadFile(wrongBoth, PRODUCT), 'format');
});

test('픽셀 초과는 dimension', () => {
  assert.equal(checkUploadPixels({ width: 401, height: 400 }, PRODUCT), 'dimension');
  assert.equal(checkUploadPixels({ width: 400, height: 401 }, PRODUCT), 'dimension');
});

test('maxPixels가 없으면 크기는 검사하지 않는다', () => {
  const noPixelRule: UploadRule = { accept: ['image/png'], maxBytes: 1024 };
  assert.equal(checkUploadPixels({ width: 9999, height: 9999 }, noPixelRule), null);
});

test('모든 실패 종류에 문구가 있다', () => {
  // 종류를 늘리고 문구를 빠뜨리면 빈 모달이 뜬다.
  const kinds: UploadErrorKind[] = ['format', 'dimension', 'size', 'failed', 'unknown'];
  for (const kind of kinds) {
    const message = UPLOAD_ERROR_MESSAGES[kind];
    assert.ok(message.title.length > 0, `${kind} 제목 없음`);
    assert.ok(message.description.length > 0, `${kind} 설명 없음`);
  }
});
