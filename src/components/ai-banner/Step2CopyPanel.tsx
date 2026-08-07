'use client';

// Design Ref: docs/patterns/copy-patterns-v2.md — Step2. /api/generate-copy 호출.
// 3개 패턴 카드를 라디오처럼 감싸 1개 선택(레퍼런스 스크린샷 기준) + 인라인 수정.
// 타겟 입력란은 없다: 앞 단계(광고그룹)에서 이미 정해져 넘어오는 값이고, 현 시점
// 전 타겟을 2030으로 가정한다(2026-08-06 확정). 서버가 기본값을 채운다.
// 2026-08-07: Astryx 제거 + 순수 Tailwind. 생성 대기가 길어서 스켈레톤/진행 문구를
// 붙였다(docs/guides/ui-polish-checklist.md 참고).

import { useState } from 'react';
import type { AiBannerFlowState } from '@/types/banner-flow';
import { ProgressStatus, Shimmer } from '@/components/ai-banner/GenerativeLoading';
import type {
  GenerateCopyRequest,
  GenerateCopyResponse,
  GenerateCopyErrorResponse,
} from '@/types/copy-generation';

interface Props {
  state: AiBannerFlowState;
  patch: (next: Partial<AiBannerFlowState>) => void;
}

// 카피 생성은 Claude 호출 1~2회라 20~40초가 걸린다. 그동안 무엇이 진행 중인지
// 알려주지 않으면 멈춘 것처럼 보인다.
const PROGRESS_MESSAGES = [
  '입력한 혜택을 분석하고 있어요',
  '업종에 맞는 카피 패턴을 고르는 중이에요',
  '패턴별 문구를 만드는 중이에요',
  '글자 수와 표현을 검수하는 중이에요',
  '거의 다 됐어요',
];

