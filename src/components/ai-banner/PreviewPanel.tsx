// Design Ref: 사용자가 "무조건 지켜야 한다"고 명시한 요구사항 — 오른쪽에 카카오페이
// 앱 컨텍스트 안에서 실시간 합성되는 배너 미리보기.
//
// 2026-08-08: DOM으로 앱 화면을 흉내내던 것을 실제 목업 PNG로 교체했다.
// (Figma 노드 1211:3006의 원본 이미지를 download_assets로 받아 public에 저장)
// 앱 화면은 이미지가 그리고, 우리는 배너 자리에만 소재를 얹는다 — 손으로 그린
// 근사치보다 정확하고, 앱 UI가 바뀌어도 이미지만 갈아끼우면 된다.

import {
  BADGE_STYLES,
  resolveBannerImageUrl,
  type AiBannerFlowState,
} from '@/types/banner-flow';

/**
 * 목업 이미지(1125×2436) 안에서 Fit 배너가 차지하는 영역의 비율.
 * 픽셀이 아니라 %로 두어야 미리보기 폭이 바뀌어도 위치가 어긋나지 않는다.
 */
const BANNER_SLOT = {
  left: '4.3%',
  top: '62.2%',
  width: '91.2%',
  height: '11.3%',
} as const;

/**
 * 목업에 박혀 있는 "새 피드" 플로팅 버튼을 가리는 자리.
 * 우리 소재와 무관한 앱 UI인데 배너 바로 아래라 시선을 끈다. 이미지에 구워져
 * 있어 지울 수 없으므로 흰 사각형으로 덮는다(그 자리 배경도 흰색이다).
 */
const NEW_FEED_PATCH = {
  left: '34%',
  top: '80.3%',
  width: '30%',
  height: '7.5%',
} as const;

export function PreviewPanel({ state }: { state: AiBannerFlowState }) {
  // 그래픽이면 고른 스타일, 제품이면 업로드한 이미지 — resolveBannerImageUrl이 판단한다.
  const bannerImageUrl = resolveBannerImageUrl(state);
  const showBadge = state.accentType === 'badge' && state.badgeText.trim().length > 0;
  const showLogo = state.accentType === 'logo' && Boolean(state.logoUrl);
  const selectedCopy =
    state.selectedCopyIndex !== null ? state.copyRecommendations[state.selectedCopyIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* 다른 필드 라벨과 같은 크기·굵기(디자인 시스템 Field label 18/28 Medium) */}
      <h2 className="text-[18px] leading-7 font-medium text-ink">미리보기</h2>

      {/* 목업 폭은 미리보기 전체가 뷰포트(1440×900 기준) 안에 들어가도록 잡았다.
          이보다 크면 sticky가 무의미해져 스크롤할 때마다 미리보기가 잘린다. */}
      <div className="relative mx-auto w-[280px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/preview/pay-app-mockup.png"
          alt="카카오페이 앱 홈 화면"
          className="w-full rounded-[24px]"
        />

        {/* "새 피드" 버튼 가리기 — 배경이 흰색이라 흰 사각형으로 덮으면 자연스럽다 */}
        <div className="absolute bg-white" style={NEW_FEED_PATCH} aria-hidden />

        {/* 흰색 딤 — 앱 UI를 흐리게 눌러 지금 만드는 소재에 시선이 가게 한다.
            배너 슬롯은 이 위에 그려서 선명하게 남는다. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[24px] bg-white/60"
          aria-hidden
        />

        {/* 배너 슬롯 — 목업의 광고 영역을 덮고 지금 만드는 소재를 그린다 */}
        <div
          className="absolute flex items-center gap-[3%] overflow-hidden rounded-[14px] bg-[#eceef0] px-[4.5%]"
          style={BANNER_SLOT}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              {showBadge && (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-px text-[10px] leading-[15px] font-medium ${BADGE_STYLES[state.badgeStyle].className}`}
                >
                  {state.badgeText.trim()}
                </span>
              )}
              <span className="truncate text-[11px] leading-[17px] text-[rgba(6,11,17,0.6)]">
                {selectedCopy?.subtitle || '서브타이틀 입력해주세요'} · AD
              </span>
            </div>
            {/* 서브/메인 간격 — 목업 기준 4px */}
            <div className="mt-1 truncate text-[15px] leading-[22px] font-semibold text-ink">
              {selectedCopy?.maintitle || '메인타이틀 입력해주세요'}
            </div>
            <div className="mt-1 text-[6px] leading-[9px] text-[rgba(6,11,17,0.28)]">
              <p>손해보험협회 심의필 제70903 (2022.07.11~2023.02.07)</p>
              <p>손해보험협회 심의필 제70903 (2022.07.11~2023.02.07)</p>
            </div>
          </div>

          {/* 이미지 영역 — 로고를 쓰면 좌하단에 1/4 크기로 얹는다 */}
          <div className="relative aspect-square w-[22%] shrink-0 overflow-hidden rounded-lg">
            {bannerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerImageUrl} alt="배너 이미지" className="size-full object-contain" />
            ) : (
              <div className="size-full rounded-lg bg-[#dfe4e9]" aria-hidden />
            )}
            {showLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.logoUrl ?? ''}
                alt="브랜드 로고"
                className="absolute bottom-0 left-0 w-1/4 rounded-[2px] bg-white/90 object-contain"
              />
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[14px] leading-[22px] text-ink-muted">
        사용자의 디바이스와 기기 설정에 따라
        <br />
        실제 노출 화면과 다를 수 있어요.
      </p>
    </div>
  );
}
