import { useEffect, useState } from "react";

export default function App() {
  const [notices, setNotices] = useState(null);

  useEffect(() => {
    function onMessage(event) {
      if (event.data?.type === "NOTICES") {
        console.log("📥 공지 수신:", event.data.data.length);
        setNotices(event.data.data);
        setLoading(false);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!notices) {
    return <div style={styles.loading}>공지 불러오는 중…</div>;
  }

  function openNotice(url) {
    window.webkit?.messageHandlers?.noticeHandler?.postMessage({
      type: "OPEN_NOTICE",
      url,
    });
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>📢 HISNet 공지사항</h2>

      {notices.map((n, i) => (
        <div key={i} style={styles.card} onClick={() => openNotice(n.link)}>
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
    background: "#f6f6f6",
    minHeight: "100vh",
    fontFamily: "system-ui",
  },
  header: { marginBottom: 12 },
  loading: { padding: 20, fontSize: 16 },
  card: {
    background: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
  },
  title: { fontWeight: 600, marginBottom: 4 },
  meta: { fontSize: 12, color: "#666" },
};
