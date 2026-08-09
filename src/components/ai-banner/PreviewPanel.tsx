// Design Ref: 사용자가 "무조건 지켜야 한다"고 명시한 요구사항 — 오른쪽에 카카오페이
// 앱 컨텍스트 안에서 실시간 합성되는 배너 미리보기.
//
// 2026-08-08: 사용자가 준 실제 앱 화면 목업에 맞춰 재구성했다.
// 배너를 뺀 나머지(페이머니 카드·아이콘 그리드·금융일정·탭바)는 흐리게 두어
// 지금 만들고 있는 소재에 시선이 가게 한다 — 목업 스크린샷도 같은 처리였다.

import {
  BADGE_STYLES,
  resolveBannerImageUrl,
  type AiBannerFlowState,
} from '@/types/banner-flow';

const QUICK_MENU = [
  '결제',
  '내계좌혜택',
  '내문서함',
  '내대출한도',
  '신용관리',
  '내카드한도',
  '보험상품',
  '전체',
];

const TAB_MENU = ['홈', '혜택', '결제', '자산', '주식'];

export function PreviewPanel({ state }: { state: AiBannerFlowState }) {
  // 그래픽이면 고른 스타일, 제품이면 업로드한 이미지 — resolveBannerImageUrl이 판단한다.
  const bannerImageUrl = resolveBannerImageUrl(state);
  const showBadge = state.accentType === 'badge' && state.badgeText.trim().length > 0;
  const showLogo = state.accentType === 'logo' && Boolean(state.logoUrl);
  const selectedCopy =
    state.selectedCopyIndex !== null ? state.copyRecommendations[state.selectedCopyIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* 다른 필드 라벨과 같은 크기·굵기로 맞춘다(디자인 시스템 Field label 18/28 Medium) */}
      <h2 className="text-[18px] leading-7 font-medium text-ink">미리보기</h2>

      <div className="mx-auto w-[360px] overflow-hidden rounded-[28px] bg-white shadow-[0_0_0_1px_var(--color-line),0_8px_24px_rgba(0,0,0,0.06)]">
        {/* 앱 헤더 */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 opacity-45">
          <span className="text-[17px] font-bold text-ink">◗ pay</span>
          <span className="flex items-center gap-3 text-[15px] text-ink-muted">
            <span aria-hidden>⌕</span>
            <span aria-hidden>♤</span>
            <span aria-hidden>☰</span>
          </span>
        </div>

        {/* 페이머니 카드 */}
        <div className="mx-4 rounded-2xl bg-[#f7f8fa] p-4 opacity-45">
          <div className="text-[11px] text-ink-muted">페이머니 · pay 충전 ⓘ</div>
          <div className="mt-1 text-[22px] leading-[30px] font-bold tabular-nums text-ink">
            100,067원 <span className="text-[14px] font-normal text-ink-muted">›</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-full bg-[#d8e9ff] px-3 py-1.5 text-[12px] font-medium text-[#0068d6]">
              여기까지 충전 ›
            </span>
            <span className="flex gap-1.5">
              <span className="rounded-full bg-[#eef1f4] px-3 py-1.5 text-[12px] text-ink">
                충전
              </span>
              <span className="rounded-full bg-brand px-3 py-1.5 text-[12px] text-ink">송금</span>
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e4e8ec]">
            <div className="h-full w-1/3 rounded-full bg-[#4a9eff]" />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
            <span>30만원까지 연 5%</span>
            <span>100만원까지 연 2.5%</span>
          </div>
        </div>

        {/* 퀵메뉴 그리드 */}
        <div className="mx-4 mt-3 grid grid-cols-4 gap-y-4 rounded-2xl bg-[#f7f8fa] p-4 opacity-45">
          {QUICK_MENU.map((label) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <span className="size-6 rounded-md bg-[#dfe4e9]" aria-hidden />
              <span className="text-[10px] text-ink-muted">{label}</span>
            </div>
          ))}
        </div>

        {/* ── 실제 Fit 배너가 노출되는 위치 — 지금 만들고 있는 소재 ── */}
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-[#eceef0] px-4 py-3.5">
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
            {/* 서브/메인 사이 간격 — 목업 기준 4px */}
            <div className="mt-1 truncate text-[15px] leading-[22px] font-semibold text-ink">
              {selectedCopy?.maintitle || '메인타이틀 입력해주세요'}
            </div>
            <div className="mt-1.5 text-[6px] leading-[9px] text-[rgba(6,11,17,0.28)]">
              <p>손해보험협회 심의필 제70903 (2022.07.11~2023.02.07)</p>
              <p>손해보험협회 심의필 제70903 (2022.07.11~2023.02.07)</p>
            </div>
          </div>

          {/* 이미지 영역 — 로고를 쓰면 좌하단에 1/4 크기로 얹는다 */}
          <div className="relative size-[68px] shrink-0 overflow-hidden rounded-xl">
            {bannerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerImageUrl}
                alt="배너 이미지"
                className="size-full object-contain"
              />
            ) : (
              <div className="size-full rounded-xl bg-[#dfe4e9]" aria-hidden />
            )}
            {showLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.logoUrl ?? ''}
                alt="브랜드 로고"
                className="absolute bottom-0 left-0 size-[17px] rounded-[3px] bg-white/90 object-contain"
              />
            )}
          </div>
        </div>

        {/* 금융일정 */}
        <div className="mx-4 mt-3 rounded-2xl bg-[#f7f8fa] p-4 opacity-45">
          <div className="flex items-center justify-between text-[11px] text-ink-muted">
            <span>금융일정</span>
            <span>12분 전 ›</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="size-7 rounded-full bg-[#dfe4e9]" aria-hidden />
            <span className="text-[12px] text-ink">3일 후</span>
            <span className="ml-auto text-[13px] font-bold tabular-nums text-ink">945,600원</span>
          </div>
        </div>

        {/* 하단 탭바 */}
        <div className="mt-4 flex items-center justify-around border-t border-line px-2 py-3 opacity-45">
          {TAB_MENU.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span
                className={`size-5 rounded-md ${i === 0 ? 'bg-[#c3d9f5]' : 'bg-[#e4e8ec]'}`}
                aria-hidden
              />
              <span className={`text-[10px] ${i === 0 ? 'text-ink' : 'text-ink-muted'}`}>
                {label}
              </span>
            </div>
          ))}
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
