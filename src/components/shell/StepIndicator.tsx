'use client';

// Design Ref: Figma 1211:2999 — 스텝퍼는 상단이 아니라 좌측 LNB의 "AI 광고 배너"
// 하위 트리로 들어간다(2026-08-08 사용자 확정). 원은 20px 검정, 숫자는 흰색.
//
// 상태 구분은 우리 규칙을 유지한다: 완료는 체크, 현재는 숫자 + 굵은 라벨,
// 예정은 회색 테두리. 완료한 단계만 눌러서 되돌아갈 수 있고, 안 가본 단계로
// 건너뛰는 건 막는다.

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
  /** 완료한 단계를 눌렀을 때. 없으면 표시 전용이 된다. */
  onStepSelect?: (step: 1 | 2 | 3) => void;
}

export function StepIndicator({ currentStep, onStepSelect }: Props) {
  return (
    <ol className="flex flex-col gap-1 pl-[52px]">
      {STEPS.map((s) => {
        const isActive = s.step === currentStep;
        const isDone = s.step < currentStep;
        const canNavigate = isDone && Boolean(onStepSelect);

        const inner = (
          <>
            <span
              aria-hidden
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-medium ${
                isDone || isActive
                  ? 'bg-ink text-white'
                  : 'border border-line text-ink-muted'
              }`}
            >
              {isDone ? (
                <svg viewBox="0 0 12 12" className="size-2.5" fill="none" strokeWidth={2}>
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
            <span
              className={`text-[15px] leading-[26px] ${
                isActive ? 'font-medium text-ink' : isDone ? 'text-ink' : 'text-ink-muted'
              }`}
            >
              {s.label}
            </span>
            <span className="sr-only">
              {isDone ? '완료' : isActive ? '진행 중' : '진행 전'}
            </span>
          </>
        );

        return (
          <li key={s.step}>
            {canNavigate ? (
              <button
                type="button"
                onClick={() => onStepSelect?.(s.step)}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg pr-3 transition-[background-color,scale] duration-150 hover:bg-[#eff2f4] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {inner}
                <span className="sr-only">— 이 단계로 돌아가기</span>
              </button>
            ) : (
              <span
                aria-current={isActive ? 'step' : undefined}
                className="flex min-h-10 items-center gap-2 pr-3"
              >
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
