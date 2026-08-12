// 글자수 카운터 — 원본 Textfield의 helper 오른쪽 칸(ico&text/counter).
//
// 화면마다 따로 만들어 쓰다가 색이 세 가지로 갈렸다(검정 / ink-muted / 초과 시 빨강).
// 여기 하나만 둔다.
//
// **초과해도 검정을 유지한다.** 원본 규칙이고 이유가 있다 — 입력칸은 이미
// 테두리·배경·글자가 붉어진다. 카운터까지 붉어지면 무엇이 잘못인지(값인지 길이인지)
// 오히려 모호해진다. 길이가 문제라는 건 숫자 자체가 말한다.

import { FORM_HELPER } from '@/components/ai-banner/fields';

interface Props {
  value: string;
  limit: number;
}

/** 숫자만. 다른 것과 한 줄에 놓을 때 쓴다(에러 문구 + 카운터 등). */
export function CharCount({ value, limit }: Props) {
  return (
    <span className="tabular-nums text-ink">
      {value.length}/{limit}
    </span>
  );
}

/** 컨트롤 아래 카운터 한 줄 — space/6 아래, 인풋과 같은 space/16 안쪽. */
export function CharCounter({ value, limit }: Props) {
  return (
    <p className={`${FORM_HELPER} text-right`}>
      <CharCount value={value} limit={limit} />
    </p>
  );
}
