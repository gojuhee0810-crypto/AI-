// Design Ref: docs/patterns/copy-patterns-v2.md §2,§3 — object_tag + benefit(+target)로
// 배너 문구 3안을 생성한다.
// 2026-08-06: 애초엔 생성→검증을 Claude 호출 2번으로 나눴는데, 검증 기준 대부분(글자수/
// 문구반복/오브젝트명반복/규제표현)이 사실 LLM 판단 없이 코드로 100% 기계적 확인 가능하다는
// 걸 재검토 후 확인했다. 그래서 생성은 1콜만 호출하고, 코드가 직접 검사해서 위반이 있을
// 때만(대부분 없을 것) 위반 필드만 지목하는 보정 콜을 추가로 부른다 — 정상 케이스는 1콜,
// 문제 있는 드문 케이스만 2콜. 검증 2콜을 매번 부르던 이전 구조보다 토큰/지연 모두 절감된다.
// benefit 수치 왜곡(예: "15% 할인"을 "20%"로 부풀림) 하나만 기계적으로 확인하기 어려워
// 생성 프롬프트의 규칙으로 예방하는 쪽으로 남겨뒀다(사후 검출 대신 사전 방지).

import Anthropic from '@anthropic-ai/sdk';
import { resolveObjectCategory } from './object-category-map';
import type { CopyRecommendation, GenerateCopyRequest, GenerateCopyResponse } from '@/types/copy-generation';

const SUBTITLE_LIMIT = 15;
const MAINTITLE_LIMIT = 14;

// 2026-08-06: 타겟 입력 폼을 별도로 만들지 않기로 함 — 원래 설계(오브젝트 선택 단계에서
// 타겟도 함께 넘어오는 흐름)가 아직 없어서, 그 전까지는 전 사용자를 "2030세대"로
// 가정하고 고정값을 쓴다. 나중에 실제 타겟 선택 플로우가 생기면 GenerateCopyRequest.target을
// 그 값으로 채워서 넘기면 이 기본값은 자동으로 무시된다.
const DEFAULT_TARGET = '2030세대';

// 금융/증권 카테고리에서 규제 위반 소지가 있는 단정적 표현. 완전한 목록은 아니지만
// 실제로 자주 나오는 패턴을 우선 커버한다 — 발견되는 대로 추가할 것.
const REGULATED_BANNED_PHRASES = ['무조건', '보장', '확정 수익', '확정수익', '손실 없이', '손실없이', '원금 보장', '무위험'];

