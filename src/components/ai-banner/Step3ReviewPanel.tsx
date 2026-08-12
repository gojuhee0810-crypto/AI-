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

import { useId, useState } from 'react';
import { EditDialog } from '@/components/ai-banner/EditDialog';
import { FORM_FIELD, FORM_HELPER, FORM_LABEL, FORM_STACK, inputClass } from '@/components/ai-banner/fields';
import { CharCount, CharCounter } from '@/components/ai-banner/CharCounter';
import { Radio } from '@/components/ai-banner/Radio';
import {
  IMAGE_STYLE_LABEL,
  IMAGE_TYPE_LABEL,
  MAINTITLE_LIMIT,
  MATERIAL_NAME_LIMIT,
  NOTICE_TEXT_LIMIT,
  REVIEW_NOTE_LIMIT,
  SUBTITLE_LIMIT,
  isStepComplete,
  isValidLandingUrl,
  resolveBannerImageUrl,
  type AiBannerFlowState,
} from '@/types/banner-flow';
import type { CopyRecommendation } from '@/types/copy-generation';
import type { ImageStyleKey } from '@/types/image-generation';

interface Props {
  state: AiBannerFlowState;
  patch: (next: Partial<AiBannerFlowState>) => void;
  /** 등록을 시도했는데 못 넘어간 상태 — 빈 필수 칸을 붉게 표시한다. */
  showErrors: boolean;
}

/** 입력 라벨 — 1·2단계와 같은 18/28 Medium */
function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className={FORM_LABEL}>
      {children}
    </label>
  );
}

// 입력칸 스타일을 여기 또 적어두지 않는다. 한때 INPUT_CLASS라는 사본이 있었고,
// fields.ts에 block을 넣어 textarea 아래 디센더 여백을 없앴을 때 이 화면만
// 안 따라와서 카운터 간격이 6이 아니라 12.5였다. inputClass() 하나만 쓴다.

/**
 * 글자수를 입력칸 안 오른쪽에 넣은 입력. 아래에 따로 한 줄을 두면 칸마다 20px씩
 * 늘어나는데, 모달에서는 그 20px이 스크롤을 만든다.
 */
