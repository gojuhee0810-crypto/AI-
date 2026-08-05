// Design Ref: prompt-system/ 아키텍처의 컴파일 단계.
// Design System(MD, 여러 파일) + Object Blueprint(MD, OBJECTS/*.md) →
// Claude(SYSTEM.md 지시에 따라 자연어로 컴파일) → GPT-Image 프롬프트 1개.
// 이 모듈은 프롬프트를 "조립"만 하고 이미지를 생성하지 않는다 — 렌더링은 항상
// OpenAI(gpt-image-1)가 한다.

import { readFile } from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const PROMPT_SYSTEM_DIR = path.join(process.cwd(), 'prompt-system');

async function readDoc(fileName: string): Promise<string> {
  return readFile(path.join(PROMPT_SYSTEM_DIR, fileName), 'utf-8');
}

async function readObjectBlueprint(objectKey: string): Promise<string> {
  return readFile(path.join(PROMPT_SYSTEM_DIR, 'OBJECTS', `${objectKey}.md`), 'utf-8');
}

/**
 * Design System(STYLE_GUIDE/SHAPE_GRAMMAR/COLOR_TOKEN/CAMERA/OUTPUT) +
 * Object Blueprint(OBJECTS/{objectKey}.md)를 읽어 Claude에게 SYSTEM.md 지시대로
 * 자연어 GPT-Image 프롬프트 1개로 컴파일하게 한다.
 */
export async function compileObjectPrompt(objectKey: string): Promise<string> {
  const [system, styleGuide, shapeGrammar, colorToken, camera, output, objectBlueprint] =
    await Promise.all([
      readDoc('SYSTEM.md'),
      readDoc('STYLE_GUIDE.md'),
      readDoc('SHAPE_GRAMMAR.md'),
      readDoc('COLOR_TOKEN.md'),
      readDoc('CAMERA.md'),
      readDoc('OUTPUT.md'),
      readObjectBlueprint(objectKey),
    ]);

  const designSystemInput = [styleGuide, shapeGrammar, objectBlueprint, colorToken, camera, output].join(
    '\n\n---\n\n',
  );

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: designSystemInput }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Prompt Compiler(Claude)가 텍스트 응답을 반환하지 않았습니다.');
  }
  return textBlock.text.trim();
}
