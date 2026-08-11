import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_FLOW_STATE,
  isStepComplete,
  isValidLandingUrl,
  resolveBannerImageUrl,
  resolveBrandButtons,
  resolveObjectTag,
  type AiBannerFlowState,
} from '@/types/banner-flow';
import type { GeneratedImage } from '@/types/image-generation';
import type { CopyRecommendation } from '@/types/copy-generation';

function img(style: GeneratedImage['style'], url: string): GeneratedImage {
  return { style, imageUrl: url, widthPx: 240, heightPx: 240, sizeBytes: 100 };
}

const copy: CopyRecommendation = {
  pattern: '상황기반+문제제기',
  subtitle: '서브',
  maintitle: '메인',
  reason: '테스트용',
};

function build(overrides: Partial<AiBannerFlowState> = {}): AiBannerFlowState {
  return { ...INITIAL_FLOW_STATE, ...overrides };
}

// ── 1단계 완료 조건 ──────────────────────────────────────────────

test('소재 이름이 없으면 1단계는 끝나지 않는다', () => {
  const state = build({
    imageType: 'graphic',
    images: [img('style-1-3d-basic', 'a')],
    selectedImageStyle: 'style-1-3d-basic',
  });
  assert.equal(isStepComplete(state, 1), false);
});

test('이미지 유형을 안 고르면 1단계는 끝나지 않는다', () => {
  assert.equal(isStepComplete(build({ materialName: '여름 배너' }), 1), false);
});

test('그래픽: 이미지를 만들고 스타일을 골라야 끝난다', () => {
  const generated = build({
    materialName: '여름 배너',
    imageType: 'graphic',
    images: [img('style-1-3d-basic', 'a')],
  });
  assert.equal(isStepComplete(generated, 1), false, '고르기 전엔 미완료');

  const chosen = { ...generated, selectedImageStyle: 'style-1-3d-basic' as const };
  assert.equal(isStepComplete(chosen, 1), true);
});

test('제품: 업로드하면 끝난다 (생성 이미지가 없어도)', () => {
  // 회귀: 업로드 경로를 추가하고도 진행 조건이 images.length만 보던 탓에
  // 업로드해도 "다음 단계" 버튼이 회색으로 남아 있었다.
  const uploaded = build({
    materialName: '미래에셋 스마트머니',
    imageType: 'product',
    productImageUrl: 'data:image/png;base64,AAAA',
  });
  assert.equal(uploaded.images.length, 0);
  assert.equal(isStepComplete(uploaded, 1), true);
});

test('제품: 업로드 전에는 끝나지 않는다', () => {
  const state = build({ materialName: '미래에셋', imageType: 'product' });
  assert.equal(isStepComplete(state, 1), false);
});

// ── 2·3단계 ──────────────────────────────────────────────────────

test('2단계는 혜택 입력과 카피 선택이 모두 있어야 끝난다', () => {
  assert.equal(isStepComplete(build({ benefit: '10% 할인' }), 2), false);
  assert.equal(
    isStepComplete(build({ copyRecommendations: [copy], selectedCopyIndex: 0 }), 2),
    false,
  );
  assert.equal(
    isStepComplete(
      build({ benefit: '10% 할인', copyRecommendations: [copy], selectedCopyIndex: 0 }),
      2,
    ),
    true,
  );
});

// 3단계는 확인만 하는 화면이 아니다 — 등록 정보(랜딩 URL)를 받는다.
test('3단계는 랜딩 URL이 없으면 등록할 수 없다', () => {
  assert.equal(isStepComplete(build(), 3), false);
  assert.equal(isStepComplete(build({ landingUrl: '   ' }), 3), false);
});

test('3단계는 https 랜딩 URL이 있으면 통과한다', () => {
  assert.equal(isStepComplete(build({ landingUrl: 'https://pay.kakao.com/event' }), 3), true);
  // 앞뒤 공백은 붙여넣다 흔히 남는다 — 그것 때문에 막지 않는다
  assert.equal(isStepComplete(build({ landingUrl: '  https://pay.kakao.com  ' }), 3), true);
});

test('http와 형식이 깨진 주소는 등록 전에 막는다', () => {
  // 심사에서 반려되면 하루가 날아간다. 형식 검사는 사람이 아니라 코드가 한다.
  assert.equal(isValidLandingUrl('http://pay.kakao.com'), false);
  assert.equal(isValidLandingUrl('pay.kakao.com'), false);
  assert.equal(isValidLandingUrl('https://'), false);
  assert.equal(isValidLandingUrl(''), false);
  assert.equal(isValidLandingUrl('https://pay.kakao.com'), true);
});

// ── 미리보기 이미지 출처 ─────────────────────────────────────────

