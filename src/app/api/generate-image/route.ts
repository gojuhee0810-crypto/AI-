// Design Ref: §3 API — 오브젝트 입력 → 스타일1(3D)+스타일2(2D) 이미지 생성.
// 각 스타일: 라이브러리 우선(findLibraryAsset/findStyle2LibraryAsset) → 없으면 동적 생성.
// 재생성(regenerateStyle 지정)은 라이브러리 매칭이었더라도 항상 동적 생성으로 전환한다.
// 2026-08-05: Supabase Storage 연동 전이라 이미지는 base64 data URL로 반환한다 —
// 프로젝트에 Supabase 키가 연결되면 업로드 후 실제 URL을 반환하도록 교체할 것.

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { findLibraryAsset } from '@/lib/asset-library';
import { findStyle2LibraryAsset } from '@/lib/style2-asset-library';
import { generateStyle1Dynamic } from '@/lib/style1-generate';
import { generateStyle2Dynamic } from '@/lib/style2-generate';
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  GenerateImageErrorResponse,
  GeneratedImage,
  ImageStyleKey,
} from '@/types/image-generation';

function errorResponse(
  code: GenerateImageErrorResponse['error']['code'],
  message: string,
  status: number,
): NextResponse<GenerateImageErrorResponse> {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function libraryImageToGeneratedImage(
  style: ImageStyleKey,
  publicPath: string,
): Promise<GeneratedImage> {
  const absolutePath = path.join(process.cwd(), 'public', publicPath);
  const rawBuffer = await readFile(absolutePath);
  // 라이브러리 원본은 240×240이 아닐 수 있으므로(예: 1024×1536) 항상 리사이즈해서
  // GeneratedImage.widthPx/heightPx(240 고정 타입) 계약을 실제로 지킨다.
  const resized = await sharp(rawBuffer)
    .resize(240, 240, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return {
    style,
    imageUrl: `data:image/png;base64,${resized.toString('base64')}`,
    widthPx: 240,
    heightPx: 240,
    sizeBytes: resized.byteLength,
  };
}

function bufferToGeneratedImage(style: ImageStyleKey, buffer: Buffer, sizeBytes: number): GeneratedImage {
  return {
    style,
    imageUrl: `data:image/png;base64,${buffer.toString('base64')}`,
    widthPx: 240,
    heightPx: 240,
    sizeBytes,
  };
}

export async function POST(request: Request): Promise<NextResponse<GenerateImageResponse | GenerateImageErrorResponse>> {
  let body: GenerateImageRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_INPUT', '요청 본문이 올바른 JSON이 아닙니다.', 400);
  }

  const { primaryObject, material, brandColor, regenerateStyle, visualizationNote } = body;

  if (!primaryObject || typeof primaryObject !== 'string' || !primaryObject.trim()) {
    return errorResponse('INVALID_INPUT', 'primaryObject는 필수입니다.', 400);
  }

  // 재생성(regenerateStyle 지정) 시엔 라이브러리 매칭이었더라도 항상 동적 생성으로 전환한다.
  const isRegenerate = Boolean(regenerateStyle);
  const stylesToGenerate: ImageStyleKey[] = regenerateStyle
    ? [regenerateStyle]
    : ['style-1-3d-basic', 'style-2-2d-flat'];

  async function generateOneStyle(style: ImageStyleKey): Promise<GeneratedImage> {
    if (style === 'style-1-3d-basic') {
      const libraryMatch = isRegenerate ? null : findLibraryAsset(primaryObject);
      if (libraryMatch) {
        return libraryImageToGeneratedImage('style-1-3d-basic', `/images/library/${path.basename(libraryMatch.path)}`);
      }
      const { buffer, sizeBytes } = await generateStyle1Dynamic(primaryObject, material, brandColor);
      return bufferToGeneratedImage('style-1-3d-basic', buffer, sizeBytes);
    }
    const libraryMatch = isRegenerate ? null : findStyle2LibraryAsset(primaryObject);
    if (libraryMatch) {
      return libraryImageToGeneratedImage('style-2-2d-flat', `/images/library-2d/${path.basename(libraryMatch.path)}`);
    }
    const { buffer, sizeBytes } = await generateStyle2Dynamic(primaryObject, brandColor);
    return bufferToGeneratedImage('style-2-2d-flat', buffer, sizeBytes);
  }

  // 스타일마다 독립적으로 시도한다 — 하나가 실패해도(예: 스타일2 실패) 이미 만들어진
  // 다른 스타일(예: 스타일1, 이미 API 비용이 든 결과)까지 통째로 버리지 않는다.
  const settled = await Promise.allSettled(stylesToGenerate.map((style) => generateOneStyle(style)));

  const images: GeneratedImage[] = [];
  const partialErrors: NonNullable<GenerateImageResponse['partialErrors']> = [];

  settled.forEach((result, index) => {
    const style = stylesToGenerate[index];
    if (result.status === 'fulfilled') {
      images.push(result.value);
    } else {
      const message = result.reason instanceof Error ? result.reason.message : '알 수 없는 오류';
      console.error(`[generate-image] ${style} 생성 실패:`, result.reason);
      partialErrors.push({ style, message });
    }
  });

  if (images.length === 0) {
    return errorResponse(
      'IMAGE_GENERATION_FAILED',
      partialErrors.map((e) => `${e.style}: ${e.message}`).join(' / ') || '이미지 생성 중 알 수 없는 오류가 발생했습니다.',
      502,
    );
  }

  const response: GenerateImageResponse = {
    images,
    visualizationNote,
    ...(partialErrors.length > 0 ? { partialErrors } : {}),
  };
  return NextResponse.json(response);
}
