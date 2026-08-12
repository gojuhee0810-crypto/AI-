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
/**
 * disabled 톤의 라벨이 조건부인 이유:
 *
 * 옅은 노랑 위 32% 검정은 대비가 **2.14**다. WCAG 1.4.3이 이걸 봐주는 건 정말로
 * 조작할 수 없는 요소일 때뿐인데, 우리 하단 CTA는 눌러서 "무엇이 비었는지"를
 * 알려주는 게 설계다(에러 표현 §3). 조작 가능한 버튼이라 면제 대상이 아니다.
 *
 * 그래서 32%는 `disabled:` 접두사에 둔다 — HTML disabled가 실제로 걸린 버튼(AI
 * 생성)에만 적용되고, 눌리는 버튼(하단 CTA)은 100%로 남는다. 정의는 하나인데
 * 두 경우가 각자 맞게 된다.
 */
export const TONE_CLASS: Record<ButtonTone, string> = {
  brand: 'bg-brand text-ink enabled:hover:bg-[#f2df00]',
  support: 'bg-fill text-ink enabled:hover:bg-[#e5e9ec]',
  disabled: 'bg-brand-disabled text-ink disabled:text-ink/32',
};

// Chip(CHIP_BASE·CHIP_OUTLINE)은 지웠다. 원본 Button은 md 36 / lg 48 두 크기뿐이라
// h-8·13px은 근거가 없었고, 문서가 "13/20은 Chip 전용"으로 허용해둔 예외가 오히려
// 스케일 이탈의 우회로가 됐다 — 2026-08-11 감사에서 13px 쓰임 4곳 중 칩은 0곳이고
// CHIP_* 는 한 번도 불리지 않았다. 인라인 액션이 필요하면 TEXT_BUTTON을 쓴다.

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
