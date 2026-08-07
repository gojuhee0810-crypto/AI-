// Design Ref: docs/guides/admin-design-system.md — 검정 헤더 + 다크 사이드바.
// Astryx 제거 후 순수 Tailwind로 재구현(2026-08-06).

export function AdStudioShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#222] bg-header px-6 text-white">
        <div className="flex items-center gap-2">
          <span className="font-bold">pay</span>
          <span className="text-[#555]">|</span>
          <span>광고센터</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#999]">id****id@naver.com</span>
          <button className="text-white hover:text-[#ccc]">로그아웃</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-[#222] bg-header p-4 text-white">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-bold">카카오페이_2023240</span>
              <span className="text-xs">⌄</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#ccc]">
              <span aria-hidden>👤</span>
              <span>마스터</span>
            </div>
            <div className="border-t border-[#222] pt-3">
              <div className="mb-2 text-xs font-bold text-[#999]">광고 관리</div>
              <div className="rounded-md bg-[#1a1a1a] px-3 py-2 text-sm">광고계정 관리</div>
            </div>
          </div>
          {/* 히트 영역 40×40 확보 — 보이는 원은 24px이지만 누를 수 있는 범위는 넓게 */}
          <button
            aria-label="사이드바 접기"
            className="flex h-10 w-10 items-center justify-center transition-[scale] duration-150 active:scale-[0.96]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#333] text-xs text-[#999] hover:border-[#555] hover:text-white">
              ‹
            </span>
          </button>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
