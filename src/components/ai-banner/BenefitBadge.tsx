// 혜택 배지 — 배너 이미지 좌측 하단에 얹는 그래픽 요소.
//
// 서브타이틀 옆의 텍스트 배지가 아니다. 카피 자리를 뺏지 않으면서 혜택을 강조하려고
// 이미지 위에 붙이는 스티커라, 흰 테두리를 두른 원 안에 문구가 들어간다.
// 흰 테두리는 장식이 아니다 — 배지가 어떤 색 이미지 위에 놓일지 모르는데,
// 테두리가 없으면 비슷한 색을 만났을 때 경계가 사라진다.
//
// SVG로 그린다. PNG로 만들면 색상 3종 × 문구마다 파일이 필요하고, 문구가 바뀔 때마다
// 다시 만들어야 한다.

import { BADGE_STYLES, type BadgeStyle } from '@/types/banner-flow';

/**
 * 문구를 두 줄로 나눈다. "5% 할인"은 "5%"가 크고 "할인"이 작아야 읽힌다 —
 * 한 줄로 균등하게 그리면 작은 배지 안에서 둘 다 안 보인다.
 *
 * 어느 쪽을 키울지는 숫자로 정한다. 광고에서 눈이 먼저 가는 건 "50%"지 "최대"가 아니다.
 * 순서는 사용자가 적은 그대로 둔다("최대 50%"를 "50% 최대"로 뒤집지 않는다).
 */
export function splitBadgeText(text: string): { lines: string[]; emphasis: number } {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { lines: parts, emphasis: 0 };

  const head = parts[0];
  const tail = parts.slice(1).join(' ');
  return { lines: [head, tail], emphasis: /\d/.test(head) ? 0 : 1 };
}

/** 글자 수에 따라 크기를 줄인다. 고정하면 "5%"는 헐렁하고 긴 문구는 원 밖으로 나간다. */
function emphasisSize(length: number): number {
  if (length <= 2) return 30;
  if (length <= 4) return 24;
  if (length <= 6) return 18;
  return 14;
}

function supportSize(length: number): number {
  if (length <= 3) return 16;
  if (length <= 5) return 13;
  return 11;
}

interface Props {
  text: string;
  style: BadgeStyle;
  className?: string;
}

export function BenefitBadge({ text, style, className }: Props) {
  const { fill, textColor } = BADGE_STYLES[style];
  const { lines, emphasis } = splitBadgeText(text);
  const isTwoLine = lines.length > 1;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`혜택 ${lines.join(' ')}`}
    >
      {/* 흰 테두리는 원을 키워 그리고 그 위에 색 원을 얹는다 — stroke로 그리면
          절반이 바깥으로 나가 viewBox에서 잘린다. */}
      <circle cx="50" cy="50" r="50" fill="#ffffff" />
      <circle cx="50" cy="50" r="44" fill={fill} />

      {isTwoLine ? (
        lines.map((line, index) => {
          const isEmphasis = index === emphasis;
          return (
            <text
              key={index}
              x="50"
              y={index === 0 ? 41 : 66}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isEmphasis ? emphasisSize(line.length) : supportSize(line.length)}
              fontWeight="700"
              fill={textColor}
            >
              {line}
            </text>
          );
        })
      ) : (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={emphasisSize(lines[0]?.length ?? 0)}
          fontWeight="700"
          fill={textColor}
        >
          {lines[0]}
        </text>
      )}
    </svg>
  );
}
