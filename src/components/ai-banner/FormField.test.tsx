/** @jsxRuntime automatic */
/** @jsxImportSource react */
//
// FormField가 실제로 그리는 HTML을 검사한다 — 프로젝트 최초의 화면 렌더 테스트.
//
// 여기 있는 항목은 전부 2026-08-11 감사에서 실제로 발견된 것들이다. 그때는 화면마다
// 손으로 조립하다가 라벨이 연결 안 된 입력이 다섯 개, `required`가 전 화면에 0건,
// `aria-invalid`는 기억나는 곳에만 걸려 있었다. FormField는 그걸 막으려고 만들었는데
// **정작 FormField가 그 일을 하는지는 아무도 확인하지 않았다.**
//
// 타입·테스트·빌드가 전부 통과한 채로 간격이 깨진 걸 사용자가 발견한 적도 있다
// (2026-08-11). 순수 함수만 테스트하면 "테스트 통과"가 "화면이 맞다"를 뜻하지 않는다.
//
// 렌더는 react-dom/server로 한다 — jsdom이나 testing-library를 새로 넣지 않는다.
// 상호작용은 못 보지만, 여기서 막으려는 것(속성이 걸렸는가)은 전부 정적 마크업이다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormField, FormOptions, fieldProps } from './FormField';

/** 속성 하나를 태그에서 뽑아낸다. 순서에 의존하지 않으려고 정규식 대신 조각으로 본다. */
function hasAttr(html: string, tag: string, attr: string, value?: string): boolean {
  const open = html.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];
  return open.some((t) => (value === undefined ? t.includes(`${attr}=`) : t.includes(`${attr}="${value}"`)));
}

// ── 라벨 연결 ────────────────────────────────────────────────────────

test('회귀: label이 htmlFor로 컨트롤을 가리킨다 (감사에서 미연결 5건)', () => {
  const html = renderToStaticMarkup(
    <FormField label="소재 이름" htmlFor="material-name">
      <input id="material-name" />
    </FormField>,
  );
  assert.ok(hasAttr(html, 'label', 'for', 'material-name'), 'label[for]가 없다');
  assert.ok(hasAttr(html, 'input', 'id', 'material-name'), 'input[id]가 없다');
});

test('라디오 그룹은 label이 아니라 fieldset/legend가 된다', () => {
  const html = renderToStaticMarkup(
    <FormField as="group" label="이미지 유형">
      <FormOptions>
        <label>
          <input type="radio" name="t" value="a" /> 그래픽 아이콘
        </label>
      </FormOptions>
    </FormField>,
  );
  assert.ok(html.includes('<fieldset'), 'fieldset이 아니다');
  assert.ok(html.includes('<legend'), 'legend가 없다');
  // 가리킬 컨트롤이 하나가 아니면 <label for>를 쓸 수 없다.
  assert.ok(!/<label[^>]*\sfor=/.test(html), '그룹에 label[for]가 붙었다');
});

// ── 필수 표시 ────────────────────────────────────────────────────────

test('회귀: required면 별표와 aria-required가 함께 붙는다 (감사에서 required 0건)', () => {
  const html = renderToStaticMarkup(
    <FormField label="소재 이름" htmlFor="x" required>
      <input {...fieldProps('x', true)} />
    </FormField>,
  );
  assert.ok(html.includes('*'), '별표가 없다');
  assert.ok(hasAttr(html, 'input', 'required'), 'required 속성이 없다');
  assert.ok(hasAttr(html, 'input', 'aria-required', 'true'), 'aria-required가 없다');
});

test('required가 아니면 별표도 aria-required도 없다', () => {
  const html = renderToStaticMarkup(
    <FormField label="안내 문구" htmlFor="x">
      <input {...fieldProps('x', false)} />
    </FormField>,
  );
  assert.ok(!html.includes('*'), '필수가 아닌데 별표가 붙었다');
  assert.ok(!hasAttr(html, 'input', 'aria-required'), 'aria-required가 붙었다');
});

test('라디오 그룹은 각 라디오가 아니라 fieldset이 aria-required를 받는다', () => {
  const html = renderToStaticMarkup(
    <FormField as="group" label="이미지 유형" required>
      <input type="radio" name="t" />
    </FormField>,
  );
  assert.ok(hasAttr(html, 'fieldset', 'aria-required', 'true'));
});

// ── 에러 표현 ────────────────────────────────────────────────────────

