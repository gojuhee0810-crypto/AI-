'use client';

// Design Ref: Figma 1211:3115 — 이미지 생성 화면.
// 위에서 아래로: 이미지 유형 → 오브젝트 명칭 → 생성 버튼 → AI 이미지 생성(결과 선택)
// → 배너 강조 요소 → 로고 업로드.
// (소재 이름은 구분선 위 헤더 영역에 있어 page.tsx가 그린다)
//
// 2026-08-08: Figma 실측값으로 전면 재구성. 이미지는 2종(3D/2D)이다.

import { useId, useState } from 'react';
import type { AiBannerFlowState, ImageSourceType } from '@/types/banner-flow';
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

const IMAGE_TYPES: Array<{ value: ImageSourceType; label: string }> = [
  { value: 'graphic', label: '그래픽 아이콘' },
  { value: 'product', label: '제품 이미지' },
];

const STYLE_LABEL: Record<ImageStyleKey, string> = {
  'style-1-3d-basic': '3D 아이콘',
  'style-2-2d-flat': '2D 아이콘',
};

const STYLE_ORDER: ImageStyleKey[] = ['style-1-3d-basic', 'style-2-2d-flat'];

const ACCENT_OPTIONS = [
  { value: 'logo', label: '로고', hasInfo: true },
  { value: 'badge', label: '혜택 배지', hasInfo: true },
  { value: 'none', label: '없음', hasInfo: false },
] as const;

const PROGRESS_MESSAGES = [
  '오브젝트를 분석하고 있어요',
  '3D 아이콘을 그리는 중이에요',
  '2D 아이콘을 그리는 중이에요',
  '배경을 정리하고 마무리하는 중이에요',
];

