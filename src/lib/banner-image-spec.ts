// 배너 이미지 규격 값. 서버(sharp)와 브라우저(canvas) 양쪽에서 읽으므로 런타임에
// 묶이지 않게 따로 둔다 — banner-image.ts는 sharp를 import해서 클라이언트 컴포넌트가
// 가져올 수 없다.
//
// 출처: docs/guides/kakaopay-banner-guide.md (매체 규격, 협상 불가)

/** 카카오페이 Fit 배너 이미지 한 변 */
export const BANNER_IMAGE_PX = 240;

// 매체 상한은 500KB지만 상수로 두지 않는다 — 240×240 RGBA의 비압축 크기가 225KB고
// 압축 불가능한 노이즈도 226KB였다(2026-08-13 실측). 규격에 맞춘 이미지는 넘을 수
// 없어서 검사할 자리가 없다. 상수와 판정 함수를 뒀더니 테스트만 부르는 죽은 코드가 됐다.

export interface BannerImage {
  buffer: Buffer;
  sizeBytes: number;
}
