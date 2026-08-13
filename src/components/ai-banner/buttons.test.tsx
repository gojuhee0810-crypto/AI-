/** @jsxRuntime automatic */
/** @jsxImportSource react */
//
// 버튼이 실제로 그리는 class를 검사한다.
//
// 색 판단 자체는 resolveButtonTone이 하고 banner-flow-rules.test.ts가 조합 4,608개를
// 돈다. 여기서 보는 건 그 다음 — **판단 결과가 화면까지 제대로 칠해지는가**다.
// 옐로우 버튼은 세 번 깨졌는데, 마지막엔 판단이 아니라 칠하는 쪽이 문제였다:
// "누를 수 있는 다시 생성하기"에 옅은 노랑을 써서 못 누르는 버튼과 같은 색이 됐다.
//
// 대비 2.14 문제도 여기서 지킨다. 옅은 노랑 위 32% 검정은 WCAG 1.4.3 미달인데,
// 그 면제는 정말로 조작할 수 없는 요소에만 적용된다. 우리 하단 CTA는 눌러서 무엇이
// 비었는지 알려주는 버튼이라 면제 대상이 아니다 — 그래서 32%는 `disabled:` 접두사
// 뒤에 있어야 하고, 접두사가 빠지면 눌리는 버튼의 라벨까지 흐려진다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { aiGenerateButtonClass, TONE_CLASS } from './buttons';
import type { ButtonTone } from '@/types/banner-flow';

const TONES: ButtonTone[] = ['brand', 'support', 'disabled'];

/** 렌더된 버튼의 class 문자열. */
function buttonClass(tone: ButtonTone, disabled = false): string {
  const html = renderToStaticMarkup(
    <button type="button" className={aiGenerateButtonClass(tone)} disabled={disabled}>
      이미지 생성하기
    </button>,
  );
  return html.match(/class="([^"]*)"/)?.[1] ?? '';
}

test('세 톤이 모두 렌더되고 각자 다른 배경색을 쓴다', () => {
  const backgrounds = TONES.map((tone) => {
    const cls = buttonClass(tone);
    const bg = cls.split(' ').find((c) => c.startsWith('bg-'));
    assert.ok(bg, `${tone}에 배경색이 없다`);
    return bg;
  });
  assert.equal(new Set(backgrounds).size, TONES.length, `배경색이 겹친다: ${backgrounds.join(', ')}`);
});

test('회귀: 누를 수 있는 버튼과 못 누르는 버튼의 노랑이 다르다 (세 번 깨진 자리)', () => {
  const brand = buttonClass('brand');
  const disabled = buttonClass('disabled');
  const bgOf = (cls: string) => cls.split(' ').find((c) => c.startsWith('bg-'));
  assert.notEqual(bgOf(brand), bgOf(disabled), '진한 노랑과 옅은 노랑이 같은 값이 됐다');
});

test('회귀: 32% 라벨은 disabled: 접두사 뒤에 있다 — 눌리는 버튼은 100%로 남는다', () => {
  const cls = TONE_CLASS.disabled;
  const faded = cls.split(' ').filter((c) => c.includes('/32'));
  assert.ok(faded.length > 0, '32% 라벨 규칙이 사라졌다');
  for (const c of faded) {
    assert.ok(c.startsWith('disabled:'), `접두사 없이 32%가 걸렸다: ${c} — 대비 2.14가 눌리는 버튼에도 적용된다`);
  }
});

test('회귀: 옅은 노랑 배경에는 조건 없는 흐린 라벨이 없다', () => {
  // 배경은 항상 걸리므로 접두사가 없어도 되지만, 그 위 글자는 조건부여야 한다.
  const rendered = buttonClass('disabled');
  const unconditionalFade = rendered
    .split(' ')
    .filter((c) => c.includes('text-ink/') && !c.startsWith('disabled:'));
  assert.deepEqual(unconditionalFade, [], `조건 없이 흐려지는 라벨: ${unconditionalFade.join(', ')}`);
});

test('HTML disabled가 걸리면 커서 규칙이 함께 온다', () => {
  const cls = buttonClass('disabled', true);
  assert.ok(cls.includes('disabled:cursor-not-allowed'), '못 누르는 버튼에 커서 표시가 없다');
});

test('hover는 enabled일 때만 — 못 누르는 버튼이 마우스에 반응하지 않는다', () => {
  for (const tone of TONES) {
    const hovers = buttonClass(tone)
      .split(' ')
      .filter((c) => c.includes('hover:'));
    for (const h of hovers) {
      assert.ok(h.startsWith('enabled:'), `${tone}의 hover에 enabled: 접두사가 없다: ${h}`);
    }
  }
});

test('모든 톤이 같은 크기·모양을 쓴다 — 색만 달라야 한다', () => {
  const shapeOf = (tone: ButtonTone) =>
    buttonClass(tone)
      .split(' ')
      .filter((c) => c.startsWith('h-') || c.startsWith('w-') || c.startsWith('rounded-'))
      .sort()
      .join(' ');
  const shapes = TONES.map(shapeOf);
  assert.equal(new Set(shapes).size, 1, `톤마다 모양이 다르다: ${shapes.join(' | ')}`);
});

test('버튼 안의 문구가 그대로 나온다', () => {
  const html = renderToStaticMarkup(
    <button type="button" className={aiGenerateButtonClass('brand')}>
      이미지 생성하기
    </button>,
  );
  assert.ok(html.includes('이미지 생성하기'));
});
