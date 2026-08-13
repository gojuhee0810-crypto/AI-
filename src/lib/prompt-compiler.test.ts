// prompt-compiler의 네트워크를 타지 않는 부분을 검사한다.
//
// 이 모듈의 핵심은 폴백이다 — Claude가 실패해도(크레딧 부족 등) 파이프라인을 막지
// 않고 낮은 품질로라도 진행한다. 그런데 폴백은 정상 상황에서 절대 실행되지 않아
// 조용히 깨져 있어도 아무도 모른다. 여기서 그 경로만 골라 확인한다.
//
// ANTHROPIC_API_KEY를 지우면 SDK가 요청을 보내기 전에 로컬에서 거절하므로
// (2026-08-13 확인, 10ms) 실제 호출 없이 폴백에 도달할 수 있다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  slugifyObject,
  resolveObjectBlueprint,
  compilePrompt,
  parseBlueprint,
  objectDetailForStyle1,
} from './prompt-compiler';

const PROMPT_SYSTEM_DIR = path.join(process.cwd(), 'prompt-system');

/**
 * 키를 지운 채 실행한다 — 끝나면 되돌려서 다른 테스트에 영향을 주지 않는다.
 *
 * 폴백은 `console.error`로 원인을 남기는데, 여기서는 그게 기대한 동작이라 삼킨다.
 * 통과하는 테스트가 매번 스택을 뱉으면 사람이 테스트 출력을 안 읽게 된다.
 */
async function withoutClaudeKey<T>(run: () => Promise<T>): Promise<T> {
  const savedKey = process.env.ANTHROPIC_API_KEY;
  const savedError = console.error;
  delete process.env.ANTHROPIC_API_KEY;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = savedError;
    if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
  }
}

// ── slugifyObject ────────────────────────────────────────────────────

test('한글 오브젝트명을 그대로 파일명으로 쓴다', () => {
  assert.equal(slugifyObject('쿠폰'), '쿠폰');
});

test('공백은 하이픈이 된다 — 띄어쓰기만 다른 입력이 다른 파일이 되지 않게', () => {
  assert.equal(slugifyObject('자동차 보험'), '자동차-보험');
  assert.equal(slugifyObject('자동차  보험'), '자동차-보험');
});

test('앞뒤 공백은 무시한다', () => {
  assert.equal(slugifyObject('  쿠폰  '), '쿠폰');
});

test('회귀: 경로를 벗어나게 하는 문자를 지운다 — 파일명으로 쓰이므로', () => {
  assert.equal(slugifyObject('a/b'), 'ab');
  assert.equal(slugifyObject('../../etc/passwd'), '....etcpasswd');
  for (const ch of ['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>']) {
    assert.ok(!slugifyObject(`쿠폰${ch}`).includes(ch), `${ch} 가 남아 있다`);
  }
});

// ── prompt-system 문서 ───────────────────────────────────────────────

test('폴백 조립이 읽는 문서가 전부 있다 — 하나만 이름이 바뀌어도 폴백이 죽는다', async () => {
  for (const name of ['SYSTEM.md', 'STYLE_GUIDE.md', 'SHAPE_GRAMMAR.md', 'COLOR_TOKEN.md', 'CAMERA.md', 'OUTPUT.md']) {
    const body = await readFile(path.join(PROMPT_SYSTEM_DIR, name), 'utf-8');
    assert.ok(body.trim().length > 0, `${name} 가 비어 있다`);
  }
});

// ── resolveObjectBlueprint ───────────────────────────────────────────

