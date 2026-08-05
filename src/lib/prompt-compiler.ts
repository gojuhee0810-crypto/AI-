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

async function readObjectBlueprint(slug: string): Promise<string | null> {
  try {
    return await readFile(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS', `${slug}.md`), 'utf-8');
  } catch {
    return null;
  }
}

/**
 * OBJECTS/{slug}.md가 없으면 Claude에게 image-research-agent와 동일한 절차로
 * 오브젝트 블루프린트를 새로 작성시키고 저장한다. 실패하면(예: 크레딧 부족) 최소
 * 블루프린트로 폴백한다 — 완전히 실패시키지 않고 낮은 품질로라도 진행한다.
 */
export async function resolveObjectBlueprint(primaryObject: string): Promise<string> {
  const slug = slugifyObject(primaryObject);
  const existing = await readObjectBlueprint(slug);
  if (existing) return existing;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system:
        '너는 핀테크 아이콘 라이브러리의 오브젝트 블루프린트 작성자다. 실물을 그대로 베끼지 않고, ' +
        '인식에 필요한 핵심 특징만 추상화한다. Must Have는 없으면 인식 불가한 것만 2~3개, Should Have는 ' +
        '1~2개, Avoid는 헷갈리기 쉬운 리얼리즘 디테일, Recognition Cue는 단 하나. 카테고리는 finance/' +
        'payment/reward/travel/insurance/map/medical/commerce/coupon/investment/security 중 하나.',
      messages: [
        {
          role: 'user',
          content: `오브젝트: "${primaryObject}"\n\n아래 마크다운 형식으로만 블루프린트를 작성해줘 (다른 설명 없이):\n\n# Object Blueprint: {영문 이름} ({한글 이름})\n\n## OBJECT\n{영문 이름}\n\n## CATEGORY\n{카테고리} (Primary {색} · Secondary {색} · Accent {색})\n\n## PURPOSE\n{1문장}\n\n## CONSTRUCTION\n{Must Have + Should Have를 자연스러운 문장으로}\n\n## SILHOUETTE\n{1문장}\n\n## PROPORTION\n{Main ~70%. Functional ~20%. Accent ~10%.}\n\n## RECOGNITION CUE\n{1문장}\n\n## OPTIONAL DETAILS\n{있으면}\n\n## AVOID\n{쉼표로 나열}`,
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
export async function compilePrompt(objectBlueprint: string, brandColor?: string): Promise<string> {
  try {
    const [system, styleGuide, shapeGrammar, colorToken, camera, output] = await Promise.all([
      readDoc('SYSTEM.md'),
      readDoc('STYLE_GUIDE.md'),
      readDoc('SHAPE_GRAMMAR.md'),
      readDoc('COLOR_TOKEN.md'),
      readDoc('CAMERA.md'),
      readDoc('OUTPUT.md'),
    ]);

    const brandColorNote = brandColor
      ? `\n\n---\n\nBRAND COLOR OVERRIDE: Use ${brandColor} as the Primary color instead of the category default.`
      : '';
    const designSystemInput =
      [styleGuide, shapeGrammar, objectBlueprint, colorToken, camera, output].join('\n\n---\n\n') + brandColorNote;

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
    const fallback = await compileByConcatenation(objectBlueprint);
    return brandColor
      ? `${fallback}\n\n---\n\nBRAND COLOR OVERRIDE: Use ${brandColor} as the Primary color instead of the category default.`
      : fallback;
  }
}
