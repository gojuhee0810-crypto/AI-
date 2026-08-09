'use client';

// Design Ref: 광고센터 알럿 모달(2026-08-09 사용자 제공) — 디자인 시스템 §6-4.
// 흰 카드 radius 16, 안쪽 여백 32, 전부 가운데 정렬, 확인 버튼 하나.
//
// 값을 고치는 EditDialog와 달리 여기엔 선택지가 없다. 무슨 일이 있었는지 알리고
// 닫는 게 전부라 버튼도 하나다 — 취소를 붙이면 "취소하면 뭐가 되돌아가지?"를
// 생각하게 만든다.

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}

export function AlertDialog({ open, title, description, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      // m-auto가 있어야 화면 가운데 선다 — Tailwind 프리플라이트가 margin을 0으로 만든다.
      className="m-auto w-[400px] max-w-[calc(100vw-32px)] rounded-2xl bg-surface p-0 text-ink backdrop:bg-black/45"
    >
      {open && (
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="flex flex-col items-center gap-3">
            {/* 줄바꿈은 문구가 정한다(whitespace-pre-line) — 브라우저에 맡기면
                "파일 형식이" / "아니에요"처럼 어색하게 끊긴다. */}
            <h2 className="text-center text-[20px] leading-[30px] font-semibold tracking-[-0.2px] whitespace-pre-line text-ink">
              {title}
            </h2>
            {description && (
              <p className="text-center text-[14px] leading-[22px] whitespace-pre-line text-ink-muted">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="h-11 min-w-[131px] rounded-[24px] bg-brand px-5 text-[16px] leading-[26px] font-medium text-ink transition-[background-color,scale] duration-150 hover:bg-[#f2df00] active:scale-[0.96]"
          >
            확인
          </button>
        </div>
      )}
    </dialog>
  );
}
