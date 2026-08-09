// 화면을 다듬는 동안 외부 AI 호출을 끄기 위한 스위치.
//
// 이미지는 라이브러리에 등록된 오브젝트면 원래 과금이 없지만, 미등록 오브젝트와
// "다시 생성하기"는 Gemini/OpenAI를 부른다. 카피는 매번 Claude를 부른다.
// UI 작업 중에는 같은 화면을 수십 번 돌리게 되므로 그 비용이 쌓인다.
//
// 켜는 법: .env.local 에 MOCK_AI=1 을 추가하고 dev 서버를 다시 시작한다.
// (이 저장소 규칙상 .env 파일은 코드가 건드리지 않는다 — 직접 추가할 것)

import type { CopyRecommendation, GenerateCopyResponse } from '@/types/copy-generation';
import type { GeneratedImage, ImageStyleKey } from '@/types/image-generation';

export function isMockMode(): boolean {
  return process.env.MOCK_AI === '1';
}

/** 실제 생성처럼 보이도록 약간 기다린다 — 스켈레톤·진행 문구가 실제로 노출돼야 검증이 된다. */
export function mockDelay(ms = 1200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 스타일이 구분되도록 색만 다른 240×240 SVG를 만든다. */
function placeholderImage(style: ImageStyleKey): GeneratedImage {
  const is3d = style === 'style-1-3d-basic';
  const fill = is3d ? '#8b9cf0' : '#f0603c';
  const label = is3d ? '3D' : '2D';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
<rect x="40" y="40" width="160" height="160" rx="${is3d ? 32 : 12}" fill="${fill}"/>
<text x="120" y="136" font-family="sans-serif" font-size="48" font-weight="700" fill="#fff" text-anchor="middle">${label}</text>
<text x="120" y="176" font-family="sans-serif" font-size="16" fill="#fff" opacity="0.8" text-anchor="middle">MOCK</text>
</svg>`;
  return {
    style,
    imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    widthPx: 240,
    heightPx: 240,
    sizeBytes: svg.length,
  };
}

export function mockImages(styles: ImageStyleKey[]): GeneratedImage[] {
  return styles.map(placeholderImage);
}

/**
 * 실제 응답과 같은 모양의 카피 3안.
 * 글자수는 매체 규격(서브 15자 / 메인 14자) 안에 맞춰 두어, 목업으로 돌려도
 * 화면의 글자수 표시와 검증 로직이 정상 케이스로 동작한다.
 */
export function mockCopyResponse(benefit: string): GenerateCopyResponse {
  const recommendations: CopyRecommendation[] = [
    {
      pattern: '상황기반+문제제기',
      subtitle: '요즘 이런 고민 있으셨죠',
      maintitle: '지금 확인해보세요',
      reason: `[목업] "${benefit}"을 상황 제시형으로 풀었습니다. 실제 호출이 아닙니다.`,
    },
    {
      pattern: '혜택조건+결과형',
      subtitle: '조건 없이 누구나',
      maintitle: '혜택 그대로 받아요',
      reason: '[목업] 조건과 결과를 나눠 신뢰감을 주는 구조입니다.',
    },
    {
      pattern: '혜택+CTA형',
      subtitle: '오늘까지만 드려요',
      maintitle: '혜택 확인하기',
      reason: '[목업] 기한을 앞세워 즉시 행동을 유도합니다.',
    },
  ];
  return { recommendations, category: '일반' };
}
