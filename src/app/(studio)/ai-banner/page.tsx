'use client';

// Design Ref: docs/02-design/features/image-generation.design.md §5 — 3단계
// 스테퍼(이미지 생성 → 카피 문구 → 최종 선택), 좌:폼 / 우:실시간 미리보기.
// 2026-08-06: 사용자 레퍼런스 스크린샷 + 사용성 검토를 거쳐 확정한 구조.
// 2026-08-07: Astryx 제거, 순수 Tailwind로 재구현.

import { useState } from 'react';
import { AdStudioShell } from '@/components/shell/AdStudioShell';
import { StepIndicator } from '@/components/shell/StepIndicator';
import { Step1ImagePanel } from '@/components/ai-banner/Step1ImagePanel';
import { Step2CopyPanel } from '@/components/ai-banner/Step2CopyPanel';
import { Step3ReviewPanel } from '@/components/ai-banner/Step3ReviewPanel';
import { PreviewPanel } from '@/components/ai-banner/PreviewPanel';
import type { GeneratedImage, ImageStyleKey } from '@/types/image-generation';
import type { CopyRecommendation } from '@/types/copy-generation';

export interface AiBannerFlowState {
  step: 1 | 2 | 3;
  primaryObject: string;
  accentType: 'logo' | 'badge' | 'none';
  images: GeneratedImage[];
  partialErrors: Array<{ style: ImageStyleKey; message: string }>;
  isGeneratingImages: boolean;
  regeneratingStyle: ImageStyleKey | null;
  benefit: string;
  copyRecommendations: CopyRecommendation[];
  copyCategory: string;
  isGeneratingCopy: boolean;
  selectedCopyIndex: number | null;
}

const INITIAL_STATE: AiBannerFlowState = {
  step: 1,
  primaryObject: '',
  accentType: 'none',
  images: [],
  partialErrors: [],
  isGeneratingImages: false,
  regeneratingStyle: null,
  benefit: '',
  copyRecommendations: [],
  copyCategory: '',
  isGeneratingCopy: false,
  selectedCopyIndex: null,
};

export default function AiBannerStudioPage() {
  const [state, setState] = useState<AiBannerFlowState>(INITIAL_STATE);
  const patch = (next: Partial<AiBannerFlowState>) => setState((s) => ({ ...s, ...next }));

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
            <StepIndicator
              currentStep={state.step}
              onStepSelect={(step) => patch({ step })}
            />
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
            onClick={() => setState(INITIAL_STATE)}
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
