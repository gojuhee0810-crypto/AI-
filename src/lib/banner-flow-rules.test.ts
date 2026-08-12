import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_FLOW_STATE,
  isStepComplete,
  isValidLandingUrl,
  resolveBannerImageUrl,
  resolveBrandButtons,
  resolveButtonTone,
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

  // 생성 중에는 생성 버튼이 옐로우다 — 지금 벌어지는 일이 화면의 주인공이다
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
    ['generate-image'],
  );
});

// ── AI 생성 버튼의 4단계 (2026-08-11 사용자 버튼 가이드) ────────────
//
// 색 세 가지의 뜻이 겹치면 안 된다:
//   brand #FFEB00 지금 할 일 · support #EFF2F4 누를 순 있음 · disabled #FFF9AD 못 누름
//
// 실제로 "누를 수 있는 다시 생성하기"에 옅은 노랑을 썼다가 못 누르는 버튼과
// 같은 색이 됐다. 표를 그대로 테스트로 옮겨 둔다.

test('AI 이미지 생성 버튼은 입력 전·후·생성 중·완료 후로 색이 바뀐다', () => {
  const base = { step: 1 as const, materialName: '소재', imageType: 'graphic' as const };

  // ① 입력 전 — 못 누름
  assert.equal(resolveButtonTone(build(base), 'generate-image'), 'disabled');

  // ② 입력 후 — 지금 할 일
  assert.equal(
    resolveButtonTone(build({ ...base, primaryObject: '쿠폰' }), 'generate-image'),
    'brand',
  );

  // ③ 생성 중 — 여전히 옐로우(+ 로딩)
  assert.equal(
    resolveButtonTone(
      build({ ...base, primaryObject: '쿠폰', isGeneratingImages: true }),
      'generate-image',
    ),
    'brand',
  );

  // ④ 완료 후 — 누를 수 있지만 주인공은 하단 CTA로 넘어갔다
  assert.equal(
    resolveButtonTone(
      build({ ...base, primaryObject: '쿠폰', images: [img('style-1-3d-basic', 'a')] }),
      'generate-image',
    ),
    'support',
  );
});

test('AI 카피 버튼도 같은 4단계를 따른다', () => {
  const base = { step: 2 as const };

  assert.equal(resolveButtonTone(build(base), 'generate-copy'), 'disabled');
  assert.equal(resolveButtonTone(build({ ...base, benefit: '10% 할인' }), 'generate-copy'), 'brand');
  assert.equal(
    resolveButtonTone(build({ ...base, benefit: '10% 할인', isGeneratingCopy: true }), 'generate-copy'),
    'brand',
  );
  assert.equal(
    resolveButtonTone(
      build({ ...base, benefit: '10% 할인', copyRecommendations: [copy] }),
      'generate-copy',
    ),
    'support',
  );
});

test('생성이 도는 동안에는 하단 CTA로 넘어갈 수 없다', () => {
  // 안 그러면 생성 버튼과 CTA가 동시에 옐로우가 된다.
  const state = build({
    step: 1,
    materialName: '소재',
    imageType: 'graphic',
    primaryObject: '쿠폰',
    images: [img('style-1-3d-basic', 'a')],
    selectedImageStyle: 'style-1-3d-basic',
    isGeneratingImages: true,
  });
  assert.equal(isStepComplete(state, 1), true, '조건 자체는 차 있다');
  assert.equal(resolveButtonTone(state, 'submit'), 'disabled');
});

test('옅은 노랑은 못 누르는 버튼만 쓴다 — 누를 수 있으면 회색이다', () => {
  // 이 규칙이 깨지면 "다시 생성하기"가 비활성 버튼과 같은 색이 된다.
  const done = build({
    step: 1,
    materialName: '소재',
    imageType: 'graphic',
    primaryObject: '쿠폰',
    images: [img('style-1-3d-basic', 'a')],
  });
  assert.notEqual(
    resolveButtonTone(done, 'generate-image'),
    'disabled',
    '결과가 있으면 다시 만들 수 있으므로 disabled가 아니다',
  );
});
