// Design Ref: 스타일 1(3D) 동적 생성 — Gemini(gemini-2.5-flash-image)로 이미지를
// 만들고, Gemini가 진짜 투명 배경을 못 만들어주는 문제(2026-08-04 실측 확인)를
// @imgly/background-removal-node로 보정한 뒤 240×240으로 리사이즈한다.

import { GoogleGenAI } from '@google/genai';
import { removeBackground } from '@imgly/background-removal-node';
import { buildStylePrompts } from './image-style-patterns';
import { toBannerPng, type BannerImage } from './banner-image';

export type Style1GenerateResult = BannerImage;

/** primaryObject를 스타일 1(3D) 이미지로 동적 생성하고 240×240 PNG 버퍼로 반환한다. */
export async function generateStyle1Dynamic(primaryObject: string): Promise<Style1GenerateResult> {
  const [{ prompt }] = buildStylePrompts({ primaryObject, onlyStyle: 'style-1-3d-basic' });

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini가 이미지를 반환하지 않았습니다.');
  }

  const rawBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

  // @imgly/background-removal-node는 Blob 입력을 받는다.
  const blob = new Blob([new Uint8Array(rawBuffer)], { type: 'image/png' });
  const transparentBlob = await removeBackground(blob);
  const transparentBuffer = Buffer.from(await transparentBlob.arrayBuffer());

  return toBannerPng(transparentBuffer);
}
