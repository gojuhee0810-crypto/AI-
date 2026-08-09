'use client';

// Design Ref: Figma 1211:3115 — 이미지 생성 화면.
// 위에서 아래로: 이미지 유형 → (그래픽) 오브젝트 명칭·생성 → AI 이미지 생성(결과 선택)
//                          → (제품) 업로드
//              → 배너 강조 요소 → 로고 업로드
// (소재 이름은 구분선 위 헤더 영역에 있어 page.tsx가 그린다)
//
// 2026-08-08: 입력 순서를 강제한다. 소재 이름을 적기 전에는 이미지 유형을 고를 수 없고,
// 시도하면 소재 이름 필드에 에러가 뜬다 — 아무 값도 없는 상태로 진행하다 마지막에
// 막히는 것보다 첫 필드에서 막히는 편이 낫다.

import { useId, useRef, useState } from 'react';
import {
  BADGE_STYLES,
  BADGE_TEXT_LIMIT,
  type AiBannerFlowState,
  type BadgeStyle,
  type ImageSourceType,
} from '@/types/banner-flow';
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
  /** 소재 이름이 비어 있을 때 호출 — page.tsx가 에러를 띄우고 포커스를 옮긴다. */
  onRequireMaterialName: () => void;
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
  { value: 'logo', label: '로고', info: '브랜드 로고를 배너 우측에 함께 노출해요' },
  { value: 'badge', label: '혜택 배지', info: '혜택을 강조하는 배지를 배너에 함께 노출해요' },
  { value: 'none', label: '없음', info: null },
] as const;

const PROGRESS_MESSAGES = [
  '오브젝트를 분석하고 있어요',
  '3D 아이콘을 그리는 중이에요',
  '2D 아이콘을 그리는 중이에요',
  '배경을 정리하고 마무리하는 중이에요',
];

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** 로고는 매체 가이드상 1MB 이하 (docs/guides/admin-design-system.md) */
const MAX_LOGO_BYTES = 1024 * 1024;

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

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[18px] leading-7 font-medium text-ink">
      {children} <span className="text-required">*</span>
    </label>
  );
}

