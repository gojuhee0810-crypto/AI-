// 혜택 배지 — 배너 이미지 좌측 하단에 얹는 그래픽 요소.
//
// 서브타이틀 옆의 텍스트 배지가 아니다. 카피 자리를 뺏지 않으면서 혜택을 강조하려고
// 이미지 위에 붙이는 스티커라, 12각 별 모양 그래픽 안에 문구가 들어간다.
//
// SVG로 그린다. PNG로 만들면 색상 3종 × 문구마다 파일이 필요하고, 문구가 바뀔 때마다
// 다시 만들어야 한다.

import { BADGE_STYLES, type BadgeStyle } from '@/types/banner-flow';

/** 12각 별. 바깥/안쪽 반지름 차이가 클수록 뾰족해진다 — 광고 스티커 톤으로 완만하게 둔다. */
const STAR_POINTS = (() => {
  const spikes = 12;
  const outer = 50;
  const inner = 41;
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    points.push(`${(50 + radius * Math.cos(angle)).toFixed(1)},${(50 + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(' ');
})();

/**
 * 글자 수에 따라 크기를 줄인다. 고정 크기로 두면 "5%"는 헐렁하고
 * "최대 50% 할인"은 별 밖으로 삐져나온다.
 */
function fontSizeFor(length: number): number {
  if (length <= 2) return 34;
  if (length <= 4) return 26;
  if (length <= 6) return 19;
  return 15;
}

interface Props {
  text: string;
  style: BadgeStyle;
  className?: string;
}

export function BenefitBadge({ text, style, className }: Props) {
  const trimmed = text.trim();
  const { fill, textColor } = BADGE_STYLES[style];

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`혜택 ${trimmed}`}>
      <polygon points={STAR_POINTS} fill={fill} />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSizeFor(trimmed.length)}
        fontWeight="700"
        fill={textColor}
      >
        {trimmed}
      </text>
    </svg>
  );
}