test('회귀: 에러가 있으면 aria-invalid와 aria-describedby가 함께 걸린다', () => {
  const html = renderToStaticMarkup(
    <FormField label="소재 이름" htmlFor="x" error="필수 입력 항목이에요.">
      <input {...fieldProps('x', true, '필수 입력 항목이에요.')} />
    </FormField>,
  );
  assert.ok(hasAttr(html, 'input', 'aria-invalid', 'true'), 'aria-invalid가 없다');
  assert.ok(hasAttr(html, 'input', 'aria-describedby', 'x-error'), 'aria-describedby가 없다');
  assert.ok(html.includes('id="x-error"'), '가리키는 대상이 실제로 없다');
});

test('에러를 색만으로 알리지 않는다 — 문구가 함께 나온다', () => {
  const html = renderToStaticMarkup(
    <FormField label="소재 이름" htmlFor="x" error="필수 입력 항목이에요.">
      <input {...fieldProps('x', true, '필수 입력 항목이에요.')} />
    </FormField>,
  );
  assert.ok(html.includes('필수 입력 항목이에요.'), '사유 문구가 화면에 없다');
});

test('role="alert"은 문구가 있을 때만 붙는다 — 빈 자리표시자에 알림을 걸지 않는다', () => {
  const withError = renderToStaticMarkup(
    <FormField label="a" htmlFor="x" error="문제가 있어요">
      <input id="x" />
    </FormField>,
  );
  const reserved = renderToStaticMarkup(
    <FormField label="a" htmlFor="x" error={null}>
      <input id="x" />
    </FormField>,
  );
  assert.ok(withError.includes('role="alert"'), '에러가 있는데 alert이 없다');
  assert.ok(!reserved.includes('role="alert"'), '문구가 없는데 alert이 붙었다');
});

test('error={null}은 헬퍼 줄을 남긴다 — 에러가 떴다 사라질 때 아래가 밀리지 않게', () => {
  const reserved = renderToStaticMarkup(
    <FormField label="a" htmlFor="x" error={null}>
      <input id="x" />
    </FormField>,
  );
  const none = renderToStaticMarkup(
    <FormField label="a" htmlFor="x">
      <input id="x" />
    </FormField>,
  );
  assert.ok(reserved.includes('id="x-error"'), '자리를 지켜야 하는데 줄이 없다');
  assert.ok(!none.includes('-error'), '에러를 안 쓰는 항목에 빈 줄이 생겼다');
});

// ── 카운터 ───────────────────────────────────────────────────────────

test('카운터는 현재/최대를 그대로 보여준다', () => {
  const html = renderToStaticMarkup(
    <FormField label="소재 이름" htmlFor="x" counter={{ value: '커피', limit: 25 }}>
      <input id="x" />
    </FormField>,
  );
  assert.ok(html.includes('2/25'), `카운터가 안 보인다: ${html.slice(-200)}`);
});

test('회귀: 카운터는 초과해도 붉어지지 않는다 — 입력칸이 이미 붉게 알린다', () => {
  const over = renderToStaticMarkup(
    <FormField label="a" htmlFor="x" counter={{ value: '가'.repeat(30), limit: 25 }}>
      <input id="x" />
    </FormField>,
  );
  assert.ok(over.includes('30/25'), '초과 상태가 안 보인다');

  // 카운터를 감싼 태그 하나만 본다. 헬퍼 줄에는 에러 자리표시자(text-error)가 바로
  // 옆에 있어서, 범위를 넓게 잡으면 그 색을 카운터 것으로 잘못 읽는다.
  const counterTag = over.slice(over.lastIndexOf('<', over.lastIndexOf('30/25')), over.lastIndexOf('30/25'));
  assert.ok(!counterTag.includes('text-error'), `카운터가 붉어졌다: ${counterTag}`);
});

// ── 설명·장식 ────────────────────────────────────────────────────────

test('설명은 라벨 안에 들어간다 — 컨트롤 안이나 라벨 옆으로 흩어지지 않는다', () => {
  const html = renderToStaticMarkup(
    <FormField label="오브젝트 명칭" htmlFor="x" description="상품을 대표하는 사물">
      <input id="x" />
    </FormField>,
  );
  const label = html.slice(html.indexOf('<label'), html.indexOf('</label>'));
  assert.ok(label.includes('상품을 대표하는 사물'), '설명이 라벨 밖에 있다');
});

test('label 안에 div를 넣지 않는다 — phrasing content만 담을 수 있다', () => {
  const html = renderToStaticMarkup(
    <FormField label="a" htmlFor="x" description="설명" adornment={<span>?</span>}>
      <input id="x" />
    </FormField>,
  );
  const label = html.slice(html.indexOf('<label'), html.indexOf('</label>'));
  assert.ok(!label.includes('<div'), 'label 안에 div가 있다');
});
