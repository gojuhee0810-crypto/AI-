// 라디오 표시 — 원 24px, 선택하면 브랜드 옐로우로 채운다(디자인 시스템 §6-3).
//
// 선택 표시는 이것 하나로만 한다. 카드 테두리 색까지 함께 바뀌면 인풋 포커스 표시와
// 뒤섞여 오히려 무엇이 선택된 건지 흐려진다(2026-08-08 확정).
//
// 실제 <input type="radio">는 sr-only로 숨기고 이 span이 그림을 맡는다 —
// 키보드 조작과 스크린리더는 브라우저 기본 동작을 그대로 쓰기 위해서다.

export function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
        checked ? 'border-brand bg-brand' : 'border-line bg-surface'
      }`}
    >
      {checked && <span className="size-2.5 rounded-full bg-ink" />}
    </span>
  );
}
