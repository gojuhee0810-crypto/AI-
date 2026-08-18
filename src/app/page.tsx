import { redirect } from "next/navigation";

// 루트는 create-next-app 기본 스캐폴드 그대로였다 — 실제 화면은 항상
// /ai-banner에 있었는데, 루트로 들어가서 이 기본 페이지를 보고 화면이
// 고장났다고 오해한 적이 있다(2026-08-18). 그래서 루트를 그리로 보낸다.
export default function Home() {
  redirect("/ai-banner");
}
