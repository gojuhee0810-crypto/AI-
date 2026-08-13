// 업로드한 이미지를 배너 규격으로 맞춘다 — 브라우저에서 도는 toBannerPng의 짝.
//
// 왜 별도 파일인가: sharp는 Node 전용이라 클라이언트 컴포넌트가 banner-image.ts를
// 가져올 수 없다. 규격 값(240 · 500KB)은 banner-image-spec.ts 한 곳에서 읽으므로
// 두 구현이 갈라지지 않는다.
//
// 왜 필요한가: 업로드 이미지는 resolveBannerImageUrl이 그대로 배너로 쓴다. 업로드
// 규칙은 JPEG·400×400·1MB까지 허용하는데 매체 규격은 PNG·240×240·500KB라, 가공 없이
// 넘기면 광고센터가 등록 단계에서 거절한다 — 사용자는 소재를 다 만든 뒤에야 안다.

import { BANNER_IMAGE_PX } from './banner-image-spec';

/**
 * data URL 이미지를 240×240 PNG로 맞춘다. 비율은 유지하고 남는 자리는 투명으로 둔다
 * (서버의 `fit: 'contain'`과 같은 규칙 — 잘라내면 제품의 일부가 사라진다).
 *
 * 브라우저 전용이다. canvas가 없는 환경에서는 부르지 않는다.
 */
export async function fitToBannerSpec(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = BANNER_IMAGE_PX;
  canvas.height = BANNER_IMAGE_PX;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d 컨텍스트를 만들 수 없습니다.');

  const { width, height, x, y } = containBox(image.naturalWidth, image.naturalHeight);
  ctx.drawImage(image, x, y, width, height);

  // toDataURL('image/png')은 항상 PNG로 낸다 — JPEG를 올려도 여기서 PNG가 된다.
  return canvas.toDataURL('image/png');
}

/** 원본 비율을 유지한 채 240×240 안에 들어가는 크기와 위치를 구한다. */
export function containBox(
  sourceWidth: number,
  sourceHeight: number,
  box = BANNER_IMAGE_PX,
): { width: number; height: number; x: number; y: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: box, height: box, x: 0, y: 0 };
  }
  const scale = Math.min(box / sourceWidth, box / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { width, height, x: (box - width) / 2, y: (box - height) / 2 };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
    image.src = src;
  });
}
