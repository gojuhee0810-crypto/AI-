// 배너 이미지의 규격을 지키는 자리는 여기 하나다.
//
// 전에는 같은 sharp 파이프라인이 세 벌 있었다 — style1-generate.ts, style2-generate.ts,
// route.ts의 라이브러리 경로. 셋 다 240×240 contain + 투명 배경 + PNG로 같았지만,
// 값이 세 곳에 있으면 한쪽만 고치게 된다(2026-08-11에 CharCounter가 3벌이라 색이
// 갈라진 것과 같은 자리). GeneratedImage 타입이 widthPx/heightPx를 240으로 고정하고
// 있으므로, 그 계약을 실제로 지키는 곳도 한 곳이어야 한다.

import sharp from 'sharp';
import { BANNER_IMAGE_PX, type BannerImage } from './banner-image-spec';

export { BANNER_IMAGE_PX, BANNER_IMAGE_MAX_BYTES, exceedsBannerSizeLimit } from './banner-image-spec';
export type { BannerImage } from './banner-image-spec';

/**
 * 임의 크기의 이미지를 배너 규격(240×240 PNG, 투명 배경)으로 맞춘다.
 *
 * `fit: 'contain'`이라 원본 비율을 유지하고 남는 자리는 투명으로 채운다 — 잘라내면
 * 오브젝트의 일부가 사라지는데, 아이콘은 실루엣 전체가 인식 단서라 잘리면 못 알아본다.
 */
export async function toBannerPng(input: Buffer): Promise<BannerImage> {
  const buffer = await sharp(input)
    .resize(BANNER_IMAGE_PX, BANNER_IMAGE_PX, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return { buffer, sizeBytes: buffer.byteLength };
}

// 결과가 500KB를 넘는지 여기서 검사하지 않는다 — 넘을 수 없기 때문이다.
// 240×240 RGBA의 비압축 크기가 225KB이고, 압축이 전혀 안 되는 무작위 노이즈를
// 넣어도 226KB였다(2026-08-13 실측). 발동할 수 없는 검사를 두면 읽는 사람이
// "여기서 걸러진다"고 믿게 된다. 상한이 실제로 문제되는 곳은 사용자 업로드
// 경로이고, 그쪽은 banner-image-client.ts가 같은 규격으로 맞춘다.
