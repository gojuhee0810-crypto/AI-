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

interface Base {
  label: string;
  /** `*`를 붙일지. 화면이 직접 붙이지 않는다 — 그래서 한쪽만 빠지는 일이 없다. */
  required?: boolean;
  /** 라벨에 간격 0으로 붙는 안내. 입력 규칙처럼 항목 전체에 걸린 설명이다. */
  description?: string;
  /** 라벨 오른쪽에 붙는 것 — InfoTooltip 등. */
  adornment?: ReactNode;
  /**
   * 사유 한 줄. 헬퍼 왼쪽.
   *
   * `null`을 넘기면 "지금은 에러가 없지만 생길 수 있다"는 뜻이라 헬퍼 줄이 자리를
   * 지킨다 — 에러가 떴다 사라질 때 아래 내용이 밀리지 않는다. 아예 안 넘기면
   * (`undefined`) 이 항목은 에러를 내지 않는 것으로 보고 줄을 만들지 않는다.
   */
  error?: string | null;
  /** 글자수. 헬퍼 오른쪽. */
  counter?: { value: string; limit: number };
  children: ReactNode;
}

/**
 * `htmlFor`는 단일 컨트롤일 때 **필수**다. 선택으로 두면 빠뜨릴 수 있고, 그러면
 * `<label>`이 아무것도 가리키지 않는다 — 이 컴포넌트가 막으려던 바로 그 버그다.
 *
 * 라디오 그룹은 가리킬 컨트롤이 하나가 아니라 `<label for>`를 쓸 수 없다.
 * `as="group"`으로 fieldset/legend가 되고, htmlFor는 받지 않는다.
 */
type Props =
  | (Base & { as?: 'field'; htmlFor: string })
  | (Base & { as: 'group'; htmlFor?: never });

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

export function FormField(props: Props) {
  const { label, required = false, description, adornment, error, counter, children } = props;
  const isGroup = props.as === 'group';
  const htmlFor = props.as === 'group' ? undefined : props.htmlFor;

  // <label>과 <legend>는 phrasing content만 담을 수 있다. div를 넣으면 명세를
  // 벗어나므로 span으로 쌓는다.
  const heading = (
    <span className="block">
      <span className={FORM_LABEL}>
        {label} {required && <span className="text-error">*</span>}
      </span>
      {description && <span className={`block ${TEXT.body14} text-ink-muted`}>{description}</span>}
    </span>
  );

  const titled = adornment ? (
    <span className="flex items-center gap-2">
      {heading}
      {adornment}
    </span>
  ) : (
    heading
  );

  // 헬퍼는 보여줄 게 있거나(카운터), 생길 수 있을 때(error를 관리하는 항목) 그린다.
  // 원본도 카운터 없는 필드에는 이 줄을 두지 않는다 — 항상 그리면 라디오 그룹·업로드
  // 상자 아래에 빈 25px이 남는다.
  const hasHelper = error !== undefined || counter !== undefined;

  const body = (
    <div>
      {children}
      {hasHelper && (
        <div className={`${FORM_HELPER} flex items-start justify-between gap-4`}>
          {/* role="alert"은 문구가 있을 때만. 빈 채로 두면 스크린리더가 자리표시자에
              대고 계속 알림을 준비한다. */}
          <p
            id={htmlFor ? `${htmlFor}-error` : undefined}
            role={error ? 'alert' : undefined}
            className="text-error"
          >
            {error ?? ''}
          </p>
          {counter ? <CharCount value={counter.value} limit={counter.limit} /> : <span />}
        </div>
      )}
    </div>
  );

  if (isGroup) {
    return (
      // fieldset은 기본 여백이 붙어 있어 눌러둔다.
      //
      // legend에 display:contents를 걸었다가 뺐다 — 일부 스크린리더가 그 legend를
      // 읽지 않는 알려진 함정이다. 라디오 각각에 required를 걸 수 없으므로
      // aria-required는 그룹에 준다.
      <fieldset
        className={`${FORM_FIELD} min-w-0 border-0 p-0`}
        aria-required={required || undefined}
      >
        <legend className="p-0">{titled}</legend>
        {body}
      </fieldset>
    );
  }

  return (
    <div className={FORM_FIELD}>
      <label htmlFor={htmlFor}>{titled}</label>
      {body}
    </div>
  );
}
