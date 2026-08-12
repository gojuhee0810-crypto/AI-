'use client';

// Design Ref: Figma 1211:2999 — 카피 문구 화면.
// 캠페인 혜택 입력(+툴팁) → AI 추천 → 패턴별 카드에서 하나 선택 → 인라인 수정.
//
// 타겟 입력란은 없다: 앞 단계(광고그룹)에서 이미 정해져 넘어오는 값이고, 현 시점
// 전 타겟을 2030으로 가정한다(2026-08-06 확정). 서버가 기본값을 채운다.
// 2026-08-11: 카드 안 위계를 뒤집었다. 회색 면은 근거가 아니라 실물 카피가 갖는다 —
// 채워진 면은 "여기가 중요하다"는 약속인데, 그걸 설명문에 주고 광고에 나갈 두 줄은
// 맨몸으로 뒀었다. 근거는 면 없이 카피 아래에 둔다(위로 올리면 길이가 카드마다
// 달라 카피 시작 높이가 어긋나고 셋을 나란히 비교할 수 없다).
// 패턴명은 파랑이 아니라 검정 볼드다 — 파랑은 링크 색이라 못 누르는 글자에
// 누르라는 신호를 붙이게 된다.

import { useId, useState } from 'react';
import {
  MAINTITLE_LIMIT,
  SUBTITLE_LIMIT,
  resolveButtonTone,
  resolveObjectTag,
  type AiBannerFlowState,
} from '@/types/banner-flow';
import { TEXT_BUTTON, aiGenerateButtonClass } from '@/components/ai-banner/buttons';
import { FORM_FIELD, FORM_LABEL, FORM_STACK, inputClass } from '@/components/ai-banner/fields';
import { ProgressStatus, Shimmer } from '@/components/ai-banner/GenerativeLoading';
import { InfoTooltip } from '@/components/ai-banner/InfoTooltip';
import { CharCounter } from '@/components/ai-banner/CharCounter';
import { Radio } from '@/components/ai-banner/Radio';
import type {
  GenerateCopyRequest,
  GenerateCopyResponse,
  GenerateCopyErrorResponse,
} from '@/types/copy-generation';

interface Props {
  state: AiBannerFlowState;
  patch: (next: Partial<AiBannerFlowState>) => void;
  /** 제출을 시도했는데 못 넘어간 상태 — 빈 필수 칸을 붉게 표시한다. */
  showErrors: boolean;
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

export function Step2CopyPanel({ state, patch, showErrors }: Props) {
  const benefitId = useId();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInput = state.benefit.trim().length > 0;
  const hasResult = state.copyRecommendations.length > 0;
  // 색 판단은 resolveButtonTone 하나가 한다(Step1·하단 CTA와 같은 근거).
  const generateTone = resolveButtonTone(state, 'generate-copy');

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
    <div className={FORM_STACK}>
      {/* 캠페인 혜택 */}
      <section className={FORM_FIELD}>
        <div className="flex items-center gap-2">
          <label htmlFor={benefitId} className={FORM_LABEL}>
            캠페인 혜택 <span className="text-error">*</span>
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
            className={inputClass(showErrors && !hasInput, 'h-[139px] resize-none py-3')}
          />
          <CharCounter value={state.benefit} limit={BENEFIT_LIMIT} />
        </div>

        <button
          type="button"
          disabled={!hasInput || state.isGeneratingCopy}
          onClick={handleGenerate}
          className={aiGenerateButtonClass(generateTone)}
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
        <p className="rounded-lg bg-error-surface px-4 py-3 text-[14px] leading-[22px] text-pretty text-error">
          카피 생성에 실패했습니다 — {error}
        </p>
      )}

      {/* AI 추천 카피 */}
      <section className={FORM_FIELD}>
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
          <div className="divider-rows flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
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
                  className="flex cursor-pointer flex-col gap-4 py-5 transition-colors duration-150 hover:bg-sidebar"
                >
                <input
                  type="radio"
                  name="selectedCopy"
                  checked={isSelected}
                  onChange={() => patch({ selectedCopyIndex: index })}
                  // 라벨 전체를 읽히게 두면 "상황기반+문제제기 요즘 이런 고민
                  // 있으셨죠 지금 확인해보세요 …"가 통째로 선택지 이름이 되어
                  // 귀로는 셋을 비교할 수 없다. 이름만 남긴다.
                  aria-label={rec.pattern}
                  className="sr-only"
                />

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Radio checked={isSelected} />
                    {/* 파랑(ico&text/blue)은 링크 색이라, 누를 수 없는 글자에
                        누르라는 신호를 붙이게 된다. 굵기와 색 농도로 가른다 —
                        새 색을 만들지 않고 이미 있는 토큰만 쓴다. */}
                    <span className="text-[16px] leading-[26px] font-medium text-ink">
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
                      className={TEXT_BUTTON}
                    >
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
                  // 면은 실물 카피가 가진다. 예전엔 근거가 면을 갖고 카피가 맨몸으로
                  // 있었는데, 채워진 면은 "여기가 중요하다"는 약속이라 시선이
                  // 설명으로 갔다. 광고에 나갈 두 줄이 주인공이다.
                  //
                  // 회색으로 가르고 테두리를 안 쓴다 — 카드 테두리 + 항목 구분선까지
                  // 같은 #cfd6dc가 세 겹이 되면 어느 선이 무엇을 나누는지 흐려진다.
                  //
                  // sunken(grey50)이 아니라 fill(grey100)인 건 호버 배경이 sidebar와
                  // 같은 grey50이라, 마우스를 올리면 면이 사라져 보이기 때문이다.
                  //
                  // 크기는 타입 스케일(§4)에서 고른다. 18/24는 실제 배너보다 커서
                  // 카드가 문서처럼 읽혔다.
                  <div className="ml-8 rounded-lg bg-fill px-4 py-3">
                    <p className="text-[14px] leading-[22px] font-medium text-ink-muted">
                      {rec.subtitle}
                    </p>
                    <p className="text-[20px] leading-[30px] font-medium tracking-[-0.2px] text-balance text-ink">
                      {rec.maintitle}
                    </p>
                  </div>
                )}

                  {rec.reason && !isEditing && (
                    // 근거는 면 없이 카피 아래. 위로 올리면 근거 길이가 카드마다
                    // 달라서 카피 시작 높이가 어긋나고, 셋을 나란히 비교할 수 없다.
                    <p className="ml-8 flex items-start gap-2 text-[14px] leading-[22px] text-pretty text-ink-muted">
                      <span aria-hidden className="shrink-0">
                        ✦
                      </span>
                      {rec.reason}
                    </p>
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
