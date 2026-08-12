// 라디오 표시 — 원 24px, 선택하면 브랜드 옐로우로 채운다(디자인 시스템 §6-3).
//
// 선택 표시는 이것 하나로만 한다. 카드 테두리 색까지 함께 바뀌면 인풋 포커스 표시와
// 뒤섞여 오히려 무엇이 선택된 건지 흐려진다(2026-08-08 확정).
//
// 실제 <input type="radio">는 sr-only로 숨기고 이 span이 그림을 맡는다 —
// 키보드 조작과 스크린리더는 브라우저 기본 동작을 그대로 쓰기 위해서다.
//
// 안 고른 상태의 테두리는 --color-line(#cfd6dc)이다. 원본 radio.yaml의
// field/border와 같은 값이고, 이 시스템의 선은 #cfd6dc 1px 하나뿐이다
// (2026-08-11 사용자 확정).
//
// 알고 쓰는 이탈: #cfd6dc는 흰 배경 대비 1.47이라 WCAG 1.4.11(UI 요소 경계 3.0)에
// 못 미친다. 한때 ink-muted(5.51)로 올렸다가 되돌렸다 — 선 색이 두 가지가 되는
// 대가가 더 컸다. 원본 Radio 스펙 자체가 기준 미달이라 우리 쪽에서 고칠 문제가
// 아니다. 다시 진하게 바꾸기 전에 known-gaps.md와 이 결정을 먼저 확인할 것.
//
// 선택하면 테두리가 사라지고 옐로우 면만 남는다 — 원본 그대로다(stroke 없음, fill만).

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
