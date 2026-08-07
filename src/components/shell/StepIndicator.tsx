'use client';

// Design Ref: docs/02-design/features/banner-studio-ui.design.md §4 — 완료는 검정 원 +
// 체크, 현재는 브랜드 옐로우, 예정은 회색 테두리.
//
// 2026-08-07: 시각 디자인은 유지하고 상호작용만 고쳤다. 이전엔 단계가 그려지기만 하고
// 클릭이 안 돼서, 되돌아가려면 하단 "이전"을 여러 번 눌러야 했다. 완료한 단계는
// 직접 누를 수 있어야 한다 — 3단계에 "이미지 변경하기"/"카피 변경하기"를 따로 둔 것도
// 사실 스테퍼가 그 역할을 못 해서 생긴 우회로였다.
//
// 앞 단계로만 이동할 수 있다. 아직 안 간 단계로 건너뛰는 건 막는다(1단계 이미지 없이
// 2단계 카피로 갈 수 없는 것과 같은 제약).

export interface StepDefinition {
  step: 1 | 2 | 3;
  label: string;
}

const STEPS: StepDefinition[] = [
  { step: 1, label: '이미지 생성' },
  { step: 2, label: '카피 문구' },
  { step: 3, label: '최종 선택' },
];

interface Props {
  currentStep: 1 | 2 | 3;
  /** 완료한 단계를 눌렀을 때. 없으면 스테퍼는 표시 전용이 된다. */
  onStepSelect?: (step: 1 | 2 | 3) => void;
}

export function StepIndicator({ currentStep, onStepSelect }: Props) {
  return (
    // px-2만큼 버튼이 안쪽으로 들어가므로 컨테이너를 그만큼 당겨, 아래 폼 컨텐츠와
    // 첫 번째 원의 왼쪽 선이 맞게 한다(기하학적 정렬이 아니라 시각적 정렬).
    <nav aria-label="진행 단계" className="-ml-2">
      <ol className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const isActive = s.step === currentStep;
          const isDone = s.step < currentStep;
          const canNavigate = isDone && Boolean(onStepSelect);

          const circle = (
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isDone
                  ? 'bg-ink text-white'
                  : isActive
                    ? 'bg-brand text-ink'
                    : 'border border-line text-ink-muted'
              }`}
            >
              {isDone ? (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" strokeWidth={2}>
                  <path
                    d="M2.5 6.2l2.4 2.4 4.6-5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                s.step
              )}
            </span>
          );

          const label = (
            <span
              className={`text-sm ${
                isActive ? 'font-bold text-ink' : isDone ? 'text-ink' : 'text-ink-muted'
              }`}
            >
              {s.label}
            </span>
          );

          // 상태 안내는 색·체크에만 의존하지 않고 텍스트로도 전달한다.
          const statusText = (
            <span className="sr-only">{isDone ? '완료' : isActive ? '진행 중' : '진행 전'}</span>
          );

          return (
            <li key={s.step} className="flex items-center gap-1">
              {canNavigate ? (
                <button
                  type="button"
                  onClick={() => onStepSelect?.(s.step)}
                  className="flex min-h-10 items-center gap-2 rounded-lg px-2 transition-[background-color,scale] duration-150 hover:bg-[#ececef] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {circle}
                  {label}
                  {statusText}
                  <span className="sr-only">— 이 단계로 돌아가기</span>
                </button>
              ) : (
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className="flex min-h-10 items-center gap-2 px-2"
                >
                  {circle}
                  {label}
                  {statusText}
                </span>
              )}

              {i < STEPS.length - 1 && (
                <span className={`h-px w-10 shrink-0 ${isDone ? 'bg-ink' : 'bg-line'}`} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
