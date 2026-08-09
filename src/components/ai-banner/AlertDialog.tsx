'use client';

// Design Ref: Figma 12:115606 — "01. Popup - default_pc" + "04. Popup - button (double)_pc".
// 아래 값은 전부 실측이다(추정 아님).
//
//   카드 폭 420 · radius 8 · 컨텐츠 pt32/px32/pb40 · 딤 rgba(6,11,17,0.6)
//   타이틀 24/35/-0.4 Medium · 본문 18/28/-0.2 Light · 둘 사이 24
//   확인 버튼 144×48 radius 24 · 16/26 Medium
//
// 값을 고치는 EditDialog와 달리 여기엔 선택지가 없다. 무슨 일이 있었는지 알리고
// 닫는 게 전부라 버튼도 하나다 — 취소를 붙이면 "취소하면 뭐가 되돌아가지?"를
// 생각하게 만든다.

import { useEffect, useRef } from 'react';
import { POPUP_BUTTON, POPUP_SHELL } from '@/components/ai-banner/popup';

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
      className={POPUP_SHELL}
    >
      {open && (
        <div className="flex flex-col items-center gap-6 px-8 pt-8 pb-10">
          {/* 줄바꿈은 문구가 정한다(whitespace-pre-line) — 브라우저에 맡기면
              "파일 형식이" / "아니에요"처럼 어색하게 끊긴다. */}
          <h2 className="text-center text-[24px] leading-[35px] font-medium tracking-[-0.4px] whitespace-pre-line text-ink">
            {title}
          </h2>
          {description && (
            <p className="text-center text-[18px] leading-7 font-light tracking-[-0.2px] whitespace-pre-line text-ink">
              {description}
            </p>
          )}

          <button type="button" autoFocus onClick={onClose} className={POPUP_BUTTON.primary}>
            확인
          </button>
        </div>
      )}
    </dialog>
  );
}
