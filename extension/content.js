/* 히즈넷 공지 목록을 읽어 모바일용 화면으로 다시 그린다.
 *
 * 히즈넷은 <frameset> 구조라 실제 내용이 안쪽 프레임에 있다.
 * manifest의 all_frames:true 덕에 이 스크립트는 프레임마다 각각 실행되고,
 * 공지처럼 보이는 표를 찾은 프레임에서만 UI를 띄운다.
 */
(() => {
  "use strict";

  const DATE_RE = /(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/;

  // 실제 DOM을 보고 조정할 여지를 남긴다. 비워두면 아래 휴리스틱을 쓴다.
  const ROW_SELECTOR = "";

  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

  /** 표의 한 행에서 공지 정보를 뽑는다. 공지가 아니면 null. */
  function parseRow(tr) {
    const link = tr.querySelector("a[href]");
    if (!link) return null;

    const title = text(link);
    if (title.length < 2) return null;

    const cells = [...tr.children].map(text);
    const dateIdx = cells.findIndex((c) => DATE_RE.test(c));
    if (dateIdx < 0) return null; // 날짜 없는 행은 헤더나 페이지네이션으로 본다

    const m = cells[dateIdx].match(DATE_RE);
    const date = `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;

    // 번호·제목·작성자·등록일 순서가 흔하다. 등록일 바로 앞 칸을 작성자로 본다.
    // (번호 칸에 "공지"가 들어가는 게시판이 있어서, 앞에서부터 찾으면 그걸 집는다)
    const prev = dateIdx > 0 ? cells[dateIdx - 1] : "";
    const writer =
      prev && prev !== title && !DATE_RE.test(prev) && prev.length <= 20 ? prev : "";

    const rowText = text(tr);
    const pinned = /공지|중요|필독/.test(rowText.slice(0, 12));

    return { title, date, writer, pinned, link: link.href };
  }

  function scrape() {
    const rows = ROW_SELECTOR
      ? [...document.querySelectorAll(ROW_SELECTOR)]
      : [...document.querySelectorAll("tr")];
    const seen = new Set();
    const out = [];
    for (const tr of rows) {
      const n = parseRow(tr);
      if (!n || seen.has(n.link + n.title)) continue;
      seen.add(n.link + n.title);
      out.push(n);
    }
    return out;
  }

  // ---- UI -------------------------------------------------------------

  function build(notices) {
    const root = document.createElement("div");
    root.className = "hm-root";
    root.innerHTML = `
      <button class="hm-fab" type="button" aria-label="공지 모바일로 보기">공지</button>
      <div class="hm-sheet" hidden>
        <header class="hm-head">
          <button class="hm-back" type="button" hidden>← 뒤로</button>
          <strong class="hm-title">HISNet 공지사항</strong>
          <button class="hm-close" type="button" aria-label="닫기">✕</button>
        </header>
        <div class="hm-body"></div>
      </div>`;
    document.body.appendChild(root);

    const sheet = root.querySelector(".hm-sheet");
    const body = root.querySelector(".hm-body");
    const back = root.querySelector(".hm-back");
    const title = root.querySelector(".hm-title");

    const renderList = () => {
      back.hidden = true;
      title.textContent = `HISNet 공지사항 (${notices.length})`;
      body.innerHTML = "";
      notices.forEach((n) => {
        const item = document.createElement("div");
        item.className = "hm-item" + (n.pinned ? " hm-pinned" : "");
        item.innerHTML = `<div class="hm-item-title"></div><div class="hm-meta"></div>`;
        item.querySelector(".hm-item-title").textContent = n.title;
        item.querySelector(".hm-meta").textContent =
          [n.date, n.writer].filter(Boolean).join(" · ");
        item.addEventListener("click", () => renderDetail(n));
        body.appendChild(item);
      });
    };

    const renderDetail = (n) => {
      back.hidden = false;
      title.textContent = "공지 상세";
      body.innerHTML = `
        <h3 class="hm-detail-title"></h3>
        <div class="hm-meta"></div>
        <a class="hm-open" target="_top">원문 열기</a>`;
      body.querySelector(".hm-detail-title").textContent = n.title;
      body.querySelector(".hm-meta").textContent =
        [n.date, n.writer].filter(Boolean).join(" · ");
      body.querySelector(".hm-open").href = n.link;
    };

    root.querySelector(".hm-fab").addEventListener("click", () => {
      sheet.hidden = false;
      renderList();
    });
    root.querySelector(".hm-close").addEventListener("click", () => {
      sheet.hidden = true;
    });
    back.addEventListener("click", renderList);

    renderList();
  }

  const notices = scrape();
  if (notices.length) build(notices);
})();
