// 입력칸 스타일 — 디자인 시스템 §6-2 / §6-5.
//
// 에러 표현이 네 곳(소재 이름·오브젝트 명칭·캠페인 혜택·랜딩URL)에 필요한데 각자
// 조건문을 쓰면 한 곳만 고쳐서 어떤 칸은 테두리만 붉어진다. 한 함수가 결정한다.

/**
 * 텍스트 스타일 12종 — 원본 `2-tokens/tokens.css`의 텍스트 스타일과 1:1이다.
 *
 * **크기·행간·자간·웨이트를 따로 조합하지 말 것.** 원본이 못박아 둔 규칙이고
 * 이유가 있다 — 넷 중 하나만 빠져도 원본과 어긋난다. 실제로 우리는 자간만
 * 빠뜨린 채 써왔다(2026-08-11 감사).
 *
 * 이름의 Bold는 Medium(500), Regular는 기본 굵기다.
 */
export const TEXT = {
  title32Bold: 'text-[32px] leading-[45px] tracking-[-0.4px] font-medium',
  title24Bold: 'text-[24px] leading-[35px] tracking-[-0.4px] font-medium',
  title20Bold: 'text-[20px] leading-[30px] tracking-[-0.2px] font-medium',
  title20: 'text-[20px] leading-[30px] tracking-[-0.2px]',
  title18Bold: 'text-[18px] leading-7 tracking-[-0.2px] font-medium',
  title18: 'text-[18px] leading-7 tracking-[-0.2px]',
  body16Bold: 'text-[16px] leading-[26px] tracking-[-0.2px] font-medium',
  body16: 'text-[16px] leading-[26px] tracking-[-0.2px]',
  body14Bold: 'text-[14px] leading-[22px] tracking-[-0.1px] font-medium',
  body14: 'text-[14px] leading-[22px] tracking-[-0.1px]',
  caption12Bold: 'text-[12px] leading-[19px] tracking-[-0.1px] font-medium',
  caption12: 'text-[12px] leading-[19px] tracking-[-0.1px]',
} as const;

// block이 필요하다: input·textarea는 기본이 inline-level이라 아래에 글꼴
// 디센더만큼(약 4~6px) 빈 줄이 붙는다. 그대로 두면 space/6으로 맞춘 헬퍼 간격이
// 실제로는 10~12px이 되어 Figma 실측과 어긋난다.
const BASE =
  `block w-full rounded-lg border px-4 ${TEXT.body16} text-ink transition-colors duration-150 outline-none`;

// 자동완성(오토필)을 고르면 브라우저가 배경을 강제로 옅은 파랑/노랑으로 칠한다.
// background-color를 덮어써도 안 먹는다 — 브라우저가 그 선언 자체를 이긴다.
// box-shadow inset으로 안쪽을 우리 배경색으로 다시 채우는 게 알려진 우회법이다
// (2026-08-18: "소재 이름"에 입력을 마쳐도 파란 배경이 안 없어진다고 확인됨).
//
// 클래스 문자열을 변수로 조립하면(예: 함수로 만들어 반환) Tailwind가 소스를 훑을 때
// 완성된 이름을 못 찾아 CSS 자체를 안 만든다 — 그래서 두 상태 각각 완전한 문자열로
// 따로 적는다. 처음에 함수로 합치려다 이 문제로 실제로 안 먹혔다.
const NORMAL_AUTOFILL =
  'autofill:[-webkit-text-fill-color:var(--color-ink)] autofill:[box-shadow:0_0_0px_1000px_var(--color-surface)_inset] autofill:[-webkit-box-shadow:0_0_0px_1000px_var(--color-surface)_inset]';
const ERROR_AUTOFILL =
  'autofill:[-webkit-text-fill-color:var(--color-error)] autofill:[box-shadow:0_0_0px_1000px_var(--color-error-surface)_inset] autofill:[-webkit-box-shadow:0_0_0px_1000px_var(--color-error-surface)_inset]';

/** 정상: 회색 테두리 + 흰 배경. 포커스에만 테두리가 진해진다. */
const NORMAL = `border-line bg-surface placeholder:text-ink-faint focus:border-ink ${NORMAL_AUTOFILL}`;

/**
 * 에러: 테두리·배경·placeholder를 함께 붉게.
 * 테두리 1px만 바꾸면 화면이 길 때 훑어봐서 어느 칸이 비었는지 안 보인다.
 */
const ERROR =
  `border-required bg-error-surface placeholder:text-error focus:border-required ${ERROR_AUTOFILL}`;

export function inputClass(hasError: boolean, extra = ''): string {
  return `${BASE} ${hasError ? ERROR : NORMAL} ${extra}`.trim();
}


/**
 * 폼 항목의 여백 — 원본 Form Field 실측(1-components/form/form-field.yaml).
 *
 *   Form Field
 *     ├ 라벨 (Title 18/Bold)
 *     ├ 설명 (Body 14/Regular)   ← 간격 0. 라벨에 붙는다
 *     │  ↓ space/15
 *     └ 컨트롤
 *        ├ 선택지 A              ← 그룹이면
 *        │  ↓ space/12           ← 형제끼리
 *        └ 선택지 B
 *        ↓ space/6
 *        헬퍼 / 카운터
 *     ↓ space/50
 *
 * 15·25·50은 8의 배수가 아니다. 원본 화면에서 반복 측정된 값이라 그렇다 —
 * 8px 그리드에 맞춘다며 16/24/48로 바꾸면 기존 광고센터 화면과 어긋난다.
 * 눈으로 맞추지 말고 이 상수를 쓸 것. 화면마다 손으로 적으면 반드시 벌어진다.
 */

/**
 * 폼 라벨 — Title 18/Bold (18/28).
 *
 * block이 필요하다: <label>은 기본이 inline이라 leading-7을 줘도 요소 높이가
 * 글꼴 실측치(21.5)로 잡힌다. 그러면 아래 15px 간격이 실제로는 18.5px가 되어
 * 폼 항목 전체 높이가 116이 아니라 113이 된다.
 */
export const FORM_LABEL = `block ${TEXT.title18Bold} text-ink`;

/** 폼 항목끼리 — space/50 */
export const FORM_STACK = 'flex flex-col gap-[50px]';

/** 라벨(+설명) → 컨트롤 — space/15 */
export const FORM_FIELD = 'flex flex-col gap-[15px]';

/** 형제 선택지끼리 — space/12 */
export const FORM_OPTIONS = 'flex flex-col gap-3';

/**
 * 컨트롤 → 헬퍼·카운터 — space/6, 좌우는 인풋과 같은 space/16.
 *
 * 타입 스타일(Caption 12/19)이 여기 들어 있는 건 필수다. 감싸는 요소에 크기를
 * 안 주면 본문 16px 기준 줄상자(strut)가 생겨서, 안쪽 글자가 12px이어도 줄 높이가
 * 24px로 벌어진다 — space/6으로 맞춰놓고도 실제로는 두 배가 됐다.
 */
export const FORM_HELPER = `mt-1.5 px-4 ${TEXT.caption12}`;
