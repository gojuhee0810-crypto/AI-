# OBJECTS/ 파일명 규칙

**파일명은 반드시 사용자가 입력한 원문 텍스트를 `slugifyObject()`로 그대로 슬러그화한
것이어야 한다 — 영문 번역 이름을 쓰면 안 된다.**

`src/lib/prompt-compiler.ts`의 `resolveObjectBlueprint()`는 `slugifyObject(primaryObject)`
(공백→하이픈만 치환, 나머지 원문 그대로)로 파일을 찾는다. 즉 사용자가 "계산기"라고
입력했으면 찾는 파일은 `계산기.md`다 — `calculator.md`가 아니다.

> 2026-08-05 교훈: `calculator.md`, `wallet.md` 등 영문 이름으로 미리 블루프린트를
> 만들어뒀지만, 실제 조회는 한글 원문 슬러그로 이루어져서 단 한 번도 재사용되지
> 않고 매번 Claude가 새로 초안을 작성했다. 지금은 이 오브젝트들이 전부
> `asset-library.ts`/`style2-asset-library.ts` 라이브러리로 캐시돼서 이 폴더까지
> 아예 안 내려오므로 문제가 안 되지만, 새 오브젝트를 여기 미리 채워둘 땐 반드시
> 실제 조회 키(원문 슬러그)로 파일명을 지을 것.

이 폴더는 현재 비어있다 — 자주 나오는 오브젝트는 전부 라이브러리(이미지 캐시)로
옮겨졌고, 라이브러리에 없는 새 오브젝트는 `resolveObjectBlueprint()`가 그때그때
Claude로 자동 작성해 여기 저장한다.
