// Design Ref: §3 API — object_tag + benefit(+target) → 배너 문구 3안 생성.
// 이미지 생성(generate-image/route.ts)과 동일한 흐름의 다음 단계.

import { NextResponse } from 'next/server';
import { generateCopy } from '@/lib/copy-generate';
import { isMockMode, mockCopyResponse, mockDelay } from '@/lib/mock-mode';
import {
  API_LIMITS,
  GENERATION_FAILED_MESSAGE,
  checkOptional,
  checkRequired,
} from '@/lib/api-input';
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

  const invalid =
    checkRequired('objectTag', objectTag, API_LIMITS.objectTag) ??
    checkRequired('benefit', benefit, API_LIMITS.benefit) ??
    checkOptional('target', target, API_LIMITS.target);
  if (invalid) return errorResponse('INVALID_INPUT', invalid, 400);

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
    // 원문은 로그에만. 응답에 실으면 상위 URL·조직 ID·키 조각이 브라우저까지 간다.
    console.error('[generate-copy] 생성 실패:', error);
    return errorResponse('COPY_GENERATION_FAILED', GENERATION_FAILED_MESSAGE, 502);
  }
}
