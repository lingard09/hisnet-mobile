import { useEffect, useState } from "react";

function App() {
  const [notices, setNotices] = useState([]);

  // useEffect(() => {
  //   // iOS WebView에서 데이터 받기
  //   window.receiveNotices = (data) => {
  //     setNotices(data);
  //     localStorage.setItem("hisnet_notices", JSON.stringify(data));
  //   };

  //   // 새로고침 대비
  //   const saved = localStorage.getItem("hisnet_notices");
  //   if (saved) setNotices(JSON.parse(saved));
  // }, []);

  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === "HISNET_NOTICES") {
        console.log("📩 공지 수신", event.data.payload);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>📢 HISNet 공지</h2>

      {notices.length === 0 && (
        <p>공지 데이터가 없습니다. HISNet에서 가져오세요.</p>
      )}

      {notices.map((n, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <strong>
            {n.pinned ? "📌 " : ""}
            {n.title}
          </strong>
          <div style={{ fontSize: 12 }}>
            {n.date} · {n.writer} · 조회 {n.views}
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
