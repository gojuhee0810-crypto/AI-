'use client';

// Design Ref: Figma 1211:2999 — 카피 문구 화면.
// 캠페인 혜택 입력(+툴팁) → AI 추천 → 패턴별 카드에서 하나 선택 → 인라인 수정.
//
// 타겟 입력란은 없다: 앞 단계(광고그룹)에서 이미 정해져 넘어오는 값이고, 현 시점
// 전 타겟을 2030으로 가정한다(2026-08-06 확정). 서버가 기본값을 채운다.
// 2026-08-08: Figma 실측값으로 재구성. 패턴명은 액센트 블루, 카드는 테두리 방식,
// 근거는 회색 박스에 ✦ 아이콘과 함께 둔다.

import { useId, useState } from 'react';
import { resolveObjectTag, type AiBannerFlowState } from '@/types/banner-flow';
import { CHIP_OUTLINE, aiGenerateButtonClass } from '@/components/ai-banner/buttons';
import { ProgressStatus, Shimmer } from '@/components/ai-banner/GenerativeLoading';
import { InfoTooltip } from '@/components/ai-banner/InfoTooltip';
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

const BENEFIT_LIMIT = 25;
const SUBTITLE_LIMIT = 15;
const MAINTITLE_LIMIT = 14;

/** 라디오 24px. 선택하면 브랜드 옐로우로 채운다(디자인 시스템 §6-3). */
function Radio({ checked }: { checked: boolean }) {
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

/** 글자수 초과를 빨간색으로 알린다. LLM은 글자를 못 세므로 코드가 표시한다. */
function CharCounter({ value, limit }: { value: string; limit: number }) {
  return (
    <span
      className={`text-[12px] leading-[19px] tabular-nums ${
        value.length > limit ? 'text-required' : 'text-ink-muted'
      }`}
    >
      {value.length}/{limit}
    </span>
  );
}

export function Step2CopyPanel({ state, patch }: Props) {
  const benefitId = useId();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInput = state.benefit.trim().length > 0;
  const hasResult = state.copyRecommendations.length > 0;
  // Step1과 같은 규칙: 지금 눌러야 진행되는 버튼만 옐로우, 그 외엔 아웃라인(보조).
  const isPrimaryAction = hasInput && !state.isGeneratingCopy && !hasResult;

  async function handleGenerate() {
    if (!hasInput) return;
    patch({ isGeneratingCopy: true, selectedCopyIndex: null });
    setEditingIndex(null);
    setError(null);
    try {
      const body: GenerateCopyRequest = {
        // 제품 이미지 경로에는 오브젝트 명칭이 없어 소재 이름으로 대신한다.
        objectTag: resolveObjectTag(state),
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
      {/* 캠페인 혜택 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor={benefitId} className="text-[18px] leading-7 font-medium text-ink">
            캠페인 혜택 <span className="text-required">*</span>
          </label>
          <InfoTooltip text="혜택, 조건, 기한을 적어주세요 추천 문구가 더 정확해져요" />
        </div>

        <div>
          <textarea
            id={benefitId}
            rows={4}
            maxLength={BENEFIT_LIMIT}
            placeholder={'혜택·조건·기한을 순서대로 적어주세요\n예) 환급 이번달 무료'}
            value={state.benefit}
            onChange={(e) => patch({ benefit: e.target.value })}
            className="h-[139px] w-full resize-none rounded-lg border border-line bg-surface px-4 py-3 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none placeholder:text-ink-faint focus:border-ink"
          />
          <p className="mt-1.5 px-4 text-right">
            <CharCounter value={state.benefit} limit={BENEFIT_LIMIT} />
          </p>
        </div>

        <button
          type="button"
          disabled={!hasInput || state.isGeneratingCopy}
          onClick={handleGenerate}
          className={aiGenerateButtonClass(isPrimaryAction)}
        >
          <span aria-hidden>{hasResult ? '↻' : '✦'}</span>
          {state.isGeneratingCopy
            ? '추천받는 중…'
            : hasResult
              ? 'AI 카피 다시 추천 받기'
              : 'AI 카피 추천 받기'}
        </button>
      </section>

      {error && (
        <p className="rounded-lg bg-[#fff4f4] px-4 py-3 text-[14px] leading-[22px] text-pretty text-required">
          카피 생성에 실패했습니다 — {error}
        </p>
      )}

      {/* AI 추천 카피 */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[18px] leading-7 font-medium text-ink">AI 추천 카피</h3>

        {state.isGeneratingCopy ? (
          <>
            <ProgressStatus messages={PROGRESS_MESSAGES} />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-4 rounded-lg border border-line p-5">
                <Shimmer className="h-6 w-28 rounded" />
                <div className="flex flex-col gap-2">
                  <Shimmer className="h-6 w-48 rounded" />
                  <Shimmer className="h-8 w-64 rounded" />
                </div>
                <Shimmer className="h-[77px] w-full rounded-xl" />
              </div>
            ))}
          </>
        ) : !hasResult ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-sidebar px-6 text-center">
            <span aria-hidden className="text-[28px] leading-none opacity-40">
              ✦
            </span>
            <p className="text-[16px] leading-[26px] text-ink">아직 추천받은 카피가 없어요</p>
            <p className="text-[14px] leading-[22px] text-ink-muted">
              캠페인 혜택을 입력하고 추천 버튼을 눌러주세요
            </p>
          </div>
        ) : (
          // 카드를 따로 세우지 않고 한 박스에 얇은 선으로만 나눈다. 셋은 같은 질문에
          // 대한 답이라 하나의 목록으로 읽혀야 비교가 쉽다 — 카드로 떼어놓으면
          // 각각이 독립된 것처럼 보여 눈이 셋을 오가지 않는다.
          <div className="divider-fade flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
            {state.copyRecommendations.map((rec, index) => {
              const isSelected = state.selectedCopyIndex === index;
              // 선택과 묶는다. 수정 중에 다른 카피를 고르면 닫아야 하는데,
              // 그 카드에는 이제 '완료' 버튼이 없어 열린 채로 갇힌다.
              const isEditing = isSelected && editingIndex === index;
              return (
                <label
                  key={rec.pattern}
                  // 선택 표시는 라디오 하나로만. 테두리 색까지 바뀌면 인풋 포커스와
                  // 뒤섞여 오히려 흐려진다. 호버는 연한 회색 배경만.
                  className="flex cursor-pointer flex-col gap-4 p-5 transition-colors duration-150 hover:bg-sidebar"
                >
                <input
                  type="radio"
                  name="selectedCopy"
                  checked={isSelected}
                  onChange={() => patch({ selectedCopyIndex: index })}
                  className="sr-only"
                />

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Radio checked={isSelected} />
                    <span className="text-[16px] leading-[26px] font-medium text-accent">
                      {rec.pattern}
                    </span>
                  </span>
                  {/* 고른 카피만 고칠 수 있다. 셋 다 수정 버튼을 달아두면 안 고를
                      카피까지 손댈 수 있는 것처럼 보여, 비교해야 할 자리에서
                      편집을 먼저 하게 된다. */}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault(); // label 안이라 선택까지 번지는 걸 막는다
                        setEditingIndex(isEditing ? null : index);
                      }}
                      className={CHIP_OUTLINE}
                    >
                      <span aria-hidden>✎</span>
                      {isEditing ? '완료' : '수정'}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div
                    className="flex flex-col gap-3"
                    onClick={(e) => e.preventDefault()}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[14px] leading-[22px] text-ink-muted">서브타이틀</span>
                      <input
                        type="text"
                        value={rec.subtitle}
                        onChange={(e) => updateRecommendation(index, 'subtitle', e.target.value)}
                        className="h-12 w-full rounded-lg border border-line px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none focus:border-ink"
                      />
                      <span className="px-4 text-right">
                        <CharCounter value={rec.subtitle} limit={SUBTITLE_LIMIT} />
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[14px] leading-[22px] text-ink-muted">메인타이틀</span>
                      <input
                        type="text"
                        value={rec.maintitle}
                        onChange={(e) => updateRecommendation(index, 'maintitle', e.target.value)}
                        className="h-12 w-full rounded-lg border border-line px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none focus:border-ink"
                      />
                      <span className="px-4 text-right">
                        <CharCounter value={rec.maintitle} limit={MAINTITLE_LIMIT} />
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pl-8">
                    <p className="text-[18px] leading-[28px] font-medium text-ink">
                      {rec.subtitle}
                    </p>
                    <p className="text-[24px] leading-[36px] font-medium text-balance text-ink">
                      {rec.maintitle}
                    </p>
                  </div>
                )}

                  {rec.reason && (
                    // 호버 배경(sidebar)과 같은 색이면 마우스를 올렸을 때 근거 박스가
                    // 사라진 것처럼 보인다 — 한 단계 진한 fill을 쓴다.
                    <div className="flex items-start gap-3 rounded-xl bg-fill px-4 py-3">
                      <span aria-hidden className="text-[18px] leading-[27px] text-ink-muted">
                        ✦
                      </span>
                      <p className="text-[15px] leading-[24px] text-pretty text-[#656a6e]">
                        {rec.reason}
                      </p>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