const GENERATION_SYSTEM_PROMPT = `당신은 성과형 광고 배너 카피라이터입니다.
아래 4가지 검증된 패턴에 따라, 입력된 정보를 기반으로 배너 문구를 생성합니다.

# 패턴 정의
1. 상황기반+문제제기 (인지·관심 유도용)
   - 서브타이틀: 사용자 상황을 구체적으로 제시 (타겟이 공감할 만한 현실적 장면)
   - 메인타이틀: 문제를 제기하며 행동을 유도 (질문형 또는 자각 유도형)
2. 혜택조건+결과형(보상) (신뢰·구체성 강조용)
   - 서브타이틀: 혜택을 받기 위한 조건을 명시 (숫자·기간·자격 등 구체적으로)
   - 메인타이틀: 조건 충족 시 얻는 최종 혜택/보상을 강조
3. 혜택+행동유도 CTA형 (전환 유도용)
   - 서브타이틀: 핵심 혜택을 간결하게 제시
   - 메인타이틀: 혜택 확인/탐색을 유도하는 명령형 CTA
4. 조건+혜택강조형 (전환·신뢰 동시 강조용)
   - 서브타이틀: 핵심 혜택을 제시
   - 메인타이틀: 최종 혜택/보상을 임팩트 있게 강조 (숫자 강조 권장)

# 작성 규칙
1. 서브타이틀 최대 15자, 메인타이틀 최대 14자 (공백 포함, 카카오페이 핏배너 기준) —
   글자수를 직접 세어보고 초과하면 더 짧은 표현으로 바꿔서 처음부터 기준 안에 맞출 것
2. category가 "금융/증권"이면 확정 수익, 보장, 무조건, 원금 보장 등 단정적 표현 절대 금지
3. target이 있으면 패턴1의 서브타이틀에만 해당 타겟의 실제 생활 맥락을 반영한다.
   나머지 패턴(2/3/4)은 타겟과 무관하게 혜택 자체에 집중할 것 — 타겟을 모든
   패턴에 넣으면 패턴별 역할 구분이 흐려지고 반복 위험이 커진다.
4. target이 없으면 패턴1은 category에서 일반적으로 통용되는 상황으로 대체
5. 동일 문구 반복 절대 금지: 3개 패턴 x (서브타이틀+메인타이틀) 총 6개 필드 중,
   완전히 같은 문장/구절이 두 번 이상 나오면 안 된다. benefit 값을 그대로
   복사해서 여러 필드에 붙여넣지 말고, 매 필드마다 다른 표현으로 바꿔 쓸 것. 숫자,
   혜택명 같은 핵심 정보는 반복돼도 되지만 앞뒤 문장 전체가 동일해선 안 된다.
6. 느낌표는 패턴3(CTA형)에만 허용, 나머지는 평서형 또는 의문형
7. object_tag가 이미 시각적으로 표현하는 대상(사물명)을 서브/메인타이틀에 그대로
   반복하지 말 것 (예: object_tag가 "카드"면 "카드"라는 단어 자체를 쓰지 않고,
   오브젝트가 암시하는 상황/감정으로 대체)
8. object_tag가 암시하는 업종과 benefit의 내용이 명백히 다르면, category를 benefit
   내용 기준으로 재추정하고 그 사실을 "warning" 필드에 1줄로 남길 것
9. subtitle/maintitle에 입력된 benefit 값에 없는 수치나 조건을 새로 지어내지 말 것
   (예: 원본이 "최대 15% 할인"인데 "20% 할인"으로 부풀리지 않기)
10. 모든 subtitle/maintitle은 반드시 존댓말(해요체/합쇼체)로 끝낼 것 — "-다/-ㄴ다"로
    끝나는 반말체·설명체는 절대 금지. 예를 들어 "아낀다", "가능하다", "저렴하다",
    "시작한다" 같은 어미는 쓰지 말고, "아낄 수 있어요", "가능해요", "저렴해요",
    "시작해요"처럼 "-요"(해요체) 또는 "-습니다/-ㅂ니다"(합쇼체)로 바꿔 쓸 것.
    의문형(패턴1)도 "~하나요?", "~있으세요?"처럼 존댓말로 끝날 것.
11. target 값 자체(예: "2030세대", "2030", "MZ", "직장인")를 subtitle/maintitle에
    라벨처럼 그대로 쓰지 말 것. target은 규칙3처럼 그 타겟이 겪는 구체적 상황·장면
    으로 녹여서 표현해야 한다 (예: target이 "2030세대"면 "2030 할인" 같은 문구가
    아니라 "월급날이 코앞이라면"처럼 그 세대가 공감할 상황으로 바꿔 쓸 것).

# 출력 형식 (JSON only, 설명 텍스트 금지)
{
  "recommendations": [
    { "pattern": "상황기반+문제제기", "subtitle": "", "maintitle": "", "reason": "" },
    { "pattern": "혜택조건+결과형", "subtitle": "", "maintitle": "", "reason": "" },
    { "pattern": "혜택+CTA형", "subtitle": "", "maintitle": "", "reason": "" }
  ],
  "warning": null
}

주의: 3개 패턴만 출력합니다 (4개 중 입력값과 가장 적합한 3개를 선정).
pattern4는 pattern2와 구조가 유사하므로, benefit이 조건부(예: "~하면 ~%할인")일 때만 pattern2 대신 채택하세요.`;

// 코드가 위반을 잡았을 때만 호출하는 보정 프롬프트 — 위반 필드만 다시 쓰게 한다.
const CORRECTION_SYSTEM_PROMPT = `아래 JSON 중 일부 필드가 규칙을 위반했습니다.
지정된 필드만 문제를 해결해서 다시 쓰고, 전체 JSON을 반환하세요 (지목되지 않은 필드는
절대 건드리지 말고 원본 그대로 유지). 서브타이틀 최대 15자, 메인타이틀 최대 14자
(공백 포함). 출력은 입력과 동일한 JSON 스키마, 설명 텍스트 금지.`;

function buildGenerationUserMessage(objectTag: string, category: string, benefit: string, target?: string): string {
  return `object_tag: ${objectTag}
category: ${category}
benefit: ${benefit}
target: ${target?.trim() || '(없음)'}`;
}

function extractJsonText(response: Anthropic.Messages.Message): string {
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude가 텍스트를 반환하지 않음');
  }
  return textBlock.text.trim();
}

interface RawCopyResult {
  recommendations: CopyRecommendation[];
  warning?: string | null;
}

function parseCopyResult(jsonText: string): RawCopyResult {
  // Claude가 코드블록(```json ... ```)으로 감싸는 경우를 대비해 벗겨낸다.
  const stripped = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(stripped) as RawCopyResult;
  if (!Array.isArray(parsed.recommendations)) {
    throw new Error('recommendations 배열이 없는 응답');
  }
  return parsed;
}

export interface Violation {
  pattern: string;
  field: 'subtitle' | 'maintitle';
  text: string;
  reasons: string[];
}

/**
 * 생성 결과를 코드로 기계적으로 검사한다 — 글자수/문구반복/오브젝트명반복/규제표현 4가지는
 * LLM 판단 없이 전부 결정적으로 확인 가능하다(2026-08-06 재검토로 확정).
 */
