'use client';

// Design Ref: Figma 1211:3115(이미지) / 1211:2999(카피) — 좌 폼 523px + 우 미리보기 530px,
// 스텝퍼는 상단이 아니라 LNB 트리 안에 있다(2026-08-08 사용자 확정).
// 하단 액션 바는 우측 정렬이 아니라 가운데 정렬이다(Figma 좌표 674/793 기준).

import { useEffect, useRef, useState } from 'react';
import { AdStudioShell } from '@/components/shell/AdStudioShell';
import { Step1ImagePanel } from '@/components/ai-banner/Step1ImagePanel';
import { Step2CopyPanel } from '@/components/ai-banner/Step2CopyPanel';
import { Step3ReviewPanel } from '@/components/ai-banner/Step3ReviewPanel';
import { PreviewPanel } from '@/components/ai-banner/PreviewPanel';
import { Toast } from '@/components/ai-banner/Toast';
import { clearFlowState, loadFlowState, saveFlowState } from '@/lib/flow-state-storage';
import {
  INITIAL_FLOW_STATE,
  MATERIAL_NAME_LIMIT,
  isStepComplete,
  type AiBannerFlowState,
} from '@/types/banner-flow';

/** 단계별 Primary 버튼 문구 — Figma 실측 */
const NEXT_LABEL: Record<1 | 2 | 3, string> = {
  1: '카피 문구 생성하러가기',
  2: '최종 화면 넘어가기',
  3: '등록하고 심사 요청하기',
};

