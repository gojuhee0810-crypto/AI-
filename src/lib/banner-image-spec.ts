// 배너 이미지 규격 값. 서버(sharp)와 브라우저(canvas) 양쪽에서 읽으므로 런타임에
// 묶이지 않게 따로 둔다 — banner-image.ts는 sharp를 import해서 클라이언트 컴포넌트가
// 가져올 수 없다.
//
// 출처: docs/guides/kakaopay-banner-guide.md (매체 규격, 협상 불가)

/** 카카오페이 Fit 배너 이미지 한 변 */
export const BANNER_IMAGE_PX = 240;

/** 매체 상한. 넘으면 광고센터가 거절한다. */
export const BANNER_IMAGE_MAX_BYTES = 500 * 1024;

export interface BannerImage {
  buffer: Buffer;
  sizeBytes: number;
}

/** 매체 상한을 넘었는지. 넘어도 막지는 않고 부르는 쪽이 판단한다. */
export function exceedsBannerSizeLimit(sizeBytes: number): boolean {
  return sizeBytes > BANNER_IMAGE_MAX_BYTES;
}
