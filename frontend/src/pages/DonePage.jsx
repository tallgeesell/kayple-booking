import { Link, Navigate, useLocation } from 'react-router-dom'
import Header from '../Header.jsx'
import { slotText } from '../format.js'

export default function DonePage() {
  const r = useLocation().state
  if (!r) return <Navigate to="/" replace />
  return (
    <>
      <Header />
      <main className="container center">
        <div className="check">✓</div>
        <h1>예약이 완료되었습니다</h1>
        <p className="sub">아래 내용으로 예약되었습니다</p>
        <dl className="info-box">
          <div><dt>예약 번호</dt><dd>#{r.id}</dd></div>
          <div><dt>날짜 · 시간</dt><dd>{slotText(r.date, r.hour)}</dd></div>
          <div><dt>이름</dt><dd>{r.name}</dd></div>
          <div><dt>연락처</dt><dd>{r.phoneMasked}</dd></div>
        </dl>
        <div className="btn-row">
          <Link to="/my" className="btn outline">내 예약 확인</Link>
          <Link to="/" className="btn primary">처음으로</Link>
        </div>
      </main>
    </>
  )
}
