'use client';

// Design Ref: Figma 1211:3115 — 이미지 생성 화면.
// 위에서 아래로: 이미지 유형 → (그래픽) 오브젝트 명칭·생성 → AI 이미지 생성(결과 선택)
//                          → (제품) 업로드
//              → 배너 강조 요소 → 로고 업로드
// (소재 이름은 구분선 위 헤더 영역에 있어 page.tsx가 그린다)
//
// 2026-08-10: 입력 순서 강제를 걷어냈다. 소재 이름 없이 이미지 유형을 고르면 곧바로
// 빨간 에러를 띄웠는데, 아직 아무것도 잘못하지 않은 시점에 혼내는 꼴이었다.
// 빈 필수 칸은 하단 CTA를 눌렀을 때만 표시한다(showErrors).

import { useId, useRef, useState } from 'react';
import {
  BADGE_STYLES,
  BADGE_TEXT_LIMIT,
  IMAGE_STYLE_LABEL,
  IMAGE_TYPE_LABEL,
  type AiBannerFlowState,
  type BadgeStyle,
  type ImageSourceType,
} from '@/types/banner-flow';
import { AlertDialog } from '@/components/ai-banner/AlertDialog';
import { BenefitBadge } from '@/components/ai-banner/BenefitBadge';
import { CHIP_BASE, aiGenerateButtonClass } from '@/components/ai-banner/buttons';
import { inputClass } from '@/components/ai-banner/fields';
import { ProgressStatus, Shimmer } from '@/components/ai-banner/GenerativeLoading';
import { Radio } from '@/components/ai-banner/Radio';
import { InfoTooltip } from '@/components/ai-banner/InfoTooltip';
import {
  UPLOAD_ERROR_MESSAGES,
  checkUploadFile,
  checkUploadPixels,
  type UploadErrorKind,
  type UploadRule,
} from '@/lib/upload-errors';
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  GenerateImageErrorResponse,
  ImageStyleKey,
} from '@/types/image-generation';

interface Props {
  state: AiBannerFlowState;
  patch: (next: Partial<AiBannerFlowState>) => void;
  /** 제출을 시도했는데 못 넘어간 상태 — 빈 필수 칸을 붉게 표시한다. */
  showErrors: boolean;
}

// 문구는 banner-flow.ts가 갖고 있다 — 3단계 확인 화면이 같은 이름을 써야 한다.
// 여기엔 화면에 놓는 순서만 남긴다.
const IMAGE_TYPE_ORDER: ImageSourceType[] = ['graphic', 'product'];
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

/** 화면에 적은 규격과 같은 값이어야 한다 — 다르면 "1MB"라 써놓고 5MB를 받는다. */
const PRODUCT_UPLOAD_RULE: UploadRule = {
  accept: ['image/png', 'image/jpeg'],
  maxBytes: 1024 * 1024,
  maxPixels: { width: 400, height: 400 },
};

/** 로고는 배너 위에 겹쳐지므로 배경이 투명해야 한다 — PNG만 받는다. */
const LOGO_UPLOAD_RULE: UploadRule = {
  accept: ['image/png'],
  maxBytes: 1024 * 1024,
  maxPixels: { width: 1371, height: 1218 },
};

/**
 * 업로드 규격 목록 — 디자인 시스템 §6-5 "목록 안내문".
 *
 * 한 줄에 가운뎃점으로 이어 붙이면 어디까지가 형식이고 어디부터가 용량인지 눈이
 * 매번 다시 갈라야 한다. 항목을 세로로 세우면 필요한 줄만 골라 본다.
 */
function SpecList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((spec) => (
        <li key={spec} className="flex items-start gap-2 text-[14px] leading-[22px] text-ink">
          <span aria-hidden className="pt-2 text-[6px] leading-none">
            ●
          </span>
          {spec}
        </li>
      ))}
    </ul>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[18px] leading-7 font-medium text-ink">
      {children} <span className="text-required">*</span>
    </label>
  );
}

