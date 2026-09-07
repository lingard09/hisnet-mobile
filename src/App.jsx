import { useEffect, useState } from "react";
import { DEMO_NOTICES } from "./demoNotices";

// 네이티브 WebView인지 판별한다.
// Safari 등 WebKit 브라우저에도 window.webkit이 있을 수 있어서
// 실제로 쓰는 messageHandlers까지 확인해야 한다.
function getBridge() {
  const handlers = window.webkit?.messageHandlers;
  return handlers?.reactReady ? handlers : null;
}

export default function App() {
  const [notices, setNotices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const handler = (e) => setNotices(e.detail);
    window.addEventListener("HISNET_NOTICES", handler);

    const bridge = getBridge();
    if (bridge) {
      // 네이티브가 공지를 긁어와 HISNET_NOTICES로 넣어준다.
      bridge.reactReady.postMessage("READY");
    } else {
      // 브라우저에는 네이티브가 없어 이벤트가 영영 오지 않는다.
      // 화면이 "불러오는 중"에 멈추지 않도록 예시 데이터를 보여준다.
      setNotices(DEMO_NOTICES);
      setIsDemo(true);
    }

    return () => window.removeEventListener("HISNET_NOTICES", handler);
  }, []);

  const openOriginal = (notice) => {
    const bridge = getBridge();
    if (bridge?.openNotice) {
      bridge.openNotice.postMessage(notice.link);
    } else if (notice.link) {
      window.open(notice.link, "_blank", "noopener");
    }
  };

  // 원문 보기
  if (selected) {
    const canOpen = !!getBridge()?.openNotice || !!selected.link;
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setSelected(null)} style={styles.back}>
          ← 뒤로
        </button>
        <h3 style={{ margin: "16px 0 8px" }}>{selected.title}</h3>
        <div style={styles.meta}>
          {selected.date} · {selected.writer}
        </div>
        {canOpen ? (
          <button onClick={() => openOriginal(selected)} style={styles.open}>
            원문 열기
          </button>
        ) : (
          <p style={styles.note}>예시 공지라 원문이 없습니다.</p>
        )}
      </div>
    );
  }

  // 공지 리스트
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 12px" }}>HISNet 공지사항</h2>

      {isDemo && (
        <p style={styles.banner}>
          예시 데이터입니다. 실제 공지는 iOS 앱에서 불러옵니다.
        </p>
      )}

      {notices.length === 0 && <p>공지 불러오는 중...</p>}

      {notices.map((n, i) => (
        <div
          key={i}
          onClick={() => setSelected(n)}
          style={{
            padding: 12,
            borderBottom: "1px solid #ddd",
            cursor: "pointer",
            background: n.pinned ? "#f9f9ff" : "white",
          }}
        >
          <strong>{n.title}</strong>
          <div style={styles.meta}>
            {n.date} · {n.writer}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  meta: { fontSize: 12, color: "#666" },
  banner: {
    margin: "0 0 12px",
    padding: "8px 10px",
    background: "#fff8e1",
    border: "1px solid #f0e0b0",
    borderRadius: 6,
    fontSize: 13,
    color: "#7a6220",
  },
  back: { padding: "6px 10px", cursor: "pointer" },
  open: { padding: "8px 12px", marginTop: 12, cursor: "pointer" },
  note: { fontSize: 13, color: "#888", marginTop: 12 },
};