function CompactField({
  value,
  limit,
  onChange,
}: {
  value: string;
  limit: number;
  onChange: (value: string) => void;
}) {
  const isOver = value.length > limit;
  return (
    <span className="relative block">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full rounded-lg border bg-surface py-0 pr-16 pl-3 text-[15px] leading-[24px] text-ink transition-colors duration-150 outline-none ${
          isOver ? 'border-required' : 'border-line focus:border-ink'
        }`}
      />
      <span
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] leading-[19px]"
      >
        <CharCount value={value} limit={limit} />
      </span>
    </span>
  );
}

/**
 * 값 한 줄 = 편집 버튼 하나.
 *
 * 줄마다 알약 버튼을 달면 세 개가 세로로 늘어서 목록이 시끄럽고, 정작 누를 영역은
 * 그 작은 알약뿐이다. 줄 전체를 누르게 하면 조용해지면서 클릭 영역은 넓어진다.
 * 오른쪽 꺾쇠는 "여기서 뭔가 열린다"는 표시만 한다.
 */
function EditRow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    // 행 높이가 값에 따라 달라지므로(카피 2줄, 이미지 썸네일 48px) 세로 가운데 정렬한다.
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 py-4 text-left transition-colors duration-150 hover:bg-sidebar"
    >
      {/* 라벨 폭을 고정해 값들이 한 줄로 정렬된다 — 눈이 값만 훑고 내려갈 수 있다 */}
      <span className="w-[76px] shrink-0 text-[16px] leading-[26px] text-ink-muted">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {/* 화면에는 꺾쇠만 보이지만, 스크린리더에는 무엇을 하는 버튼인지 알려준다 */}
      <span className="sr-only">변경</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-5 shrink-0 text-ink-faint"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

type EditTarget = 'name' | 'copy' | 'image';

export function Step3ReviewPanel({ state, patch, showErrors }: Props) {
  const noticeId = useId();
  const landingId = useId();
  const reviewNoteId = useId();

  // 고치는 값은 초안에 담았다가 저장할 때 한 번에 반영한다. 곧바로 patch하면
  // 취소해도 되돌릴 수 없고, 모달을 여는 동안 오른쪽 미리보기가 먼저 바뀐다.
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftCopyIndex, setDraftCopyIndex] = useState<number | null>(null);
  const [draftCopies, setDraftCopies] = useState<CopyRecommendation[]>([]);
  const [draftStyle, setDraftStyle] = useState<ImageStyleKey | null>(null);
  // 글자를 직접 고치는 건 드문 동작이라 기본은 접어둔다. 셋 다 입력칸을 펼쳐두면
  // 모달이 화면을 넘겨서, 정작 흔한 일(셋 중 하나 고르기)에 스크롤이 필요해진다.
  const [copyEditIndex, setCopyEditIndex] = useState<number | null>(null);

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

  function openEdit(target: EditTarget) {
    // 현재 값을 초안으로 복사한다. 모달에서 고치다 취소하면 이 복사본만 버려진다.
    setDraftName(state.materialName);
    setDraftCopyIndex(state.selectedCopyIndex);
    setDraftCopies(state.copyRecommendations.map((rec) => ({ ...rec })));
    setDraftStyle(state.selectedImageStyle);
    setCopyEditIndex(null);
    setEditing(target);
  }

  function saveEdit() {
    if (editing === 'name') patch({ materialName: draftName.trim() });
    if (editing === 'copy') {
      patch({ copyRecommendations: draftCopies, selectedCopyIndex: draftCopyIndex });
    }
    if (editing === 'image') patch({ selectedImageStyle: draftStyle });
    setEditing(null);
  }

  function updateDraftCopy(index: number, field: 'subtitle' | 'maintitle', value: string) {
    setDraftCopies((prev) =>
      prev.map((rec, i) => (i === index ? { ...rec, [field]: value } : rec)),
    );
  }

  const canSaveEdit =
    editing === 'name'
      ? draftName.trim().length > 0
      : editing === 'copy'
        ? draftCopyIndex !== null
        : editing === 'image'
          ? draftStyle !== null
          : false;

  /**
   * 랜딩 URL 에러는 두 갈래다.
   *
   * 형식 오류는 입력한 뒤 바로 알린다 — 이미 뭔가 적었으니 지적할 근거가 있다.
   * 비어 있는 건 등록을 눌렀을 때만 알린다. 들어오자마자 빨갛게 만들면 아직
   * 하지도 않은 일을 잘못했다고 말하는 꼴이다.
   */
  const trimmedUrl = state.landingUrl.trim();
  const urlError = !trimmedUrl
    ? showErrors
      ? '필수 입력 항목이에요.'
      : null
    : !isValidLandingUrl(state.landingUrl)
      ? 'https:// 로 시작하는 주소를 입력해주세요'
      : null;

  // 제품 이미지는 스타일이 없다 — 유형 이름으로 대신 부른다.
  const imageLabel =
    state.imageType === 'product'
      ? IMAGE_TYPE_LABEL.product
      : state.selectedImageStyle
        ? IMAGE_STYLE_LABEL[state.selectedImageStyle]
        : IMAGE_TYPE_LABEL.graphic;

  return (
    <div className={FORM_STACK}>
      <section className={FORM_FIELD}>
        <h3 className="text-[18px] leading-7 font-medium text-ink">선택한 소재 정보</h3>

        <div className="divider-rows flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
          <EditRow label="소재 이름" onClick={() => openEdit('name')}>
            <span className="block text-[16px] leading-[26px] text-pretty text-ink">
              {state.materialName}
            </span>
          </EditRow>

          <EditRow label="카피" onClick={() => openEdit('copy')}>
            <span className="flex flex-col">
              <span className="text-[16px] leading-[26px] text-pretty text-ink-muted">
                {selectedCopy.subtitle}
              </span>
              <span className="text-[16px] leading-[26px] font-medium text-pretty text-ink">
                {selectedCopy.maintitle}
              </span>
            </span>
          </EditRow>

          {/* 썸네일만 보여준다. "3D 아이콘" 같은 스타일 이름을 옆에 적어봐야
              그림이 이미 그걸 말하고 있어, 같은 정보를 두 번 읽게 할 뿐이다.
              (스타일 이름이 필요한 자리는 고르는 화면인 1단계다) */}
          <EditRow label="이미지" onClick={() => openEdit('image')}>
            <span className="flex size-12 items-center justify-center overflow-hidden rounded-lg">
              {bannerImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerImageUrl}
                  alt={imageLabel}
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </span>
          </EditRow>
        </div>
      </section>

      {/* 안내 문구 — 배너 하단에 함께 노출된다. 미리보기에 바로 반영된다. */}
      <section className={FORM_FIELD}>
        <FieldLabel htmlFor={noticeId}>안내 문구</FieldLabel>
        <div>
          <textarea
            id={noticeId}
            rows={2}
            maxLength={NOTICE_TEXT_LIMIT}
            placeholder="심의필 등 안내 문구가 필요할 경우 입력해주세요"
            value={state.noticeText}
            onChange={(e) => patch({ noticeText: e.target.value })}
            className={inputClass(false, "h-[76px] resize-none py-3")}
          />
          <CharCounter value={state.noticeText} limit={NOTICE_TEXT_LIMIT} />
        </div>
      </section>

      {/* 랜딩 URL — 등록 필수값 */}
      <section className={FORM_FIELD}>
        <FieldLabel htmlFor={landingId}>
          랜딩URL <span className="text-error">*</span>
        </FieldLabel>
        <div>
          <input
            id={landingId}
            type="url"
            inputMode="url"
            placeholder="https:// 형식의 랜딩 URL을 입력해주세요"
            value={state.landingUrl}
            aria-invalid={urlError !== null || undefined}
            aria-describedby={urlError ? `${landingId}-error` : undefined}
            onChange={(e) => patch({ landingUrl: e.target.value })}
            className={inputClass(urlError !== null, 'h-12')}
          />
          {urlError && (
            <p
              id={`${landingId}-error`}
              role="alert"
              className={`${FORM_HELPER} text-error`}
            >
              {urlError}
            </p>
          )}
        </div>
      </section>

      {/* 심사 참고사항 — 심사 담당자에게만 전달되고 배너에는 안 나온다 */}
      <section className={FORM_FIELD}>
        <FieldLabel htmlFor={reviewNoteId}>심사 참고사항</FieldLabel>
        <div>
          <textarea
            id={reviewNoteId}
            rows={6}
            maxLength={REVIEW_NOTE_LIMIT}
            placeholder="소재 심사 담당자에게 전달할 의견이 있는 경우 입력해주세요"
            value={state.reviewNote}
            onChange={(e) => patch({ reviewNote: e.target.value })}
            className={inputClass(false, "h-[180px] resize-none py-3")}
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

      {/* ── 편집 모달 ─────────────────────────────────────────────── */}

      <EditDialog
        open={editing === 'name'}
        title="소재 이름 변경"
        canSave={canSaveEdit}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      >
        <input
          type="text"
          autoFocus
          maxLength={MATERIAL_NAME_LIMIT}
          placeholder="소재 이름을 입력해주세요"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          className={inputClass(false, "h-12")}
        />
        <CharCounter value={draftName} limit={MATERIAL_NAME_LIMIT} />
      </EditDialog>

      <EditDialog
        open={editing === 'copy'}
        title="카피 변경"
        canSave={canSaveEdit}
        // 카피 3안을 나란히 읽고 비교해야 한다. 400px에서는 서브타이틀이 줄바꿈돼
        // 실제 배너와 다른 모양으로 보인다.
        width={560}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      >
        <div className="divider-rows flex flex-col rounded-lg border border-line [--gutter:16px]">
          {draftCopies.map((rec, index) => {
            const isSelected = draftCopyIndex === index;
            const isEditing = isSelected && copyEditIndex === index;
            return (
              <label
                key={rec.pattern}
                className="flex cursor-pointer flex-col gap-2 py-3 transition-colors duration-150 hover:bg-sidebar"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="draftCopy"
                    checked={isSelected}
                    onChange={() => setDraftCopyIndex(index)}
                    className="sr-only"
                  />
                  <Radio checked={isSelected} />
                  <span className="text-[14px] leading-[22px] font-medium text-accent">
                    {rec.pattern}
                  </span>
                  {/* 고른 안만 글자를 고칠 수 있다. 안 쓸 카피를 다듬는 데
                      시간을 쓰게 만들 이유가 없다. */}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault(); // label 안이라 선택까지 번지는 걸 막는다
                        setCopyEditIndex(isEditing ? null : index);
                      }}
                      className="ml-auto text-[13px] leading-[20px] font-medium text-fill-strong underline underline-offset-2 transition-colors duration-150 hover:text-ink"
                    >
                      {isEditing ? '완료' : '직접 수정'}
                    </button>
                  )}
                </span>

                {isEditing ? (
                  <span className="flex flex-col gap-2 pl-8" onClick={(e) => e.preventDefault()}>
                    <CompactField
                      value={rec.subtitle}
                      limit={SUBTITLE_LIMIT}
                      onChange={(v) => updateDraftCopy(index, 'subtitle', v)}
                    />
                    <CompactField
                      value={rec.maintitle}
                      limit={MAINTITLE_LIMIT}
                      onChange={(v) => updateDraftCopy(index, 'maintitle', v)}
                    />
                  </span>
                ) : (
                  <span className="flex flex-col pl-8">
                    <span className="text-[14px] leading-[22px] text-ink-muted">
                      {rec.subtitle}
                    </span>
                    <span className="text-[16px] leading-[26px] font-medium text-ink">
                      {rec.maintitle}
                    </span>
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </EditDialog>

      <EditDialog
        open={editing === 'image'}
        title="이미지 변경"
        canSave={canSaveEdit}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      >
        {state.imageType === 'product' ? (
          // 제품 이미지는 고를 대상이 하나뿐이라 여기서 바꿀 게 없다.
          <p className="text-center text-[14px] leading-[22px] text-pretty text-ink-muted">
            제품 이미지는 1단계에서 다시 올려주세요
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {state.images.map((image) => {
              const isSelected = draftStyle === image.style;
              return (
                <label
                  key={image.style}
                  className="flex cursor-pointer flex-col gap-2 rounded-xl border border-line p-3 transition-colors duration-150 hover:bg-sidebar"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="draftStyle"
                      checked={isSelected}
                      onChange={() => setDraftStyle(image.style)}
                      className="sr-only"
                    />
                    <Radio checked={isSelected} />
                    <span className="text-[14px] leading-[22px] text-ink">
                      {IMAGE_STYLE_LABEL[image.style]}
                    </span>
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.imageUrl}
                    alt={IMAGE_STYLE_LABEL[image.style]}
                    className="h-[110px] w-full object-contain"
                  />
                </label>
              );
            })}
          </div>
        )}
      </EditDialog>
    </div>
  );
}