export function Step1ImagePanel({ state, patch, showErrors }: Props) {
  const objectId = useId();
  const badgeTextId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // 업로드 실패는 인라인 문구가 아니라 알럿 모달로 알린다(디자인 시스템 §6-4).
  // 파일 창이 닫히면서 화면이 그대로라, 작은 빨간 글씨는 실패한 줄도 모르고 지나친다.
  const [uploadError, setUploadError] = useState<UploadErrorKind | null>(null);
  const [logoError, setLogoError] = useState<UploadErrorKind | null>(null);
  const alertKind = uploadError ?? logoError;

  const isGraphic = state.imageType === 'graphic';
  const isProduct = state.imageType === 'product';
  const hasInput = state.primaryObject.trim().length > 0;
  const hasResult = state.images.length > 0;
  // 지금 눌러야 진행되는 버튼만 브랜드 컬러. 결과가 나오면 주요 액션이
  // 하단 "카피 문구 생성하러가기"로 넘어가므로 회색으로 내린다.
  const isPrimaryAction = isGraphic && hasInput && !state.isGeneratingImages && !hasResult;

  /**
   * 규격을 통과한 파일만 data URL로 바꿔 넘긴다.
   *
   * 픽셀 크기는 파일만 봐서는 알 수 없어 한 번 그려본 뒤 검사한다. 그래서 형식·용량
   * (즉시 판단) → 읽기 → 크기 순서가 된다.
   */
  function readUpload(
    file: File,
    rule: UploadRule,
    onDone: (dataUrl: string) => void,
    onFail: (kind: UploadErrorKind) => void,
  ) {
    const fileError = checkUploadFile(file, rule);
    if (fileError) return onFail(fileError);

    const reader = new FileReader();
    reader.onerror = () => onFail('failed');
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (!rule.maxPixels) return onDone(dataUrl);

      const probe = new Image();
      probe.onerror = () => onFail('failed');
      probe.onload = () => {
        const pixelError = checkUploadPixels(
          { width: probe.naturalWidth, height: probe.naturalHeight },
          rule,
        );
        if (pixelError) return onFail(pixelError);
        onDone(dataUrl);
      };
      probe.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // 같은 파일을 다시 골라도 change가 걸리도록
    if (!file) return;

    readUpload(
      file,
      PRODUCT_UPLOAD_RULE,
      (dataUrl) => patch({ productImageUrl: dataUrl }),
      setUploadError,
    );
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    readUpload(file, LOGO_UPLOAD_RULE, (dataUrl) => patch({ logoUrl: dataUrl }), setLogoError);
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
    <div className="flex flex-col gap-[42px]">
      {/* 이미지 유형 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FieldLabel>이미지 유형</FieldLabel>
          <InfoTooltip text="아이콘은 AI가 자동생성하고 제품 이미지는 업로드 해주세요" />
        </div>
        <div className="flex flex-col gap-2">
          {IMAGE_TYPE_ORDER.map((value) => (
            // 선택 표시는 라디오 하나로만 한다. 테두리 색까지 같이 바뀌면 인풋 포커스와
            // 뒤섞여 오히려 무엇이 선택된 건지 흐려진다. 호버는 연한 회색 배경만.
            <label
              key={value}
              className="flex h-12 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 transition-colors duration-150 hover:bg-sidebar"
            >
              <input
                type="radio"
                name="imageType"
                value={value}
                checked={state.imageType === value}
                onChange={() => patch({ imageType: value })}
                className="sr-only"
              />
              <Radio checked={state.imageType === value} />
              <span className="text-[16px] leading-[26px] text-ink">
                {IMAGE_TYPE_LABEL[value]}
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
                className={inputClass(showErrors && !hasInput, 'h-12')}
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
              className={aiGenerateButtonClass(isPrimaryAction)}
            >
              <span aria-hidden>✦</span>
              {state.isGeneratingImages ? '생성 중…' : 'AI 이미지 2종 생성하기'}
            </button>
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
                      className={`group relative flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 transition-colors duration-150 hover:bg-sidebar ${
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

                      <div className="flex items-center gap-2">
                        <Radio checked={isSelected} />
                        <span
                          className={`text-[16px] leading-[26px] ${
                            image ? 'text-ink' : 'text-ink-faint'
                          }`}
                        >
                          {IMAGE_STYLE_LABEL[style]}
                        </span>
                        {isSelected && (
                          <span className="ml-auto text-[13px] leading-[20px] font-medium text-ink">
                            선택됨
                          </span>
                        )}
                      </div>

                      {isBusy ? (
                        <Shimmer className="h-[132px] w-full rounded-lg" />
                      ) : (
                        <>
                          {image ? (
                            <div className="flex h-[132px] w-full items-center justify-center overflow-hidden rounded-lg">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image.imageUrl}
                                alt={IMAGE_STYLE_LABEL[style]}
                                className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <div className="flex h-[132px] items-center justify-center rounded-lg bg-fill text-[13px] leading-[20px] text-ink-muted">
                              생성되지 않았어요
                            </div>
                          )}

                          {/* 실패한 카드에도 이 버튼이 있어야 한다. 예전엔 이미지가 있을
                              때만 그려서, 한 장이 실패하면 그 카드에서는 손쓸 방법이 없고
                              멀쩡한 다른 한 장까지 날리며 전체를 다시 돌려야 했다.

                              옐로우로 바꾸지 않는다. 카드의 주 액션은 "고르기"인데
                              카드에 마우스를 올릴 때마다 재생성 버튼이 켜지면 위계가
                              뒤집히고, 하단 CTA와 함께 화면에 옐로우가 둘이 된다
                              (디자인 시스템 §4 "옐로우는 화면에 하나만"). */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={(e) => {
                              e.preventDefault(); // label 안이라 선택까지 번지는 걸 막는다
                              handleRegenerate(style);
                            }}
                            className={`${CHIP_BASE} self-center border border-line bg-fill text-ink hover:bg-[#e5e9ec] disabled:cursor-not-allowed`}
                          >
                            다시 생성하기
                          </button>
                        </>
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
                {IMAGE_STYLE_LABEL[err.style]} 생성 실패 — {err.message}
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
            // 높이(240)와 이미지 영역(132)은 그래픽 아이콘 결과 카드의 실측값이다.
            // 두 경로가 같은 자리를 다른 크기로 채우면 유형을 바꿀 때마다 아래 내용이
            // 위아래로 튄다.
            className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-sidebar p-3 transition-colors duration-150 hover:border-ink-muted"
          >
            {state.productImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.productImageUrl}
                  alt="업로드한 제품 이미지"
                  className="max-h-[132px] max-w-full object-contain"
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
                {/* 규격은 두 줄로 나눈다. 한 줄에 몰면 어디까지가 크기고 어디부터가
                    용량인지 눈이 매번 갈라야 한다. 형식은 한 단계 작게 둔다 —
                    셋 중 가장 덜 헷갈리는 항목이다. */}
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-[14px] leading-[22px] text-ink-muted">
                    400 × 400(px), 1MB
                  </span>
                  <span className="text-[12px] leading-[19px] text-ink-faint">PNG</span>
                </span>
              </>
            )}
          </button>

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

        {/* 혜택 배지 — 이미지 좌측 하단에 얹히는 그래픽이다. 모양은 고정이고
            사용자가 정하는 건 안에 들어갈 문구와 색 둘뿐이다. */}
        {state.accentType === 'badge' && (
          <div className="flex flex-col gap-4 rounded-lg border border-line p-5">
            <div className="flex items-start gap-5">
              {/* 만들어지는 배지를 그대로 보여준다 — 색 이름만 나열하면
                  실제로 어떤 그래픽이 붙는지 상상해야 한다. */}
              <BenefitBadge
                text={state.badgeText || '5%'}
                style={state.badgeStyle}
                className="mt-1 size-20 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <label htmlFor={badgeTextId} className="text-[14px] leading-[22px] text-ink">
                  배지 문구
                </label>
                <input
                  id={badgeTextId}
                  type="text"
                  maxLength={BADGE_TEXT_LIMIT}
                  placeholder="예) 5% 할인"
                  value={state.badgeText}
                  onChange={(e) => patch({ badgeText: e.target.value })}
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none placeholder:text-ink-faint focus:border-ink"
                />
                <p className="mt-1.5 px-4 text-right text-[12px] leading-[19px] tabular-nums text-ink-muted">
                  {state.badgeText.length}/{BADGE_TEXT_LIMIT}
                </p>
              </div>
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
                        className="size-4 shrink-0 rounded-full"
                        style={{ backgroundColor: BADGE_STYLES[key].fill }}
                      />
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
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={state.logoUrl}
                      alt="업로드한 로고"
                      className="max-h-full max-w-full object-contain"
                    />
                  </span>
                )}
                <SpecList
                  items={['파일 형식 : PNG', '크기 : 1371 × 1218px', '용량 : 1MB 이하']}
                />
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex h-9 shrink-0 items-center gap-1 rounded-[24px] bg-fill-strong px-3.5 text-[14px] leading-[22px] font-medium text-white transition-[background-color,scale] duration-150 hover:bg-[#4e5760] active:scale-[0.96]"
              >
                <span aria-hidden>+</span> {state.logoUrl ? '로고 변경' : '로고 업로드'}
              </button>
            </div>
            <p className="text-[14px] leading-[22px] text-ink-muted">
              로고는 배너 이미지 좌측 하단에 1/4 크기로 붙습니다
            </p>
          </div>
        )}
      </section>

      {/* 업로드 실패 알림 — 제품 이미지와 로고가 같은 모달을 쓴다 */}
      <AlertDialog
        open={alertKind !== null}
        title={alertKind ? UPLOAD_ERROR_MESSAGES[alertKind].title : ''}
        description={alertKind ? UPLOAD_ERROR_MESSAGES[alertKind].description : undefined}
        onClose={() => {
          setUploadError(null);
          setLogoError(null);
        }}
      />
    </div>
  );
}
