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
    "if(window.__hisnetMobileDiagnose){window.__hisnetMobileDiagnose();}"
    "else{toast('공지 목록을 찾지 못했습니다.');}}"
    "}catch(e){toast('오류: '+e.message);}"
    "})();"
) % (TOAST, json.dumps(css), js)

url = "javascript:" + urllib.parse.quote(wrapper, safe="")

open(os.path.join(HERE, "bookmarklet.txt"), "w", encoding="utf-8").write(url)
print(f"bookmarklet.txt 생성: {len(url):,}자")

# ---- 짧은 로더 방식 ---------------------------------------------------------
# 42KB짜리 주소를 폰에서 붙여넣는 건 고통스럽다.
# 런타임을 hm.js로 따로 올려두고, 북마크에는 그걸 불러오는 한 줄만 넣는다.
# 덤으로 hm.js만 갈아끼우면 북마크를 다시 만들 필요가 없다.

runtime = "window.__HM_CSS=%s;\n%s\n" % (json.dumps(css), js)
runtime += (
    "if(!window.__hisnetMobileStart||!window.__hisnetMobileStart()){"
    "if(window.__hisnetMobileDiagnose)window.__hisnetMobileDiagnose();}\n"
)
open(os.path.join(HERE, "..", "public", "hm.js"), "w", encoding="utf-8").write(runtime)
print(f"public/hm.js 생성: {len(runtime):,}자")

