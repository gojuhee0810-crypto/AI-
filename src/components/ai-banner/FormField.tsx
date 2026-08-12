// 폼 항목 하나 — 원본 Form Field(1-components/form/form-field.yaml).
//
//   라벨 (Title 18/Bold) + *
//   설명 (Body 14/Regular)     ← 간격 0. 라벨에 붙는다
//    ↓ space/15
//   컨트롤
//     ├ 선택지 A               ← 그룹이면
//     │  ↓ space/12            ← 형제끼리 (FormOptions)
//     └ 선택지 B
//    ↓ space/6
//   헬퍼 / 카운터
//    ↓ space/50                ← 다음 항목까지 (부모 FORM_STACK)
//
// 값은 상수가 이미 지키고 있었다. 이 컴포넌트가 막는 건 **조립**이다 —
// 화면마다 손으로 세우다가 이렇게 갈렸다(2026-08-11 감사):
//
//   · FieldLabel이 두 벌인데 한쪽만 `*`를 붙였다
//   · 라벨이 연결되지 않은 입력이 다섯 개
//   · required / aria-required가 전 화면에 0건
//   · aria-invalid는 기억나는 곳에만
//   · 설명 문구가 라벨 아래·컨트롤 안·라벨 옆 세 군데로 흩어졌다

import type { ReactNode } from 'react';
import { CharCount } from '@/components/ai-banner/CharCounter';
import {
  FORM_FIELD,
  FORM_HELPER,
  FORM_LABEL,
  FORM_OPTIONS,
  TEXT,
} from '@/components/ai-banner/fields';

interface Props {
  label: string;
  /** `*`를 붙일지. 화면이 직접 붙이지 않는다 — 그래서 한쪽만 빠지는 일이 없다. */
  required?: boolean;
  /** 라벨에 간격 0으로 붙는 안내. 입력 규칙처럼 항목 전체에 걸린 설명이다. */
  description?: string;
  /** 라벨 오른쪽에 붙는 것 — InfoTooltip 등. */
  adornment?: ReactNode;

  /** 사유 한 줄. 헬퍼 왼쪽. */
  error?: string | null;
  /** 글자수. 헬퍼 오른쪽. */
  counter?: { value: string; limit: number };

  /**
   * 컨트롤이 하나면 그 id를 준다 — `<label for>`로 연결된다.
   * 라디오 그룹처럼 여럿이면 `as="group"`을 쓴다(가리킬 컨트롤이 하나가 아니라
   * `<label for>`를 쓸 수 없다. 빈 label을 두면 스크린리더가 이름을 못 읽는다).
   */
  htmlFor?: string;
  as?: 'field' | 'group';

  children: ReactNode;
}

/**
 * 컨트롤에 그대로 펼쳐 넣는 접근성 속성.
 *
 * `error`를 넘기면 aria-invalid와 aria-describedby가 함께 걸린다 — 붉게만 칠하고
 * 스크린리더에는 아무것도 안 가던 상태를 막는다.
 */
export function fieldProps(id: string, required: boolean, error?: string | null) {
  return {
    id,
    required,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  } as const;
}

/** 형제 선택지끼리 space/12. 라디오 그룹을 감쌀 때 쓴다. */
export function FormOptions({ children }: { children: ReactNode }) {
  return <div className={FORM_OPTIONS}>{children}</div>;
}

export function FormField({
  label,
  required = false,
  description,
  adornment,
  error,
  counter,
  htmlFor,
  as = 'field',
  children,
}: Props) {
  const isGroup = as === 'group';
  const helperId = htmlFor ? `${htmlFor}-error` : undefined;

  // 라벨과 설명은 간격 0으로 붙어 하나의 덩어리가 된다 — 행간으로만 벌어진다.
  const heading = (
    <div>
      <span className={FORM_LABEL}>
        {label} {required && <span className="text-error">*</span>}
      </span>
      {description && <span className={`block ${TEXT.body14} text-ink-muted`}>{description}</span>}
    </div>
  );

  const helper = (
    // 헬퍼는 흐름 안에 둔다. 해부도상 Form Field의 일부이고, 다음 항목까지의
    // space/50은 이 줄 아래에서 재는 값이다.
    <div className={`${FORM_HELPER} flex items-start justify-between gap-4`}>
      {/* role="alert"은 문구가 있을 때만. 빈 채로 두면 스크린리더가 자리표시자에
          대고 계속 알림을 준비한다. */}
      <p id={helperId} role={error ? 'alert' : undefined} className="text-error">
        {error ?? ''}
      </p>
      {counter ? <CharCount value={counter.value} limit={counter.limit} /> : <span />}
    </div>
  );

  const body = (
    <div>
      {children}
      {(error || counter) && helper}
    </div>
  );

  if (isGroup) {
    return (
      // fieldset은 기본 스타일이 붙으므로 min-w-0으로 눌러둔다(flex 안에서 안 줄어드는 문제).
      <fieldset className={`${FORM_FIELD} min-w-0`}>
        <legend className="contents">
          {adornment ? (
            <span className="flex items-center gap-2">
              {heading}
              {adornment}
            </span>
          ) : (
            heading
          )}
        </legend>
        {body}
      </fieldset>
    );
  }

  return (
    <div className={FORM_FIELD}>
      {adornment ? (
        <div className="flex items-center gap-2">
          <label htmlFor={htmlFor}>{heading}</label>
          {adornment}
        </div>
      ) : (
        <label htmlFor={htmlFor}>{heading}</label>
      )}
      {body}
    </div>
  );
}
