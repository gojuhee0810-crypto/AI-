'use client';

// Design Ref: Figma 12:115606 — "01. Popup - default_pc" + "04. Popup - button (double)_pc".
// 아래 값은 전부 실측이다(추정 아님).
//
//   카드 폭 420 · radius 8 · 딤 rgba(6,11,17,0.6)
//   본문 영역: pt32/px32/pb40, 타이틀↔본문 24
//   타이틀 24/35/-0.4 Medium · 본문 18/28/-0.2 Regular(DemiLight)
//   버튼 영역: 높이 80 고정, 버튼 144×48이 위에 붙고 아래 32
//   버튼 영역 위 34px 페이드(투명→흰색)
//
// 값을 고치는 EditDialog와 달리 여기엔 선택지가 없다. 무슨 일이 있었는지 알리고
// 닫는 게 전부라 버튼도 하나다 — 취소를 붙이면 "취소하면 뭐가 되돌아가지?"를
// 생각하게 만든다.

import { useEffect, useRef } from 'react';
import {
  POPUP_BODY,
  POPUP_BUTTON,
  POPUP_FADE,
  POPUP_FOOTER,
  POPUP_SHELL,
  POPUP_WIDTH,
} from '@/components/ai-banner/popup';
import { TEXT } from '@/components/ai-banner/fields';

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
      // 폭을 안 주면 내용에 맞게 줄어든다 — 실제로 258px로 서 있었고, 문구가
      // 짧은 알럿과 긴 알럿의 크기가 매번 달랐다.
      style={{ width: POPUP_WIDTH }}
      className={POPUP_SHELL}
    >
      {open && (
        <>
          <div className={POPUP_BODY}>
            {/* 줄바꿈은 문구가 정한다(whitespace-pre-line) — 브라우저에 맡기면
                "파일 형식이" / "아니에요"처럼 어색하게 끊긴다. */}
            <h2 className={`text-center whitespace-pre-line text-ink ${TEXT.title24Bold}`}>
              {title}
            </h2>
            {description && (
              // Title 18/Regular은 DemiLight(350)다. Pretendard에 그 굵기가 없어
              // font-light(300)로 받는다 — 원본과 한 단계 가늘다.
              <p className={`text-center font-light whitespace-pre-line text-ink ${TEXT.title18}`}>
                {description}
              </p>
            )}
          </div>

          <div className={POPUP_FOOTER}>
            <div aria-hidden className={POPUP_FADE} />
            <button type="button" autoFocus onClick={onClose} className={POPUP_BUTTON.primary}>
              확인
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
