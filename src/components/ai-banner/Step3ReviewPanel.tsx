'use client';

// Design Ref: Figma 프레임 미확보 — 1·2단계에서 확정된 규칙을 그대로 적용했다.
// (섹션 제목 18/28 Medium, 카드 radius 12 + --color-line 테두리, Chip 버튼 radius 24)
//
// 이 화면이 답해야 하는 질문은 하나다: "내가 만든 소재가 이게 맞나."
// 그래서 사용자가 실제로 고르거나 입력한 것만 보여준다 — 소재 이름, 카피, 이미지.
// 재질·시점 같은 값은 넣지 않는다. 고른 적이 없는 값이라 화면에 적으면 지어낸 정보가 된다.
// 타겟팅도 뺐다(2026-08-09 사용자 확정) — 여기서 고칠 수 없는 값이고, 헤더의
// 캠페인·광고그룹과 성격이 같아 3단계에만 카드로 세우면 여기서 정하는 것처럼 보인다.
//
// 값마다 되돌아갈 버튼을 붙인다. 틀린 걸 발견해도 어디로 가야 할지 모르면
// 확인 화면은 확인만 시키고 고치지는 못하게 만든다.

import { useId } from 'react';
import { CHIP_OUTLINE } from '@/components/ai-banner/chip';
import {
  IMAGE_STYLE_LABEL,
  IMAGE_TYPE_LABEL,
  NOTICE_TEXT_LIMIT,
  REVIEW_NOTE_LIMIT,
  isStepComplete,
  isValidLandingUrl,
  resolveBannerImageUrl,
  type AiBannerFlowState,
} from '@/types/banner-flow';

interface Props {
  state: AiBannerFlowState;
  patch: (next: Partial<AiBannerFlowState>) => void;
}

/** 입력 라벨 — 1·2단계와 같은 18/28 Medium */
function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[18px] leading-7 font-medium text-ink">
      {children}
    </label>
  );
}

/** 글자수 — 초과하면 빨간색. LLM은 글자를 못 세므로 코드가 표시한다. */
function CharCounter({ value, limit }: { value: string; limit: number }) {
  return (
    <p className="mt-1.5 px-4 text-right">
      <span
        className={`text-[12px] leading-[19px] tabular-nums ${
          value.length > limit ? 'text-required' : 'text-ink-muted'
        }`}
      >
        {value.length}/{limit}
      </span>
    </p>
  );
}

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface px-4 text-[16px] leading-[26px] text-ink transition-colors duration-150 outline-none placeholder:text-ink-faint focus:border-ink';

/** 되돌아가기 Chip — 디자인 시스템 §6-1 Chip(높이 32, radius 24) */
function BackChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={CHIP_OUTLINE}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // 행 높이가 값에 따라 달라지므로(카피 2줄, 이미지 썸네일 48px) 세로 가운데
    // 정렬한다. 위 정렬로 두면 버튼만 위에 붙어 행마다 아래 여백이 달라 보인다.
    <div className="flex items-center gap-4 px-5 py-4">
      {/* 라벨 폭을 고정해 값들이 한 줄로 정렬된다 — 눈이 값만 훑고 내려갈 수 있다 */}
      <dt className="w-[76px] shrink-0 text-[16px] leading-[26px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
      {action}
    </div>
  );
}

