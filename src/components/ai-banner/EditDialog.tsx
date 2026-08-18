'use client';

// Design Ref: Figma 12:115606 팝업 컴포넌트 — 껍데기·버튼 값은 popup.ts에 모아 뒀다.
//
// 원본은 확인 버튼 하나짜리 알럿이다. 여기선 값을 고치는 폼이라 취소/저장 두 개를
// 나란히 둔다 — 폭은 고정 144px이 아니라 본문(위 카드 영역)과 같은 좌우 여백 안에서
// flex-1로 반반 나눈다(2026-08-19 확정, popup.ts BUTTON_BASE 참조).
// 입력 필드만 좌측 정렬한다 — 가운데 정렬하면 라벨과 값이 어긋나 눈이 좌우로 튄다.
//
// 3단계에서 값을 고칠 때 앞 단계로 되돌아가지 않게 하려고 만들었다. 되돌아가면
// 3단계에서 채우던 등록 정보를 두고 나갔다가 다시 찾아 들어와야 한다.
//
// <dialog>를 쓴다. 포커스 가두기, Esc 닫기, 바깥 요소 비활성화를 브라우저가 처리하므로
// 라이브러리 없이 접근성이 맞는다.

import { useEffect, useRef } from 'react';
import {
  POPUP_BUTTON,
  POPUP_BUTTON_GAP,
  POPUP_SHELL,
  POPUP_WIDTH,
} from '@/components/ai-banner/popup';

interface Props {
  open: boolean;
  title: string;
  /** 저장 버튼 활성 여부 — 비면 저장할 게 없는 상태다 */
  canSave: boolean;
  /**
   * 카드 폭(px). 기본은 팝업 규격 420이고, 고를 것이 여럿인 모달은 넓힌다 —
   * 좁은 카드에 선택지를 우겨넣으면 카피가 줄바꿈돼 서로 비교가 안 된다.
   */
  width?: number;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}

export function EditDialog({
  open,
  title,
  canSave,
  width = POPUP_WIDTH,
  onClose,
  onSave,
  children,
}: Props) {
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
      // Esc는 브라우저가 닫아버리므로 막고 우리 상태로 닫는다 — 안 그러면
      // 화면은 닫혔는데 open이 true로 남아 다시 못 연다.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // 배경(백드롭)을 누르면 닫는다. dialog 자신이 이벤트 대상일 때가 배경이다.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      style={{ width }}
      className={POPUP_SHELL}
    >
      {open && (
        <div className="flex flex-col gap-6 px-8 pt-8 pb-10">
          {/* 타이틀 24/35/-0.4 — 팝업 규격(Figma 실측) */}
          <h2 className="text-center text-[24px] leading-[35px] font-medium tracking-[-0.4px] text-balance text-ink">
            {title}
          </h2>

          {/* 입력은 좌측 정렬 — 가운데로 두면 라벨과 값이 어긋난다 */}
          <div className="max-h-[56vh] overflow-y-auto">{children}</div>

          {/* justify-center를 안 쓴다 — 버튼이 flex-1이라 이미 폭을 다 채운다.
              남는 폭이 있으면 그건 실수로 안 채워진 것이지, 가운데로 몰아야 할
              여백이 아니다. */}
          <div className="flex" style={{ gap: POPUP_BUTTON_GAP }}>
            <button type="button" onClick={onClose} className={POPUP_BUTTON.support}>
              취소
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={onSave}
              className={POPUP_BUTTON.primary}
            >
              저장
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
