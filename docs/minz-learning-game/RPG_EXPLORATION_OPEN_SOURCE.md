# 움직이는 RPG 탐험 오픈소스 적용 기록

## 적용 원칙

로블록스의 상표·화면·자산을 복제하지 않고, 직접 이동·수집·친구 동행·포털 진입이라는 익숙한 플레이 감각만 학습 게임에 적용한다.

## 사용한 오픈소스

| 프로젝트 | 라이선스 | 적용 내용 |
|---|---|---|
| [phaserjs/phaser](https://github.com/phaserjs/phaser) | MIT | Canvas/WebGL 렌더링, 키보드 입력, 장면 수명주기, 트윈·카메라 효과 |
| [phaserjs/examples](https://github.com/phaserjs/examples) | MIT(코드) | 방향키 이동과 장면 구성 패턴 참고. 저장소의 예제 자산은 사용하지 않음 |
| [open-duelyst/duelyst](https://github.com/open-duelyst/duelyst) | CC0-1.0 | 숫자 숲 배경, 영웅, 수호자 이미지 |
| [rexrainbow/phaser3-rex-notes](https://github.com/rexrainbow/phaser3-rex-notes) | MIT | 가상 조이스틱 구조 참고. 현재 MVP는 추가 패키지 없이 화면 버튼으로 구현 |
| [Pixel-boy Ninja Adventure](https://pixel-boy.itch.io/ninja-adventure-asset-pack) | CC0-1.0 | 16px 원본을 nearest-neighbor 2배 변환해 32px 정수 배율로 사용. 세 월드의 땅·길·물·장식 실제 Tiled 레이어 렌더링 |

## 현재 RPG MVP

- 방향키/WASD 이동
- 휴대폰·태블릿 화면 조이스틱
- 숫자 조각 3개 수집
- 바위·나무·강 충돌과 통과 가능한 다리
- 선택형 숨은 길
- 친구 캐릭터 자동 동행
- 보스 포털 도착 후 학습 전투 해금
- 전투 장면·문제·체력 게이지를 스크롤 분리 없이 함께 보여주는 반응형 전투 콕핏
- 첫 오답은 체력을 깎지 않고 재관찰 기회를 주며, 반복 오답에는 단계별 힌트 제공
- 기존 연령·학년별 문제, 보상, 인벤토리 저장 유지

## 다음 확장

1. 실제 휴대폰에서 10분 연속 플레이하며 FPS·메모리·발열 기록
2. Rex Virtual Joystick 플러그인 도입 여부를 번들 크기와 터치 정확도로 비교
3. 온라인 방의 친구 위치를 낮은 빈도로 동기화
4. 세 월드의 수집 도감과 보스별 연출 강도 단계화
