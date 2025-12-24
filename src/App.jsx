import { useEffect, useState } from "react";

export default function App() {
  const [notices, setNotices] = useState([]);
  const [selected, setSelected] = useState(null);

  // Swift에 READY 알림
  useEffect(() => {
    if (window.webkit) {
      window.webkit.messageHandlers.reactReady.postMessage("READY");
    }

    const handler = (e) => {
      setNotices(e.detail);
    };

    window.addEventListener("HISNET_NOTICES", handler);
    return () => window.removeEventListener("HISNET_NOTICES", handler);
  }, []);

  // 원문 보기
  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)}>← 뒤로</button>
        <iframe
          src={selected.link}
          style={{ width: "100%", height: "95vh", border: "none" }}
        />
      </div>
    );
  }

  // 공지 리스트
  return (
    <div style={{ padding: 16 }}>
      <h2>HISNet 공지사항</h2>

      {notices.length === 0 && <p>공지 불러오는 중...</p>}

      {notices.map((n, i) => (
        <div
          key={i}
          onClick={() => setSelected(n)}
          style={{
            padding: 12,
            borderBottom: "1px solid #ddd",
            cursor: "pointer",
            background: n.pinned ? "#f9f9ff" : "white"
          }}
        >
          <strong>{n.title}</strong>
          <div style={{ fontSize: 12, color: "#666" }}>
            {n.date} · {n.writer}
          </div>
        </div>
      ))}
    </div>
  );
}
