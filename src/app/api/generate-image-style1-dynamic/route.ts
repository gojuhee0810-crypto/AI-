// Design Ref: §3 API — style-1(3D) 미등록 오브젝트 전용, 별도 함수로 분리.
//
// 2026-09-18: generate-image/route.ts와 같은 번들에 있었을 때, 이 경로에서만 쓰는
// generateStyle1Dynamic → @imgly/background-removal-node → onnxruntime-node
// 의존성(플랫폼별 바이너리 포함 압축 144MB)이 Vercel 함수 용량 제한을 넘겨서,
// "쿠폰"처럼 이 무거운 경로를 전혀 안 타는 요청까지 함수 자체가 배포에서
// 빠지며 전부 500(정확히는 x-matched-path: /500 정적 폴백)이 났다.
// 무거운 의존성을 쓰는 요청만 별도 함수로 떼어 나머지를 정상화한다.

import { NextResponse } from 'next/server';
import { generateStyle1Dynamic } from '@/lib/style1-generate';
import { API_LIMITS, checkRequired } from '@/lib/api-input';

export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  let body: { primaryObject?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: '요청 본문이 올바른 JSON이 아닙니다.' } }, { status: 400 });
  }

  const invalid = checkRequired('primaryObject', body.primaryObject, API_LIMITS.objectTag);
  if (invalid) return NextResponse.json({ error: { code: 'INVALID_INPUT', message: invalid } }, { status: 400 });

  try {
    const { buffer, sizeBytes } = await generateStyle1Dynamic(body.primaryObject!);
    return NextResponse.json({ imageBase64: buffer.toString('base64'), sizeBytes });
  } catch (err) {
    console.error('[generate-image-style1-dynamic] 생성 실패:', err);
    return NextResponse.json({ error: { code: 'IMAGE_GENERATION_FAILED', message: '이미지 생성에 실패했습니다.' } }, { status: 502 });
  }
}
