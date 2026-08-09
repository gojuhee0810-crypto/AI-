'use client';

// Design Ref: 광고센터 모달 디자인 시스템(2026-08-09 사용자 제공).
// 흰 카드 radius 16, 안쪽 여백 32, 타이틀·버튼 가운데 정렬, 옐로우 pill 확인 버튼.
//
// 원본은 확인 버튼 하나짜리 알럿이다. 여기선 값을 고치는 폼이라 취소/저장 두 개를
// 나란히 두되 정렬과 크기는 그대로 따른다. 입력 필드만 좌측 정렬한다 —
// 가운데 정렬하면 라벨과 값이 서로 어긋나 읽는 눈이 계속 좌우로 튄다.
//
// 3단계에서 값을 고칠 때 앞 단계로 되돌아가지 않게 하려고 만들었다. 되돌아가면
// 3단계에서 채우던 등록 정보를 두고 나갔다가 다시 찾아 들어와야 한다.
//
// <dialog>를 쓴다. 포커스 가두기, Esc 닫기, 바깥 요소 비활성화를 브라우저가 처리하므로
// 라이브러리 없이 접근성이 맞는다.

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  /** 저장 버튼 활성 여부 — 비면 저장할 게 없는 상태다 */
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}

export function EditDialog({ open, title, canSave, onClose, onSave, children }: Props) {
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
      // m-auto가 있어야 화면 가운데 선다. <dialog>는 margin:auto로 가운데 정렬되는데
      // Tailwind 프리플라이트가 margin을 0으로 초기화한다.
      className="m-auto w-[400px] max-w-[calc(100vw-32px)] rounded-2xl bg-surface p-0 text-ink backdrop:bg-black/45"
    >
      {open && (
        <div className="flex flex-col gap-6 p-8">
          {/* Section title 20/30/-0.2 (디자인 시스템 §4), 가운데 정렬 */}
          <h2 className="text-center text-[20px] leading-[30px] font-semibold tracking-[-0.2px] text-balance text-ink">
            {title}
          </h2>

          {/* 입력은 좌측 정렬 — 가운데로 두면 라벨과 값이 어긋난다 */}
          <div className="max-h-[56vh] overflow-y-auto">{children}</div>

          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 min-w-[131px] rounded-[24px] bg-fill px-5 text-[16px] leading-[26px] font-medium text-ink transition-[background-color,scale] duration-150 hover:bg-[#e5e9ec] active:scale-[0.96]"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={onSave}
              className="h-11 min-w-[131px] rounded-[24px] bg-brand px-5 text-[16px] leading-[26px] font-medium text-ink transition-[background-color,scale] duration-150 enabled:hover:bg-[#f2df00] enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-muted"
            >
              저장
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
