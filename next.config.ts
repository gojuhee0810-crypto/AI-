import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp는 플랫폼별 네이티브 바이너리를 쓴다. 번들링에 맡기면 macOS에서 빌드한 걸
  // Vercel의 Linux 런타임이 못 읽어서, import 시점에 route.ts 전체가 죽는다(요청
  // 내용과 무관하게 항상 500). 번들링하지 말고 Node의 require로 그대로 두게 한다.
  // onnxruntime-node(@imgly/background-removal-node이 쓴다)도 sharp와 같은 이유로
  // 번들링에서 뺀다 — process.platform/arch로 바이너리 경로를 동적으로 짓는 방식이라
  // 트레이싱이 원래 잘 못 따라간다.
  serverExternalPackages: ['sharp', 'onnxruntime-node', '@imgly/background-removal-node'],
  // 아래 둘 다 동적 경로(`${...}`)로 파일을 읽어서, Next.js의 서버리스 파일 트레이싱이
  // 못 따라간다 — 로컬(next start)은 되는데 Vercel만 500나던 이유가 이거였다.
  // - generate-image API: fs.readFile로 라이브러리 원본 이미지를 읽는다.
  // - onnxruntime-node: process.platform/arch로 바이너리(.node) 경로를 짓는다.
  outputFileTracingIncludes: {
    '/api/generate-image': [
      './public/images/library/**',
      './public/images/library-2d/**',
      './node_modules/onnxruntime-node/bin/**',
    ],
  },
};

export default nextConfig;
