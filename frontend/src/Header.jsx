import { Link } from 'react-router-dom'

export default function Header({ admin = false, onLogout }) {
  return (
    <header className="header">
      <Link to={admin ? '/admin' : '/'} className="brand">{admin ? '상담 예약 관리자' : '상담 예약'}</Link>
      {admin
        ? onLogout && <button className="link" onClick={onLogout}>로그아웃</button>
        : <Link to="/my" className="link">내 예약 확인</Link>}
    </header>
  )
}
