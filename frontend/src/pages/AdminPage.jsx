import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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

  const { date } = useParams()
  if (authed === null) return <Header admin />
  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />
  const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
  return valid
    ? <AdminDay key={date} date={date} onLogout={logout} onExpired={() => setAuthed(false)} />
    : <AdminSchedule onLogout={logout} onExpired={() => setAuthed(false)} />
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

async function fetchMonth(year, month) {
  return api(`/admin/reservations?year=${year}&month=${month}`)
}

/** 캘린더 화면. 연·월은 주소(?year=&month=)에 담아 목록 화면에서 돌아와도 같은 달이 보이게 한다. */
function AdminSchedule({ onLogout, onExpired }) {
  const navigate = useNavigate()
  const now = new Date()
  const todayIso = toIso(now)
  const [params, setParams] = useSearchParams()
  const year = Number(params.get('year')) || now.getFullYear()
  const month = Math.min(12, Math.max(1, Number(params.get('month')) || now.getMonth() + 1))
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMonth(year, month)
      .then((r) => { setRows(r); setError('') })
      .catch((e) => (e.status === 401 ? onExpired() : setError(e.message)))
  }, [year, month])

  const changeMonth = (y, m) => setParams({ year: String(y), month: String(m) }, { replace: true })

  const byDate = useMemo(() => {
    const map = {}
    for (const r of rows) (map[r.date] ||= []).push(r)
    return map
  }, [rows])

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
            return (
              <button key={d} className={d === todayIso ? 'cal-cell today' : 'cal-cell'} onClick={() => navigate(`/admin/${d}`)}>
                <span className="cal-day">{Number(d.slice(8))}</span>
                {pending > 0 && <span className="chip pending">대기 {pending}</span>}
                {confirmed > 0 && <span className="chip confirmed">승인 {confirmed}</span>}
                {cancelled > 0 && <span className="chip cancelled">취소 {cancelled}</span>}
              </button>
            )
          })}
        </div>
        <p className="meta">날짜를 누르면 해당일의 예약 목록으로 이동합니다</p>
      </main>
    </>
  )
}

/** 비고: 최대 2줄까지 보여주고, 넘치면 … 처리 + 눌러서 전문 다이얼로그. 요소는 하나로 유지해 측정 대상이 바뀌지 않게 한다. */
function NoteCell({ text, onOpen }) {
  const ref = useRef(null)
  const [clamped, setClamped] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])
  if (!text) return null
  const open = () => clamped && onOpen(text)
  return (
    <div ref={ref} className={clamped ? 'note clamped' : 'note'}
      role={clamped ? 'button' : undefined} tabIndex={clamped ? 0 : undefined}
      title={clamped ? '눌러서 전체 보기' : undefined}
      onClick={open} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open()}>
      {text}
    </div>
  )
}

function shiftDay(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  return toIso(new Date(y, m - 1, d + n))
}

/** 날짜별 예약 목록 화면. 대기 건 승인, 진행 중 건 사유 입력 후 취소. */
function AdminDay({ date, onLogout, onExpired }) {
  const navigate = useNavigate()
  const [y, m] = date.split('-').map(Number)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  const handleError = (e, setter = setError) => (e.status === 401 ? onExpired() : setter(e.message))

  async function load() {
    try {
      const all = await fetchMonth(y, m)
      setRows(all.filter((r) => r.date === date))
      setError('')
    } catch (e) { handleError(e) }
  }
  useEffect(() => { load() }, [date])

  async function approve(r) {
    setBusy(true)
    try { await api(`/admin/reservations/${r.id}/approve`, { method: 'POST' }); await load() }
    catch (e) { handleError(e) }
    finally { setBusy(false) }
  }

  async function submitCancel() {
    if (!reason.trim()) { setReasonError('취소 사유를 입력해 주세요'); return }
    setBusy(true)
    try {
      await api(`/admin/reservations/${cancelTarget.id}/cancel`, { method: 'POST', body: { reason: reason.trim() } })
      setCancelTarget(null)
      await load()
    } catch (e) { handleError(e, setReasonError) }
    finally { setBusy(false) }
  }

  return (
    <>
      <Header admin onLogout={onLogout} />
      <main className="container wide">
        <Link to={`/admin?year=${y}&month=${m}`} className="link back">‹ 캘린더로 돌아가기</Link>
        <div className="admin-head">
          <h1>{longDate(date)} 예약</h1>
          <div className="year-nav">
            <button className="btn outline small" onClick={() => navigate(`/admin/${shiftDay(date, -1)}`, { replace: true })}>‹ 전날</button>
            <button className="btn outline small" onClick={() => navigate(`/admin/${shiftDay(date, 1)}`, { replace: true })}>다음날 ›</button>
          </div>
        </div>
        {error && <div className="banner-error">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th className="nowrap">시간</th><th className="nowrap">이름</th><th className="nowrap">연락처</th><th className="nowrap">상태</th><th className="nowrap">신청 일시</th><th className="nowrap">처리</th><th className="note-col">비고</th></tr></thead>
            <tbody>
              {rows === null && <tr><td colSpan="7" className="empty-cell">불러오는 중…</td></tr>}
              {rows?.length === 0 && <tr><td colSpan="7" className="empty-cell">예약이 없습니다</td></tr>}
              {rows?.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{hourText(r.hour)}</td>
                  <td className="nowrap">{r.name}</td>
                  <td className="nowrap">{r.phoneMasked}</td>
                  <td className="nowrap"><span className={`badge ${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td className="nowrap muted">{r.createdAt}</td>
                  <td className="nowrap"><div className="actions">
                    {r.past && r.status !== 'CANCELLED' && <span className="muted">지난 예약</span>}
                    {!r.past && r.status === 'PENDING' && <button className="btn primary small" disabled={busy} onClick={() => approve(r)}>승인</button>}
                    {!r.past && r.status !== 'CANCELLED' && (
                      <button className="btn danger-outline small" disabled={busy}
                        onClick={() => { setCancelTarget(r); setReason(''); setReasonError('') }}>취소</button>
                    )}
                  </div></td>
                  <td className="note-col">
                    <NoteCell text={r.status === 'CANCELLED' ? (r.cancelledBy === 'ADMIN' ? `취소 사유: ${r.cancelReason}` : '사용자 취소') : ''}
                      onOpen={setNote} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {note && (
        <Modal title="비고" onClose={() => setNote(null)}>
          <p className="note-full">{note}</p>
          <div className="btn-row"><button className="btn primary" onClick={() => setNote(null)}>닫기</button></div>
        </Modal>
      )}

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