/** ⓘ 아이콘에 마우스를 올리거나 포커스하면 뜨는 검정 말풍선. */
function InfoTooltip({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={text}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="flex size-[18px] items-center justify-center rounded-full border border-ink-muted text-[11px] leading-none text-ink-muted"
      >
        i
      </button>
      {isOpen && (
        <span
          role="tooltip"
          className="absolute top-1/2 left-[calc(100%+8px)] z-10 -translate-y-1/2 rounded-lg bg-ink px-2.5 py-2 text-[14px] leading-[22px] font-medium whitespace-nowrap text-white"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** Figma 라디오: 24px 원, 선택 시 검정 테두리 + 검정 점. */
function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
        checked ? 'border-ink' : 'border-line'
      }`}
    >
      {checked && <span className="size-2.5 rounded-full bg-ink" />}
    </span>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[18px] leading-7 font-medium text-ink">
      {children} <span className="text-required">*</span>
    </label>
  );
}

export function Step1ImagePanel({ state, patch }: Props) {
  const objectId = useId();
  const isGraphic = state.imageType === 'graphic';
  const hasInput = state.primaryObject.trim().length > 0;
  const hasResult = state.images.length > 0;
  // 지금 눌러야 진행되는 버튼만 브랜드 컬러. 결과가 나오면 주요 액션이
  // 하단 "카피 문구 생성하러가기"로 넘어가므로 회색으로 내린다.
  const isPrimaryAction = isGraphic && hasInput && !state.isGeneratingImages && !hasResult;

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
    if (!hasInput || !isGraphic) return;
    patch({ isGeneratingImages: true, partialErrors: [], selectedImageStyle: null });
    try {
      const data = await callGenerate({ primaryObject: state.primaryObject });
      patch({
        images: data.images,
        partialErrors: data.partialErrors ?? [],
        isGeneratingImages: false,
        // 첫 결과는 자동 선택해서 미리보기가 곧바로 채워지게 한다.
        selectedImageStyle: data.images[0]?.style ?? null,
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
    <div className="flex flex-col gap-10">
      {/* 이미지 유형 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FieldLabel>이미지 유형</FieldLabel>
          <InfoTooltip text="아이콘은 AI가 자동생성하고 제품 이미지는 업로드 해주세요" />
        </div>
        <div className="flex flex-col gap-2">
          {IMAGE_TYPES.map((opt) => (
            <label
              key={opt.value}
              className={`flex h-12 cursor-pointer items-center gap-2 rounded-lg border px-4 transition-colors duration-150 ${
                state.imageType === opt.value ? 'border-ink' : 'border-line hover:border-ink-muted'
              }`}
            >
              <input
                type="radio"
                name="imageType"
                value={opt.value}
                checked={state.imageType === opt.value}
                onChange={() => patch({ imageType: opt.value })}
                className="sr-only"
              />
              <Radio checked={state.imageType === opt.value} />
              <span className="text-[16px] leading-[26px] text-ink">{opt.label}</span>
            </label>
          ))}
        </div>
        {!isGraphic && (
          <p className="text-[14px] leading-[22px] text-ink-muted">
            제품 이미지 업로드는 아직 준비 중이에요.
          </p>
        )}
      </section>

      {/* 오브젝트 명칭 */}
      <section className="flex flex-col gap-3">
        <FieldLabel htmlFor={objectId}>오브젝트 명칭</FieldLabel>
        <div>
          <input
            id={objectId}
            type="text"
            maxLength={15}
            disabled={!isGraphic}
            placeholder="생성하고 싶은 오브젝트를 입력해주세요"
            value={state.primaryObject}
            onChange={(e) => patch({ primaryObject: e.target.value })}
            className="h-12 w-full rounded-lg border border-line bg-surface px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none placeholder:text-ink-faint focus:border-ink disabled:bg-fill"
          />
          <p className="mt-1.5 px-4 text-right text-[12px] leading-[19px] tabular-nums text-ink">
            {state.primaryObject.length}/15
          </p>
        </div>

        <button
          type="button"
          disabled={!hasInput || !isGraphic || state.isGeneratingImages}
          onClick={handleGenerate}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-[24px] border text-[16px] leading-[26px] font-medium transition-[background-color,scale] duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:text-ink-muted ${
            isPrimaryAction
              ? 'border-transparent bg-brand text-ink enabled:hover:bg-[#f2df00]'
              : 'border-black/[0.06] bg-[#f0f0f0] text-ink enabled:hover:bg-[#e9e9e9]'
          }`}
        >
          <span aria-hidden>✦</span>
          {state.isGeneratingImages ? '생성 중…' : 'AI 이미지 2종 생성하기'}
        </button>
      </section>

      {/* AI 이미지 생성 — 결과 선택 */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[18px] leading-7 font-medium text-ink">AI 이미지 생성</h3>

        {state.isGeneratingImages && <ProgressStatus messages={PROGRESS_MESSAGES} />}

        <div className="rounded-lg border border-line p-5">
          <div className="grid grid-cols-2 gap-4">
            {STYLE_ORDER.map((style) => {
              const image = state.images.find((img) => img.style === style);
              const isRegenerating = state.regeneratingStyle === style;
              const isSelected = state.selectedImageStyle === style;
              return (
                <div key={style} className="flex flex-col gap-3">
                  <label
                    className={`flex items-center gap-2 ${
                      image ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedImageStyle"
                      value={style}
                      checked={isSelected}
                      disabled={!image}
                      onChange={() => patch({ selectedImageStyle: style })}
                      className="sr-only"
                    />
                    <Radio checked={isSelected} />
                    <span
                      className={`text-[16px] leading-[26px] ${
                        image ? 'text-ink' : 'text-ink-faint'
                      }`}
                    >
                      {STYLE_LABEL[style]}
                    </span>
                  </label>

                  {state.isGeneratingImages || isRegenerating ? (
                    <Shimmer className="h-[120px] w-full rounded-lg" />
                  ) : image ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-[120px] w-full items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.imageUrl}
                          alt={STYLE_LABEL[style]}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(style)}
                        className="min-h-9 rounded-[24px] border border-line px-3 text-[14px] leading-[22px] text-ink transition-[background-color,scale] duration-150 hover:bg-fill active:scale-[0.96]"
                      >
                        다시 생성하기
                      </button>
                    </div>
                  ) : (
                    <div className="h-[120px]" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {state.partialErrors.map((err) => (
          <p
            key={err.style}
            className="rounded-lg bg-[#fff4f4] px-4 py-3 text-[14px] leading-[22px] text-pretty text-required"
          >
            {STYLE_LABEL[err.style]} 생성 실패 — {err.message}
          </p>
        ))}
      </section>

      {/* 배너 강조 요소 추가 */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[18px] leading-7 font-medium text-ink">배너 강조 요소 추가</h3>
        <p className="flex items-start gap-2 text-[14px] leading-[22px] text-ink-muted">
          <span aria-hidden className="pt-2 text-[6px] leading-none">
            ●
          </span>
          배너 크기 제약으로 로고와 혜택 배지 중 하나만 사용할 수 있어요
        </p>
        <div className="flex items-center gap-[30px]">
          {ACCENT_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1">
              <label className="flex min-h-10 cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="accentType"
                  value={opt.value}
                  checked={state.accentType === opt.value}
                  onChange={() => patch({ accentType: opt.value })}
                  className="sr-only"
                />
                <Radio checked={state.accentType === opt.value} />
                <span className="text-[16px] leading-[26px] text-ink">{opt.label}</span>
              </label>
              {opt.hasInfo && (
                <InfoTooltip
                  text={
                    opt.value === 'logo'
                      ? '브랜드 로고를 배너 우측에 함께 노출해요'
                      : '혜택을 강조하는 배지를 배너에 함께 노출해요'
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* 로고 업로드 */}
        {state.accentType === 'logo' && (
          <div className="flex items-center justify-between rounded-lg border border-line px-5 py-4">
            <ul className="flex flex-col gap-0.5">
              {['파일 형식 : PNG', '용량 : 1MB 이하', '1371 x 1218px'].map((spec) => (
                <li
                  key={spec}
                  className="flex items-start gap-2 text-[14px] leading-[22px] text-ink"
                >
                  <span aria-hidden className="pt-2 text-[6px] leading-none">
                    ●
                  </span>
                  {spec}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled
              title="로고 업로드는 아직 준비 중입니다"
              className="flex h-9 shrink-0 items-center gap-1 rounded-[24px] bg-fill-strong px-3.5 text-[14px] leading-[22px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden>+</span> 로고 업로드
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
