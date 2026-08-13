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
import { slugifyObject, resolveObjectBlueprint, compilePrompt } from './prompt-compiler';

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
