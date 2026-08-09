'use client';

// Design Ref: 광고센터 하단 토스트(2026-08-09 사용자 제공) — 검은 알약에 ⚠ 아이콘.
//
// 필수 항목이 비었을 때 쓴다. 각 필드에 빨간 안내가 붙지만, 화면이 길면 비어 있는
// 칸이 접혀 있거나 스크롤 밖에 있어서 "왜 안 넘어가지"만 남는다. 토스트는 버튼을
// 누른 자리에서 이유를 알려준다.

import { useEffect } from 'react';

interface Props {
  message: string | null;
  onDismiss: () => void;
  /** 자동으로 사라지기까지(ms). 읽을 시간은 주되 화면에 눌러앉지 않게 한다. */
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 3000 }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    // role="status"라 스크린리더가 포커스를 뺏지 않고 읽어준다. alert로 두면
    // 하던 입력을 끊는다.
    <div
      role="status"
      className="pointer-events-none fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-[24px] bg-ink px-5 py-3 text-[15px] leading-[24px] font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)]"
    >
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-required text-[13px] leading-none font-bold text-white"
      >
        !
      </span>
      {message}
    </div>
  );
}
