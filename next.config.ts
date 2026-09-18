import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp는 플랫폼별 네이티브 바이너리를 쓴다. 번들링에 맡기면 macOS에서 빌드한 걸
  // Vercel의 Linux 런타임이 못 읽어서, import 시점에 route.ts 전체가 죽는다(요청
  // 내용과 무관하게 항상 500). 번들링하지 말고 Node의 require로 그대로 두게 한다.
  serverExternalPackages: ['sharp'],
  // generate-image API가 런타임에 fs.readFile로 라이브러리 원본 이미지를 읽는다.
  // Next.js의 서버리스 파일 트레이싱은 동적 경로(`${...}`)를 못 따라가므로,
  // public/ 아래 라이브러리 이미지를 명시적으로 포함시켜야 Vercel에서도 읽힌다.
  outputFileTracingIncludes: {
    '/api/generate-image': ['./public/images/library/**', './public/images/library-2d/**'],
  },
};

export default nextConfig;
