// 입력칸 스타일 — 디자인 시스템 §6-2 / §6-5.
//
// 에러 표현이 네 곳(소재 이름·오브젝트 명칭·캠페인 혜택·랜딩URL)에 필요한데 각자
// 조건문을 쓰면 한 곳만 고쳐서 어떤 칸은 테두리만 붉어진다. 한 함수가 결정한다.

const BASE =
  'w-full rounded-lg border px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none';

/** 정상: 회색 테두리 + 흰 배경. 포커스에만 테두리가 진해진다. */
const NORMAL = 'border-line bg-surface placeholder:text-ink-faint focus:border-ink';

/**
 * 에러: 테두리·배경·placeholder를 함께 붉게.
 * 테두리 1px만 바꾸면 화면이 길 때 훑어봐서 어느 칸이 비었는지 안 보인다.
 */
const ERROR = 'border-required bg-[#fff4f4] placeholder:text-required focus:border-required';

export function inputClass(hasError: boolean, extra = ''): string {
  return `${BASE} ${hasError ? ERROR : NORMAL} ${extra}`.trim();
}
