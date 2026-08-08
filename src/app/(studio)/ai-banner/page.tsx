'use client';

// Design Ref: Figma 1211:3115(이미지) / 1211:2999(카피) — 좌 폼 523px + 우 미리보기 530px,
// 스텝퍼는 상단이 아니라 LNB 트리 안에 있다(2026-08-08 사용자 확정).
// 하단 액션 바는 우측 정렬이 아니라 가운데 정렬이다(Figma 좌표 674/793 기준).

import { useEffect, useState } from 'react';
import { AdStudioShell } from '@/components/shell/AdStudioShell';
import { Step1ImagePanel } from '@/components/ai-banner/Step1ImagePanel';
import { Step2CopyPanel } from '@/components/ai-banner/Step2CopyPanel';
import { Step3ReviewPanel } from '@/components/ai-banner/Step3ReviewPanel';
import { PreviewPanel } from '@/components/ai-banner/PreviewPanel';
import { clearFlowState, loadFlowState, saveFlowState } from '@/lib/flow-state-storage';
import { INITIAL_FLOW_STATE, type AiBannerFlowState } from '@/types/banner-flow';

/** 단계별 Primary 버튼 문구 — Figma 실측 */
const NEXT_LABEL: Record<1 | 2 | 3, string> = {
  1: '카피 문구 생성하러가기',
  2: '최종 화면 넘어가기',
  3: '소재 등록하기',
};

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

  return (
    // 완료한 단계로만 되돌아갈 수 있다. 앞 단계 건너뛰기는 막는다.
    <AdStudioShell currentStep={state.step} onStepSelect={(step) => patch({ step })}>
      <div className="flex min-h-full flex-col">
        <div className="px-12 pt-10">
          <h1 className="text-[32px] leading-[45px] font-medium tracking-[-0.4px] text-ink">
            AI 광고 소재 만들기
          </h1>

          {/* 앞 단계에서 정해져 넘어온 캠페인·광고그룹 — 지금은 표시 전용 */}
          <div className="mt-6 flex items-center gap-10">
            {[
              { badge: '캠페인', name: '일이삼사오육칠팔구십일이삼사오육칠팔구십' },
              { badge: '광고그룹', name: '일이삼사오육칠팔구십일이삼사오육칠팔구십' },
            ].map((item) => (
              <div key={item.badge} className="flex items-center gap-3">
                <span className="rounded-full bg-accent-soft px-[7px] py-[3px] text-[14px] leading-[22px] font-medium text-accent">
                  {item.badge}
                </span>
                <span className="text-[16px] leading-[26px] text-ink">{item.name}</span>
              </div>
            ))}
          </div>
          {/* 소재 이름은 구분선 위(미리보기 영역 밖)에 온다 — Figma 1211:3115 기준.
              카피·최종 단계에는 없고 1단계에서만 노출된다. */}
          {state.step === 1 && (
            <div className="mt-10 max-w-[523px]">
              <label
                htmlFor="materialName"
                className="text-[18px] leading-7 font-medium text-ink"
              >
                소재 이름 <span className="text-required">*</span>
              </label>
              <input
                id="materialName"
                type="text"
                maxLength={25}
                placeholder="소재 이름을 입력해주세요"
                value={state.materialName}
                onChange={(e) => patch({ materialName: e.target.value })}
                className="mt-3 h-12 w-full rounded-lg border border-line bg-surface px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none placeholder:text-ink-faint focus:border-ink"
              />
              <p className="mt-1.5 px-4 text-right text-[12px] leading-[19px] tabular-nums text-ink">
                {state.materialName.length}/25
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-line" />

        {/* 본문: 좌 폼 / 우 미리보기 — 미리보기 우측 배치는 확정 요구사항.
            미리보기는 스크롤을 따라오도록 헤더 아래에 붙인다. */}
        <div className="flex flex-1 items-stretch">
          <div className="min-w-0 flex-1 px-12 py-10">
            <div className="max-w-[523px]">
              {state.step === 1 && <Step1ImagePanel state={state} patch={patch} />}
              {state.step === 2 && <Step2CopyPanel state={state} patch={patch} />}
              {state.step === 3 && <Step3ReviewPanel state={state} patch={patch} />}
            </div>
          </div>
          <aside className="w-[530px] shrink-0 border-l border-line bg-sidebar px-12 py-10">
            <div className="sticky top-[124px]">
              <PreviewPanel state={state} />
            </div>
          </aside>
        </div>

        {/* 하단 액션 바 — 가운데 정렬 */}
        <div className="flex shrink-0 items-center justify-center gap-2 py-10">
          <button
            type="button"
            onClick={handleReset}
            className="h-12 w-[111px] rounded-[24px] bg-fill text-[16px] leading-[26px] font-medium text-ink transition-[background-color,scale] duration-150 hover:bg-[#e5e9ec] active:scale-[0.96]"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => {
              if (state.step < 3) patch({ step: (state.step + 1) as 2 | 3 });
              // step 3 "소재 등록하기"는 광고센터 연동(미착수) 전까지 동작 없음
            }}
            className="h-12 min-w-[222px] rounded-[24px] bg-brand px-6 text-[16px] leading-[26px] font-medium text-ink transition-[background-color,scale] duration-150 enabled:hover:bg-[#f2df00] enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-muted"
          >
            {NEXT_LABEL[state.step]}
          </button>
        </div>
      </div>
    </AdStudioShell>
  );
}
