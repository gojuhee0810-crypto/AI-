// 카드 안 인라인 액션 버튼(Chip) — 디자인 시스템 §6-1.
//
// 폭을 고정한다. 라벨 길이("수정" / "이미지 변경" / "다시 생성하기")에 따라 버튼이
// 제각각 넓어지면, 여러 행에 세로로 늘어섰을 때 오른쪽 끝이 들쭉날쭉해 보인다.
// 가장 긴 라벨("다시 생성하기")이 들어가는 폭에 맞춰 전부 같게 둔다.

export const CHIP_BASE =
  'flex h-8 w-[104px] shrink-0 items-center justify-center gap-1 rounded-[24px] text-[13px] leading-[20px] font-medium transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.96]';

/** 흰 배경 + 회색 테두리 (기본) */
export const CHIP_OUTLINE = `${CHIP_BASE} border border-line bg-surface text-ink-muted hover:bg-fill hover:text-ink`;