export function Step3ReviewPanel({ state, patch }: Props) {
  const noticeId = useId();
  const landingId = useId();
  const reviewNoteId = useId();
  const selectedCopy =
    state.selectedCopyIndex !== null ? state.copyRecommendations[state.selectedCopyIndex] : null;
  const bannerImageUrl = resolveBannerImageUrl(state);

  // 완료 판정은 isStepComplete 하나로 한다. 여기서 따로 조건을 쓰면 제품 이미지
  // 경로(images가 비어 있다)를 빠뜨려 업로드하고도 막히는 일이 생긴다 — 실제로 그랬다.
  const isReady =
    isStepComplete(state, 1) && isStepComplete(state, 2) && selectedCopy !== null;

  if (!isReady) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-sidebar px-6 text-center">
        <span aria-hidden className="text-[28px] leading-none opacity-40">
          ✦
        </span>
        <p className="text-[16px] leading-[26px] text-ink">이전 단계를 먼저 완료해주세요</p>
        <p className="text-[14px] leading-[22px] text-ink-muted">
          이미지와 카피를 모두 골라야 최종 확인을 할 수 있어요
        </p>
      </div>
    );
  }

  // 뭔가 입력한 뒤에만 형식을 지적한다. 빈 칸을 처음부터 빨갛게 만들면
  // 아직 하지도 않은 일을 잘못했다고 말하는 셈이다.
  const showUrlError =
    state.landingUrl.trim().length > 0 && !isValidLandingUrl(state.landingUrl);

  // 제품 이미지는 스타일이 없다 — 유형 이름으로 대신 부른다.
  const imageLabel =
    state.imageType === 'product'
      ? IMAGE_TYPE_LABEL.product
      : state.selectedImageStyle
        ? IMAGE_STYLE_LABEL[state.selectedImageStyle]
        : IMAGE_TYPE_LABEL.graphic;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-[18px] leading-7 font-medium text-ink">선택한 소재 정보</h3>

        <dl className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
          <Row label="소재 이름" action={<BackChip onClick={() => patch({ step: 1 })}>수정</BackChip>}>
            <p className="text-[16px] leading-[26px] text-pretty text-ink">{state.materialName}</p>
          </Row>

          <Row label="카피" action={<BackChip onClick={() => patch({ step: 2 })}>카피 변경</BackChip>}>
            <div className="flex flex-col">
              <span className="text-[16px] leading-[26px] text-pretty text-ink-muted">
                {selectedCopy.subtitle}
              </span>
              <span className="text-[16px] leading-[26px] font-medium text-pretty text-ink">
                {selectedCopy.maintitle}
              </span>
            </div>
          </Row>

          <Row
            label="이미지"
            action={<BackChip onClick={() => patch({ step: 1 })}>이미지 변경</BackChip>}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {bannerImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerImageUrl}
                    alt={imageLabel}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </span>
              <span className="text-[16px] leading-[26px] text-ink">{imageLabel}</span>
            </div>
          </Row>
        </dl>
      </section>

      {/* 안내 문구 — 배너 하단에 함께 노출된다. 미리보기에 바로 반영된다. */}
      <section className="flex flex-col gap-3">
        <FieldLabel htmlFor={noticeId}>안내 문구</FieldLabel>
        <div>
          <textarea
            id={noticeId}
            rows={2}
            maxLength={NOTICE_TEXT_LIMIT}
            placeholder="심의필 등 안내 문구가 필요할 경우 입력해주세요"
            value={state.noticeText}
            onChange={(e) => patch({ noticeText: e.target.value })}
            className={`h-[76px] resize-none py-3 ${INPUT_CLASS}`}
          />
          <CharCounter value={state.noticeText} limit={NOTICE_TEXT_LIMIT} />
        </div>
      </section>

      {/* 랜딩 URL — 등록 필수값 */}
      <section className="flex flex-col gap-3">
        <FieldLabel htmlFor={landingId}>
          랜딩URL <span className="text-required">*</span>
        </FieldLabel>
        <div>
          <input
            id={landingId}
            type="url"
            inputMode="url"
            placeholder="https:// 형식의 랜딩 URL을 입력해주세요"
            value={state.landingUrl}
            aria-invalid={showUrlError || undefined}
            aria-describedby={showUrlError ? `${landingId}-error` : undefined}
            onChange={(e) => patch({ landingUrl: e.target.value })}
            className={`h-12 ${INPUT_CLASS} ${showUrlError ? 'border-required focus:border-required' : ''}`}
          />
          {/* 입력을 시작한 뒤에만 알린다 — 빈 칸을 처음부터 빨갛게 만들지 않는다 */}
          {showUrlError && (
            <p
              id={`${landingId}-error`}
              role="alert"
              className="mt-1.5 px-4 text-[12px] leading-[19px] text-required"
            >
              https:// 로 시작하는 주소를 입력해주세요
            </p>
          )}
        </div>
      </section>

      {/* 심사 참고사항 — 심사 담당자에게만 전달되고 배너에는 안 나온다 */}
      <section className="flex flex-col gap-3">
        <FieldLabel htmlFor={reviewNoteId}>심사 참고사항</FieldLabel>
        <div>
          <textarea
            id={reviewNoteId}
            rows={6}
            maxLength={REVIEW_NOTE_LIMIT}
            placeholder="소재 심사 담당자에게 전달할 의견이 있는 경우 입력해주세요"
            value={state.reviewNote}
            onChange={(e) => patch({ reviewNote: e.target.value })}
            className={`h-[180px] resize-none py-3 ${INPUT_CLASS}`}
          />
          <CharCounter value={state.reviewNote} limit={REVIEW_NOTE_LIMIT} />
        </div>
      </section>

      <p className="flex items-start gap-2 text-[14px] leading-[22px] text-pretty text-ink-muted">
        <span aria-hidden className="pt-2 text-[6px] leading-none">
          ●
        </span>
        &lsquo;등록하고 심사 요청하기&rsquo;는 광고센터 연동이 아직 준비 중이라 이 데모에서는
        동작하지 않습니다
      </p>
    </div>
  );
}