BASE = os.environ.get("HM_BASE", "https://hisnet-mobile.vercel.app")
loader_src = (
    "(function(){"
    "var s=document.createElement('script');"
    "s.src='%s/hm.js?'+Date.now();"
    "document.documentElement.appendChild(s);"
    "})();" % BASE
)
loader = "javascript:" + urllib.parse.quote(loader_src, safe="")
open(os.path.join(HERE, "loader.txt"), "w", encoding="utf-8").write(loader)
print(f"bookmarklet/loader.txt 생성: {len(loader)}자  (base={BASE})")

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
  .lead { color: #666; margin: 0 0 24px; }
  h2 { font-size: 1.05rem; margin: 30px 0 10px; padding-bottom: 7px; border-bottom: 1px solid #eee; }
  ol { padding-left: 1.25em; } li { margin-bottom: 7px; }
  .drag { display: inline-block; padding: 12px 22px; border-radius: 10px;
          background: #3b5bdb; color: #fff; text-decoration: none; font-weight: 700; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 14px 0 6px; }
  button { padding: 11px 18px; border: 1px solid #d0d0d5; background: #fff;
           border-radius: 9px; font: inherit; font-weight: 600; cursor: pointer; }
  button:active { background: #f0f0f4; }
  .ok { color: #1a7f37; font-size: .88rem; }
  .note { background: #fbf8ec; border: 1px solid #eee0b8; border-radius: 8px;
          padding: 12px 14px; font-size: .9rem; color: #6b5a1e; margin: 20px 0; }
  code { background: #f4f4f6; padding: 1px 5px; border-radius: 4px; font-size: .88em; }
  .muted { color: #888; font-size: .85rem; }
  .addr { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd;
          border-radius: 8px; font: 12px/1.5 ui-monospace, Menlo, monospace; word-break: break-all; }
  details { margin-top: 34px; border-top: 1px solid #eee; padding-top: 14px; }
  summary { cursor: pointer; font-weight: 600; font-size: .95rem; }
</style>

<h1>히즈넷 모바일로 보기</h1>
<p class="lead">공지사항을 읽기 편한 목록으로 다시 그려주는 북마크입니다. 설치할 앱은 없습니다.</p>

<div class="note">
  <b>로그인한 히즈넷 화면 안에서 돌아갑니다.</b>
  비밀번호를 묻지 않고, 어디로도 아무것도 보내지 않습니다.
  이미 로그인된 내 세션으로 보이는 화면을 다시 그릴 뿐입니다.
</div>

<h2>1. 주소 복사</h2>
<div class="row">
  <button id="copy">주소 복사하기</button>
  <span class="ok" id="done" hidden>복사했습니다</span>
</div>
<textarea class="addr" id="raw" rows="3" readonly>__LOADER__</textarea>
<p class="muted">복사가 안 되면 위 칸을 길게 눌러 전체 선택하세요.</p>

<h2>2. 북마크로 저장</h2>

<p><b>아이폰 (사파리)</b></p>
<ol>
  <li>아무 페이지에서나 공유 → <b>즐겨찾기 추가</b> (이름은 <code>히즈넷 공지</code> 정도로)</li>
  <li>책갈피 → 즐겨찾기 → <b>편집</b> → 방금 만든 항목 선택</li>
  <li>주소 칸을 전부 지우고 <b>붙여넣기</b> 후 저장</li>
</ol>
<p class="muted">붙여넣었는데 앞의 <code>javascript:</code>가 사라지면 직접 타이핑해 넣으세요. iOS가 가끔 지웁니다.</p>

<p><b>안드로이드 (크롬)</b></p>
<ol>
  <li>아무 페이지나 북마크(☆)에 추가 → 편집 → URL 붙여넣기</li>
  <li>쓸 때는 주소창에 북마크 이름을 입력해 뜨는 항목을 선택</li>
</ol>

<p><b>컴퓨터</b></p>
<ol>
  <li>북마크 바를 켜고 (<code>Cmd/Ctrl + Shift + B</code>)</li>
  <li>아래 버튼을 북마크 바로 <b>끌어다 놓습니다</b></li>
</ol>
<p><a class="drag" href="__LOADER__">📋 히즈넷 공지</a></p>

<h2>3. 쓰는 법</h2>
<ol>
  <li>히즈넷에 로그인합니다</li>
  <li><b>공지사항 목록 화면</b>으로 갑니다</li>
  <li>만들어 둔 북마크를 누릅니다</li>
  <li>오른쪽 아래 <b>공지</b> 버튼을 누르면 목록이 뜹니다</li>
</ol>
<p class="muted">목록이 아닌 화면에서 누르면 무엇을 찾았는지 진단 내용을 보여줍니다.
본문이 엉뚱하게 나오면 <b>다른 영역 보기</b>로 맞는 곳을 고르세요. 다음부터 기억합니다.</p>

<details>
  <summary>인터넷 없이 쓰는 긴 버전</summary>
  <p class="muted">위 주소는 실행할 때마다 이 서버에서 코드를 받아옵니다.
  그게 싫거나 서버가 내려가도 쓰고 싶으면, 코드가 통째로 들어간 긴 주소를 쓰세요.
  대신 4만 자가 넘어서 붙여넣기가 번거롭고, 코드가 바뀌면 북마크를 다시 만들어야 합니다.</p>
  <div class="row"><button id="copy-full">긴 주소 복사하기</button>
  <span class="ok" id="done-full" hidden>복사했습니다</span></div>
  <textarea class="addr" id="raw-full" rows="3" readonly>__BM__</textarea>
</details>

<script>
function copyTo(text, doneEl) {
  return (async () => {
    // navigator.clipboard는 HTTPS(또는 localhost)에서만 동작한다
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* 아래 폴백 */ }
    // iOS 사파리는 readonly면 execCommand copy가 안 먹는다
    const t = document.createElement('textarea');
    t.value = text;
    t.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(t);
    t.contentEditable = 'true';
    const range = document.createRange();
    range.selectNodeContents(t);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    t.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    return ok;
  })().then((ok) => {
    if (ok) {
      doneEl.hidden = false;
      setTimeout(() => { doneEl.hidden = true; }, 2500);
    }
    return ok;
  });
}

document.getElementById('copy').addEventListener('click', () => {
  copyTo(document.getElementById('raw').value, document.getElementById('done'));
});
document.getElementById('copy-full').addEventListener('click', () => {
  copyTo(document.getElementById('raw-full').value, document.getElementById('done-full'));
});
</script>
"""

esc = lambda v: v.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
page = page.replace("__BM__", esc(url)).replace("__LOADER__", esc(loader))
# Vite는 public/ 안의 파일을 그대로 루트에 서빙한다.
# 배포되면 https://<도메인>/install.html 로 열린다.
out = os.path.join(HERE, "..", "public", "install.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf-8").write(page)
print(f"public/install.html 생성: {len(page):,}자")

