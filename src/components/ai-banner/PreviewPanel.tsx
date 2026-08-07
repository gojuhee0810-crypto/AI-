// Design Ref: 사용자가 "무조건 지켜야 한다"고 명시한 요구사항 — 오른쪽에 카카오페이
// 앱 컨텍스트 안에서 실시간 합성되는 배너 미리보기.
// 2026-08-06: Astryx 제거, 순수 Tailwind로 재구현.
// TODO: 앱 화면 목업 이미지(PNG)를 받으면 배경으로 깔고 배너 영역만 오버레이하는
// 방식으로 교체 — 지금은 DOM으로 근사치 재현.

import type { AiBannerFlowState } from '@/app/(studio)/ai-banner/page';

export function PreviewPanel({ state }: { state: AiBannerFlowState }) {
  const bannerImage = state.images.find((img) => img.style === 'style-2-2d-flat') ?? state.images[0];
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
              <div className="truncate text-[11px] text-ink-muted">
                {selectedCopy?.subtitle || '서브타이틀 입력해주세요'} · AD
              </div>
              <div className="truncate text-sm font-bold text-ink">
                {selectedCopy?.maintitle || '메인타이틀 입력해주세요'}
              </div>
            </div>
            {bannerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerImage.imageUrl} alt="배너 이미지" width={48} height={48} className="shrink-0" />
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
