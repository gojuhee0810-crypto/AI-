'use client';

// Design Ref: 좌측 LNB "AI 광고 배너" 하위 트리로 들어가는 세로 스텝퍼.
// 원 사이에 연결선을 그어 단계가 이어져 있음을 보인다.
//
// 상태 구분: 완료는 검정 원 + 체크, 현재는 검정 원 + 숫자 + 굵은 라벨,
// 예정은 회색 원 + 흐린 라벨. 완료한 단계만 눌러서 되돌아갈 수 있다.

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
    <ol className="flex flex-col pl-6">
      {STEPS.map((s, i) => {
        const isActive = s.step === currentStep;
        const isDone = s.step < currentStep;
        const canNavigate = isDone && Boolean(onStepSelect);
        const isLast = i === STEPS.length - 1;

        const content = (
          <>
            <span
              aria-hidden
              className={`z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${
                isDone || isActive ? 'bg-ink text-white' : 'bg-fill text-ink-muted'
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
                isActive
                  ? 'font-semibold text-ink'
                  : isDone
                    ? 'text-ink'
                    : 'text-ink-muted'
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
          <li key={s.step} className="relative">
            {/* 다음 단계로 이어지는 세로 연결선 — 원 중앙(12px)에 맞춘다 */}
            {!isLast && (
              <span
                aria-hidden
                className={`absolute top-6 left-3 h-full w-px -translate-x-1/2 ${
                  isDone ? 'bg-ink/30' : 'bg-line'
                }`}
              />
            )}
            {canNavigate ? (
              <button
                type="button"
                onClick={() => onStepSelect?.(s.step)}
                className="flex w-full items-center gap-2.5 rounded-lg py-2 pr-3 transition-[background-color,scale] duration-150 hover:bg-fill active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {content}
                <span className="sr-only">— 이 단계로 돌아가기</span>
              </button>
            ) : (
              <span
                aria-current={isActive ? 'step' : undefined}
                className="flex items-center gap-2.5 py-2 pr-3"
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