export function validateRecommendations(
  recommendations: CopyRecommendation[],
  objectTag: string,
  category: string,
): Violation[] {
  const byField = new Map<string, Violation>();
  const keyOf = (pattern: string, field: 'subtitle' | 'maintitle') => `${pattern}::${field}`;

  function flag(pattern: string, field: 'subtitle' | 'maintitle', text: string, reason: string) {
    const key = keyOf(pattern, field);
    const existing = byField.get(key);
    if (existing) {
      existing.reasons.push(reason);
    } else {
      byField.set(key, { pattern, field, text, reasons: [reason] });
    }
  }

  // 1. 글자수
  for (const rec of recommendations) {
    if (rec.subtitle.length > SUBTITLE_LIMIT) {
      flag(rec.pattern, 'subtitle', rec.subtitle, `글자수 초과(${rec.subtitle.length}자, 제한 ${SUBTITLE_LIMIT}자)`);
    }
    if (rec.maintitle.length > MAINTITLE_LIMIT) {
      flag(rec.pattern, 'maintitle', rec.maintitle, `글자수 초과(${rec.maintitle.length}자, 제한 ${MAINTITLE_LIMIT}자)`);
    }
  }

  // 2. 6개 필드 중 완전 동일 문구 반복 (첫 등장은 놔두고 이후 중복만 지목)
  const seen = new Map<string, { pattern: string; field: 'subtitle' | 'maintitle' }>();
  for (const rec of recommendations) {
    for (const field of ['subtitle', 'maintitle'] as const) {
      const text = rec[field].trim();
      if (!text) continue;
      const firstSeenAt = seen.get(text);
      if (firstSeenAt) {
        flag(rec.pattern, field, text, `"${firstSeenAt.pattern}.${firstSeenAt.field}"와 동일 문구 반복`);
      } else {
        seen.set(text, { pattern: rec.pattern, field });
      }
    }
  }

  // 3. object_tag 사물명 그대로 재노출
  const normalizedTag = objectTag.replace(/\s+/g, '');
  if (normalizedTag) {
    for (const rec of recommendations) {
      for (const field of ['subtitle', 'maintitle'] as const) {
        if (rec[field].replace(/\s+/g, '').includes(normalizedTag)) {
          flag(rec.pattern, field, rec[field], `object_tag("${objectTag}") 단어를 그대로 재노출`);
        }
      }
    }
  }

  // 4. 금융/증권 규제 표현
  if (category === '금융/증권') {
    for (const rec of recommendations) {
      for (const field of ['subtitle', 'maintitle'] as const) {
        const hit = REGULATED_BANNED_PHRASES.find((phrase) => rec[field].includes(phrase));
        if (hit) {
          flag(rec.pattern, field, rec[field], `금융/증권 규제 위반 소지 표현("${hit}") 포함`);
        }
      }
    }
  }

  return Array.from(byField.values());
}

function buildCorrectionUserMessage(result: RawCopyResult, violations: Violation[]): string {
  const violationLines = violations
    .map((v) => `- ${v.pattern}.${v.field}: "${v.text}" → ${v.reasons.join(' / ')}`)
    .join('\n');
  return `# 위반 필드\n${violationLines}\n\n# 전체 JSON\n${JSON.stringify(result)}`;
}

/**
 * object_tag + benefit(+target)으로 배너 문구 3안을 생성한다.
 * 생성은 1콜만 호출하고, 코드가 결과를 기계적으로 검사해서 위반이 있을 때만 보정 콜을
 * 추가로 호출한다(최대 1회, 무한 재시도 아님). 실패 시(예: 크레딧 부족) 예외를 그대로
 * 던진다 — 이미지 생성과 달리 카피는 의미 있는 결정적 폴백이 없다.
 */
export async function generateCopy(request: GenerateCopyRequest): Promise<GenerateCopyResponse> {
  const { objectTag, benefit, target } = request;
  const effectiveTarget = target?.trim() || DEFAULT_TARGET;
  const category = resolveObjectCategory(objectTag);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const generationResponse = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildGenerationUserMessage(objectTag, category, benefit, effectiveTarget) }],
  });
  let result = parseCopyResult(extractJsonText(generationResponse));

  const violations = validateRecommendations(result.recommendations, objectTag, category);
  if (violations.length > 0) {
    console.warn('[copy-generate] 위반 발견, 보정 콜 실행:', violations.map((v) => `${v.pattern}.${v.field}(${v.reasons.join(',')})`));
    const correctionResponse = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: CORRECTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildCorrectionUserMessage(result, violations) }],
    });
    result = parseCopyResult(extractJsonText(correctionResponse));

    const remaining = validateRecommendations(result.recommendations, objectTag, category);
    if (remaining.length > 0) {
      console.warn('[copy-generate] 보정 후에도 남은 위반(그대로 반환):', remaining.map((v) => `${v.pattern}.${v.field}(${v.reasons.join(',')})`));
    }
  }

  return {
    recommendations: result.recommendations,
    category,
    ...(result.warning ? { warning: result.warning } : {}),
  };
}
