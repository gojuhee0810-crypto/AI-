// 팝업 공통 값 — Figma 12:115606 실측(디자인 시스템 §6-4).
//
// 알럿과 편집 모달이 같은 껍데기를 쓴다. 각자 적어두면 한쪽만 고쳐서 딤 농도나
// radius가 갈린다 — 실제로 이 값들을 눈대중으로 적었다가 폭·radius·글자 크기가
// 전부 어긋나 있었다.

/** 카드 껍데기. 폭은 style로 따로 준다(모달마다 다르다). */
export const POPUP_SHELL =
  // m-auto가 있어야 화면 가운데 선다 — Tailwind 프리플라이트가 margin을 0으로 만든다.
  'm-auto max-w-[calc(100vw-32px)] rounded-lg bg-surface p-0 text-ink backdrop:bg-[rgba(6,11,17,0.6)]';

/** 기본 카드 폭(px) */
export const POPUP_WIDTH = 420;

const BUTTON_BASE =
  'h-12 w-[144px] shrink-0 rounded-[24px] text-[16px] leading-[26px] font-medium tracking-[-0.2px] transition-[background-color,scale] duration-150 active:scale-[0.96]';

export const POPUP_BUTTON = {
  primary: `${BUTTON_BASE} bg-brand text-ink enabled:hover:bg-[#f2df00] disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-muted`,
  support: `${BUTTON_BASE} bg-fill text-ink hover:bg-[#e5e9ec]`,
} as const;

/** 버튼 두 개 사이 간격(px) — 그룹 298 안에 144×2가 들어간다 */
export const POPUP_BUTTON_GAP = 10;