test('캐시된 오브젝트는 Claude 없이 그대로 읽는다', async () => {
  const blueprint = await withoutClaudeKey(() => resolveObjectBlueprint('쿠폰'));
  const cached = await readFile(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS', '쿠폰.md'), 'utf-8');
  assert.equal(blueprint, cached);
});

test('캐시 조회는 slug 규칙을 따른다 — 공백이 섞여 들어와도 같은 파일을 찾는다', async () => {
  const direct = await withoutClaudeKey(() => resolveObjectBlueprint('자동차보험'));
  assert.match(direct, /# Object Blueprint/);
  assert.ok(!direct.includes('Instantly communicate'), '폴백이 아니라 캐시를 읽어야 한다');
});

test('캐시에 없고 Claude도 못 부르면 폴백 블루프린트를 준다 — 파이프라인을 막지 않는다', async () => {
  const blueprint = await withoutClaudeKey(() => resolveObjectBlueprint('한번도만든적없는오브젝트'));
  assert.match(blueprint, /# Object Blueprint: 한번도만든적없는오브젝트/);
  assert.match(blueprint, /Instantly communicate/);
});

test('폴백 블루프린트도 컴파일러가 기대하는 섹션을 전부 갖는다', async () => {
  const blueprint = await withoutClaudeKey(() => resolveObjectBlueprint('섹션검사용오브젝트'));
  for (const section of ['## OBJECT', '## CATEGORY', '## PURPOSE', '## CONSTRUCTION', '## SILHOUETTE', '## PROPORTION', '## RECOGNITION CUE', '## AVOID']) {
    assert.ok(blueprint.includes(section), `${section} 가 없다`);
  }
});

test('폴백은 파일을 쓰지 않는다 — 낮은 품질 결과가 캐시로 굳으면 안 된다', async () => {
  const slug = '캐시오염검사용오브젝트';
  await withoutClaudeKey(() => resolveObjectBlueprint(slug));
  await assert.rejects(
    () => readFile(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS', `${slug}.md`), 'utf-8'),
    '폴백 결과가 OBJECTS/에 저장됐다',
  );
});

// ── compilePrompt ────────────────────────────────────────────────────

test('Claude를 못 부르면 문서를 이어붙인 프롬프트로 폴백한다', async () => {
  const prompt = await withoutClaudeKey(() => compilePrompt('# Object Blueprint: 테스트\n\n## OBJECT\n테스트'));
  assert.ok(prompt.includes('# Object Blueprint: 테스트'), '블루프린트가 들어가야 한다');
  assert.ok(prompt.length > 500, '문서를 실제로 이어붙였는지');
});

test('폴백 프롬프트는 문서 순서대로 이어붙인다 — 블루프린트가 스타일 규칙 뒤에 온다', async () => {
  const marker = '# Object Blueprint: 순서검사';
  const prompt = await withoutClaudeKey(() => compilePrompt(marker));
  const blueprintAt = prompt.indexOf(marker);
  assert.ok(blueprintAt > 0, '블루프린트가 맨 앞이면 스타일 규칙이 빠진 것이다');
  assert.ok(prompt.indexOf('---') < blueprintAt, '문서 구분자가 있어야 한다');
});

// ── parseBlueprint / objectDetailForStyle1 ───────────────────────────
//
// 2026-08-13에 추가. 스타일 1이 오브젝트 이름만 받고 있었다 — "전기자전거"를 넣었더니
// 배터리 없는 평범한 자전거가 나왔는데, 블루프린트에는 배터리가 정확히 적혀 있었다.
// 실제 API를 처음 돌려보고서야 알았다.

test('블루프린트를 섹션 맵으로 나눈다', () => {
  const s = parseBlueprint('# T\n\n## OBJECT\nBike\n\n## AVOID\nspokes, chains');
  assert.equal(s.OBJECT, 'Bike');
  assert.equal(s.AVOID, 'spokes, chains');
});

test('여러 줄짜리 섹션도 통째로 담는다', () => {
  const s = parseBlueprint('## CONSTRUCTION\n첫 줄\n둘째 줄\n\n## AVOID\nx');
  assert.equal(s.CONSTRUCTION, '첫 줄\n둘째 줄');
});

test('공백 섹션과 제목만 있는 섹션은 버린다 — 빈 지시가 프롬프트에 들어가지 않게', () => {
  const s = parseBlueprint('## OPTIONAL DETAILS\n\n## AVOID\nx');
  assert.ok(!('OPTIONAL DETAILS' in s));
  assert.equal(s.AVOID, 'x');
});

test('회귀: 실제 블루프린트에서 인식 단서를 뽑는다 (전기자전거의 배터리)', async () => {
  const blueprint = await readFile(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS', '전기자전거.md'), 'utf-8');
  const detail = objectDetailForStyle1(blueprint);
  assert.match(detail, /battery pack/i, '배터리가 스타일 1 프롬프트에 안 들어간다');
  assert.match(detail, /must be clearly visible/i, '인식 단서를 강조하는 문장이 없다');
});

test('색·비율·카메라는 가져오지 않는다 — 스타일 1은 자기 규칙이 있다', async () => {
  const blueprint = await readFile(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS', '전기자전거.md'), 'utf-8');
  const detail = objectDetailForStyle1(blueprint);
  const sections = parseBlueprint(blueprint);
  assert.ok(!detail.includes(sections.CATEGORY), 'CATEGORY(2D용 팔레트)가 섞였다');
  assert.ok(!detail.includes(sections.PROPORTION), 'PROPORTION이 섞였다');
  assert.ok(!detail.includes(sections.PURPOSE), 'PURPOSE(시각 정보 아님)가 섞였다');
});

test('AVOID는 금지 문장으로 옮긴다', () => {
  const detail = objectDetailForStyle1('## AVOID\nrealistic spokes, brand logos');
  assert.match(detail, /Do not include: realistic spokes, brand logos/);
});

test('섹션이 하나도 없으면 빈 문자열 — 빈 줄만 프롬프트에 넣지 않는다', () => {
  assert.equal(objectDetailForStyle1('# 제목만 있는 문서'), '');
});

test('폴백 블루프린트에서도 설명이 나온다 — Claude가 죽어도 이름만 넘어가지 않게', async () => {
  const blueprint = await withoutClaudeKey(() => resolveObjectBlueprint('폴백설명검사용'));
  const detail = objectDetailForStyle1(blueprint);
  assert.ok(detail.length > 0, '폴백일 때 스타일 1이 이름만 받게 된다');
  assert.match(detail, /폴백설명검사용/);
});
