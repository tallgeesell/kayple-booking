import { useEffect, useMemo, useState } from 'react'
import Header from '../Header.jsx'
import Modal from '../Modal.jsx'
import { api } from '../api.js'
import { hourText, longDate, toIso, STATUS_LABEL } from '../format.js'

export default function AdminPage() {
  const [authed, setAuthed] = useState(null) // null = 확인 중

  useEffect(() => {
    api('/admin/me').then(() => setAuthed(true)).catch(() => setAuthed(false))
  }, [])

  async function logout() {
    await api('/admin/logout', { method: 'POST' }).catch(() => {})
    setAuthed(false)
  }

  if (authed === null) return <Header admin />
  return authed ? <AdminSchedule onLogout={logout} onExpired={() => setAuthed(false)} /> : <AdminLogin onLogin={() => setAuthed(true)} />
}

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!username || !password) { setError('아이디와 비밀번호를 입력해 주세요'); return }
    setBusy(true)
    try {
      await api('/admin/login', { method: 'POST', body: { username, password } })
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  return (
    <>
      <Header admin />
      <main className="container narrow">
        <h1>관리자 로그인</h1>
        <form onSubmit={submit} noValidate>
          <label className="field-label" htmlFor="u">아이디</label>
          <input id="u" className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <label className="field-label" htmlFor="p">비밀번호</label>
          <input id="p" type="password" className={error ? 'input invalid' : 'input'} autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="field-error">{error}</p>}
          <button className="btn primary block" disabled={busy}>로그인</button>
        </form>
      </main>
    </>
  )
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

function calendarCells(year, month) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0).getDate()
  const cells = Array(first.getDay()).fill(null)
  for (let d = 1; d <= last; d++) cells.push(toIso(new Date(year, month - 1, d)))
  while (cells.length % 7) cells.push(null)
  return cells
}

function AdminSchedule({ onLogout, onExpired }) {
  const now = new Date()
  const todayIso = toIso(now)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selected, setSelected] = useState(todayIso)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setRows(await api(`/admin/reservations?year=${year}&month=${month}`))
      setError('')
    } catch (e) {
      if (e.status === 401) onExpired()
      else setError(e.message)
    }
  }
  useEffect(() => { load() }, [year, month])

  function changeMonth(y, m) {
    setYear(y)
    setMonth(m)
    const isCurrent = y === now.getFullYear() && m === now.getMonth() + 1
    setSelected(isCurrent ? todayIso : toIso(new Date(y, m - 1, 1)))
  }

  const byDate = useMemo(() => {
    const map = {}
    for (const r of rows) (map[r.date] ||= []).push(r)
    return map
  }, [rows])
  const dayRows = byDate[selected] || []

  async function approve(r) {
    setBusy(true)
    try { await api(`/admin/reservations/${r.id}/approve`, { method: 'POST' }); await load() }
    catch (e) { e.status === 401 ? onExpired() : setError(e.message) }
    finally { setBusy(false) }
  }

  async function submitCancel() {
    if (!reason.trim()) { setReasonError('취소 사유를 입력해 주세요'); return }
    setBusy(true)
    try {
      await api(`/admin/reservations/${cancelTarget.id}/cancel`, { method: 'POST', body: { reason: reason.trim() } })
      setCancelTarget(null)
      await load()
    } catch (e) {
      if (e.status === 401) onExpired()
      else setReasonError(e.message)
    } finally { setBusy(false) }
  }

  return (
    <>
      <Header admin onLogout={onLogout} />
      <main className="container wide">
        <div className="admin-head">
          <h1>예약 관리</h1>
          <div className="year-nav">
            <button className="btn outline small" onClick={() => changeMonth(year - 1, month)} aria-label="이전 연도">‹</button>
            <strong>{year}년</strong>
            <button className="btn outline small" onClick={() => changeMonth(year + 1, month)} aria-label="다음 연도">›</button>
          </div>
        </div>
        <div className="month-tabs" role="tablist">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button key={m} role="tab" aria-selected={m === month} className={m === month ? 'tab active' : 'tab'} onClick={() => changeMonth(year, m)}>{m}월</button>
          ))}
        </div>
        {error && <div className="banner-error">{error}</div>}

        <div className="calendar">
          {WEEK.map((w, i) => <div key={w} className={`cal-head ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{w}</div>)}
          {calendarCells(year, month).map((d, i) => {
            if (!d) return <div key={i} className="cal-cell empty-day" />
            const list = byDate[d] || []
            const pending = list.filter((r) => r.status === 'PENDING').length
            const confirmed = list.filter((r) => r.status === 'CONFIRMED').length
            const cancelled = list.filter((r) => r.status === 'CANCELLED').length
            const cls = ['cal-cell', d === selected && 'selected', d === todayIso && 'today'].filter(Boolean).join(' ')
            return (
              <button key={d} className={cls} onClick={() => setSelected(d)}>
                <span className="cal-day">{Number(d.slice(8))}</span>
                {pending > 0 && <span className="chip pending">대기 {pending}</span>}
                {confirmed > 0 && <span className="chip confirmed">승인 {confirmed}</span>}
                {cancelled > 0 && <span className="chip cancelled">취소 {cancelled}</span>}
              </button>
            )
          })}
        </div>

        <h2>{longDate(selected)} 예약</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>시간</th><th>이름</th><th>연락처</th><th>상태</th><th>신청 일시</th><th>처리</th></tr></thead>
            <tbody>
              {dayRows.length === 0 && <tr><td colSpan="6" className="empty-cell">예약이 없습니다</td></tr>}
              {dayRows.map((r) => (
                <tr key={r.id}>
                  <td>{hourText(r.hour)}</td>
                  <td>{r.name}</td>
                  <td>{r.phoneMasked}</td>
                  <td>
                    <span className={`badge ${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span>
                    {r.status === 'CANCELLED' && (
                      <div className="meta">{r.cancelledBy === 'ADMIN' ? `사유: ${r.cancelReason}` : '사용자 취소'}</div>
                    )}
                  </td>
                  <td className="muted">{r.createdAt}</td>
                  <td className="actions">
                    {r.past && r.status !== 'CANCELLED' && <span className="muted">지난 예약</span>}
                    {!r.past && r.status === 'PENDING' && <button className="btn primary small" disabled={busy} onClick={() => approve(r)}>승인</button>}
                    {!r.past && r.status !== 'CANCELLED' && (
                      <button className="btn danger-outline small" disabled={busy}
                        onClick={() => { setCancelTarget(r); setReason(''); setReasonError('') }}>취소</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {cancelTarget && (
        <Modal title={`${longDate(cancelTarget.date)} ${hourText(cancelTarget.hour)} ${cancelTarget.name} 님 예약을 취소할까요?`}
          busy={busy} onClose={() => setCancelTarget(null)}>
          <label className="field-label" htmlFor="reason">취소 사유</label>
          <textarea id="reason" className={reasonError ? 'input textarea invalid' : 'input textarea'} maxLength={200}
            placeholder="예약자에게 보여지는 사유입니다" value={reason} onChange={(e) => setReason(e.target.value)} />
          {reasonError && <p className="field-error">{reasonError}</p>}
          <div className="btn-row" style={{ marginTop: 24 }}>
            <button className="btn outline" disabled={busy} onClick={() => setCancelTarget(null)}>닫기</button>
            <button className="btn danger" disabled={busy} onClick={submitCancel}>취소하기</button>
          </div>
        </Modal>
      )}
    </>
  )
}