test('그래픽이면 고른 스타일의 이미지를 미리보기에 쓴다', () => {
  const state = build({
    imageType: 'graphic',
    images: [img('style-1-3d-basic', '3d'), img('style-2-2d-flat', '2d')],
    selectedImageStyle: 'style-2-2d-flat',
  });
  assert.equal(resolveBannerImageUrl(state), '2d');
});

test('제품이면 업로드한 이미지를 미리보기에 쓴다', () => {
  const state = build({ imageType: 'product', productImageUrl: 'uploaded' });
  assert.equal(resolveBannerImageUrl(state), 'uploaded');
});

test('이미지가 하나도 없으면 null이다', () => {
  assert.equal(resolveBannerImageUrl(build()), null);
});

// ── 카피 생성에 넘길 태그 ────────────────────────────────────────

test('오브젝트 명칭이 있으면 그것을 태그로 쓴다', () => {
  assert.equal(resolveObjectTag(build({ primaryObject: '쿠폰', materialName: '여름' })), '쿠폰');
});

test('제품 경로처럼 오브젝트 명칭이 없으면 소재 이름으로 대신한다', () => {
  // 회귀: 빈 문자열을 보내면 /api/generate-copy가 400을 돌려준다.
  const tag = resolveObjectTag(build({ imageType: 'product', materialName: '미래에셋 스마트머니' }));
  assert.equal(tag, '미래에셋 스마트머니');
  assert.notEqual(tag, '');
});

// ── 옐로우는 화면에 하나만 (디자인 시스템 §4) ──────────────────────
//
// 규칙이 문서와 주석에만 있어 두 번 깨졌다. 하단 CTA의 비활성 스타일을 지우면서
// 항상 옐로우가 되어 생성 버튼과 나란히 떴다. 이제 조합을 전부 돌려 확인한다.

test('어떤 상태에서도 옐로우 버튼이 둘 이상 되지 않는다', () => {
  const steps: Array<1 | 2 | 3> = [1, 2, 3];
  const bools = [false, true];
  let checked = 0;

  for (const step of steps)
    for (const imageType of ['graphic', 'product', null] as const)
      for (const hasObject of bools)
        for (const hasImages of bools)
          for (const hasSelectedStyle of bools)
            for (const hasProductUrl of bools)
              for (const generatingImages of bools)
                for (const hasBenefit of bools)
                  for (const hasCopies of bools)
                    for (const hasSelectedCopy of bools)
                      for (const generatingCopy of bools)
                        for (const landingUrl of ['', 'https://a.com', 'http://a.com']) {
                          const state = build({
                            step,
                            materialName: '소재',
                            imageType,
                            primaryObject: hasObject ? '쿠폰' : '',
                            productImageUrl: hasProductUrl ? 'data:image/png;base64,x' : null,
                            images: hasImages ? [img('style-1-3d-basic', 'a')] : [],
                            selectedImageStyle: hasSelectedStyle ? 'style-1-3d-basic' : null,
                            isGeneratingImages: generatingImages,
                            benefit: hasBenefit ? '혜택' : '',
                            copyRecommendations: hasCopies ? [copy] : [],
                            selectedCopyIndex: hasSelectedCopy && hasCopies ? 0 : null,
                            isGeneratingCopy: generatingCopy,
                            landingUrl,
                          });
                          const yellow = resolveBrandButtons(state);
                          assert.ok(
                            yellow.length <= 1,
                            `옐로우 ${yellow.length}개 (${yellow.join(', ')}) — step ${step}, ` +
                              `imageType ${imageType}, images ${hasImages}, benefit ${hasBenefit}`,
                          );
                          checked++;
                        }

  // 조합을 실제로 돌았는지 확인 — 루프가 비면 테스트가 조용히 통과한다
  assert.ok(checked > 4000, `조합 ${checked}개만 검사됨`);
});

test('단계를 끝내면 하단 CTA가, 아니면 생성 버튼이 옐로우다', () => {
  // 1단계: 오브젝트만 넣은 상태 → 생성 버튼
  assert.deepEqual(
    resolveBrandButtons(
      build({ step: 1, materialName: '소재', imageType: 'graphic', primaryObject: '쿠폰' }),
    ),
    ['generate-image'],
  );

  // 1단계: 이미지를 골랐으면 → 하단 CTA
  assert.deepEqual(
    resolveBrandButtons(
      build({
        step: 1,
        materialName: '소재',
        imageType: 'graphic',
        primaryObject: '쿠폰',
        images: [img('style-1-3d-basic', 'a')],
        selectedImageStyle: 'style-1-3d-basic',
      }),
    ),
    ['submit'],
  );

  // 생성 중에는 아무것도 옐로우가 아니다 — 지금 누를 게 없다
  assert.deepEqual(
    resolveBrandButtons(
      build({
        step: 1,
        materialName: '소재',
        imageType: 'graphic',
        primaryObject: '쿠폰',
        isGeneratingImages: true,
      }),
    ),
    [],
  );
});
