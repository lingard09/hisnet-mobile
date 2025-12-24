import { useEffect, useState } from "react";

export default function App() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    function handleMessage(event) {
      const data = event.data;
      if (data?.type === "HISNET_NOTICES" && Array.isArray(data.payload)) {
        console.log("📩 공지 수신:", data.payload.length);
        setNotices(data.payload);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function openNotice(link) {
    // iOS WKWebView 환경
    if (window.webkit?.messageHandlers?.openLink) {
      window.webkit.messageHandlers.openLink.postMessage(link);
    } else {
      // 일반 웹 (Safari / Chrome / Desktop)
      window.open(link, "_blank");
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>HISNet 공지사항</h1>

      {notices.length === 0 ? (
        <p style={styles.loading}>공지 불러오는 중...</p>
      ) : (
        <ul style={styles.list}>
          {notices.map((n) => (
            <li
              key={n.id}
              style={styles.item}
              onClick={() => openNotice(n.link)}
            >
              {n.pinned && <span style={styles.pinned}>📌</span>}

              <div style={styles.title}>{n.title}</div>

              <div style={styles.meta}>
                {n.writer} · {n.date} · 조회 {n.views}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: "0 auto",
    padding: 16,
    fontFamily: "system-ui, -apple-system",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  loading: {
    textAlign: "center",
    color: "#666",
  },
  list: {
    listStyle: "none",
    padding: 0,
  },
  item: {
    padding: "12px 8px",
    borderBottom: "1px solid #eee",
    cursor: "pointer",
  },
  pinned: {
    marginRight: 6,
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
