'use client';

// Design Ref: docs/02-design/features/image-generation.design.md §5 — Step1.
// /api/generate-image 호출(스타일1+2 동시 생성, 2026-08-06 확정된 플로우).
// 2026-08-07: Astryx 제거 후 순수 Tailwind. 브랜드 컬러 선택은 제거(사용자 확정),
// 생성 버튼은 "지금 누르면 되는 상태"일 때만 옐로우로 둔다.

import type { AiBannerFlowState } from '@/types/banner-flow';
import { ProgressStatus, Shimmer } from '@/components/ai-banner/GenerativeLoading';
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  GenerateImageErrorResponse,
  ImageStyleKey,
} from '@/types/image-generation';

interface Props {
  state: AiBannerFlowState;
  patch: (next: Partial<AiBannerFlowState>) => void;
}

const STYLE_LABEL: Record<ImageStyleKey, string> = {
  'style-1-3d-basic': '스타일 1 (3D)',
  'style-2-2d-flat': '스타일 2 (2D)',
};

const ACCENT_OPTIONS = [
  { value: 'logo', label: '로고', hint: 'PNG, 1MB 이하 · 업로드 기능은 준비 중' },
  { value: 'badge', label: '혜택 배지', hint: '이번 버전엔 아직 없어요 · 준비 중' },
  { value: 'none', label: '없음', hint: '' },
] as const;

const PROGRESS_MESSAGES = [
  '오브젝트를 분석하고 있어요',
  '스타일 1(3D)을 그리는 중이에요',
  '스타일 2(2D)를 그리는 중이에요',
  '배경을 정리하고 마무리하는 중이에요',
];

