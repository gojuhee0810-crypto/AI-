// Design Ref: 사용자가 "무조건 지켜야 한다"고 명시한 요구사항 — 오른쪽에 카카오페이
// 앱 컨텍스트 안에서 실시간 합성되는 배너 미리보기.
// 2026-08-06: Astryx 제거, 순수 Tailwind로 재구현.
// TODO: 앱 화면 목업 이미지(PNG)를 받으면 배경으로 깔고 배너 영역만 오버레이하는
// 방식으로 교체 — 지금은 DOM으로 근사치 재현.

import {
  BADGE_STYLES,
  resolveBannerImageUrl,
  type AiBannerFlowState,
} from '@/types/banner-flow';

export function PreviewPanel({ state }: { state: AiBannerFlowState }) {
  // 그래픽이면 고른 스타일, 제품이면 업로드한 이미지 — resolveBannerImageUrl이 판단한다.
  const bannerImageUrl = resolveBannerImageUrl(state);
  const showBadge = state.accentType === 'badge' && state.badgeText.trim().length > 0;
  const selectedCopy =
    state.selectedCopyIndex !== null ? state.copyRecommendations[state.selectedCopyIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-ink">미리보기</h2>

      <div className="rounded-3xl bg-[#fafafa] p-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">pay</span>
            <span className="text-xs text-ink-muted">☰</span>
          </div>

          <div className="rounded-xl bg-[#f7f8fa] p-3">
            <div className="text-[11px] text-ink-muted">페이머니 · pay 충전</div>
            <div className="text-lg font-bold tabular-nums">100,067원</div>
          </div>

          {/* 실제 Fit 배너가 노출되는 위치 — 지금 만들고 있는 소재 */}
          <div className="flex items-center gap-2 rounded-xl bg-[#f7f8fa] p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {/* 혜택 배지 — 강조 요소로 배지를 고르고 문구를 넣었을 때만 */}
                {showBadge && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-px text-[10px] leading-[15px] font-medium ${BADGE_STYLES[state.badgeStyle].className}`}
                  >
                    {state.badgeText.trim()}
                  </span>
                )}
                <span className="truncate text-[11px] text-ink-muted">
                  {selectedCopy?.subtitle || '서브타이틀 입력해주세요'} · AD
                </span>
              </div>
              <div className="truncate text-sm font-bold text-ink">
                {selectedCopy?.maintitle || '메인타이틀 입력해주세요'}
              </div>
            </div>
            {bannerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerImageUrl}
                alt="배너 이미지"
                className="size-12 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-lg bg-[#e9ecef]" aria-hidden />
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-muted">
          사용자의 디바이스와 기기 설정에 따라
          <br />
          실제 노출 화면과 다를 수 있어요.
        </p>
      </div>
    </div>
  );
}
