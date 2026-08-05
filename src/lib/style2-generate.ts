// Design Ref: 스타일 2(2D) 동적 생성 — prompt-compiler.ts가 만든 자연어 프롬프트를
// OpenAI(gpt-image-1)의 images.generate로 렌더링한다. 텍스트 전용(레퍼런스 이미지
// 미첨부) — 스타일 1(3D 클레이) 이미지를 참고로 붙이면 리얼리즘이 섞여 결과가
// 나빠짐이 2026-08-05 실측으로 확인됨.

import OpenAI from 'openai';
import sharp from 'sharp';
import { resolveObjectBlueprint, compilePrompt } from './prompt-compiler';

export interface Style2GenerateResult {
  buffer: Buffer;
  sizeBytes: number;
}

/** primaryObject를 스타일 2(2D) 이미지로 동적 생성하고 240×240 PNG 버퍼로 반환한다. */
export async function generateStyle2Dynamic(
  primaryObject: string,
  brandColor?: string,
): Promise<Style2GenerateResult> {
  const objectBlueprint = await resolveObjectBlueprint(primaryObject);
  const prompt = await compilePrompt(objectBlueprint, brandColor);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024',
    background: 'transparent',
  });

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error('OpenAI가 이미지를 반환하지 않았습니다.');
  }

  const rawBuffer = Buffer.from(imageBase64, 'base64');
  const resized = await sharp(rawBuffer)
    .resize(240, 240, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return { buffer: resized, sizeBytes: resized.byteLength };
}
