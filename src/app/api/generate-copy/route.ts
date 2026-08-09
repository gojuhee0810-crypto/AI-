// Design Ref: §3 API — object_tag + benefit(+target) → 배너 문구 3안 생성.
// 이미지 생성(generate-image/route.ts)과 동일한 흐름의 다음 단계.

import { NextResponse } from 'next/server';
import { generateCopy } from '@/lib/copy-generate';
import { isMockMode, mockCopyResponse, mockDelay } from '@/lib/mock-mode';
import type { GenerateCopyRequest, GenerateCopyResponse, GenerateCopyErrorResponse } from '@/types/copy-generation';

function errorResponse(
  code: GenerateCopyErrorResponse['error']['code'],
  message: string,
  status: number,
): NextResponse<GenerateCopyErrorResponse> {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<NextResponse<GenerateCopyResponse | GenerateCopyErrorResponse>> {
  let body: GenerateCopyRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_INPUT', '요청 본문이 올바른 JSON이 아닙니다.', 400);
  }

  const { objectTag, benefit, target } = body;

  if (!objectTag || typeof objectTag !== 'string' || !objectTag.trim()) {
    return errorResponse('INVALID_INPUT', 'objectTag는 필수입니다.', 400);
  }
  if (!benefit || typeof benefit !== 'string' || !benefit.trim()) {
    return errorResponse('INVALID_INPUT', 'benefit은 필수입니다.', 400);
  }

  // 화면 작업 중에는 같은 화면을 수십 번 돌리게 되는데 카피는 매번 Claude를 부른다.
  // MOCK_AI=1이면 호출 없이 같은 모양의 응답을 돌려준다(src/lib/mock-mode.ts).
  if (isMockMode()) {
    console.warn('[generate-copy] MOCK_AI=1 — 실제 호출 없이 목업 응답을 반환합니다.');
    await mockDelay();
    return NextResponse.json(mockCopyResponse(benefit));
  }

  try {
    const result = await generateCopy({ objectTag, benefit, target });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[generate-copy] 생성 실패:', error);
    return errorResponse('COPY_GENERATION_FAILED', message, 502);
  }
}
