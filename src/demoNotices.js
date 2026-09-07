// 브라우저에서 열었을 때만 쓰는 예시 데이터.
// 실제 공지는 네이티브(Swift)가 긁어와 HISNET_NOTICES 이벤트로 넣어준다.
// link가 없는 항목은 원문 열기 대신 안내 문구를 보여준다.
export const DEMO_NOTICES = [
  {
    title: "[학사] 2026학년도 2학기 수강신청 일정 안내",
    date: "2026-09-01",
    writer: "학사팀",
    pinned: true,
  },
  {
    title: "[장학] 교내 근로장학생 2차 모집",
    date: "2026-08-29",
    writer: "학생지원팀",
    pinned: true,
  },
  {
    title: "[도서관] 중간고사 기간 열람실 연장 운영",
    date: "2026-08-27",
    writer: "학술정보팀",
  },
  {
    title: "[취업] 하반기 공채 대비 자기소개서 특강",
    date: "2026-08-25",
    writer: "취업지원팀",
  },
  {
    title: "[시설] 기숙사 정기 소방점검 실시",
    date: "2026-08-22",
    writer: "생활관",
  },
];
