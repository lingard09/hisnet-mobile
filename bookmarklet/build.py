#!/usr/bin/env python3
"""extension/의 content.js + overlay.css를 북마클릿 하나로 묶는다.

확장을 설치할 수 없는 환경(특히 iOS 사파리)에서 같은 기능을 쓰기 위한 것.
북마클릿은 페이지 출처 안에서 실행되므로 CORS도 로그인도 문제되지 않는다.
"""
import json, os, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.join(HERE, "..", "extension")

js = open(os.path.join(EXT, "content.js"), encoding="utf-8").read()
css = open(os.path.join(EXT, "overlay.css"), encoding="utf-8").read()

# CSS를 심고 본체를 실행한다. 이미 떠 있으면 다시 열기만 한다.
# 화면 안내는 alert 대신 토스트로 띄운다.
# alert는 iOS에서 거슬리고, 자동화 도구에서는 렌더러를 멈춰 세운다.
TOAST = (
    "function(m){var t=d.createElement('div');t.textContent=m;"
    "t.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);"
    "z-index:2147483647;background:#333;color:#fff;padding:12px 18px;border-radius:8px;"
    "font:14px -apple-system,system-ui,sans-serif;max-width:80%;text-align:center';"
    "(d.body||d.documentElement).appendChild(t);setTimeout(function(){t.remove()},4000);}"
)

wrapper = (
    "(function(){"
    "var d=document;"
    "var toast=%s;"
    "window.__HM_CSS=%s;"
    "try{"
    "%s\n"
    "if(!window.__hisnetMobileStart||!window.__hisnetMobileStart()){"
    "toast('공지 목록을 찾지 못했습니다. 공지사항 목록 화면에서 눌러주세요.');}"
    "}catch(e){toast('오류: '+e.message);}"
    "})();"
) % (TOAST, json.dumps(css), js)

url = "javascript:" + urllib.parse.quote(wrapper, safe="")

open(os.path.join(HERE, "bookmarklet.txt"), "w", encoding="utf-8").write(url)
print(f"bookmarklet.txt 생성: {len(url):,}자")

# ---- 설치 페이지 -----------------------------------------------------------
# 30KB짜리 javascript: URL을 사람이 직접 복사하긴 어렵다.
# 데스크톱은 드래그, iOS는 복사-붙여넣기로 안내한다.

page = """<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>히즈넷 모바일로 보기</title>
<style>
  :root { color-scheme: light; }
  body { max-width: 680px; margin: 0 auto; padding: 28px 18px 60px;
         font: 16px/1.65 -apple-system, system-ui, "Apple SD Gothic Neo", sans-serif;
         color: #1c1c1e; background: #fff; }
  h1 { font-size: 1.5rem; margin: 0 0 6px; }
  .lead { color: #666; margin: 0 0 26px; }
  h2 { font-size: 1.05rem; margin: 30px 0 10px; padding-bottom: 7px;
       border-bottom: 1px solid #eee; }
  ol { padding-left: 1.25em; }
  li { margin-bottom: 7px; }
  .drag { display: inline-block; padding: 12px 22px; border-radius: 10px;
          background: #3b5bdb; color: #fff; text-decoration: none; font-weight: 700; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 14px 0 6px; }
  button { padding: 11px 18px; border: 1px solid #d0d0d5; background: #fff;
           border-radius: 9px; font: inherit; font-weight: 600; cursor: pointer; }
  button:active { background: #f0f0f4; }
  .ok { color: #1a7f37; font-size: .88rem; }
  .note { background: #fbf8ec; border: 1px solid #eee0b8; border-radius: 8px;
          padding: 12px 14px; font-size: .9rem; color: #6b5a1e; margin: 22px 0; }
  code { background: #f4f4f6; padding: 1px 5px; border-radius: 4px; font-size: .88em; }
  .muted { color: #888; font-size: .85rem; }
</style>

<h1>히즈넷 모바일로 보기</h1>
<p class="lead">공지사항을 읽기 편한 목록으로 다시 그려주는 북마크입니다.
설치할 앱은 없습니다.</p>

<div class="note">
  <b>로그인한 히즈넷 화면 안에서 돌아갑니다.</b>
  비밀번호를 묻지 않고, 어디로도 아무것도 보내지 않습니다.
  이미 로그인된 내 세션으로 보이는 화면을 다시 그릴 뿐입니다.
</div>

<h2>컴퓨터 (크롬 · 사파리 · 파이어폭스)</h2>
<ol>
  <li>북마크 바를 켭니다 (<code>Cmd/Ctrl + Shift + B</code>)</li>
  <li>아래 버튼을 북마크 바로 <b>끌어다 놓습니다</b></li>
</ol>
<p><a class="drag" href="__BM__">📋 히즈넷 공지</a></p>
<p class="muted">누르지 마시고 끌어다 놓으세요. 눌러도 이 페이지에서는 아무 일도 없습니다.</p>

<h2>아이폰 (사파리)</h2>
<p>사파리는 드래그가 안 되어서, 북마크를 하나 만든 뒤 주소만 바꿔 넣습니다.</p>
<div class="row">
  <button id="copy">주소 복사하기</button>
  <span class="ok" id="done" hidden>복사했습니다</span>
</div>
<ol>
  <li>위 <b>주소 복사하기</b>를 누릅니다</li>
  <li>아무 페이지에서나 공유 → <b>즐겨찾기 추가</b> (이름은 <code>히즈넷 공지</code> 정도로)</li>
  <li>즐겨찾기 목록에서 방금 만든 항목을 <b>길게 눌러 편집</b></li>
  <li>주소 칸을 전부 지우고 <b>붙여넣기</b> 후 저장</li>
</ol>

<h2>안드로이드 (크롬)</h2>
<ol>
  <li><b>주소 복사하기</b>를 누릅니다</li>
  <li>아무 페이지나 북마크(☆)에 추가합니다</li>
  <li>북마크 편집에서 URL을 붙여넣습니다</li>
  <li>쓸 때는 주소창에 북마크 이름을 입력해 뜨는 항목을 선택합니다</li>
</ol>

<h2>쓰는 법</h2>
<ol>
  <li>히즈넷에 로그인합니다</li>
  <li><b>공지사항 목록 화면</b>으로 갑니다</li>
  <li>만들어 둔 북마크를 누릅니다</li>
  <li>오른쪽 아래 <b>공지</b> 버튼을 누르면 목록이 뜹니다</li>
</ol>
<p class="muted">목록이 아닌 화면에서 누르면 "공지 목록을 찾지 못했습니다"라고 알려줍니다.
본문이 엉뚱하게 나오면 <b>다른 영역 보기</b>를 눌러 맞는 곳을 고르세요. 다음부터 기억합니다.</p>

<script>
const BM = document.querySelector('.drag').getAttribute('href');
document.getElementById('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(BM);
  } catch (e) {
    // 클립보드 권한이 없으면 임시 입력칸으로 대체한다
    const t = document.createElement('textarea');
    t.value = BM; document.body.appendChild(t); t.select();
    document.execCommand('copy'); t.remove();
  }
  const ok = document.getElementById('done');
  ok.hidden = false;
  setTimeout(() => { ok.hidden = true; }, 2500);
});
</script>
"""

page = page.replace("__BM__", url.replace("&", "&amp;").replace('"', "&quot;"))
# Vite는 public/ 안의 파일을 그대로 루트에 서빙한다.
# 배포되면 https://<도메인>/install.html 로 열린다.
out = os.path.join(HERE, "..", "public", "install.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf-8").write(page)
print(f"public/install.html 생성: {len(page):,}자")