export default function AiBannerStudioPage() {
  const [state, setState] = useState<AiBannerFlowState>(INITIAL_FLOW_STATE);
  // 서버 렌더와 클라이언트 첫 렌더가 달라지면 하이드레이션이 깨지므로, 저장된 상태는
  // 마운트 이후에 불러온다. 불러오기 전에는 저장하지 않는다 — 순서가 뒤바뀌면
  // 복원되기 직전에 빈 상태로 덮어써서 오히려 작업을 날린다.
  const [isHydrated, setIsHydrated] = useState(false);
  // 소재 이름을 건너뛰고 다음 필드를 건드렸을 때만 켠다. 처음부터 빨갛게 띄우지 않는다.
  const [showNameError, setShowNameError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // 제출을 시도한 뒤에만 빈 필수 칸을 붉게 만든다. 처음부터 빨간 화면을 보여주면
  // 아직 하지도 않은 일을 잘못했다고 말하는 셈이다.
  const [showErrors, setShowErrors] = useState(false);
  const materialNameRef = useRef<HTMLInputElement>(null);

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
    setShowNameError(false);
    setShowErrors(false);
    clearFlowState();
  }

  /** 소재 이름을 건너뛰고 이미지 유형을 고르려 할 때 — 에러를 띄우고 그쪽으로 데려간다. */
  function handleRequireMaterialName() {
    setShowNameError(true);
    materialNameRef.current?.focus();
  }

  const canGoNext = isStepComplete(state, state.step);

  /**
   * 다음 단계 버튼. 아직 못 넘어가는 상태여도 누를 수 있게 둔다.
   *
   * 비활성 버튼은 "왜 안 되는지"를 말해주지 않는다. 눌러서 무엇이 비었는지 알려주는
   * 편이 낫다 — 비어 있는 칸은 화면 밖에 있을 수 있으므로 토스트로도 함께 알린다.
   */
  function handleNext() {
    if (!canGoNext) {
      setShowErrors(true);
      setToast('필수 항목을 입력해주세요');
      if (state.step === 1 && !state.materialName.trim()) handleRequireMaterialName();
      return;
    }
    setShowErrors(false); // 단계를 넘어가면 앞 단계의 빨간 표시를 들고 가지 않는다
    if (state.step < 3) patch({ step: (state.step + 1) as 2 | 3 });
    // step 3 "등록하고 심사 요청하기"는 광고센터 연동(미착수) 전까지 동작 없음
  }

  return (
    // 완료한 단계로만 되돌아갈 수 있다. 앞 단계 건너뛰기는 막는다.
    <AdStudioShell currentStep={state.step} onStepSelect={(step) => patch({ step })}>
      {/* 본문 폭을 1440 설계 기준(LNB 250을 뺀 1190)에서 멈춘다.
          폼 칸이 고정이라 상한이 없으면 남는 폭을 미리보기가 전부 먹는다 —
          1728 창에서 미리보기가 796px까지 부풀어 설계(523)와 딴판이 됐다.
          넓은 화면에서는 오른쪽을 비우는 편이 낫다. */}
      <div className="flex min-h-full w-full max-w-[1190px] flex-col">
        <div className="px-12 pt-8">
          <h1 className="text-[32px] leading-[45px] font-medium tracking-[-0.4px] text-ink">
            AI 광고 소재 만들기
          </h1>

          {/* 앞 단계에서 정해져 넘어온 캠페인·광고그룹 — 지금은 표시 전용 */}
          <div className="mt-4 flex items-center gap-10">
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
              카피·최종 단계에는 없고 1단계에서만 노출된다.
              폭은 아래 폼 칸과 같은 523px(광고센터 기존 소재 폼 실측). */}
          {state.step === 1 && (
            <div className="mt-6 w-[523px] max-w-full">
              <label
                htmlFor="materialName"
                className="text-[18px] leading-7 font-medium text-ink"
              >
                소재 이름 <span className="text-required">*</span>
              </label>
              <input
                ref={materialNameRef}
                id="materialName"
                type="text"
                maxLength={MATERIAL_NAME_LIMIT}
                placeholder="소재 이름을 입력해주세요"
                value={state.materialName}
                aria-invalid={showNameError || undefined}
                aria-describedby={showNameError ? 'materialNameError' : undefined}
                onChange={(e) => {
                  patch({ materialName: e.target.value });
                  if (e.target.value.trim()) setShowNameError(false);
                }}
                // 에러일 때는 테두리만이 아니라 배경과 placeholder까지 붉게 물린다.
                // 테두리 1px만 바꾸면 화면이 길 때 훑어봐도 어느 칸이 비었는지 안 보인다.
                className={`mt-3 h-12 w-full rounded-lg border px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none ${
                  showNameError
                    ? 'border-required bg-[#fff4f4] placeholder:text-required'
                    : 'border-line bg-surface placeholder:text-ink-faint focus:border-ink'
                }`}
              />
              <div className="mt-1.5 flex items-start justify-between gap-4 px-4">
                <p
                  id="materialNameError"
                  role="alert"
                  className="text-[12px] leading-[19px] text-required"
                >
                  {showNameError ? '필수 입력 항목이에요.' : ''}
                </p>
                <p className="text-[12px] leading-[19px] tabular-nums text-ink">
                  {state.materialName.length}/{MATERIAL_NAME_LIMIT}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 mr-12 border-t border-line" />

        {/* 본문: 좌 폼 / 우 미리보기 — 미리보기 우측 배치는 확정 요구사항.
            미리보기는 스크롤을 따라오도록 헤더 아래에 붙인다. */}
        {/* 좌우 5:5. 이전엔 폼을 523px로 묶어둬서 1440 화면에서 좌측이 남고
            그만큼 세로로 길어졌다 — 폭 제한을 풀어 스크롤을 줄인다. */}
        {/* 1440 기준 실측(광고센터 기존 소재 폼): LNB 250 · 폼 칸 619 · 미리보기 523 ·
            오른쪽 여백 48.
            폼 칸은 고정한다 — 입력 523 + 좌우 패딩 48×2. 비율(flex)로 두면 스크롤바
            유무에 따라 523이 어긋난다. 미리보기가 남는 폭을 받아 1440에서 523이 된다.
            오른쪽 48을 비우는 건 미리보기의 회색 배경이 화면 끝까지 닿으면
            페이지가 아니라 창에 붙은 패널처럼 보이기 때문이다. */}
        <div className="mr-12 flex flex-1 items-stretch">
          <div className="w-[619px] shrink-0 px-12 py-8">
            {state.step === 1 && (
              <Step1ImagePanel
                state={state}
                patch={patch}
                onRequireMaterialName={handleRequireMaterialName}
                showErrors={showErrors}
              />
            )}
            {state.step === 2 && (
              <Step2CopyPanel state={state} patch={patch} showErrors={showErrors} />
            )}
            {state.step === 3 && <Step3ReviewPanel state={state} patch={patch} />}
          </div>
          <aside className="min-w-0 flex-1 border-l border-line bg-sidebar px-12 py-8">
            <div className="sticky top-[108px]">
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
            onClick={handleNext}
            className="h-12 min-w-[222px] rounded-[24px] bg-brand px-6 text-[16px] leading-[26px] font-medium text-ink transition-[background-color,scale] duration-150 hover:bg-[#f2df00] active:scale-[0.96]"
          >
            {NEXT_LABEL[state.step]}
          </button>
        </div>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </AdStudioShell>
  );
}
