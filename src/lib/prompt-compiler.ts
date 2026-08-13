// Design Ref: prompt-system/ 문서를 읽어 GPT-Image용 프롬프트 1개로 컴파일한다.
// prompt-system/compile.ts와 같은 역할이지만, route.ts에서 실제로 호출 가능하도록
// Claude 실패 시(예: 크레딧 부족) 결정적 조립(concatenation)으로 폴백하는 버전이다.

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const PROMPT_SYSTEM_DIR = path.join(process.cwd(), 'prompt-system');

async function readDoc(fileName: string): Promise<string> {
  return readFile(path.join(PROMPT_SYSTEM_DIR, fileName), 'utf-8');
}

/** 입력 오브젝트 텍스트를 OBJECTS/*.md 파일명으로 쓸 수 있게 정리한다 (한글 그대로 사용). */
export function slugifyObject(input: string): string {
  return input.trim().replace(/\s+/g, '-').replace(/[/\\?%*:|"<>]/g, '');
}

/** 블루프린트 마크다운을 `## 섹션명` → 내용 맵으로 나눈다. */
export function parseBlueprint(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
  for (const part of markdown.split(/^## /m).slice(1)) {
    const lineBreak = part.indexOf('\n');
    if (lineBreak < 0) continue;
    const name = part.slice(0, lineBreak).trim();
    const body = part.slice(lineBreak + 1).trim();
    if (name && body) sections[name] = body;
  }
  return sections;
}

/**
 * 스타일 1(3D)에 넣을 오브젝트 설명. 블루프린트에서 **모양에 관한 것만** 뽑는다.
 *
 * 색·비율·카메라는 가져오지 않는다 — 스타일 1은 자기 팔레트와 카메라 규칙을 갖고
 * 있고(image-style-patterns.ts), 블루프린트의 CATEGORY 색은 스타일 2(2D)용이다.
 * 둘을 섞으면 3D 아이콘이 2D 팔레트로 칠해진다.
 *
 * 2026-08-13에 추가했다. 그전까지 스타일 1은 오브젝트 **이름만** 받았다 —
 * "전기자전거"를 넣었더니 배터리도 모터도 없는 평범한 자전거가 나왔는데,
 * 블루프린트에는 `RECOGNITION CUE: Visible battery pack integrated into the
 * frame's downtube`가 정확히 적혀 있었다. 만들어놓고 스타일 2에게만 주고 있었다.
 */
export function objectDetailForStyle1(blueprint: string): string {
  const s = parseBlueprint(blueprint);
  const lines: string[] = [];

  if (s.CONSTRUCTION) lines.push(`It is built like this: ${s.CONSTRUCTION}`);
  if (s.SILHOUETTE) lines.push(`Its silhouette reads as: ${s.SILHOUETTE}`);
  if (s['RECOGNITION CUE']) {
    // 하나만 남길 수 있다면 이것 — 빠지면 다른 사물로 읽힌다.
    lines.push(
      `The single detail that makes it recognizable, which must be clearly visible: ${s['RECOGNITION CUE']}`,
    );
  }
  if (s.AVOID) lines.push(`Do not include: ${s.AVOID}`);

  return lines.join('\n');
}

async function readObjectBlueprint(slug: string): Promise<string | null> {
  try {
    return await readFile(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS', `${slug}.md`), 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 같은 오브젝트를 동시에 요청했을 때 Claude를 한 번만 부르게 막는다.
 *
 * 스타일 1과 2가 `Promise.allSettled`로 **함께** 출발하므로, 캐시가 없는 오브젝트는
 * 두 요청이 같은 순간에 파일이 없는 걸 확인한다. 막지 않으면 Claude를 두 번 부르고
 * 같은 파일에 두 번 쓴다 — 값이 크게 다르진 않지만 비용이 두 배고, 두 스타일이 서로
 * 다른 블루프린트를 받아 한 화면에 다른 사물이 나올 수 있다.
 */
const inFlight = new Map<string, Promise<string>>();

/**
 * OBJECTS/{slug}.md가 없으면 Claude에게 오브젝트 블루프린트를 새로 작성시키고
 * 저장한다. 실패하면(예: 크레딧 부족) 최소 블루프린트로 폴백한다 — 완전히
 * 실패시키지 않고 낮은 품질로라도 진행한다.
 */
export async function resolveObjectBlueprint(primaryObject: string): Promise<string> {
  const slug = slugifyObject(primaryObject);
  const existing = await readObjectBlueprint(slug);
  if (existing) return existing;

  const running = inFlight.get(slug);
  if (running) return running;

  const started = createObjectBlueprint(primaryObject, slug);
  inFlight.set(slug, started);
  try {
    return await started;
  } finally {
    inFlight.delete(slug);
  }
}

async function createObjectBlueprint(primaryObject: string, slug: string): Promise<string> {
  try {
    const colorTokenDoc = await readDoc('COLOR_TOKEN.md');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system:
        '너는 핀테크 아이콘 라이브러리의 오브젝트 블루프린트 작성자다. 실물을 그대로 베끼지 않고, ' +
        '인식에 필요한 핵심 특징만 추상화한다. Must Have는 없으면 인식 불가한 것만 2~3개, Should Have는 ' +
        '1~2개, Avoid는 헷갈리기 쉬운 리얼리즘 디테일, Recognition Cue는 단 하나. 카테고리와 그 Primary/' +
        'Secondary/Accent 색상은 반드시 아래 COLOR_TOKEN.md 표에 있는 값 그대로 써야 한다 — 색을 스스로 ' +
        '지어내지 마라. 오브젝트 위에 읽을 수 있는 텍스트/단어/라벨(예: "STOCK", "SALE" 같은 영단어)은 ' +
        '절대 넣지 마라 — Must Have/Should Have/Optional Details 어디에도 텍스트 라벨을 넣지 않는다. ' +
        `통화 기호(₩, $)나 화살표 같은 심볼 하나 정도만 예외로 허용한다.\n\n${colorTokenDoc}`,
      messages: [
        {
          role: 'user',
          content: `오브젝트: "${primaryObject}"\n\n아래 마크다운 형식으로만 블루프린트를 작성해줘 (다른 설명 없이):\n\n# Object Blueprint: {영문 이름} ({한글 이름})\n\n## OBJECT\n{영문 이름}\n\n## CATEGORY\n{COLOR_TOKEN.md 표의 카테고리명 그대로} (Primary {표의 색+헥스} · Secondary {표의 색+헥스} · Accent {표의 색+헥스})\n\n## PURPOSE\n{1문장}\n\n## CONSTRUCTION\n{Must Have + Should Have를 자연스러운 문장으로}\n\n## SILHOUETTE\n{1문장}\n\n## PROPORTION\n{Main ~70%. Functional ~20%. Accent ~10%.}\n\n## RECOGNITION CUE\n{1문장}\n\n## OPTIONAL DETAILS\n{있으면}\n\n## AVOID\n{쉼표로 나열}`,
        },
      ],
    });
    const textBlock = response.content.find((block) => block.type === 'text');
    const blueprint = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : null;
    if (!blueprint) throw new Error('Claude가 블루프린트를 반환하지 않음');

    await mkdir(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS'), { recursive: true });
    await writeFile(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS', `${slug}.md`), blueprint, 'utf-8');
    return blueprint;
  } catch (error) {
    // Claude 호출 실패(예: 크레딧 부족) — 최소 블루프린트로 폴백해서 파이프라인을 막지 않는다.
    console.error('[prompt-compiler] 블루프린트 생성 실패, 폴백 사용:', error);
    return `# Object Blueprint: ${primaryObject}\n\n## OBJECT\n${primaryObject}\n\n## CATEGORY\nFinance (Primary Blue · Secondary Yellow · Accent Gray)\n\n## PURPOSE\nInstantly communicate "${primaryObject}" at small icon sizes.\n\n## CONSTRUCTION\nA simple recognizable rounded shape representing ${primaryObject}.\n\n## SILHOUETTE\nA single clear, bold silhouette.\n\n## PROPORTION\nMain shape ~70%. Functional parts ~20%. Accent mark ~10%.\n\n## RECOGNITION CUE\nThe overall silhouette of ${primaryObject}.\n\n## AVOID\nrealistic textures, brand logos.`;
}
}

/** 결정적 조립 폴백 — Claude 없이 MD 섹션을 그대로 이어붙인다. */
async function compileByConcatenation(objectBlueprint: string): Promise<string> {
  const [styleGuide, shapeGrammar, colorToken, camera, output] = await Promise.all([
    readDoc('STYLE_GUIDE.md'),
    readDoc('SHAPE_GRAMMAR.md'),
    readDoc('COLOR_TOKEN.md'),
    readDoc('CAMERA.md'),
    readDoc('OUTPUT.md'),
  ]);
  return [styleGuide, shapeGrammar, objectBlueprint, colorToken, camera, output].join('\n\n---\n\n');
}

/**
 * prompt-system/ 문서 + 오브젝트 블루프린트를 Claude로 자연어 프롬프트 1개로
 * 컴파일한다. Claude 호출이 실패하면(크레딧 부족 등) 결정적 조립으로 폴백한다.
 */
export async function compilePrompt(objectBlueprint: string): Promise<string> {
  try {
    const [system, styleGuide, shapeGrammar, colorToken, camera, output] = await Promise.all([
      readDoc('SYSTEM.md'),
      readDoc('STYLE_GUIDE.md'),
      readDoc('SHAPE_GRAMMAR.md'),
      readDoc('COLOR_TOKEN.md'),
      readDoc('CAMERA.md'),
      readDoc('OUTPUT.md'),
    ]);

    const designSystemInput = [styleGuide, shapeGrammar, objectBlueprint, colorToken, camera, output].join('\n\n---\n\n');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: designSystemInput }],
    });
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('Claude가 텍스트를 반환하지 않음');
    return textBlock.text.trim();
  } catch (error) {
    console.error('[prompt-compiler] Claude 컴파일 실패, 조립 폴백 사용:', error);
    return compileByConcatenation(objectBlueprint);
  }
}