export function Step2CopyPanel({ state, patch }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInput = state.benefit.trim().length > 0;
  const hasResult = state.copyRecommendations.length > 0;
  // Step1과 같은 규칙: 지금 눌러야 진행되는 버튼만 옐로우, 그 외엔 회색(보조).
  const isPrimaryAction = hasInput && !state.isGeneratingCopy && !hasResult;

  async function handleGenerate() {
    if (!hasInput) return;
    patch({ isGeneratingCopy: true, selectedCopyIndex: null });
    setError(null);
    try {
      const body: GenerateCopyRequest = {
        objectTag: state.primaryObject,
        benefit: state.benefit,
      };
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: GenerateCopyResponse | GenerateCopyErrorResponse = await res.json();
      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error.message : '카피 생성에 실패했습니다.');
      }
      patch({
        copyRecommendations: data.recommendations,
        copyCategory: data.category,
        isGeneratingCopy: false,
        selectedCopyIndex: 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '카피 생성에 실패했습니다.');
      patch({ isGeneratingCopy: false });
    }
  }

  function updateRecommendation(index: number, field: 'subtitle' | 'maintitle', value: string) {
    const next = state.copyRecommendations.map((rec, i) =>
      i === index ? { ...rec, [field]: value } : rec,
    );
    patch({ copyRecommendations: next });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <label htmlFor="benefit" className="text-sm font-bold text-ink">
          캠페인 혜택 <span className="text-required">*</span>
        </label>
        <p className="text-xs text-pretty text-ink-muted">
          혜택, 조건, 기한을 적어주세요 — 추천 문구가 더 정확해져요
        </p>
        <textarea
          id="benefit"
          rows={3}
          maxLength={25}
          placeholder={'혜택·조건·기한을 순서대로 적어주세요\n예) 환급 이번달 무료'}
          value={state.benefit}
          onChange={(e) => patch({ benefit: e.target.value })}
          className="w-full resize-none rounded-lg border border-line bg-surface px-4 py-3 text-sm transition-colors duration-150 outline-none placeholder:text-ink-muted focus:border-ink"
        />
        <div className="text-right text-xs tabular-nums text-ink-muted">
          {state.benefit.length}/25
        </div>

        <button
          type="button"
          disabled={!hasInput || state.isGeneratingCopy}
          onClick={handleGenerate}
          className={`mt-1 w-full rounded-lg py-3.5 text-sm font-bold transition-[background-color,scale] duration-150 enabled:active:scale-[0.96] disabled:cursor-not-allowed ${
            isPrimaryAction
              ? 'bg-brand text-ink enabled:hover:bg-[#f5dc00]'
              : 'bg-[#f2f3f5] text-ink enabled:hover:bg-[#e9ecef] disabled:text-ink-muted'
          }`}
        >
          {state.isGeneratingCopy
            ? '추천받는 중…'
            : hasResult
              ? 'AI 카피 다시 추천 받기'
              : '✦ AI 카피 추천 받기'}
        </button>
      </section>

      {error && (
        <p className="rounded-lg bg-[#fff4f4] px-4 py-3 text-sm text-pretty text-required">
          카피 생성에 실패했습니다 — {error}
        </p>
      )}

      {/* 생성 중: 결과 카드와 같은 모양으로 자리를 잡아둔다(레이아웃 점프 방지) */}
      {state.isGeneratingCopy && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-ink">AI 추천 카피</h3>
          <ProgressStatus messages={PROGRESS_MESSAGES} />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]"
            >
              <Shimmer className="h-4 w-28 rounded" />
              <div className="flex flex-col gap-2">
                <Shimmer className="h-3 w-40 rounded" />
                <Shimmer className="h-6 w-52 rounded" />
              </div>
              <Shimmer className="h-8 w-full rounded-xl" />
            </div>
          ))}
        </section>
      )}

      {!state.isGeneratingCopy && hasResult && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-ink">AI 추천 카피</h3>
          {state.copyRecommendations.map((rec, index) => {
            const isSelected = state.selectedCopyIndex === index;
            const isEditing = editingIndex === index;
            return (
              <div
                key={rec.pattern}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => patch({ selectedCopyIndex: index })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    patch({ selectedCopyIndex: index });
                  }
                }}
                className={`cursor-pointer rounded-2xl bg-surface p-4 transition-shadow duration-150 ${
                  isSelected
                    ? 'shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_2px_var(--color-ink)]'
                    : 'shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.12)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-ink' : 'border-line'
                      }`}
                      aria-hidden
                    >
                      {isSelected && <span className="h-2 w-2 rounded-full bg-ink" />}
                    </span>
                    <span className="text-sm font-bold text-ink">{rec.pattern}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIndex(isEditing ? null : index);
                    }}
                    className="min-h-10 min-w-10 rounded-lg px-2 text-xs text-ink-muted transition-[background-color,color,scale] duration-150 hover:bg-[#f7f8fa] hover:text-ink active:scale-[0.96]"
                  >
                    {isEditing ? '완료' : '수정'}
                  </button>
                </div>

                {isEditing ? (
                  <div className="mt-3 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-ink-muted">서브타이틀</label>
                      <input
                        type="text"
                        value={rec.subtitle}
                        onChange={(e) => updateRecommendation(index, 'subtitle', e.target.value)}
                        className="w-full rounded-lg border border-line px-3 py-2 text-sm transition-colors duration-150 outline-none focus:border-ink"
                      />
                      <span
                        className={`text-right text-xs tabular-nums ${
                          rec.subtitle.length > 15 ? 'text-required' : 'text-ink-muted'
                        }`}
                      >
                        {rec.subtitle.length}/15
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-ink-muted">메인타이틀</label>
                      <input
                        type="text"
                        value={rec.maintitle}
                        onChange={(e) => updateRecommendation(index, 'maintitle', e.target.value)}
                        className="w-full rounded-lg border border-line px-3 py-2 text-sm transition-colors duration-150 outline-none focus:border-ink"
                      />
                      <span
                        className={`text-right text-xs tabular-nums ${
                          rec.maintitle.length > 14 ? 'text-required' : 'text-ink-muted'
                        }`}
                      >
                        {rec.maintitle.length}/14
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs text-ink-muted">{rec.subtitle}</p>
                    <p className="text-lg font-bold text-balance text-ink">{rec.maintitle}</p>
                  </div>
                )}

                {rec.reason && (
                  <p className="mt-3 rounded-xl bg-[#f7f8fa] px-3 py-2 text-xs text-pretty text-ink-muted">
                    {rec.reason}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
