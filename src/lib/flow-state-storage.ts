// 새로고침해도 작업 중이던 배너가 날아가지 않게 한다.
//
// 이미지·카피는 만드는 데 API 비용과 수십 초가 든다. 그걸 새로고침 한 번에 잃으면
// 사용자는 같은 시간을 다시 기다려야 하고, 그 지점에서 이탈할 가능성이 크다.
//
// sessionStorage를 쓴다(localStorage 아님): 새로고침은 버티되 탭을 닫으면 지운다.
// 일주일 전 만들다 만 배너가 갑자기 되살아나는 편이 더 혼란스럽기 때문이다.

import {
  INITIAL_FLOW_STATE,
  TRANSIENT_FLOW_KEYS,
  type AiBannerFlowState,
} from '@/types/banner-flow';

const STORAGE_KEY = 'ai-banner-flow';

/**
 * 저장 형식이 바뀌면 올린다. 예전 형식이 남아 있으면 복원하지 않고 버린다 —
 * 어설프게 복원해서 깨진 화면을 보여주느니 처음부터 시작하는 게 낫다.
 */
const STORAGE_VERSION = 1;

interface PersistedEnvelope {
  version: number;
  state: AiBannerFlowState;
}

/** 진행 중 플래그를 떼고 저장할 형태로 만든다. */
export function toPersisted(state: AiBannerFlowState): PersistedEnvelope {
  const next = { ...state };
  for (const key of TRANSIENT_FLOW_KEYS) {
    (next[key] as unknown) = INITIAL_FLOW_STATE[key];
  }
  return { version: STORAGE_VERSION, state: next };
}

/**
 * 저장된 문자열을 복원한다. 형식이 다르거나 깨졌으면 null을 돌려준다.
 *
 * 단계는 데이터가 허용하는 범위로 낮춘다. 저장된 단계가 3인데 이미지가 없으면
 * 들어가도 아무것도 못 하는 화면이라, 그 상태로 복원하면 사용자가 갇힌다.
 */
export function fromPersisted(raw: string | null): AiBannerFlowState | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const envelope = parsed as Partial<PersistedEnvelope>;
  if (envelope.version !== STORAGE_VERSION) return null;
  if (typeof envelope.state !== 'object' || envelope.state === null) return null;

  const merged: AiBannerFlowState = {
    ...INITIAL_FLOW_STATE,
    ...envelope.state,
    // 저장 시점에 지웠더라도 한 번 더 막는다.
    isGeneratingImages: false,
    isGeneratingCopy: false,
    regeneratingStyle: null,
  };

  if (!Array.isArray(merged.images)) merged.images = [];
  if (!Array.isArray(merged.copyRecommendations)) merged.copyRecommendations = [];
  if (!Array.isArray(merged.partialErrors)) merged.partialErrors = [];

  const hasImages = merged.images.length > 0;
  const hasCopy =
    merged.selectedCopyIndex !== null &&
    merged.selectedCopyIndex >= 0 &&
    merged.selectedCopyIndex < merged.copyRecommendations.length;

  if (!hasCopy) merged.selectedCopyIndex = null;
  if (merged.step === 3 && !(hasImages && hasCopy)) merged.step = hasImages ? 2 : 1;
  if (merged.step === 2 && !hasImages) merged.step = 1;

  return merged;
}

export function saveFlowState(state: AiBannerFlowState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(state)));
  } catch {
    // 대개 용량 초과다. 업로드한 제품 이미지가 base64로 수 MB까지 커질 수 있는데,
    // 그것 때문에 나머지(소재 이름·카피·선택)까지 통째로 못 남기면 손해가 크다.
    // 이미지만 빼고 한 번 더 시도한다 — 이미지는 다시 올릴 수 있지만
    // 40초 걸려 만든 카피는 그렇지 않다.
    try {
      const withoutUpload = toPersisted({ ...state, productImageUrl: null });
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(withoutUpload));
    } catch {
      // 프라이빗 모드 등으로 아예 못 쓰는 경우. 저장은 보조 장치라 조용히 넘어간다.
    }
  }
}

export function loadFlowState(): AiBannerFlowState | null {
  if (typeof window === 'undefined') return null;
  try {
    return fromPersisted(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearFlowState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시 — 지우기 실패가 사용자 흐름을 막아선 안 된다.
  }
}
