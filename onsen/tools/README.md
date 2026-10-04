# 온천 마을 스테이지 도구

- `logic.js` — 물 흐름 규칙, 1~10번 손으로 만든 스테이지, 섞기. 게임 `index.html`의 `// LOGIC START ~ END` 구간과 같은 코드입니다.
- `gen.js` — 11~100번 생성기. 정답 트리를 먼저 만들고 높이·고양이·가짜 물길·유자를 얹은 뒤, 풀리는지와 섞었을 때 이미 풀려 있지 않은지 검증합니다. 결과는 `generated.json`.
- `sortgen.js` — 마을(10스테이지)마다 쉬운 순서로 정렬합니다.
- `verify.js` — 1~10번 검증.

```bash
node gen.js && node sortgen.js   # generated.json 재생성
```

생성 결과는 게임 파일 안의 `GENERATED` 배열에 그대로 들어가 있습니다. 다시 만들면 퍼즐이 바뀌어 기존 기록과 맞지 않을 수 있습니다.
