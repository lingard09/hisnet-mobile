/* 히즈넷 공지 목록을 읽어 모바일용 화면으로 다시 그린다.
 *
 * 히즈넷은 <frameset> 구조라 실제 내용이 안쪽 프레임에 있다.
 * manifest의 all_frames:true 덕에 이 스크립트는 프레임마다 각각 실행되고,
 * 공지처럼 보이는 표를 찾은 프레임에서만 UI를 띄운다.
 */
(() => {
  "use strict";

  // 2026-09-01, 2026.9.1, 26-09-01 을 모두 받는다.
  // 구형 게시판은 2자리 연도를 쓰는 곳이 많다.
  const DATE_RE = /(?:^|\D)((?:20)?\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:\D|$)/;

  // 실제 DOM을 보고 조정할 여지를 남긴다. 비워두면 아래 휴리스틱을 쓴다.
  const ROW_SELECTOR = "";
  const BODY_SELECTOR = "";

  // 실제 게시판에서 확인된 본문 컨테이너.
  // 글자 수 휴리스틱은 본문보다 긴 사이드 배너에 지므로, 이쪽을 먼저 본다.
  const KNOWN_BODY_SELECTORS = [".readText.BoardContent", ".BoardContent", ".readText"];

  // 구형 페이지는 본문도 이 표에 담는다. 다만 레이아웃도 같은 표로 짜기 때문에
  // 바깥 것을 집으면 배너·푸터까지 딸려온다. 가장 안쪽 것부터 본다.
  const CONTENT_TABLE =
    'table[width="100%"][border="0"][cellpadding="0"][cellspacing="0"]';

  // 배너·푸터·네비게이션으로 보이는 덩어리. 본문에서 걷어낸다.
  const JUNK_RE =
    /(^|[\s_-])(banner|footer|gnb|lnb|snb|nav|quick|copyright|aside)([\s_-]|$)/i;

  const looksJunk = (el) =>
    JUNK_RE.test(`${el.getAttribute("class") || ""} ${el.getAttribute("id") || ""}`);

  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

  /** 표의 한 행에서 공지 정보를 뽑는다. 공지가 아니면 null. */
  function parseRow(tr) {
    // 한 행에 링크가 여럿이다. 번호 칸도 링크이고 [첨부] 아이콘도 링크다.
    // 첫 번째를 집으면 제목 대신 번호가 나오므로, 가장 긴 것을 제목으로 본다.
    // (구형 게시판은 <a href> 대신 onclick 달린 <td>로 여는 곳도 있다)
    const clickables = [...tr.querySelectorAll("a[href], [onclick]")];
    if (!clickables.length) return null;

    let clickable = null;
    let titleLen = 0;
    for (const el of clickables) {
      const t = text(el);
      if (t.length < 2) continue;
      if (/^\d+$/.test(t)) continue; // 번호
      if (t.length > titleLen) {
        titleLen = t.length;
        clickable = el;
      }
    }
    if (!clickable) return null;

    const title = text(clickable);
    if (title.length < 2) return null;

    // 제목에 걸린 링크를 원문 주소로 쓴다
    const link =
      (clickable.matches && clickable.matches("a[href]") && clickable) ||
      clickable.querySelector("a[href]") ||
      (clickable.closest && clickable.closest("a[href]")) ||
      null;

    const cells = [...tr.children].map(text);
    const dateIdx = cells.findIndex((c) => DATE_RE.test(c));
    if (dateIdx < 0) return null; // 날짜 없는 행은 헤더나 페이지네이션으로 본다

    const m = cells[dateIdx].match(DATE_RE);
    const yy = m[1].length === 2 ? `20${m[1]}` : m[1];
    const date = `${yy}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;

    // 번호·제목·작성자·등록일 순서가 흔하다. 등록일 바로 앞 칸을 작성자로 본다.
    // (번호 칸에 "공지"가 들어가는 게시판이 있어서, 앞에서부터 찾으면 그걸 집는다)
    const prev = dateIdx > 0 ? cells[dateIdx - 1] : "";
    const writer =
      prev && prev !== title && !DATE_RE.test(prev) && prev.length <= 20 ? prev : "";

    const rowText = text(tr);
    const pinned = /공지|중요|필독/.test(rowText.slice(0, 12));

    // href가 없으면 원문을 가져올 수 없다. 대신 원래 요소를 눌러 이동한다.
    return { title, date, writer, pinned, link: link ? link.href : "", srcEl: clickable };
  }

  function scrape(doc) {
    const rows = ROW_SELECTOR
      ? [...doc.querySelectorAll(ROW_SELECTOR)]
      : [...doc.querySelectorAll("tr")];
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

  // ---- 원문 본문 --------------------------------------------------------

  /** 응답 바이트를 페이지 인코딩에 맞춰 문자열로 만든다.
   *  히즈넷은 euc-kr이라 그냥 res.text()를 쓰면 한글이 깨진다. */
  async function fetchDoc(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();

    // Content-Type에 charset이 있으면 그걸, 없으면 현재 문서 인코딩을 따른다
    const ct = res.headers.get("content-type") || "";
    const m = ct.match(/charset=([\w-]+)/i);
    const charset = (m && m[1]) || document.characterSet || "utf-8";

    let html = new TextDecoder(charset).decode(buf);

    // 문서 안에 charset이 따로 선언돼 있으면 그걸로 다시 읽는다
    const meta = html.match(/charset=["']?([\w-]+)/i);
    if (meta && meta[1].toLowerCase() !== charset.toLowerCase()) {
      try {
        html = new TextDecoder(meta[1]).decode(buf);
      } catch (_) {
        /* 모르는 인코딩이면 처음 것을 쓴다 */
      }
    }
    return new DOMParser().parseFromString(html, "text/html");
  }

  // compareDocumentPosition 비트값
  const POS_FOLLOWING = 4; // 기준 노드보다 뒤에 있다
  const POS_CONTAINS = 8; // 기준 노드를 품고 있다

  /** 목록에서 얻은 제목이 실제로 찍힌 가장 작은 요소를 찾는다. */
  function findTitleNode(doc, title) {
    if (!title) return null;
    const key = title.slice(0, 12);
    let best = null;
    for (const el of doc.querySelectorAll("h1,h2,h3,h4,h5,td,div,span,p,b,strong,font")) {
      const t = text(el);
      if (!t.includes(key)) continue;
      if (!best || t.length < text(best).length) best = el;
    }
    return best;
  }

  /** 본문 후보를 점수순으로 세운다.
   *
   *  글자 수만 보면 사이드 배너처럼 길기만 한 덩어리에 진다.
   *  그래서 목록에서 이미 아는 제목을 기준점으로 삼는다.
   *  본문은 제목 뒤에 오고, 감싸는 통은 제목을 품고 있다. */
  function rankBodies(doc, title) {
    const titleNode = findTitleNode(doc, title);
    const out = [];
    for (const el of doc.querySelectorAll("td, div, article, section, p")) {
      const len = text(el).length;
      if (len < 30) continue;
      const links = el.querySelectorAll("a").length;
      let score = len / (1 + links * 20); // 링크가 많으면 목록·네비로 본다
      if (looksJunk(el)) score *= 0.05; // banner/footer/nav 류
      if (titleNode && titleNode !== el) {
        const pos = titleNode.compareDocumentPosition(el);
        if (pos & POS_FOLLOWING) score *= 3; // 제목 뒤 = 본문일 가능성
        if (pos & POS_CONTAINS) score *= 0.2; // 제목을 품음 = 감싸는 통
      }
      out.push({ el, score });
    }
    const ranked = out.sort((a, b) => b.score - a.score).map((c) => c.el);

    // 알려진 선택자가 맞으면 그것을 맨 앞에 둔다.
    // 나머지는 뒤에 남겨서 "다른 영역 보기"로 계속 넘겨볼 수 있게 한다.
    const known = [];
    for (const sel of KNOWN_BODY_SELECTORS) {
      let hits;
      try {
        hits = doc.querySelectorAll(sel);
      } catch (_) {
        continue;
      }
      for (const el of hits) {
        if (text(el).length >= 10 && !known.includes(el)) known.push(el);
      }
    }
    // 본문 표 후보: 안쪽에 같은 표를 품지 않은 것(=가장 안쪽)부터,
    // 그중에서도 글자가 많고 링크가 적은 순으로
    let tables = [];
    try {
      tables = [...doc.querySelectorAll(CONTENT_TABLE)]
        .filter((t) => !t.querySelector(CONTENT_TABLE) && !looksJunk(t))
        .filter((t) => text(t).length >= 20)
        .sort(
          (a, b) =>
            text(b).length / (1 + b.querySelectorAll("a").length * 20) -
            text(a).length / (1 + a.querySelectorAll("a").length * 20)
        );
    } catch (_) {
      tables = [];
    }

    // 표를 통째로 쓰면 제목·작성자 줄까지 딸려온다.
    // 표 안에서 제목을 담지 않은 가장 큰 셀이 있으면 그쪽을 먼저 보여준다.
    const bestCellIn = (table) => {
      let best = null;
      let bestLen = 0;
      for (const cell of table.querySelectorAll("td, th")) {
        if (cell.querySelector("table")) continue; // 다른 셀을 품은 껍데기
        const t = text(cell);
        if (t.length < 20) continue;
        if (titleNode && t.includes(text(titleNode))) continue; // 제목 줄
        if (cell.querySelectorAll("a").length > 2) continue;
        if (t.length > bestLen) {
          bestLen = t.length;
          best = cell;
        }
      }
      return best;
    };

    const head = [...known];
    for (const t of tables) {
      const cell = bestCellIn(t);
      if (cell && !head.includes(cell)) head.push(cell);
      if (!head.includes(t)) head.push(t);
    }
    return [...head, ...ranked.filter((el) => !head.includes(el))];
  }

  /** 후보가 무엇인지 한 줄로 요약한다. 어느 후보가 본문인지 화면에서 바로 읽으려고. */
  function describe(el) {
    const cls = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean);
    const tag = el.tagName.toLowerCase() + (cls.length ? "." + cls.join(".") : "");
    return `${tag.slice(0, 40)} · ${text(el).length}자`;
  }

  /** 고른 요소를 다음에도 찾을 수 있게 선택자를 만든다. */
  function cssPath(el) {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 6; n = n.parentElement) {
      if (n.id) {
        parts.unshift("#" + CSS.escape(n.id));
        break;
      }
      let seg = n.tagName.toLowerCase();
      const cls = (n.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean);
      if (cls.length) seg += "." + cls.map((c) => CSS.escape(c)).join(".");
      const sibs = n.parentElement
        ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName)
        : [];
      if (sibs.length > 1) seg += `:nth-of-type(${sibs.indexOf(n) + 1})`;
      parts.unshift(seg);
    }
    return parts.join(" > ");
  }

  // 사용자가 직접 고른 본문 위치를 게시판별로 기억한다
  const MEMO_KEY = `hm:body:${location.host}`;
  const remembered = () => {
    try {
      return localStorage.getItem(MEMO_KEY) || "";
    } catch (_) {
      return "";
    }
  };
  // 글자 크기는 배율로 기억한다. 화면 폭에 따른 기본값(clamp)은 그대로 두고 곱한다.
  const FS_KEY = "hm:fontscale";
  const FS_MIN = 0.85;
  const FS_MAX = 1.8;
  const readScale = () => {
    try {
      const v = parseFloat(localStorage.getItem(FS_KEY));
      return v >= FS_MIN && v <= FS_MAX ? v : 1;
    } catch (_) {
      return 1;
    }
  };
  const writeScale = (v) => {
    try {
      localStorage.setItem(FS_KEY, String(v));
    } catch (_) {
      /* 저장 못 해도 이번 화면에는 적용된다 */
    }
  };

  const forget = () => {
    try {
      localStorage.removeItem(MEMO_KEY);
    } catch (_) {
      /* 무시 */
    }
  };
  const remember = (sel) => {
    try {
      localStorage.setItem(MEMO_KEY, sel);
    } catch (_) {
      /* 저장 못 해도 이번 세션에는 동작한다 */
    }
  };

  // 표 안에 든 본문을 그대로 꽂으면 display:table-cell 로 렌더돼 폭을 못 채운다.
  // <td>·<tr> 같은 것은 알맹이만 꺼내 일반 블록에 담는다.
  const CELL_TAGS = new Set(["TD", "TH", "TR", "TBODY", "THEAD", "TFOOT"]);

  function unwrapCell(el) {
    if (!CELL_TAGS.has(el.tagName)) return el;
    const box = el.ownerDocument.createElement("div");
    // 본문 자체가 표를 품고 있을 수 있으니 자식은 그대로 옮긴다
    while (el.firstChild) box.appendChild(el.firstChild);
    return box;
  }

  /** 실행 가능한 것들을 걷어낸 사본을 만든다. */
  function sanitize(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll("script, style, link, iframe, object, embed, form").forEach((n) => n.remove());

    // 본문 안에 섞여 있는 배너·푸터 조각을 걷어낸다.
    // 다만 그게 본문의 대부분이면 오탐이므로 남긴다.
    const whole = text(clone).length || 1;
    clone.querySelectorAll("[class], [id]").forEach((n) => {
      if (!n.isConnected || !looksJunk(n)) return;
      if (text(n).length / whole > 0.5) return;
      n.remove();
    });
    clone.querySelectorAll("*").forEach((n) => {
      [...n.attributes].forEach((a) => {
        if (/^on/i.test(a.name) || /^javascript:/i.test(a.value)) n.removeAttribute(a.name);
      });
    });
    return unwrapCell(clone);
  }

  // ---- UI -------------------------------------------------------------

  /** 히즈넷에는 viewport 메타가 없다.
   *  그러면 폰이 980px짜리 화면으로 그린 뒤 통째로 축소해 보여준다.
   *  우리 오버레이도 같이 축소돼서 버튼이 손톱만해진다.
   *  최상위 문서에 메타를 넣어 실제 화면 폭으로 그리게 한다. */
  function ensureViewport(doc) {
    try {
      if (!doc || !doc.head) return;
      if (doc.querySelector('meta[name="viewport"]')) return;
      const m = doc.createElement("meta");
      m.name = "viewport";
      m.content = "width=device-width, initial-scale=1";
      doc.head.appendChild(m);
    } catch (_) {
      /* 못 넣어도 기능은 동작한다 */
    }
  }

  function build(doc, notices) {
    // 북마클릿으로 실행하면 CSS가 같이 오지 않는다. 오버레이를 그리는 그 문서에
    // 직접 심어야 한다 — 스타일은 프레임 경계를 넘지 못한다.
    // (확장은 manifest가 프레임마다 넣어주므로 이 블록이 하는 일이 없다)
    try {
      const css = window.__HM_CSS;
      if (css && !doc.getElementById("hm-style")) {
        const st = doc.createElement("style");
        st.id = "hm-style";
        st.textContent = css;
        (doc.head || doc.documentElement).appendChild(st);
      }
    } catch (_) {
      /* 스타일이 없어도 기능은 동작한다 */
    }

    // 프레임 안이라도 화면 축소를 정하는 건 최상위 문서다. 둘 다 챙긴다.
    try {
      ensureViewport(window.top.document);
    } catch (_) {
      /* 다른 출처면 건드릴 수 없다 */
    }
    ensureViewport(doc);

    const root = doc.createElement("div");
    root.className = "hm-root";
    root.innerHTML = `
      <button class="hm-fab" type="button" aria-label="공지 모바일로 보기">공지</button>
      <div class="hm-sheet" hidden>
        <header class="hm-head">
          <button class="hm-back" type="button" hidden>← 뒤로</button>
          <strong class="hm-title">HISNet 공지사항</strong>
          <span class="hm-fs">
            <button class="hm-fs-down" type="button" aria-label="글자 작게">가−</button>
            <button class="hm-fs-up" type="button" aria-label="글자 크게">가+</button>
          </span>
          <button class="hm-close" type="button" aria-label="닫기">✕</button>
        </header>
        <div class="hm-body"></div>
      </div>`;
    doc.body.appendChild(root);

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

    const renderDetail = async (n) => {
      back.hidden = false;
      title.textContent = "공지 상세";
      body.innerHTML = `
        <h3 class="hm-detail-title"></h3>
        <div class="hm-meta"></div>
        <div class="hm-content hm-loading">본문 불러오는 중...</div>
        <div class="hm-candinfo"></div>
        <div class="hm-pickrow">
          <button class="hm-repick" type="button" hidden></button>
          <button class="hm-keep" type="button" hidden>이걸로 기억하기</button>
        </div>
        <div class="hm-memo"></div>
        <a class="hm-open" target="_top">원문 페이지로</a>`;
      body.querySelector(".hm-detail-title").textContent = n.title;
      body.querySelector(".hm-meta").textContent =
        [n.date, n.writer].filter(Boolean).join(" · ");
      body.querySelector(".hm-open").href = n.link;

      const slot = body.querySelector(".hm-content");
      const retry = body.querySelector(".hm-repick");
      const info = body.querySelector(".hm-candinfo");
      const keep = body.querySelector(".hm-keep");
      const memo = body.querySelector(".hm-memo");
      const open = body.querySelector(".hm-open");

      if (!n.link) {
        // href 없이 onclick으로 여는 게시판. 원문 주소를 모르니 가져올 수 없다.
        slot.classList.remove("hm-loading");
        slot.textContent = "이 게시판은 원문 주소가 없어 본문을 미리 가져올 수 없습니다.";
        open.removeAttribute("href");
        open.textContent = "원문 열기";
        open.onclick = () => n.srcEl && n.srcEl.click();
        return;
      }

      try {
        const doc = await fetchDoc(n.link);
        const ranked = rankBodies(doc, n.title);
        if (!ranked.length) throw new Error("본문 후보 없음");

        // 전에 직접 고른 위치가 있으면 그것을 맨 앞으로
        const savedSel = remembered();
        if (savedSel) {
          const hit = doc.querySelector(savedSel);
          if (hit) {
            const i = ranked.indexOf(hit);
            if (i > 0) ranked.splice(i, 1);
            if (i !== 0) ranked.unshift(hit);
          }
        }

        const showMemo = () => {
          const m = remembered();
          memo.innerHTML = "";
          if (!m) return;
          const label = doc.createElement("span");
          label.textContent = `기억됨: ${m.slice(0, 46)}`;
          const clear = doc.createElement("button");
          clear.className = "hm-forget";
          clear.textContent = "기억 지우기";
          clear.onclick = () => {
            forget();
            showMemo();
          };
          memo.append(label, clear);
        };

        let idx = 0;
        const show = () => {
          slot.classList.remove("hm-loading", "hm-error");
          slot.replaceChildren(sanitize(ranked[idx]));
          retry.hidden = ranked.length < 2;
          keep.hidden = ranked.length < 2;
          retry.textContent = `다른 영역 보기 — 지금 ${idx + 1}/${ranked.length}`;
          info.textContent = `${idx + 1}/${ranked.length} · ${describe(ranked[idx])}`;
        };
        show();
        showMemo();

        // 훑어보기는 저장하지 않는다.
        // 예전에는 누를 때마다 저장해서, 지나쳐 간 배너까지 기억에 남았다.
        retry.onclick = () => {
          idx = (idx + 1) % ranked.length;
          show();
        };

        keep.onclick = () => {
          remember(cssPath(ranked[idx]));
          showMemo();
        };
      } catch (e) {
        slot.classList.remove("hm-loading");
        slot.classList.add("hm-error");
        slot.textContent = `본문을 불러오지 못했습니다 (${e.message}). 아래 링크로 원문을 열어보세요.`;
      }
    };

    let scale = readScale();
    const applyScale = () => {
      // clamp()로 정한 기본값에 배율을 곱한다
      // 본문만 조절한다. 버튼·목록은 --hm-ui 가 따로 정한다.
      sheet.style.setProperty("--hm-fs", `${(12 * scale).toFixed(1)}px`);
    };
    applyScale();

    const bump = (d) => {
      scale = Math.min(FS_MAX, Math.max(FS_MIN, Math.round((scale + d) * 100) / 100));
      applyScale();
      writeScale(scale);
    };
    root.querySelector(".hm-fs-up").addEventListener("click", () => bump(0.12));
    root.querySelector(".hm-fs-down").addEventListener("click", () => bump(-0.12));

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

  /** 같은 출처인 문서를 전부 모은다.
   *  히즈넷은 frameset이라 최상위 문서에는 표도 body도 없다.
   *  확장은 all_frames로 프레임마다 실행되지만,
   *  북마클릿은 최상위에서 한 번만 실행되므로 직접 내려가야 한다. */
  function sameOriginDocs(win, acc = []) {
    let doc;
    try {
      doc = win.document;
    } catch (_) {
      return acc; // 다른 출처 프레임은 건너뛴다
    }
    acc.push(doc);
    // window.frames는 Window 객체라 for...of로 순회할 수 없다. 인덱스로 돈다.
    for (let i = 0; i < win.frames.length; i++) sameOriginDocs(win.frames[i], acc);
    return acc;
  }

  function start() {
    let root;
    try {
      root = window.top; // 북마클릿은 여기서 시작해 아래로 내려간다
    } catch (_) {
      root = window;
    }
    for (const doc of sameOriginDocs(root)) {
      // frameset 문서도 document.body가 <frameset>을 돌려주므로 태그를 확인한다
      if (!doc.body || doc.body.tagName !== "BODY") continue;
      // 이미 붙어 있으면 성공으로 본다.
      // content.js가 스스로 start()를 부르고 북마클릿 래퍼가 한 번 더 부르는데,
      // 여기서 false를 돌려주면 성공한 실행에도 진단 패널이 떴다.
      // 겸사겸사 닫아둔 목록을 다시 열어준다(북마크를 다시 누른 경우).
      if (doc.documentElement.dataset.hmActive) {
        const open = doc.querySelector(".hm-sheet");
        if (open) open.hidden = false;
        return true;
      }
      const notices = scrape(doc);
      if (notices.length) {
        doc.documentElement.dataset.hmActive = "1";
        build(doc, notices);
        return true;
      }
    }
    return false;
  }

  /** 공지를 못 찾았을 때, 무엇을 보고 그렇게 판단했는지 화면에 보여준다.
   *  "못 찾았습니다"만 띄우면 고칠 단서가 없다. */
  function diagnose() {
    let root;
    try {
      root = window.top;
    } catch (_) {
      root = window;
    }
    const docs = sameOriginDocs(root);
    const lines = [];
    let sample = null;

    docs.forEach((doc, i) => {
      if (!doc.body || doc.body.tagName !== "BODY") {
        lines.push(`${i}. ${doc.location ? doc.location.pathname : "?"} — frameset (표 없음)`);
        return;
      }
      const rows = [...doc.querySelectorAll("tr")];
      const withLink = rows.filter((r) => r.querySelector("a[href], [onclick]"));
      const withDate = rows.filter((r) => DATE_RE.test(text(r)));
      lines.push(
        `${i}. ${doc.location.pathname} — tr ${rows.length}개 / ` +
          `링크 ${withLink.length}개 / 날짜 ${withDate.length}개`
      );
      if (!sample && withLink.length) {
        sample = [...withLink[0].children].map(text).filter(Boolean);
      }
    });

    const cross = (() => {
      try {
        let n = 0;
        for (let i = 0; i < root.frames.length; i++) {
          try {
            root.frames[i].document;
          } catch (_) {
            n++;
          }
        }
        return n;
      } catch (_) {
        return 0;
      }
    })();

    const doc = document.body && document.body.tagName === "BODY" ? document : docs.find((d) => d.body && d.body.tagName === "BODY");
    if (!doc) return;

    const box = doc.createElement("div");
    box.className = "hm-diag";
    const parts = [
      "공지 목록을 찾지 못했습니다.",
      "",
      `같은 출처 문서 ${docs.length}개` + (cross ? ` / 다른 출처 프레임 ${cross}개(접근 불가)` : ""),
      ...lines,
    ];
    if (sample) parts.push("", "링크 있는 첫 행의 칸:", sample.map((c) => `[${c.slice(0, 24)}]`).join(" "));
    parts.push("", "공지 목록 화면에서 눌렀는지 확인해 주세요.");
    box.textContent = parts.join("\n");

    const close = doc.createElement("button");
    close.textContent = "닫기";
    close.className = "hm-diag-close";
    close.onclick = () => box.remove();
    box.appendChild(close);
    doc.body.appendChild(box);
  }

  // 북마클릿으로 부를 수 있게 이름을 남긴다
  window.__hisnetMobileStart = start;
  window.__hisnetMobileDiagnose = diagnose;
  start();
})();
