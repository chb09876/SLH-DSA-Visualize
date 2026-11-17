# SLH-DSA Visualizer

SLH-DSA의 KeyGen / Sign / Verify 연산을 큰 Canvas에서 살펴보는 비주얼라이저입니다.

**[비주얼라이저 열기](https://chb09876.github.io/SLH-DSA-Visualize/)**

## 기능

- KeyGen, Sign, Verify 모드와 실제 키·서명 계산
- Pure / Hash 메시지 형식 및 메시지·컨텍스트 입력
- 보안 수준 128 / 192 / 256, s / f, SHA2 / SHAKE 버튼 선택
- WOTS+ 체인, XMSS, Hypertree, FORS와 서명 조립 흐름
- 노드 값, 서명 블록, 연산별 입력·출력 크기 및 ADRS 상세 보기
- SHAKE256의 absorb 횟수와 구분자·패딩 바이트 표시
- 이동·확대·축소, 글씨·도형 크기 조절, PNG 및 계산 결과 JSON 저장

## 사용

배포 주소에서 바로 실행하거나 `index.html`을 내려받아 브라우저로 열 수 있습니다. 키·서명 계산은 브라우저의 Web Worker에서 실행됩니다.

KeyGen으로 키를 만든 뒤 Sign에서 메시지에 서명하고, Verify에서 검증할 수 있습니다. Canvas의 값이나 연산 블록을 클릭하면 상세 정보가 표시됩니다. 파라미터를 바꾸면 구조와 바이트 길이도 함께 갱신됩니다.

## 소스 수정과 빌드

Node.js 22 이상과 pnpm 11에서:

```sh
pnpm install --frozen-lockfile
pnpm run build
```

- `src/`: Canvas, 입력 UI, 연산 설명 및 Web Worker 소스
- `src/base-canvas.html`: Canvas 엔진의 기반 템플릿
- `src/build-worker.cjs`: 암호 라이브러리에 연산 관찰 코드를 추가하고 Worker 번들 생성
- `src/build-app.cjs`: 템플릿과 모듈을 합쳐 루트의 `index.html` 생성
- `index.html`: 외부 런타임 파일 없이 동작하는 배포 결과물

소스 변경 후 다시 빌드한 `index.html`을 함께 커밋합니다. GitHub Pages는 `main` 브랜치의 루트에서 배포됩니다.

## 참조

- [NIST FIPS 205](https://doi.org/10.6028/NIST.FIPS.205)
- [noble-post-quantum](https://github.com/paulmillr/noble-post-quantum)

번들에 포함된 라이브러리의 라이선스는 [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt)에 보존되어 있으며 HTML에도 포함되어 있습니다.
