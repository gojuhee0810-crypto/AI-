// toBannerPng()가 GeneratedImage 타입의 240×240 계약을 실제로 지키는지 확인한다.
//
// 이 계약은 전에 세 곳(style1-generate, style2-generate, route의 라이브러리 경로)에
// 복사돼 있었고 아무도 검사하지 않았다. 라이브러리 원본은 1024×1536처럼 비율이
// 제각각이라, 리사이즈가 한 곳이라도 빠지면 240으로 선언된 타입이 거짓말을 한다.
//
// sharp는 로컬에서 돌아 네트워크가 필요 없다 — 외부 API를 부르는 생성 단계와 달리
// 이 자리는 전부 검사할 수 있다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { toBannerPng, BANNER_IMAGE_PX } from './banner-image';

/** 지정한 크기의 불투명 단색 PNG를 만든다. */
async function solidPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 200, g: 30, b: 30, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

test('정사각 원본을 240×240으로 맞춘다', async () => {
  const { buffer } = await toBannerPng(await solidPng(1024, 1024));
  const meta = await sharp(buffer).metadata();
  assert.equal(meta.width, BANNER_IMAGE_PX);
  assert.equal(meta.height, BANNER_IMAGE_PX);
});

test('회귀: 라이브러리 원본처럼 세로로 긴 이미지도 240×240이 된다 (1024×1536)', async () => {
  const { buffer } = await toBannerPng(await solidPng(1024, 1536));
  const meta = await sharp(buffer).metadata();
  assert.equal(meta.width, BANNER_IMAGE_PX);
  assert.equal(meta.height, BANNER_IMAGE_PX);
});

test('가로로 긴 이미지도 240×240이 된다', async () => {
  const { buffer } = await toBannerPng(await solidPng(1600, 400));
  const meta = await sharp(buffer).metadata();
  assert.equal(meta.width, BANNER_IMAGE_PX);
  assert.equal(meta.height, BANNER_IMAGE_PX);
});

test('240보다 작은 원본은 240으로 키운다', async () => {
  const { buffer } = await toBannerPng(await solidPng(64, 64));
  const meta = await sharp(buffer).metadata();
  assert.equal(meta.width, BANNER_IMAGE_PX);
  assert.equal(meta.height, BANNER_IMAGE_PX);
});

test('잘라내지 않는다 — 비율이 안 맞으면 여백을 투명으로 채운다', async () => {
  // 세로로 긴 원본이므로 좌우에 여백이 생긴다. 왼쪽 끝 픽셀은 투명이어야 한다.
  const { buffer } = await toBannerPng(await solidPng(240, 720));
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
  assert.equal(alphaAt(0, 120), 0, '왼쪽 여백이 투명해야 한다');
  assert.equal(alphaAt(239, 120), 0, '오른쪽 여백이 투명해야 한다');
  assert.ok(alphaAt(120, 120) > 0, '가운데는 원본이 남아 있어야 한다');
});

test('알파 채널이 있는 PNG로 나온다', async () => {
  const { buffer } = await toBannerPng(await solidPng(500, 500));
  const meta = await sharp(buffer).metadata();
  assert.equal(meta.format, 'png');
  assert.equal(meta.channels, 4);
});

test('PNG 시그니처로 시작한다 — data URL로 그대로 나가므로', async () => {
  const { buffer } = await toBannerPng(await solidPng(300, 300));
  assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
});

test('sizeBytes가 실제 버퍼 길이와 같다', async () => {
  const { buffer, sizeBytes } = await toBannerPng(await solidPng(800, 800));
  assert.equal(sizeBytes, buffer.byteLength);
});

test('원본이 투명 배경이어도 투명을 잃지 않는다', async () => {
  const transparent = await sharp({
    create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();
  const { buffer } = await toBannerPng(transparent);
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[(120 * info.width + 120) * info.channels + 3], 0);
});

test('이미지가 아닌 버퍼는 거절한다 — 조용히 빈 이미지를 내보내지 않는다', async () => {
  await assert.rejects(() => toBannerPng(Buffer.from('이건 이미지가 아니다')));
});

test('규격에 맞춘 결과는 매체 상한 500KB를 넘을 수 없다 — 최악의 입력으로 확인', async () => {
  // 압축이 전혀 안 되는 무작위 노이즈. 240×240 RGBA의 비압축 크기가 225KB라
  // PNG로 나온 결과도 그 언저리를 넘지 못한다. 상한 검사 대신 이 사실을 붙잡는다.
  const px = BANNER_IMAGE_PX * BANNER_IMAGE_PX * 4;
  const noise = Buffer.alloc(px);
  for (let i = 0; i < px; i++) noise[i] = Math.floor(Math.random() * 256);
  const source = await sharp(noise, {
    raw: { width: BANNER_IMAGE_PX, height: BANNER_IMAGE_PX, channels: 4 },
  })
    .png()
    .toBuffer();

  const { sizeBytes } = await toBannerPng(source);
  assert.ok(sizeBytes <= 500 * 1024, `최악의 경우가 ${Math.round(sizeBytes / 1024)}KB로 상한을 넘었다`);
});
