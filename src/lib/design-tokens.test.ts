// 디자인 시스템 회귀 테스트 — 파일을 읽어서 검사한다.
//
// 화면 픽셀은 테스트하기 어렵지만, 2026-08-11 감사에서 나온 문제 대부분은
// 파일만 읽어도 잡힌다. 고치기만 하면 네 번째가 온다 — Skeleton 그라데이션은
// 이미 두 번째였고, 옐로우 버튼은 세 번째였다.
//
// 기준은 심볼릭 링크로 걸린 원본 시스템이다:
//   .claude/skills/adcenter-design-system/2-tokens/tokens.css

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GLOBALS = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
const ORIGIN = readFileSync(
  join(ROOT, '.claude/skills/adcenter-design-system/2-tokens/tokens.css'),
  'utf8',
);

function readToken(css: string, name: string): string | null {
  const m = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim().toLowerCase() : null;
}

/** src 아래 모든 .ts/.tsx 경로 */
function sourceFiles(dir = join(ROOT, 'src')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

const SOURCES = sourceFiles().map((path) => ({ path, text: readFileSync(path, 'utf8') }));

// ── 토큰이 원본과 같은가 ─────────────────────────────────────────
//
// globals.css는 원본을 손으로 옮겨 적은 사본이라 갈라진다. 감사 시점에 17개 중
// 16개가 일치했고, 어긋난 하나는 아래에 이유와 함께 등록해 둔다.

/** 우리 이름 → 원본 이름. 값이 같아야 한다. */
const TOKEN_PAIRS: Array<[ours: string, origin: string]> = [
  ['--color-page', '--color-white'],
  ['--color-header', '--color-black'],
  ['--color-sidebar', '--color-grey50'],
  ['--color-brand', '--color-yellow'],
  ['--color-brand-disabled', '--color-yellow-disabled'],
  ['--color-ink', '--color-black'],
  ['--color-ink-muted', '--color-grey600'],
  ['--color-required', '--color-red'],
  ['--color-error', '--color-red700'],
  ['--color-error-surface', '--color-red50'],
  ['--color-line', '--color-grey300'],
  ['--color-fill', '--color-grey100'],
  ['--color-fill-strong', '--color-grey600'],
  ['--color-accent-soft', '--color-blue50'],
];

test('색 토큰이 원본 tokens.css와 같다', () => {
  for (const [ours, origin] of TOKEN_PAIRS) {
    const mine = readToken(GLOBALS, ours);
    const theirs = readToken(ORIGIN, origin);
    assert.ok(mine, `globals.css에 ${ours}가 없다`);
    assert.ok(theirs, `원본에 ${origin}이 없다`);
    assert.equal(mine, theirs, `${ours}(${mine}) ≠ 원본 ${origin}(${theirs})`);
  }
});

test('원본에서 의도적으로 벗어난 토큰은 --color-accent 하나뿐이다', () => {
  // #008dff는 배지 배경(#e3f3ff) 위에서 2.96, 흰 배경에서도 3.36이라 14px 글자에
  // 필요한 4.5를 못 넘는다. 원본 Badge 스펙 자체가 미달이라 한 단계 진하게 내렸다.
  // 되돌리려면 그 대비 문제를 먼저 해결해야 한다.
  assert.equal(readToken(GLOBALS, '--color-accent'), '#006bc4');
  assert.equal(readToken(ORIGIN, '--color-blue600-base'), '#008dff');
});

// ── 회귀: known-gaps.md "고쳐서 해결된 것" ────────────────────────

test('shimmer가 하드코딩 hex 대신 토큰을 쓴다', () => {
  // 두 번째다. 원본은 skeleton(grey100) 사이를 sunken(grey50)이 지나가 가운데가
  // 밝다. 하드코딩으로 되돌리면 값도 방향도 어긋난다.
  const shimmer = GLOBALS.slice(GLOBALS.indexOf('.shimmer'));
  const rule = shimmer.slice(0, shimmer.indexOf('}'));
  assert.ok(
    !/#[0-9a-fA-F]{3,8}/.test(rule),
    `shimmer에 하드코딩된 색이 있다:\n${rule}`,
  );
  assert.ok(rule.includes('var(--color-fill)'), 'skeleton 자리에 --color-fill을 쓴다');
  assert.ok(rule.includes('var(--color-sidebar)'), '지나가는 빛은 --color-sidebar다');
});

// ── 정의가 하나뿐인가 ────────────────────────────────────────────
//
// 감사에서 중복 9종이 나왔고 일부는 이미 갈라져 있었다. 한쪽만 고치면 화면마다
// 다르게 보인다 — Step3의 INPUT_CLASS 사본 때문에 카운터 간격이 그 화면만
// 6이 아니라 12.5였다.

/**
 * 아직 안 고친 것들. **줄어들기만 해야 한다.**
 *
 * 목록이 비어야 통과하게 만들면 지금 당장 전부 고쳐야 하고, 그러면 이 테스트를
 * 아예 안 만들게 된다. 대신 현재 상태를 적어두고 **새로 생기는 것만** 막는다.
 * 하나 고칠 때마다 여기서 지운다 — 안 지우면 테스트가 "고쳤으니 목록에서 빼라"고
 * 실패한다. 그래야 목록이 실제와 어긋나지 않는다.
 */
const KNOWN_INPUT_COPIES = [
  'src/components/ai-banner/Step1ImagePanel.tsx', // 배지 문구 입력이 BASE+NORMAL을 손으로 재작성
];

test('입력칸 스타일을 직접 적은 파일이 늘지 않는다', () => {
  const offenders = SOURCES.filter(
    ({ path, text }) =>
      !path.endsWith('fields.ts') &&
      // 인풋 스타일의 지문: 테두리 + radius + 좌우 패딩을 한 문자열에 적은 것
      /'[^']*\brounded-lg\b[^']*\bborder\b[^']*\bpx-4\b[^']*'/.test(text),
  ).map((f) => f.path.replace(ROOT + '/', ''));

  assert.deepEqual(
    offenders.sort(),
    [...KNOWN_INPUT_COPIES].sort(),
    'inputClass()를 안 쓴 파일이 바뀌었다 — 늘었으면 고치고, 줄었으면 KNOWN_INPUT_COPIES에서 지울 것',
  );
});

test('글자수 카운터 정의는 CharCounter.tsx 하나뿐이다', () => {
  const offenders = SOURCES.filter(
    ({ path, text }) =>
      !path.endsWith('CharCounter.tsx') && /\{value\.length\}\/\{limit\}/.test(text),
  );
  assert.deepEqual(
    offenders.map((f) => f.path.replace(ROOT + '/', '')),
    [],
    'CharCounter를 쓰지 않고 카운터를 직접 그린 파일',
  );
});

// ── 타입 스케일 ──────────────────────────────────────────────────

/** 원본 텍스트 스타일 12종이 쓰는 크기. */
const TYPE_SCALE = new Set([32, 24, 20, 18, 16, 14, 12]);

/**
 * 글자가 아니라 그림을 그리는 데 쓰는 크기. 스케일 대상이 아니다.
 * (● 불릿, ✦ 빈 상태 글리프 — 아이콘 자리를 텍스트로 채운 것)
 */
const GLYPH_SIZES = new Set([6, 22, 28]);

/**
 * 아직 안 고친 스케일 이탈. **줄어들기만 해야 한다.**
 * 전부 눈으로 맞추다 생긴 값이고, 원본에는 하나도 없다.
 */
const KNOWN_OFF_SCALE: Record<number, string[]> = {
  11: [
    'src/components/ai-banner/InfoTooltip.tsx',
    'src/components/ai-banner/PreviewPanel.tsx',
    'src/components/shell/AdStudioShell.tsx',
  ],
  13: [
    'src/components/ai-banner/Step1ImagePanel.tsx',
    'src/components/ai-banner/Toast.tsx',
    'src/components/shell/StepIndicator.tsx',
  ],
  15: [
    'src/components/ai-banner/Step3ReviewPanel.tsx',
    'src/components/ai-banner/Toast.tsx',
    'src/components/shell/StepIndicator.tsx',
  ],
  17: ['src/components/shell/AdStudioShell.tsx'],
};

test('스케일 밖 글자 크기가 늘지 않는다', () => {
  const found = new Map<number, Set<string>>();

  for (const { path, text } of SOURCES) {
    for (const m of text.matchAll(/text-\[(\d+)px\]/g)) {
      const size = Number(m[1]);
      if (TYPE_SCALE.has(size) || GLYPH_SIZES.has(size)) continue;
      const rel = path.replace(ROOT + '/', '');
      found.set(size, (found.get(size) ?? new Set()).add(rel));
    }
  }

  const actual = [...found.entries()]
    .map(([size, files]) => `${size}: ${[...files].sort().join(', ')}`)
    .sort();
  const expected = Object.entries(KNOWN_OFF_SCALE)
    .map(([size, files]) => `${size}: ${[...files].sort().join(', ')}`)
    .sort();

  assert.deepEqual(
    actual,
    expected,
    '스케일 밖 크기가 바뀌었다 — 늘었으면 고치고, 줄었으면 KNOWN_OFF_SCALE에서 지울 것',
  );
});

// ── 선은 한 종류 ─────────────────────────────────────────────────

test('선 색은 --color-line 하나뿐이다', () => {
  // 시스템에 선은 #cfd6dc 1px 하나다(2026-08-11 사용자 확정). 라디오 테두리를
  // 대비 때문에 진하게 바꿨다가 되돌린 적이 있다.
  const offenders: string[] = [];
  for (const { path, text } of SOURCES) {
    for (const m of text.matchAll(/border-(?:t-|b-|l-|r-|x-|y-)?\[?#([0-9a-fA-F]{3,8})\]?/g)) {
      offenders.push(`${path.replace(ROOT + '/', '')} — #${m[1]}`);
    }
  }
  assert.deepEqual(offenders, [], '하드코딩된 테두리 색');
});
