# 작은 오락실

브라우저에서 바로 하는 작은 게임 모음입니다.

**플레이:** https://starone99.github.io/arcade/

| 게임 | 경로 | 장르 |
|---|---|---|
| 카피바라 온천 마을 | [`/onsen/`](https://starone99.github.io/arcade/onsen/) | 3D 힐링 퍼즐, 100 스테이지 (three.js) |
| 데굴데굴 귤 상자 | [`/roll/`](https://starone99.github.io/arcade/roll/) | 3D 굴리기 퍼즐, 100 스테이지 (three.js) |
| 카피바라 이삿짐 | [`/pack/`](https://starone99.github.io/arcade/pack/) | 3D 짐싸기 퍼즐, 100 스테이지 (three.js) |
| 작은 공방 | [`/workshop/`](https://starone99.github.io/arcade/workshop/) | 3D 조립(DIY) 퍼즐, 100 스테이지 (three.js) |
| 카피바라 대시 | [`/dash/`](https://starone99.github.io/arcade/dash/) | 원터치 러너, 기록 도전 (canvas) |
| 유자 쌓기 | [`/stack/`](https://starone99.github.io/arcade/stack/) | 물리 균형 쌓기, 기록 도전 (matter.js) |
| 카피바라 행복바이러스 | [`/virus/`](https://starone99.github.io/arcade/virus/) | 전략 시뮬레이션 |

각 게임은 폴더 하나에 `index.html` 하나로 되어 있고, 빌드 과정이 없습니다.
새 게임은 폴더를 추가하고 루트 `index.html`에 카드를 하나 더하면 됩니다.

기록은 브라우저 localStorage에 저장됩니다. `starone99.github.io` 아래 모든 저장소가 같은 저장 공간을 쓰므로, 키 앞에 게임 이름을 붙입니다 (예: `capy-onsen:v1`).
