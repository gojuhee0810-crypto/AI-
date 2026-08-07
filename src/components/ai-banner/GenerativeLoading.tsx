'use client';

// 생성형 UI 공용 조각.
// 이미지/카피 생성은 수십 초가 걸린다. 그동안 스피너 하나만 돌리면 "멈춘 건가?"
// 싶어지므로, (1) 최종 결과와 같은 모양의 스켈레톤과 (2) 지금 뭘 하고 있는지
// 알려주는 진행 문구를 함께 보여준다.

import { useEffect, useState } from 'react';

/** 스켈레톤 블록 한 조각. shimmer 애니메이션은 globals.css에 정의돼 있다. */
export function Shimmer({ className = '' }: { className?: string }) {
  return <span className={`shimmer block rounded-md ${className}`} aria-hidden />;
}

/**
 * 진행 문구를 일정 간격으로 순환시킨다. 마지막 문구에 도달하면 거기서 멈춘다
 * — 실제 진행률이 아니라 체감 대기시간을 줄이는 장치라, 끝없이 도는 것보다
 * "마무리 중"에서 멈춰 있는 편이 덜 불안하다.
 */
export function ProgressStatus({
  messages,
  intervalMs = 3000,
}: {
  messages: string[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i < messages.length - 1 ? i + 1 : i));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [messages, intervalMs]);

  return (
    <p
      className="flex items-center gap-2 text-sm text-ink-muted"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink"
        aria-hidden
      />
      {messages[index]}
    </p>
  );
}
