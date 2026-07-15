---
type: design-audit
project: Minz_Edu
status: fixed-and-verified
updated: 2026-07-13
tags: [boss, progression, phaser, ux, graphics]
---

# 보스 성장과 스테이지 흐름 감사

## 결론

기존 화면은 첫 지역부터 거대한 중장갑 보스를 노출했고 Stage 2도 숫자 숲 Scene을 재사용했다. 위협도와 학습 난이도의 성장 감각이 없었으며, 파괴된 Scene의 전역 이벤트 구독이 남아 `drawImage` 런타임 오류와 캐릭터 소실을 만들었다.

## 감사 단계

| 단계 | 화면 | 상태 | 핵심 관찰 |
|---|---|---|---|
| 1 | `output/design-audit/boss-flow-before/01-stage-same-and-oversized-boss.png` | 문제 | Stage 1부터 장갑 거인이 등장하고 Stage 2도 같은 배경·수집물·보스 구조를 사용 |
| 2 | `output/design-audit/boss-flow-before/02-drawimage-runtime-error.png` | 실패 | DESTROY된 Phaser Text Canvas가 global bridge의 sync를 다시 받아 `drawImage` null 오류 발생 |
| 3 | `output/design-audit/boss-flow-after/01-world.png` | 개선 | 월드맵에 슬라임→미믹→장갑 수호자의 위협도 1→2→3 성장 표시 |
| 4 | `output/design-audit/boss-flow-after/02-number-forest-ready.png` | 정상 | 캐릭터와 첫 보스가 선명하게 표시되고 NPC→상자→수집→관문 흐름 제공 |
| 5 | `output/design-audit/boss-flow-after/03-word-island-viewport.png` | 정상 | 단어섬 전용 밤바다 배경, 글자 룬, 국어 NPC, 단어 먹보 미믹 적용 |
| 6 | `output/design-audit/boss-flow-after/04-story-castle.png` | 정상 | 이야기 성 전용 폐허 배경, 두 증언 NPC, 순서 조각, 장갑 수호자 적용 |

## 적용한 성장 곡선

| 지역 | 위협도 | 보스 | 학습 행동 | 시각적 성장 |
|---|---:|---|---|---|
| 숫자 숲 | 1 | 잠든 씨앗 슬라임 | 숫자 조각, 기초 원리 | 작고 둥글며 무장 없음, 보호막 10 |
| 단어섬 | 2 | 단어 먹보 미믹 | 글자 룬 순서, 낱말 결계 | 더 큰 실루엣과 단어 방패, 보호막 25 |
| 이야기 성 | 3 | 논리의 장갑 수호자 | 증언 수집, 이야기 순서, 주장·근거 | 장갑·대형 실루엣, 보호막 40 |

보스는 쓰러뜨리는 대상이 아니라 혼란을 풀어 친구로 되돌리는 지역 수호자로 표현한다. 각 수호자가 다음 지역의 열쇠나 문장을 건네 흐름이 끊기지 않게 한다.

## 접근성·검증 한계

- 화면 캡처에서는 크기·대비·정보 순서를 확인했다.
- 키보드, 터치, reduced-motion은 자동 검사와 별도 실제 기기 검증이 필요하다.
- Canvas 내부 요소는 DOM 접근성 트리에 없으므로 필수 목표·대화·방향은 Canvas 밖 HTML에도 중복 제공한다.
