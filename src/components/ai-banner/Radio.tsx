// 라디오 표시 — 원 24px, 선택하면 브랜드 옐로우로 채운다(디자인 시스템 §6-3).
//
// 선택 표시는 이것 하나로만 한다. 카드 테두리 색까지 함께 바뀌면 인풋 포커스 표시와
// 뒤섞여 오히려 무엇이 선택된 건지 흐려진다(2026-08-08 확정).
//
// 실제 <input type="radio">는 sr-only로 숨기고 이 span이 그림을 맡는다 —
// 키보드 조작과 스크린리더는 브라우저 기본 동작을 그대로 쓰기 위해서다.
//
// 안 고른 상태의 테두리는 --color-line이 아니라 --color-ink-muted다.
// line은 흰 배경 대비 1.47이라 WCAG 1.4.11(UI 요소 경계 3.0)에 못 미친다.
// 여기서 선택 표시는 이 원 하나뿐이라, 원이 안 보이면 고를 수 있다는 것 자체가
// 안 보인다. ink-muted는 3.47로 기준을 넘는다.

export function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
        checked ? 'border-brand bg-brand' : 'border-ink-muted bg-surface'
      }`}
    >
      {checked && <span className="size-2.5 rounded-full bg-ink" />}
    </span>
  );
}