export function Step1ImagePanel({ state, patch, onRequireMaterialName }: Props) {
  const objectId = useId();
  const badgeTextId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const hasMaterialName = state.materialName.trim().length > 0;
  const isGraphic = state.imageType === 'graphic';
  const isProduct = state.imageType === 'product';
  const hasInput = state.primaryObject.trim().length > 0;
  const hasResult = state.images.length > 0;
  // 지금 눌러야 진행되는 버튼만 브랜드 컬러. 결과가 나오면 주요 액션이
  // 하단 "카피 문구 생성하러가기"로 넘어가므로 회색으로 내린다.
  const isPrimaryAction = isGraphic && hasInput && !state.isGeneratingImages && !hasResult;

  function handleImageTypeChange(value: ImageSourceType) {
    // 소재 이름이 먼저다. 없으면 고르지 못하게 하고 그쪽으로 안내한다.
    if (!hasMaterialName) {
      onRequireMaterialName();
      return;
    }
    patch({ imageType: value });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // 같은 파일을 다시 골라도 change가 걸리도록
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setUploadError('PNG 또는 JPG 파일만 올릴 수 있어요.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('5MB 이하 파일만 올릴 수 있어요.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => patch({ productImageUrl: String(reader.result) });
    reader.onerror = () => setUploadError('파일을 읽지 못했어요. 다시 시도해주세요.');
    reader.readAsDataURL(file);
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    // 로고는 배너 위에 겹쳐지므로 배경이 투명해야 한다 — PNG만 받는다.
    if (file.type !== 'image/png') {
      setLogoError('로고는 배경이 투명한 PNG만 올릴 수 있어요.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('1MB 이하 파일만 올릴 수 있어요.');
      return;
    }

    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => patch({ logoUrl: String(reader.result) });
    reader.onerror = () => setLogoError('파일을 읽지 못했어요. 다시 시도해주세요.');
    reader.readAsDataURL(file);
  }

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
            // 선택 표시는 검정 테두리 대신 브랜드 옐로우 링 + 옅은 배경으로 통일한다.
            // 검정 테두리는 인풋 포커스와 구분이 안 돼 무엇이 선택된 건지 모호했다.
            <label
              key={opt.value}
              className={`flex h-12 items-center gap-2 rounded-lg px-4 transition-[background-color,box-shadow] duration-150 ${
                state.imageType === opt.value
                  ? 'bg-surface shadow-[0_0_0_2px_var(--color-brand)]'
                  : 'bg-surface shadow-[0_0_0_1px_var(--color-line)] hover:shadow-[0_0_0_1px_var(--color-ink-muted)]'
              } ${hasMaterialName ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            >
              <input
                type="radio"
                name="imageType"
                value={opt.value}
                checked={state.imageType === opt.value}
                onChange={() => handleImageTypeChange(opt.value)}
                className="sr-only"
              />
              <Radio checked={state.imageType === opt.value} />
              <span
                className={`text-[16px] leading-[26px] ${
                  hasMaterialName ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* 그래픽 아이콘 — 오브젝트 입력 + AI 생성 */}
      {isGraphic && (
        <>
          <section className="flex flex-col gap-3">
            <FieldLabel htmlFor={objectId}>오브젝트 명칭</FieldLabel>
            <div>
              <input
                id={objectId}
                type="text"
                maxLength={15}
                placeholder="생성하고 싶은 오브젝트를 입력해주세요"
                value={state.primaryObject}
                onChange={(e) => patch({ primaryObject: e.target.value })}
                className="h-12 w-full rounded-lg border border-line bg-surface px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none placeholder:text-ink-faint focus:border-ink"
              />
              <p className="mt-1.5 px-4 text-right text-[12px] leading-[19px] tabular-nums text-ink">
                {state.primaryObject.length}/15
              </p>
            </div>

            {/* 결과가 나온 뒤에는 못 누르게 막는다. 카드마다 "다시 생성하기"가 있어
                여기서 또 전체 생성을 돌리면 방금 고른 것이 통째로 날아간다. */}
            <button
              type="button"
              disabled={!hasInput || state.isGeneratingImages || hasResult}
              title={hasResult ? '다시 만들려면 각 카드의 "다시 생성하기"를 눌러주세요' : undefined}
              onClick={handleGenerate}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-[24px] border text-[16px] leading-[26px] font-medium transition-[background-color,scale] duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:text-ink-muted ${
                isPrimaryAction
                  ? 'border-transparent bg-brand text-ink enabled:hover:bg-[#f2df00]'
                  : 'border-black/[0.06] bg-[#f0f0f0] text-ink enabled:hover:bg-brand'
              }`}
            >
              <span aria-hidden>✦</span>
              {state.isGeneratingImages ? '생성 중…' : 'AI 이미지 2종 생성하기'}
            </button>
            {hasResult && (
              <p className="text-[13px] leading-[20px] text-ink-muted">
                다시 만들려면 아래 카드의 &lsquo;다시 생성하기&rsquo;를 눌러주세요
              </p>
            )}
          </section>

          {/* AI 이미지 생성 — 결과 선택 */}
          <section className="flex flex-col gap-3">
            <h3 className="text-[18px] leading-7 font-medium text-ink">AI 이미지 생성</h3>

            {state.isGeneratingImages && <ProgressStatus messages={PROGRESS_MESSAGES} />}

            {/* 생성 전 빈 상태 — 무엇을 하면 여기가 채워지는지 알려준다 */}
            {!hasResult && !state.isGeneratingImages ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-sidebar px-6 text-center">
                <span aria-hidden className="text-[28px] leading-none opacity-40">
                  ✦
                </span>
                <p className="text-[16px] leading-[26px] text-ink">
                  아직 만든 이미지가 없어요
                </p>
                <p className="text-[14px] leading-[22px] text-ink-muted">
                  오브젝트 명칭을 입력하고 생성 버튼을 눌러주세요
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {STYLE_ORDER.map((style) => {
                  const image = state.images.find((img) => img.style === style);
                  const isRegenerating = state.regeneratingStyle === style;
                  const isSelected = state.selectedImageStyle === style;
                  const isBusy = state.isGeneratingImages || isRegenerating;

                  return (
                    // 카드 전체가 선택 영역이다. 라디오·라벨만 누를 수 있으면
                    // 이미지를 눌러도 반응이 없어 고장으로 읽힌다.
                    <label
                      key={style}
                      className={`group relative flex flex-col gap-3 rounded-xl p-3 transition-[background-color,box-shadow] duration-150 ${
                        image ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isSelected
                          ? 'bg-surface shadow-[0_0_0_2px_var(--color-brand),0_4px_12px_rgba(0,0,0,0.06)]'
                          : 'bg-surface shadow-[0_0_0_1px_var(--color-line)] hover:shadow-[0_0_0_1px_var(--color-ink-muted)]'
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

                      <div className="flex items-center gap-2">
                        <Radio checked={isSelected} />
                        <span
                          className={`text-[16px] leading-[26px] ${
                            image ? 'text-ink' : 'text-ink-faint'
                          }`}
                        >
                          {STYLE_LABEL[style]}
                        </span>
                        {isSelected && (
                          <span className="ml-auto text-[13px] leading-[20px] font-medium text-ink">
                            선택됨
                          </span>
                        )}
                      </div>

                      {isBusy ? (
                        <Shimmer className="h-[132px] w-full rounded-lg" />
                      ) : image ? (
                        <>
                          {/* 투명 PNG라 흰 배경에선 경계가 안 보인다 — 체커보드를 깐다 */}
                          <div className="checkerboard flex h-[132px] w-full items-center justify-center overflow-hidden rounded-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image.imageUrl}
                              alt={STYLE_LABEL[style]}
                              className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={(e) => {
                              e.preventDefault(); // label 안이라 선택까지 번지는 걸 막는다
                              handleRegenerate(style);
                            }}
                            // 카드에 마우스를 올리면 이 버튼만 옐로우로 바뀐다 —
                            // 카드 배경을 물들이지 않고 눌러야 할 곳만 알린다.
                            className="min-h-8 self-center rounded-[24px] border border-line bg-fill px-3 text-[13px] leading-[20px] font-medium text-ink-muted transition-[background-color,border-color,color,scale] duration-150 group-hover:border-transparent group-hover:bg-brand group-hover:text-ink active:scale-[0.96] disabled:cursor-not-allowed"
                          >
                            다시 생성하기
                          </button>
                        </>
                      ) : (
                        <div className="flex h-[132px] items-center justify-center rounded-lg bg-fill text-[13px] leading-[20px] text-ink-muted">
                          생성되지 않았어요
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {state.partialErrors.map((err) => (
              <p
                key={err.style}
                className="rounded-lg bg-[#fff4f4] px-4 py-3 text-[14px] leading-[22px] text-pretty text-required"
              >
                {STYLE_LABEL[err.style]} 생성 실패 — {err.message}
              </p>
            ))}
          </section>
        </>
      )}

      {/* 제품 이미지 — 직접 업로드 */}
      {isProduct && (
        <section className="flex flex-col gap-3">
          <FieldLabel>제품 이미지 업로드</FieldLabel>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-sidebar p-6 transition-colors duration-150 hover:border-ink-muted"
          >
            {state.productImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.productImageUrl}
                  alt="업로드한 제품 이미지"
                  className="max-h-[150px] max-w-full object-contain"
                />
                <span className="text-[14px] leading-[22px] text-ink-muted">
                  클릭하면 다른 이미지로 바꿔요
                </span>
              </>
            ) : (
              <>
                <span
                  aria-hidden
                  className="flex size-16 items-center justify-center rounded-full bg-surface text-[22px] text-ink shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  ⬆
                </span>
                <span className="text-[16px] leading-[26px] text-ink">클릭하여 이미지 업로드</span>
                <span className="text-[14px] leading-[22px] text-ink-muted">
                  PNG, JPG (최대 5MB)
                </span>
              </>
            )}
          </button>
          {uploadError && (
            <p className="text-[14px] leading-[22px] text-required">{uploadError}</p>
          )}
        </section>
      )}

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
              {opt.info && <InfoTooltip text={opt.info} />}
            </div>
          ))}
        </div>

        {/* 혜택 배지 — 문구와 색을 정한다. 미리보기에 바로 반영된다. */}
        {state.accentType === 'badge' && (
          <div className="flex flex-col gap-4 rounded-lg border border-line p-5">
            <div>
              <label htmlFor={badgeTextId} className="text-[14px] leading-[22px] text-ink">
                배지 문구
              </label>
              <input
                id={badgeTextId}
                type="text"
                maxLength={BADGE_TEXT_LIMIT}
                placeholder="예) 최대 50%"
                value={state.badgeText}
                onChange={(e) => patch({ badgeText: e.target.value })}
                className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none placeholder:text-ink-faint focus:border-ink"
              />
              <p className="mt-1.5 px-4 text-right text-[12px] leading-[19px] tabular-nums text-ink-muted">
                {state.badgeText.length}/{BADGE_TEXT_LIMIT}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[14px] leading-[22px] text-ink">배지 색상</span>
              <div className="flex items-center gap-2">
                {(Object.keys(BADGE_STYLES) as BadgeStyle[]).map((key) => {
                  const isSelected = state.badgeStyle === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => patch({ badgeStyle: key })}
                      className={`flex min-h-9 items-center gap-2 rounded-[24px] border px-3 transition-[border-color,scale] duration-150 active:scale-[0.96] ${
                        isSelected ? 'border-ink' : 'border-line hover:border-ink-muted'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`rounded-full px-2 py-0.5 text-[12px] leading-[19px] font-medium ${BADGE_STYLES[key].className}`}
                      >
                        {state.badgeText.trim() || '배지'}
                      </span>
                      <span className="text-[13px] leading-[20px] text-ink-muted">
                        {BADGE_STYLES[key].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 로고 업로드 — 배너 이미지 좌하단에 1/4 크기로 얹힌다 */}
        {state.accentType === 'logo' && (
          <div className="flex flex-col gap-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png"
              onChange={handleLogoChange}
              className="sr-only"
            />
            <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-5 py-4">
              <div className="flex min-w-0 items-center gap-4">
                {state.logoUrl && (
                  <span className="checkerboard flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={state.logoUrl}
                      alt="업로드한 로고"
                      className="max-h-full max-w-full object-contain"
                    />
                  </span>
                )}
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
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex h-9 shrink-0 items-center gap-1 rounded-[24px] bg-fill-strong px-3.5 text-[14px] leading-[22px] font-medium text-white transition-[background-color,scale] duration-150 hover:bg-[#4e5760] active:scale-[0.96]"
              >
                <span aria-hidden>+</span> {state.logoUrl ? '로고 변경' : '로고 업로드'}
              </button>
            </div>
            {logoError ? (
              <p className="text-[14px] leading-[22px] text-required">{logoError}</p>
            ) : (
              <p className="text-[14px] leading-[22px] text-ink-muted">
                로고는 배너 이미지 좌측 하단에 1/4 크기로 붙습니다
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
