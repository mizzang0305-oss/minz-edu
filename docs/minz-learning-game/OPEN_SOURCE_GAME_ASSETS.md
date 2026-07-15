# 오픈소스 게임 에셋 사용 기록

## 적용 소스

- 프로젝트: [open-duelyst/duelyst](https://github.com/open-duelyst/duelyst)
- 라이선스: CC0-1.0
- 적용 목적: 시작 화면과 전투 화면의 배경 및 애니메이션 캐릭터

## 포함 파일

| 로컬 파일 | 원본 경로 |
| --- | --- |
| `battle-arena.jpg` | `app/resources/maps/battlemap5_background.jpg` |
| `hero-thunder.webp` | `app/resources/generals/general_f1.png` |
| `hero-magic.webp` | `app/resources/generals/general_f2.png` |
| `number-guardian.webp` | `app/resources/generals/general_boss_1.png` |

고해상도 원본 약 2.3MB를 투명 WebP 약 61KB로 축소했다. 배경을 포함한 실제 추가 그래픽 용량은 약 193KB이며, 전체 저장소는 포함하지 않는다. 원본 라이선스 사본은 `public/game-assets/duelyst/LICENSE`에 보관한다.

## Superpowers RPG Battle System

- 저장소: https://github.com/sparklinlabs/superpowers-asset-packs
- 고정 검토 커밋: `e8674a03ab4456802f71f848c4df79eccca23f7a`
- 제작: Sparklin Labs / Pixel-boy
- 라이선스: CC0 1.0 Universal
- 로컬 경로: `public/game-assets/superpowers-rpg/`
- 사용 파일: 탐험 영웅·마법사, 슬라임·미믹 보스, 보물 상자, 단어섬·이야기 성 배경

원본 sprite sheet에서 필요한 첫 프레임만 투명 PNG로 추출해 번들 크기를 줄였다. 외부 raw URL에 런타임 의존하지 않으며 루트 LICENSE를 함께 보관한다.

## Ninja Adventure Tiled terrain

- 원작 소개: https://pixel-boy.itch.io/ninja-adventure-asset-pack
- 저장소: https://github.com/sparklinlabs/superpowers-asset-packs
- 고정 검토 커밋: `e8674a03ab4456802f71f848c4df79eccca23f7a`
- 제작: Pixel-boy / AAA
- 라이선스: CC0 1.0 Universal
- 원본 규격: 16×16px
- 게임 규격: nearest-neighbor 2배 변환한 32×32px 정수 배율
- 타일셋: `public/game-assets/ninja-adventure/tileset-32.png`
- 라이선스·출처: `public/game-assets/ninja-adventure/LICENSE.txt`, `public/game-assets/ninja-adventure/SOURCE.md`
- Tiled 맵: `public/game-maps/number-forest.tmj`, `word-island.tmj`, `story-castle.tmj`

세 맵 모두 `ground`, `paths`, `water`, `decor` 실제 tile layer와 `collision`, `entities`, `zones` object layer를 사용한다. 원격 이미지는 런타임에 불러오지 않으며, 빌드 전에 생성기와 검증기로 레이어 크기·필수 객체·안전한 로컬 에셋 경로를 확인한다.
