import type { ButtonTone } from '@/types/banner-flow';

// 여러 단계에서 같이 쓰는 버튼 스타일 — 디자인 시스템 §6-1.
//
// 단계마다 따로 적어두면 반드시 어긋난다. 실제로 "AI 생성" 버튼이 1단계는 48/radius24/
// Medium, 2단계는 54/radius27/SemiBold로 벌어져 있었다.

/**
 * "AI로 만들기" 버튼 — 각 단계 폼 아래 놓이는 전체폭 버튼.
 *
 * 어떤 색인지는 여기서 정하지 않는다 — resolveButtonTone이 정한 걸 받아 칠하기만
 * 한다. 화면이 스스로 판단하기 시작하면 반드시 어긋난다(세 번 겪었다).
 */
export function aiGenerateButtonClass(tone: ButtonTone): string {
  return [
    'flex h-12 w-full items-center justify-center gap-2 rounded-[24px] border border-transparent',
    'text-[16px] leading-[26px] font-medium',
    'transition-[background-color,scale] duration-150 enabled:active:scale-[0.98]',
    'disabled:cursor-not-allowed',
    TONE_CLASS[tone],
  ].join(' ');
}

/**
 * 색 세 가지. 여기 없는 조합은 쓰지 않는다.
 *
 *   brand     지금 눌러야 진행된다. 화면에 하나만.
 *   support   누를 수 있지만 주인공은 아니다.
 *   disabled  정말 못 누른다. 라벨 32%.
 *
 * "다시 생성하기"처럼 누를 수 있는 버튼에 옅은 노랑을 쓰면 못 누르는 버튼과
 * 같은 색이 되어 구분이 사라진다. 실제로 그렇게 만들었다가 되돌렸다.
 */
export const TONE_CLASS: Record<ButtonTone, string> = {
  brand: 'bg-brand text-ink enabled:hover:bg-[#f2df00]',
  support: 'bg-fill text-ink enabled:hover:bg-[#e5e9ec]',
  disabled: 'bg-brand-disabled text-ink/32',
};

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
 * 글자색 --color-fill-strong은 대비 5.51이라 13px에서도 AA를 넘는다.
 *
 * 2026-08-11: --color-ink-muted도 grey600(5.51)이 되어 이제 값이 같다. 그래도
 * 이름은 그대로 둔다 — 원본에서 ico&text/sub와 background/reverse가 같은 원시값을
 * 가리키면서 쓰임이 다른 것과 같다.
 */
export const CHIP_OUTLINE = `${CHIP_BASE} border border-line bg-surface text-fill-strong hover:bg-fill hover:text-ink`;

/**
 * 배경 없는 텍스트 버튼 — 원본 Button Text.
 *
 * 카드 안에서 한 항목에만 붙는 가벼운 액션에 쓴다. 칩보다 조용해서 카드의 주
 * 액션(고르기)을 가리지 않는다.
 *
 * 상하 패딩이 있는 건 장식이 아니다. 14px 글자만 두면 높이가 22px이라 WCAG 2.5.8의
 * 24×24에 못 미친다. min-h-6과 px-1로 눌리는 영역을 넓힌다.
 */
export const TEXT_BUTTON =
  'flex min-h-6 shrink-0 items-center px-1 text-[14px] leading-[22px] font-medium text-ink underline underline-offset-4 transition-colors duration-150 hover:text-fill-strong';
