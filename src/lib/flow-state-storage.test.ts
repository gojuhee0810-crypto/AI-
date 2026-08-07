import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPersisted, toPersisted } from './flow-state-storage';
import { INITIAL_FLOW_STATE, type AiBannerFlowState } from '@/types/banner-flow';
import type { GeneratedImage } from '@/types/image-generation';
import type { CopyRecommendation } from '@/types/copy-generation';

const image: GeneratedImage = {
  style: 'style-1-3d-basic',
  imageUrl: 'data:image/png;base64,AAAA',
  widthPx: 240,
  heightPx: 240,
  sizeBytes: 100,
};

const copy: CopyRecommendation = {
  pattern: '상황기반+문제제기',
  subtitle: '더위에 옷장만 열어보세요?',
  maintitle: '여름 스타일 지금 바꿔요',
  reason: '테스트용',
};

function build(overrides: Partial<AiBannerFlowState> = {}): AiBannerFlowState {
  return { ...INITIAL_FLOW_STATE, ...overrides };
}

/** 실제 저장 경로와 같게, 직렬화한 문자열을 만들어 되돌린다. */
function roundTrip(state: AiBannerFlowState): AiBannerFlowState | null {
  return fromPersisted(JSON.stringify(toPersisted(state)));
}

test('진행 중 플래그는 저장되지 않는다 (복원 시 영원히 도는 스피너 방지)', () => {
  const persisted = toPersisted(
    build({ isGeneratingImages: true, isGeneratingCopy: true, regeneratingStyle: 'style-1-3d-basic' }),
  );
  assert.equal(persisted.state.isGeneratingImages, false);
  assert.equal(persisted.state.isGeneratingCopy, false);
  assert.equal(persisted.state.regeneratingStyle, null);
});

test('생성 중에 새로고침해도 복원 결과는 대기 상태가 아니다', () => {
  const restored = roundTrip(build({ primaryObject: '쿠폰', isGeneratingImages: true }));
  assert.equal(restored?.isGeneratingImages, false);
  assert.equal(restored?.primaryObject, '쿠폰');
});

test('정상 상태는 그대로 복원된다', () => {
  const restored = roundTrip(
    build({
      step: 3,
      primaryObject: '쿠폰',
      benefit: '여름 옷 할인 10%',
      images: [image],
      copyRecommendations: [copy],
      selectedCopyIndex: 0,
    }),
  );
  assert.equal(restored?.step, 3);
  assert.equal(restored?.primaryObject, '쿠폰');
  assert.equal(restored?.benefit, '여름 옷 할인 10%');
  assert.equal(restored?.images.length, 1);
  assert.equal(restored?.selectedCopyIndex, 0);
});

test('저장된 값이 없으면 null이다', () => {
  assert.equal(fromPersisted(null), null);
  assert.equal(fromPersisted(''), null);
});

test('깨진 JSON은 복원하지 않는다', () => {
  assert.equal(fromPersisted('{'), null);
  assert.equal(fromPersisted('null'), null);
  assert.equal(fromPersisted('"문자열"'), null);
});

test('저장 형식 버전이 다르면 복원하지 않는다', () => {
  const old = JSON.stringify({ version: 0, state: build({ primaryObject: '쿠폰' }) });
  assert.equal(fromPersisted(old), null);
});

test('3단계인데 이미지가 없으면 1단계로 되돌린다', () => {
  const restored = roundTrip(build({ step: 3, selectedCopyIndex: 0, copyRecommendations: [copy] }));
  assert.equal(restored?.step, 1);
});

test('3단계인데 카피를 안 골랐으면 2단계로 되돌린다', () => {
  const restored = roundTrip(build({ step: 3, images: [image] }));
  assert.equal(restored?.step, 2);
});

test('2단계인데 이미지가 없으면 1단계로 되돌린다', () => {
  const restored = roundTrip(build({ step: 2 }));
  assert.equal(restored?.step, 1);
});

test('선택한 카피 인덱스가 범위를 벗어나면 선택을 지운다', () => {
  const restored = roundTrip(
    build({ step: 2, images: [image], copyRecommendations: [copy], selectedCopyIndex: 5 }),
  );
  assert.equal(restored?.selectedCopyIndex, null);
});

test('배열이어야 할 필드가 깨져 있으면 빈 배열로 채운다', () => {
  const broken = JSON.stringify({
    version: 1,
    state: { ...INITIAL_FLOW_STATE, images: 'not-an-array', copyRecommendations: null },
  });
  const restored = fromPersisted(broken);
  assert.deepEqual(restored?.images, []);
  assert.deepEqual(restored?.copyRecommendations, []);
});
