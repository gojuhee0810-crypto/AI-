import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // generate-image API가 런타임에 fs.readFile로 라이브러리 원본 이미지를 읽는다.
  // Next.js의 서버리스 파일 트레이싱은 동적 경로(`${...}`)를 못 따라가므로,
  // public/ 아래 라이브러리 이미지를 명시적으로 포함시켜야 Vercel에서도 읽힌다.
  outputFileTracingIncludes: {
    '/api/generate-image': ['./public/images/library/**', './public/images/library-2d/**'],
  },
};

export default nextConfig;
