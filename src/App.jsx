import { useEffect, useState } from "react";

export default function App() {
  const [notices, setNotices] = useState(null);

  useEffect(() => {
    /* ✅ React 준비 완료 신호 */
    if (window.webkit?.messageHandlers?.reactReady) {
      window.webkit.messageHandlers.reactReady.postMessage("ready");
    }

    function handleMessage(event) {
      const data = event.data;

      if (data?.type === "HISNET_NOTICES") {
        console.log("📩 공지 수신:", data.payload.length);
        setNotices(data.payload);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  /* 로딩 상태 */
  if (!notices) {
    return <div style={styles.loading}>공지 불러오는 중…</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>📢 HISNet 공지사항</h2>

      {notices.map((n, idx) => (
        <div
          key={idx}
          style={styles.card}
          onClick={() => {
            console.log("🔗 원문 열기:", n.link);
            if (window.webkit?.messageHandlers?.openLink) {
              window.webkit.messageHandlers.openLink.postMessage(n.link);
            }
          }}
        >
          <div style={styles.title}>
            {n.pinned ? "📌 " : ""}
            {n.title}
          </div>
          <div style={styles.meta}>
            {n.writer} · {n.date} · 조회 {n.views}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    padding: 16,
    fontFamily: "system-ui",
    background: "#f6f6f6",
    minHeight: "100vh",
  },
  header: {
    marginBottom: 12,
  },
  loading: {
    padding: 20,
    fontSize: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },
  title: {
    fontWeight: 600,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: "#666",
  },
};