export function Step1ImagePanel({ state, patch }: Props) {
  const hasInput = state.primaryObject.trim().length > 0;
  const hasResult = state.images.length > 0;
  // 옐로우 = "지금 이걸 누르면 진행된다". 생성 중이거나 이미 결과가 있으면
  // 주요 액션이 "다음 단계"로 넘어가므로 회색(보조)으로 내린다.
  const isPrimaryAction = hasInput && !state.isGeneratingImages && !hasResult;

  async function callGenerate(body: GenerateImageRequest) {
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: GenerateImageResponse | GenerateImageErrorResponse = await res.json();
    if (!res.ok || 'error' in data) {
      throw new Error('error' in data ? data.error.message : '이미지 생성에 실패했습니다.');
    }
    return data;
  }

  async function handleGenerate() {
    if (!hasInput) return;
    patch({ isGeneratingImages: true, partialErrors: [] });
    try {
      const data = await callGenerate({ primaryObject: state.primaryObject });
      patch({
        images: data.images,
        partialErrors: data.partialErrors ?? [],
        isGeneratingImages: false,
      });
    } catch {
      patch({
        isGeneratingImages: false,
        partialErrors: [{ style: 'style-1-3d-basic', message: '이미지 생성에 실패했습니다.' }],
      });
    }
  }

  async function handleRegenerate(style: ImageStyleKey) {
    patch({ regeneratingStyle: style });
    try {
      const data = await callGenerate({
        primaryObject: state.primaryObject,
        regenerateStyle: style,
      });
      const newImage = data.images[0];
      if (newImage) {
        patch({
          images: [...state.images.filter((img) => img.style !== style), newImage],
          partialErrors: state.partialErrors.filter((e) => e.style !== style),
        });
      }
    } finally {
      patch({ regeneratingStyle: null });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <label htmlFor="primaryObject" className="text-sm font-bold text-ink">
          오브젝트 명칭 <span className="text-required">*</span>
        </label>
        <input
          id="primaryObject"
          type="text"
          maxLength={15}
          placeholder="생성하고 싶은 오브젝트를 입력해주세요"
          value={state.primaryObject}
          onChange={(e) => patch({ primaryObject: e.target.value })}
          className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm transition-colors duration-150 outline-none placeholder:text-ink-muted focus:border-ink"
        />
        <div className="text-right text-xs tabular-nums text-ink-muted">
          {state.primaryObject.length}/15
        </div>

        <button
          type="button"
          disabled={!hasInput || state.isGeneratingImages}
          onClick={handleGenerate}
          className={`mt-1 w-full rounded-lg py-3.5 text-sm font-bold transition-[background-color,scale] duration-150 enabled:active:scale-[0.96] disabled:cursor-not-allowed ${
            isPrimaryAction
              ? 'bg-brand text-ink enabled:hover:bg-[#f5dc00]'
              : 'bg-[#f2f3f5] text-ink enabled:hover:bg-[#e9ecef] disabled:text-ink-muted'
          }`}
        >
          {state.isGeneratingImages
            ? '생성 중…'
            : hasResult
              ? 'AI 이미지 다시 생성하기'
              : '✦ AI 이미지 생성하기'}
        </button>
        <button
          type="button"
          disabled
          title="파일 업로드는 아직 준비 중입니다"
          className="mx-auto px-3 py-2 text-xs text-ink-muted underline underline-offset-2 disabled:cursor-not-allowed"
        >
          또는 직접 업로드
        </button>
      </section>

      {/* 생성 중: 최종 결과와 같은 2열 배치로 자리를 미리 잡아둔다(레이아웃 점프 방지) */}
      {state.isGeneratingImages && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-ink">AI 이미지 생성</h3>
          <ProgressStatus messages={PROGRESS_MESSAGES} />
          <div className="grid grid-cols-2 gap-4">
            {(['style-1-3d-basic', 'style-2-2d-flat'] as const).map((style) => (
              <div
                key={style}
                className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]"
              >
                <span className="text-xs font-bold text-ink">{STYLE_LABEL[style]}</span>
                <Shimmer className="h-44 w-full rounded-xl" />
                <Shimmer className="h-10 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </section>
      )}

      {!state.isGeneratingImages && hasResult && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-ink">AI 이미지 생성</h3>
          <div className="grid grid-cols-2 gap-4">
            {state.images.map((image) => {
              const isRegenerating = state.regeneratingStyle === image.style;
              return (
                <div
                  key={image.style}
                  className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]"
                >
                  <span className="text-xs font-bold text-ink">{STYLE_LABEL[image.style]}</span>
                  {isRegenerating ? (
                    <Shimmer className="h-44 w-full rounded-xl" />
                  ) : (
                    // 컬럼 폭이 넓어 aspect-square로 두면 카드가 340px까지 커진다.
                    // 이미지 영역 높이를 고정해 카드가 세로로 늘어나지 않게 한다.
                    <div className="flex h-44 w-full items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.imageUrl}
                        alt={STYLE_LABEL[image.style]}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isRegenerating}
                    onClick={() => handleRegenerate(image.style)}
                    className="min-h-10 rounded-lg border border-line px-3 text-xs text-ink transition-[background-color,scale] duration-150 enabled:hover:bg-[#f7f8fa] enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:text-ink-muted"
                  >
                    {isRegenerating ? '생성 중…' : '다시 생성하기'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {state.partialErrors.map((err) => (
        <p key={err.style} className="rounded-lg bg-[#fff4f4] px-4 py-3 text-sm text-pretty text-required">
          {STYLE_LABEL[err.style]} 생성 실패 — {err.message}
        </p>
      ))}

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">배너 강조 요소 추가</h3>
          <p className="mt-1 text-xs text-pretty text-ink-muted">
            · 배너 크기 제약으로 로고와 혜택 배지 중 하나만 사용할 수 있어요
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {ACCENT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex min-h-10 cursor-pointer items-start gap-3 rounded-lg py-2 transition-colors duration-150 hover:bg-[#f7f8fa]"
            >
              <input
                type="radio"
                name="accentType"
                value={opt.value}
                checked={state.accentType === opt.value}
                onChange={() => patch({ accentType: opt.value })}
                className="mt-0.5 h-4 w-4 accent-[#FEE500]"
              />
              <span>
                <span className="block text-sm text-ink">{opt.label}</span>
                {opt.hint && <span className="block text-xs text-ink-muted">{opt.hint}</span>}
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
