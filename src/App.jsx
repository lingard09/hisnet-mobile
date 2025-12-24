import { useEffect, useState } from "react";

function App() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("hisnet_notices");
    if (saved) {
      setNotices(JSON.parse(saved));
    }
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>📢 HISNet 공지</h2>

      {notices.length === 0 && (
        <p>공지 데이터가 없습니다. HISNet에서 북마클릿을 실행하세요.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {notices.map((n, idx) => (
          <li key={idx} style={{ marginBottom: 12 }}>
            <a href={n.link} style={{ textDecoration: "none", color: "black" }}>
              {n.pinned && <strong>📌 </strong>}
              <div>{n.title}</div>
              <small>
                {n.date} · {n.writer} · 조회 {n.views}
              </small>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
