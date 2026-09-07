# HISNet Mobile 확장 (프로토타입)

히즈넷 공지 목록을 읽어 모바일용 화면으로 다시 그리는 브라우저 확장.

로그인한 히즈넷 화면 **안에서** 돌기 때문에 CORS도, 비밀번호 입력도 필요 없다.
사용자의 기존 세션을 그대로 쓴다.

## 왜 확장인가

- 히즈넷은 로그인 뒤에 공지가 있고, 응답에 `Access-Control-Allow-Origin`이 없다.
  → 다른 출처의 웹앱에서는 `fetch`로 가져올 수 없다.
- 콘텐츠 스크립트는 `hisnet.handong.edu` 출처 안에서 실행되므로 두 제약을 모두 비껴간다.

## 설치

**크롬 / Floorp(파이어폭스)** — 스토어 등록 없이 바로 쓴다.

1. `chrome://extensions` (Floorp는 `about:debugging`) 열기
2. 개발자 모드 켜기
3. "압축해제된 확장 프로그램을 로드" → 이 `extension/` 폴더 선택

**사파리 / iOS** — macOS에서 Xcode 프로젝트로 변환한다.

```bash
xcrun safari-web-extension-converter extension/
```

iOS에서 확장을 지원하는 브라우저는 사파리뿐이다.
(iOS의 크롬·파이어폭스는 엔진이 WebKit이라 확장을 못 쓴다.)

## 구조

| 파일 | 역할 |
|---|---|
| `manifest.json` | MV3. `all_frames: true`가 핵심 — 히즈넷은 `<frameset>`이라 내용이 안쪽 프레임에 있다 |
| `content.js` | 표에서 공지를 뽑아(`parseRow`) 오버레이 UI를 그린다 |
| `overlay.css` | 오버레이 스타일 |
| `fixture/` | 로그인 없이 개발·테스트하기 위한 가짜 히즈넷 (euc-kr + frameset) |

## 실제 히즈넷에 맞추기

`parseRow`는 실제 DOM을 못 보고 만든 **휴리스틱**이다. 다음을 가정한다.

- 공지 한 건 = `<tr>` 하나이고, 그 안에 링크(`<a href>`)가 있다
- 같은 행에 `2026-09-01` / `2026.09.01` 꼴의 날짜 칸이 있다
- 작성자는 **날짜 칸 바로 앞** 칸이다 (번호·제목·작성자·등록일 순서를 가정)

안 맞으면 `content.js` 위쪽의 `ROW_SELECTOR`에 실제 행 선택자를 넣으면
`<tr>` 전체를 훑는 대신 그것만 본다.

## 테스트

로그인 없이 확인하려면 `fixture/`를 서빙하고 하네스를 연다.

```bash
cd extension && python3 -m http.server 4601
# 목록: http://127.0.0.1:4601/fixture/harness.html
# 상세: http://127.0.0.1:4601/fixture/harness.html?step=detail
```

`fixture/list.html`은 실제 히즈넷처럼 **euc-kr**로 저장돼 있다.
하네스는 콘텐츠 스크립트를 `<script charset="utf-8">`로 주입하는데,
실제 확장 런타임이 스크립트를 UTF-8로 읽는 동작을 맞춘 것이다.
(charset을 빼면 스크립트 안의 한글 리터럴이 페이지 인코딩으로 디코딩돼 깨진다.)

## 설치 없이 쓰기 — 북마클릿

확장은 iOS에서 사파리만 지원하고, 남에게 주려면 App Store 등록이 필요하다.
그래서 같은 코드를 북마클릿으로도 뽑는다. 북마크 하나면 끝이고
iOS 사파리·안드로이드 크롬·데스크톱에서 모두 돌아간다.

```bash
python3 bookmarklet/build.py
# -> public/hm.js                 (런타임)
# -> bookmarklet/loader.txt       (hm.js를 불러오는 228자 북마클릿 — 주력)
# -> bookmarklet/bookmarklet.txt  (코드가 통째로 든 42KB 북마클릿 — 오프라인용)
# -> public/install.html          (설치 안내 페이지, 배포 시 /install.html)

# 배포 주소가 바뀌면
HM_BASE=https://내도메인 python3 bookmarklet/build.py
```

주력은 **짧은 로더**다. 42KB를 폰에서 붙여넣는 건 고통스럽고,
hm.js만 갈아끼우면 북마크를 다시 만들 필요도 없다.

로더는 **HTTPS로 서빙해야 한다.** 히즈넷이 HTTPS라
`http://` 스크립트는 혼합 콘텐츠로 차단된다. LAN 주소로는 실제 히즈넷에서 동작하지 않는다.

`content.js`를 고치면 반드시 다시 돌려야 북마클릿에 반영된다.

### 확장과 다른 점

| | 확장 | 북마클릿 |
|---|---|---|
| 실행 | 페이지 열면 자동 | 매번 북마크를 눌러야 함 |
| iOS | 사파리만, App Store 필요 | 사파리에서 바로 |
| 프레임 | manifest의 `all_frames`가 처리 | `content.js`가 직접 순회 |
| CSS | manifest가 프레임마다 주입 | `window.__HM_CSS`로 넘겨 대상 문서에 주입 |

프레임과 CSS를 `content.js`가 스스로 처리하도록 만들어 둬서 한 파일로 양쪽을 덮는다.
스타일은 프레임 경계를 넘지 못하므로, **오버레이를 그리는 그 문서에** 심어야 한다.
