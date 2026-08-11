// 여러 단계에서 같이 쓰는 버튼 스타일 — 디자인 시스템 §6-1.
//
// 단계마다 따로 적어두면 반드시 어긋난다. 실제로 "AI 생성" 버튼이 1단계는 48/radius24/
// Medium, 2단계는 54/radius27/SemiBold로 벌어져 있었다.

/**
 * "AI로 만들기" 버튼 — 각 단계 폼 아래 놓이는 전체폭 버튼.
 *
 * 옐로우는 화면에 하나만 쓴다. 지금 눌러야 진행되는 순간에만 브랜드 컬러를 주고,
 * 결과가 나와 주요 액션이 하단 CTA로 넘어가면 회색으로 내린다.
 */
export function aiGenerateButtonClass(isPrimary: boolean): string {
  return [
    'flex h-12 w-full items-center justify-center gap-2 rounded-[24px] border',
    'text-[16px] leading-[26px] font-medium',
    'transition-[background-color,scale] duration-150 enabled:active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:text-ink-muted',
    isPrimary
      ? 'border-transparent bg-brand text-ink enabled:hover:bg-[#f2df00]'
      : 'border-black/[0.06] bg-[#f0f0f0] text-ink enabled:hover:bg-brand',
  ].join(' ');
}

/**
 * 카드 안 인라인 액션 버튼(Chip) — "수정", "이미지 변경", "다시 생성하기".
 *
 * 폭은 라벨에 맡기고 좌우 10px 여백으로 잡는다. 고정 폭으로 묶으면 "수정" 두 글자가
 * 가운데만 차고 양옆이 비어 어디를 눌러야 하는지 흐려진다.
 */
export const CHIP_BASE =
  'flex h-8 shrink-0 items-center justify-center gap-1 rounded-[24px] px-2.5 text-[13px] leading-[20px] font-medium transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.96]';

/**
 * 흰 배경 + 회색 테두리 (기본)
 *
 * 글자색은 --color-ink-muted가 아니라 --color-fill-strong이다. 13px는 WCAG 기준
 * "본문"이라 4.5가 필요한데 ink-muted는 흰 배경에서 3.47로 못 미친다.
 * ink-muted 자체를 진하게 만들면 안내문·카운터까지 다 같이 어두워지는데, 그 값은
 * Figma 실측이라 건드리면 안 된다. 작은 글자에만 한 단계 진한 토큰을 쓴다(5.51).
 */
export const CHIP_OUTLINE = `${CHIP_BASE} border border-line bg-surface text-fill-strong hover:bg-fill hover:text-ink`;
