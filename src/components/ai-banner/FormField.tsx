// 폼 항목 하나 — 원본 Form Field(1-components/form/form-field.yaml).
//
// 라벨·간격·헬퍼·접근성 속성을 화면마다 손으로 조립하다가 전부 갈라졌다:
// FieldLabel이 두 벌인데 한쪽만 `*`를 붙였고, 라벨이 안 연결된 입력이 다섯 개
// 있었고, required/aria-required는 전 화면에 하나도 없었다(2026-08-11 감사).
// 여기 한 곳이 조립하면 그렇게 될 수 없다.
//
//   라벨 (Title 18/Bold) + *
//    ↓ space/15
//   컨트롤
//    ↓ space/6
//   헬퍼 — 왼쪽 에러 문구 / 오른쪽 카운터
//    ↓ space/10  (다음 항목까지. 입력칸 바닥 기준으로는 35)
//
// 헬퍼 줄은 **비어 있어도 자리를 지킨다.** 없애면 그 항목만 25px 위로 붙고,
// 에러가 뜰 때 아래 내용이 밀린다.

import type { ReactNode } from 'react';
import { CharCount } from '@/components/ai-banner/CharCounter';
import { FORM_FIELD, FORM_HELPER, FORM_LABEL } from '@/components/ai-banner/fields';

interface Props {
  /** 라벨 문구. `*`는 required가 붙인다 — 화면마다 다르게 붙이지 않게. */
  label: string;
  /** 컨트롤의 id. `<label for>`로 연결된다 — 이게 없으면 스크린리더가 이름을 못 읽는다. */
  htmlFor: string;
  required?: boolean;
  /** 사유 한 줄. null이면 헬퍼 왼쪽이 비고 자리는 남는다. */
  error?: string | null;
  /** 오른쪽 글자수. 없으면 안 그린다. */
  counter?: { value: string; limit: number };
  /** 라벨 옆에 붙는 것 — 툴팁 등. */
  adornment?: ReactNode;
  children: ReactNode;
}

/** 컨트롤에 그대로 펼쳐 넣을 접근성 속성. */
export function fieldProps(id: string, required: boolean, error: string | null | undefined) {
  return {
    id,
    required,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  } as const;
}

export function FormField({
  label,
  htmlFor,
  required = false,
  error,
  counter,
  adornment,
  children,
}: Props) {
  return (
    <div className={FORM_FIELD}>
      {adornment ? (
        <div className="flex items-center gap-2">
          <label htmlFor={htmlFor} className={FORM_LABEL}>
            {label} {required && <span className="text-error">*</span>}
          </label>
          {adornment}
        </div>
      ) : (
        <label htmlFor={htmlFor} className={FORM_LABEL}>
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div>
        {children}
        {/* role="alert"은 문구가 있을 때만 붙인다 — 빈 채로 두면 스크린리더가
            자리표시자에 대고 계속 알림을 준비한다. */}
        <div className={`${FORM_HELPER} flex items-start justify-between gap-4`}>
          <p id={`${htmlFor}-error`} role={error ? 'alert' : undefined} className="text-error">
            {error ?? ''}
          </p>
          {counter ? <CharCount value={counter.value} limit={counter.limit} /> : <span />}
        </div>
      </div>
    </div>
  );
}
