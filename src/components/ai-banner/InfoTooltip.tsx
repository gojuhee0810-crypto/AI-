'use client';

// Design Ref: Figma "02. Tooltip - black_pc component" — 검정 말풍선.
// ⓘ 아이콘 오른쪽에 꼬리(삼각형)가 달린 형태로 뜬다.
//
// Step1·Step2에 같은 코드가 중복돼 있어 하나로 뺐다. 세 번째 쓰임이 생긴 시점이
// 뽑을 때다.

import { useState } from 'react';

export function InfoTooltip({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={text}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="flex size-[18px] items-center justify-center rounded-full border border-ink-muted text-[11px] leading-none text-ink-muted transition-colors duration-150 hover:border-ink hover:text-ink"
      >
        i
      </button>

      {isOpen && (
        <span
          role="tooltip"
          className="absolute top-1/2 left-[calc(100%+10px)] z-20 -translate-y-1/2"
        >
          <span className="relative block rounded-lg bg-ink px-3 py-2 text-[14px] leading-[22px] font-medium whitespace-nowrap text-white">
            {text}
            {/* 꼬리 — 정사각형을 45도 돌려 말풍선 왼쪽 변에 붙인다 */}
            <span
              aria-hidden
              className="absolute top-1/2 left-[-3px] size-2 -translate-y-1/2 rotate-45 rounded-[1px] bg-ink"
            />
          </span>
        </span>
      )}
    </span>
  );
}
