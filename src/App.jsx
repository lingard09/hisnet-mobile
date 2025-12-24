import { useEffect, useState } from "react";

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(null);

  // Swift → React 메시지 수신
  useEffect(() => {
    function onMessage(event) {
      const msg = event.data;

      if (msg?.type === "NOTICES") {
        setNotices(msg.data);
        setLoading(false);
      }

      if (msg?.type === "GO_BACK") {
        setCurrentUrl(null);
      }
    }

    window.addEventListener("message", onMessage);

    // 🔥 React 준비 완료 알림
    window.webkit?.messageHandlers?.reactReady?.postMessage("READY");

    return () => window.removeEventListener("message", onMessage);
  }, []);

  // 공지 클릭 → 원문 열기
  const openNotice = (url) => {
    setCurrentUrl(url);
    window.webkit?.messageHandlers?.openNotice?.postMessage(url);
  };

  if (loading) {
    return <div style={{ padding: 20 }}>공지 불러오는 중...</div>;
  }

  // 📄 공지 원문 화면
  if (currentUrl) {
    return (
      <div style={{ height: "100vh" }}>
        <button
          onClick={() => setCurrentUrl(null)}
          style={{ padding: 10 }}
        >
          ← 목록으로
        </button>

        <iframe
          src={currentUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    );
  }

  // 📋 공지 리스트
  return (
    <div style={{ padding: 20 }}>
      <h2>📢 한동대 공지사항</h2>

      {notices.map((n, i) => (
        <div
          key={i}
          onClick={() => openNotice(n.link)}
          style={{
            borderBottom: "1px solid #ddd",
            padding: "10px 0",
            cursor: "pointer"
          }}
        >
          <b>{n.title}</b>
          <div style={{ fontSize: 12, color: "#666" }}>
            {n.writer} · {n.date}
          </div>
        </div>
      ))}
    </div>
  );
}
