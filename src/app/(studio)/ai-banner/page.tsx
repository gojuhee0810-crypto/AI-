'use client';

// Design Ref: docs/02-design/features/banner-studio-ui.design.md §1 — 3단계
// 스테퍼(이미지 생성 → 카피 문구 → 최종 선택), 좌:폼 6 / 우:실시간 미리보기 4.
// 2026-08-06: 사용자 레퍼런스 스크린샷 + 사용성 검토를 거쳐 확정한 구조.
// 2026-08-07: Astryx 제거 후 순수 Tailwind. 새로고침 대비 상태 저장 추가.

import { useEffect, useState } from 'react';
import { AdStudioShell } from '@/components/shell/AdStudioShell';
import { StepIndicator } from '@/components/shell/StepIndicator';
import { Step1ImagePanel } from '@/components/ai-banner/Step1ImagePanel';
import { Step2CopyPanel } from '@/components/ai-banner/Step2CopyPanel';
import { Step3ReviewPanel } from '@/components/ai-banner/Step3ReviewPanel';
import { PreviewPanel } from '@/components/ai-banner/PreviewPanel';
import { clearFlowState, loadFlowState, saveFlowState } from '@/lib/flow-state-storage';
import { INITIAL_FLOW_STATE, type AiBannerFlowState } from '@/types/banner-flow';

export default function AiBannerStudioPage() {
  const [state, setState] = useState<AiBannerFlowState>(INITIAL_FLOW_STATE);
  // 서버 렌더와 클라이언트 첫 렌더가 달라지면 하이드레이션이 깨지므로, 저장된 상태는
  // 마운트 이후에 불러온다. 불러오기 전에는 저장하지 않는다 — 순서가 뒤바뀌면
  // 복원되기 직전에 빈 상태로 덮어써서 오히려 작업을 날린다.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const restored = loadFlowState();
    if (restored) setState(restored);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveFlowState(state);
  }, [state, isHydrated]);

  const patch = (next: Partial<AiBannerFlowState>) => setState((s) => ({ ...s, ...next }));

  function handleReset() {
    setState(INITIAL_FLOW_STATE);
    clearFlowState();
  }

  const canGoNext =
    state.step === 1
      ? state.images.length > 0
      : state.step === 2
        ? state.selectedCopyIndex !== null
        : true;
  const nextLabel = state.step < 3 ? '다음 단계 넘어가기' : '소재 등록하기';

  return (
    <AdStudioShell>
      <div className="flex h-full flex-col">
        {/* 페이지 헤더: 타이틀 + 스테퍼.
            스크롤 영역 밖에 두어 폼이 길어져도 현재 단계가 계속 보이게 한다. */}
        <div className="shrink-0 border-b border-line bg-surface px-8 pt-5 pb-3">
          <h1 className="text-2xl font-bold text-balance text-ink">AI 광고 배너 스튜디오</h1>
          <div className="mt-3">
            {/* 완료한 단계로만 되돌아갈 수 있다. 앞 단계 건너뛰기는 막는다. */}
            <StepIndicator currentStep={state.step} onStepSelect={(step) => patch({ step })} />
          </div>
        </div>

        {/* 본문: 좌 폼 6 / 우 미리보기 4 — 미리보기 우측 배치는 확정 요구사항 */}
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-[6] overflow-y-auto px-8 py-6">
            {state.step === 1 && <Step1ImagePanel state={state} patch={patch} />}
            {state.step === 2 && <Step2CopyPanel state={state} patch={patch} />}
            {state.step === 3 && <Step3ReviewPanel state={state} patch={patch} />}
          </div>
          <aside className="min-w-0 flex-[4] overflow-y-auto border-l border-line bg-surface px-6 py-6">
            <PreviewPanel state={state} />
          </aside>
        </div>

        {/* 하단 고정 버튼 그룹 */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-surface px-8 py-4">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-10 rounded-lg border border-line px-5 text-sm font-bold text-ink transition-[background-color,scale] duration-150 hover:bg-[#f7f8fa] active:scale-[0.96]"
          >
            취소
          </button>
          <div className="flex items-center gap-2">
            {state.step > 1 && (
              <button
                type="button"
                onClick={() => patch({ step: (state.step - 1) as 1 | 2 })}
                className="min-h-10 rounded-lg border border-line px-5 text-sm font-bold text-ink transition-[background-color,scale] duration-150 hover:bg-[#f7f8fa] active:scale-[0.96]"
              >
                이전
              </button>
            )}
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => {
                if (state.step < 3) patch({ step: (state.step + 1) as 2 | 3 });
                // step 3 "소재 등록하기"는 광고센터 연동(미착수) 전까지 동작 없음
              }}
              className="min-h-10 rounded-lg bg-brand px-5 text-sm font-bold text-ink transition-[background-color,scale] duration-150 enabled:hover:bg-[#f5dc00] enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-[#f2f3f5] disabled:text-ink-muted"
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </AdStudioShell>
  );
}
