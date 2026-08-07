'use client';

// Design Ref: 레퍼런스 스크린샷 "최종 선택" 화면 — 사용성 검토로 확정한 범위.
// 타겟팅 정보/시점(카메라 각도)은 뺐다: 앞 단계에 없던 정보가 여기 갑자기
// 나오면 출처가 불명확해서 혼란을 준다(2026-08-06 사용자 피드백으로 확정).
// "카피 변경하기"는 "이미지 변경하기"와 대칭으로 추가(레퍼런스엔 이미지 쪽만 있어
// 비대칭이었음 — UX 검토에서 발견).
// 2026-08-07: Astryx 제거, 순수 Tailwind로 재구현.

import type { AiBannerFlowState } from '@/types/banner-flow';

interface Props {
  state: AiBannerFlowState;
  patch: (next: Partial<AiBannerFlowState>) => void;
}

export function Step3ReviewPanel({ state, patch }: Props) {
  const selectedCopy =
    state.selectedCopyIndex !== null ? state.copyRecommendations[state.selectedCopyIndex] : null;
  const style1Image = state.images.find((img) => img.style === 'style-1-3d-basic');
  const style2Image = state.images.find((img) => img.style === 'style-2-2d-flat');

  if (!selectedCopy || state.images.length === 0) {
    return (
      <div className="rounded-lg bg-[#fffaf0] px-4 py-3">
        <p className="text-sm font-bold text-ink">이전 단계를 먼저 완료해주세요</p>
        <p className="mt-1 text-xs text-ink-muted">
          이미지와 카피를 모두 선택해야 최종 확인이 가능해요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-ink">선택한 배너 정보</h3>

        <dl className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
          <div className="flex items-start justify-between gap-4 px-4 py-4">
            <dt className="shrink-0 text-xs text-ink-muted">카피</dt>
            <dd className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-ink-muted">{selectedCopy.subtitle}</p>
                <p className="text-sm font-bold text-ink">{selectedCopy.maintitle}</p>
              </div>
              <button
                type="button"
                onClick={() => patch({ step: 2 })}
                className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-ink hover:bg-[#f7f8fa]"
              >
                카피 변경하기
              </button>
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <dt className="shrink-0 text-xs text-ink-muted">이미지</dt>
            <dd className="flex items-center gap-3">
              {style1Image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={style1Image.imageUrl} alt="스타일1" width={48} height={48} />
              )}
              {style2Image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={style2Image.imageUrl} alt="스타일2" width={48} height={48} />
              )}
              <button
                type="button"
                onClick={() => patch({ step: 1 })}
                className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-ink hover:bg-[#f7f8fa]"
              >
                이미지 변경하기
              </button>
            </dd>
          </div>

        </dl>
      </section>

      <p className="rounded-lg bg-[#f7f8fa] px-4 py-3 text-xs text-ink-muted">
        &lsquo;소재 등록하기&rsquo;는 광고센터 연동 기능이 아직 준비 중이라 이 데모에서는 동작하지
        않습니다.
      </p>
    </div>
  );
}
