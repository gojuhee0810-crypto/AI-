'use client';

// Design Ref: Figma 1211:2999 / 1211:3115 — 카카오페이 광고센터 셸.
// 2026-08-08: Figma 실측값으로 교체. 사이드바는 검정이 아니라 밝은 회색(#f8f9fa)이다
// — 이전엔 스크린샷이 어두워 검정으로 잘못 읽었다.
// GNB 84px / LNB 250px, 스텝퍼는 LNB의 "AI 광고 배너" 하위 트리로 들어간다.

import { StepIndicator } from '@/components/shell/StepIndicator';

interface Props {
  currentStep: 1 | 2 | 3;
  onStepSelect?: (step: 1 | 2 | 3) => void;
  children: React.ReactNode;
}

export function AdStudioShell({ currentStep, onStepSelect, children }: Props) {
  return (
    // 내부 스크롤을 만들지 않고 브라우저 기본 스크롤을 쓴다. 화면이 세로로 길어도
    // GNB는 상단에, LNB는 헤더 바로 아래에 고정돼 길잡이가 사라지지 않는다.
    <div className="flex min-h-dvh flex-col bg-page">
      {/* GNB — dark */}
      <header className="sticky top-0 z-20 flex h-[84px] shrink-0 items-center justify-between bg-header px-[30px] text-white">
        <div className="flex items-center gap-2 text-[20px] font-semibold">
          <span>pay</span>
          <span className="text-white/30">|</span>
          <span className="text-[18px] font-normal">광고센터</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[14px] leading-[22px] text-white">id****id@naver.com</span>
          <button
            type="button"
            className="rounded-[24px] border border-white px-4 py-[7px] text-[14px] leading-[22px] font-medium text-white transition-[background-color,scale] duration-150 hover:bg-white/10 active:scale-[0.96]"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* LNB — 헤더(84px) 아래에 고정. 본문이 길어져도 잘리거나 밀리지 않는다. */}
        <aside className="sticky top-[84px] h-[calc(100dvh-84px)] w-[250px] shrink-0 self-start overflow-y-auto bg-sidebar pt-10">
          <div className="mx-auto flex w-[190px] flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[18px] leading-7 font-medium text-ink">
                카카오페이_2023240
              </span>
              <span aria-hidden className="text-xs text-ink-muted">
                ⌄
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="flex size-[22px] items-center justify-center rounded-full bg-accent-soft text-[11px] text-accent"
              >
                ●
              </span>
              <span className="text-[16px] leading-[26px] text-ink">마스터</span>
            </div>
          </div>

          <div className="mx-auto my-6 h-px w-[190px] bg-line" />

          {/* 트리: 광고 관리 > 소재 > AI 광고 배너 > 1·2·3 단계 */}
          <nav className="flex flex-col gap-1 px-[30px]">
            <div className="py-1.5">
              <span className="text-[16px] leading-[26px] text-ink-muted">광고 관리</span>
            </div>

            <div className="py-1.5 pl-3">
              <span className="text-[17px] leading-[26px] font-semibold text-ink">소재</span>
            </div>

            <div className="ml-3 rounded-lg bg-fill px-4 py-2.5">
              <span className="text-[17px] leading-[26px] font-semibold text-ink">
                AI 광고 배너
              </span>
            </div>

            <div className="mt-1">
              <StepIndicator currentStep={currentStep} onStepSelect={onStepSelect} />
            </div>

            <div className="mt-3 py-1.5">
              <span className="text-[16px] leading-[26px] text-ink-muted">광고계정 관리</span>
            </div>
          </nav>

          {/* 사이드바 접기 핸들은 뺐다(2026-08-09). Figma 광고센터 UI에는 있지만
              접는 동작을 붙이지 않아 눌러도 아무 일도 일어나지 않았다 —
              반응 없는 버튼은 없는 버튼보다 나쁘다. 접기 기능을 만들 때 같이 되살린다. */}
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
