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

/**
 * 팝업은 **본문과 버튼 영역이 따로**다 (Figma 12:115608 실측).
 *
 *   ┌─ 420 ───────────────┐
 *   │ pt 32 · px 32       │
 *   │   타이틀             │
 *   │   ↓ 24              │  ← 타이틀과 본문 사이만 24
 *   │   본문               │
 *   │ pb 40               │
 *   ├─────────────────────┤
 *   │ 버튼 48 (top에 붙음) │  ← 여기부터 footer, 높이 80 고정
 *   │ ↓ 32                │
 *   └─────────────────────┘
 *
 * 예전엔 버튼을 본문과 한 흐름에 두고 gap 24로 띄웠다. 그러면 본문→버튼이 24,
 * 버튼→바닥이 40이 되어 실측(40 / 32)과 위아래가 뒤집힌다.
 */
export const POPUP_BODY = 'flex flex-col items-center gap-6 px-8 pt-8 pb-10';

/** 버튼 영역 — 높이 80 고정. 버튼은 위에 붙고 아래 32가 남는다. */
export const POPUP_FOOTER = 'relative flex h-20 justify-center';

/**
 * 버튼 영역 위에 얹히는 34px 페이드.
 *
 * 본문이 길어 스크롤될 때 글이 버튼 밑에서 잘리는 대신 흐려지며 사라진다.
 * 스크롤이 없어도 원본에는 항상 있다 — 버튼 영역이 본문과 다른 층이라는 표시다.
 */
export const POPUP_FADE =
  'pointer-events-none absolute inset-x-0 -top-[34px] h-[34px] bg-gradient-to-b from-transparent to-surface';

const BUTTON_BASE =
  'h-12 w-[144px] shrink-0 rounded-[24px] text-[16px] leading-[26px] font-medium tracking-[-0.2px] transition-[background-color,scale] duration-150 active:scale-[0.96]';

export const POPUP_BUTTON = {
  primary: `${BUTTON_BASE} bg-brand text-ink enabled:hover:bg-[#f2df00] disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-muted`,
  support: `${BUTTON_BASE} bg-fill text-ink hover:bg-[#e5e9ec]`,
} as const;

/** 버튼 두 개 사이 간격(px) — 그룹 298 안에 144×2가 들어간다 */
export const POPUP_BUTTON_GAP = 10;
