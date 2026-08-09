// Design Ref: 사용자가 "무조건 지켜야 한다"고 명시한 요구사항 — 오른쪽에 카카오페이
// 앱 컨텍스트 안에서 실시간 합성되는 배너 미리보기.
//
// 2026-08-08: DOM으로 앱 화면을 흉내내던 것을 실제 목업 PNG로 교체했다.
// (Figma 노드 1211:3006의 원본 이미지를 download_assets로 받아 public에 저장)
// 앱 화면은 이미지가 그리고, 우리는 배너 자리에만 소재를 얹는다 — 손으로 그린
// 근사치보다 정확하고, 앱 UI가 바뀌어도 이미지만 갈아끼우면 된다.

import { BenefitBadge } from '@/components/ai-banner/BenefitBadge';
import { resolveBannerImageUrl, type AiBannerFlowState } from '@/types/banner-flow';

/**
 * "새 피드" 플로팅 버튼을 덮는 자리 — 하단 목업 이미지(1125×646) 기준 비율.
 * 원본 절대좌표 x 400~740 / y 2010~2152를 잘라낸 위치로 환산한 값이다.
 */
const NEW_FEED_PATCH = {
  left: '35.6%',
  top: '34.1%',
  width: '30.2%',
  height: '22.0%',
} as const;

export function PreviewPanel({ state }: { state: AiBannerFlowState }) {
  // 그래픽이면 고른 스타일, 제품이면 업로드한 이미지 — resolveBannerImageUrl이 판단한다.
  const bannerImageUrl = resolveBannerImageUrl(state);
  const showBadge = state.accentType === 'badge' && state.badgeText.trim().length > 0;
  const showLogo = state.accentType === 'logo' && Boolean(state.logoUrl);
  const selectedCopy =
    state.selectedCopyIndex !== null ? state.copyRecommendations[state.selectedCopyIndex] : null;
  const noticeText = state.noticeText.trim();

  return (
    <div className="flex flex-col gap-4">
      {/* 다른 필드 라벨과 같은 크기·굵기(디자인 시스템 Field label 18/28 Medium) */}
      <h2 className="text-[18px] leading-7 font-medium text-ink">미리보기</h2>

      {/* 목업 폭은 미리보기 전체가 뷰포트(1440×900 기준) 안에 들어가도록 잡았다.
          이보다 크면 sticky가 무의미해져 스크롤할 때마다 미리보기가 잘린다. */}
      <div className="relative mx-auto w-[280px]">
        {/* 목업을 배너 자리에서 위·아래로 잘라 배너를 그 사이에 끼운다.
            통짜 이미지 위에 배너를 얹으면, 심의필이 붙어 배너가 세로로 늘어날 때
            아래 앱 화면이 안 밀리고 배너에 덮인다 — 실제 앱에서는 밀려 내려간다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/preview/pay-app-mockup-top.png"
          alt="카카오페이 앱 홈 화면"
          className="w-full rounded-t-[24px]"
        />

        {/* 배너 — 목업의 광고 영역을 대신하고 지금 만드는 소재를 그린다.
            여백·크기는 목업에 원래 그려져 있던 배너를 잘라 실측한 값이다
            (원본 1026×275 기준: 좌 74px=7.2%, 우 49px=4.8%).
            높이는 고정하지 않는다 — 안쪽 여백과 내용이 정한다. aspect-ratio로 묶으면
            안내 문구가 붙어도 안 늘어나고 잘린다. */}
        <div
          className="relative z-10 ml-[4.3%] flex w-[91.2%] items-center overflow-hidden rounded-lg bg-[#f3f4f5] pr-[4.8%] pl-[7.2%]"
        >
          {/* 세로 여백은 텍스트 쪽에만 준다. 배너 전체에 주면 이미지까지 밀려
              원본(이미지가 텍스트보다 크다)보다 배너가 두꺼워진다. */}
          <div className="min-w-0 flex-1 py-[6.5%]">
            <div className="truncate text-[11px] leading-4 text-[rgba(6,11,17,0.72)]">
              {selectedCopy?.subtitle || '서브타이틀 입력해주세요'} · AD
            </div>
            {/* 서브/메인 사이는 마진 없이 줄높이로만 띄운다 — 원본의 두 줄 간격
                (잉크 기준 30px ≈ 7.5px)이 딱 이 정도다. 마진을 더하면 두 줄이
                벌어져 한 덩어리로 안 읽힌다. */}
            <div className="truncate text-[14px] leading-5 font-semibold text-ink">
              {selectedCopy?.maintitle || '메인타이틀 입력해주세요'}
            </div>
            {/* 안내 문구(심의필) — 3단계에서 입력한 만큼만 나온다.
                고정 문구로 박아두면 안 쓰는 광고주 화면에도 남는다. */}
            {noticeText && (
              <p className="mt-1 text-[6px] leading-[9px] whitespace-pre-line text-[rgba(6,11,17,0.4)]">
                {noticeText}
              </p>
            )}
          </div>

          {/* 이미지는 폭 기준으로 잡는다 — 안내 문구가 붙어 배너가 세로로 늘어나도
              이미지까지 같이 커지면 안 된다.
              로고와 혜택 배지는 둘 다 이미지 좌측 하단에 얹힌다(하나만 고를 수 있다). */}
          <div className="relative my-[1%] ml-[3%] aspect-square w-[26.6%] shrink-0 self-center rounded-lg">
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
                className="absolute bottom-[8%] left-[4%] w-1/4 rounded-[2px] bg-white/90 object-contain"
              />
            )}
            {showBadge && (
              /* 폭이 이미지 대비 %라, 이미지를 키울 때 배지까지 같이 커진다.
                 배지 크기는 그대로 두기로 해서 이미지 배율만큼 나눠 잡았다
                 (이미지 19%→26.6%일 때 배지 56%→40%, 화면에 보이는 크기는 동일).
                 이미지 안쪽에 넣는다 — 밖으로 빼면 배너 모서리에 붙어 잘린 것처럼
                 보인다. 이미지와 겹치는 건 의도한 배치다. */
              <BenefitBadge
                text={state.badgeText}
                style={state.badgeStyle}
                className="absolute bottom-[8%] left-[4%] w-[40%]"
              />
            )}
          </div>
        </div>

        {/* 배너 아래 화면 — 배너가 늘어나면 이만큼 그대로 밀려 내려간다 */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/preview/pay-app-mockup-bottom.png"
            alt=""
            aria-hidden
            className="w-full rounded-b-[24px]"
          />
          {/* 목업에 구워진 "새 피드" 플로팅 버튼 가리기. 우리 소재와 무관한 앱 UI인데
              배너 바로 아래라 시선을 끈다. 알약 바깥으로 넘기면 뒤의 금융일정 카드까지
              지워지므로 버튼 실측 범위에만 맞춘다. */}
          <div className="absolute bg-white" style={NEW_FEED_PATCH} aria-hidden />
        </div>

        {/* 흰색 딤 — 앱 UI를 흐리게 눌러 지금 만드는 소재에 시선이 가게 한다.
            배너는 z-10으로 이 위에 있어 선명하게 남는다. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[24px] bg-white/60"
          aria-hidden
        />
      </div>

      <p className="text-center text-[14px] leading-[22px] text-ink-muted">
        사용자의 디바이스와 기기 설정에 따라
        <br />
        실제 노출 화면과 다를 수 있어요.
      </p>
    </div>
  );
}
