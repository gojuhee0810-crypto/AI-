// Design Ref: 스타일 2(2D 플랫) 동적 생성 시 항상 첨부하는 레퍼런스 이미지.
//
// 2026-08-04: 텍스트 프롬프트만으로는 아웃라인 유무·그라디언트 음영·조형을 정확히
// 재현하지 못한다는 걸 실제 테스트로 확인 (레퍼런스 이미지를 멀티모달로 첨부했을 때
// 훨씬 정확했음). 그래서 스타일 2는:
//   - 라이브러리(asset-library.ts) 매칭을 타지 않고 항상 Gemini 동적 생성
//   - 생성 시 텍스트 프롬프트(image-style-patterns.ts의 style2Flat2d) +
//     아래 앵커 이미지들을 함께 멀티모달로 첨부
// 스타일 1(3D)은 반대로 라이브러리 매칭을 우선 시도하고, 매칭 없을 때만 동적 생성한다.
//
// 앵커 3장은 서로 다른 오브젝트(저금통/지갑/폴더)를 보여줘서, 모델이 "이 3장의
// 공통점"(아웃라인 없음, 은은한 그라디언트, 밝은 채도)만 뽑아 쓰고 특정 1장에만 있는
// 디테일(예: 저금통의 떠있는 코인 배지)은 안 따라가게 유도한다.
export const STYLE2_ANCHOR_IMAGE_PATHS = [
  'docs/patterns/assets/style-anchors/2d-flat/piggy-bank-anchor.png',
  'docs/patterns/assets/style-anchors/2d-flat/wallet-anchor.png',
  'docs/patterns/assets/style-anchors/2d-flat/folder-anchor.png',
] as const;

export const STYLE2_ANCHOR_INSTRUCTION = `The attached reference images are all from the SAME icon set/family. Study what they share in common: outline-free semi-flat 2D icons, soft gradient shading inside rounded shapes, bright saturated colors, simple friendly silhouettes, clean vector-quality edges. Ignore anything that appears in only ONE of the references (e.g. a floating coin badge, or any letter/logo mark) — those are not part of the shared family style and must not be copied.`;
