import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_LIMITS, checkOptional, checkRequired } from '@/lib/api-input';

// 화면의 maxLength는 브라우저를 거친 요청만 막는다. 라우트가 길이를 안 보면
// 요청 하나로 Claude에 임의 길이를 넘길 수 있고, 그건 곧 토큰 비용과 지연이다.

test('필수 값이 비어 있으면 사유를 돌려준다', () => {
  assert.match(checkRequired('benefit', '', 25) ?? '', /필수/);
  assert.match(checkRequired('benefit', '   ', 25) ?? '', /필수/);
  assert.match(checkRequired('benefit', undefined, 25) ?? '', /필수/);
  assert.match(checkRequired('benefit', 123, 25) ?? '', /필수/);
});

test('한도를 넘으면 자르지 않고 거절한다', () => {
  // 잘라서 넘기면 사용자가 적은 것과 다른 결과가 나오는데, 왜 다른지 화면 어디에도 없다.
  const reason = checkRequired('benefit', 'ㄱ'.repeat(26), 25);
  assert.match(reason ?? '', /25자/);
  assert.equal(checkRequired('benefit', 'ㄱ'.repeat(25), 25), null, '한도까지는 통과');
});

test('선택 값은 없으면 통과하고, 있으면 같은 한도를 받는다', () => {
  assert.equal(checkOptional('target', undefined, 50), null);
  assert.equal(checkOptional('target', null, 50), null);
  assert.equal(checkOptional('target', '2030', 50), null);
  assert.match(checkOptional('target', 'ㄱ'.repeat(51), 50) ?? '', /50자/);
  assert.match(checkOptional('target', 123, 50) ?? '', /문자열/);
});

test('한도가 화면 입력칸과 같다', () => {
  // 다르면 화면에서 통과한 값이 서버에서 막히거나 그 반대가 된다.
  // 화면 쪽 값: Step1ImagePanel의 OBJECT_LIMIT, Step2CopyPanel의 BENEFIT_LIMIT.
  assert.equal(API_LIMITS.objectTag, 15);
  assert.equal(API_LIMITS.benefit, 25);
});
