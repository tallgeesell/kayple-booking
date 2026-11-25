import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../Header.jsx'
import Modal from '../Modal.jsx'
import { api } from '../api.js'
import { slotText, isValidPhone, STATUS_LABEL } from '../format.js'

export default function MyPage() {
  const initialPhone = useLocation().state?.phone || ''
  const [phone, setPhone] = useState(initialPhone)
  const [queried, setQueried] = useState('')
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  async function lookup(p = phone) {
    setError('')
    if (!isValidPhone(p)) { setError('연락처 형식이 올바르지 않습니다'); return }
    try {
      setList(await api('/reservations/lookup', { method: 'POST', body: { phone: p } }))
      setQueried(p)
    } catch (e) { setError(e.message) }
  }

  // "이미 신청한 예약이 있습니다" 팝업의 [내 예약보기]로 들어오면 바로 조회
  useEffect(() => { if (initialPhone) lookup(initialPhone) }, [])

  async function doCancel() {
    setBusy(true)
    try {
      await api(`/reservations/${confirm.id}/cancel`, { method: 'POST', body: { phone: queried } })
      setConfirm(null)
      await lookup(queried)
    } catch (e) {
      setConfirm(null)
      setError(e.message)
    } finally { setBusy(false) }
  }

  return (
    <>
      <Header />
      <main className="container">
        <h1>내 예약 확인</h1>
        <p className="sub">예약할 때 입력한 연락처로 조회할 수 있습니다</p>
        <label className="field-label" htmlFor="phone">연락처</label>
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); lookup() }}>
          <input id="phone" className={error ? 'input invalid' : 'input'} value={phone} inputMode="tel"
            placeholder="010-1234-5678" onChange={(e) => { setPhone(e.target.value); setError('') }} />
          <button className="btn primary">조회</button>
        </form>
        {error
          ? <p className="field-error">{error}</p>
          : <p className="field-hint">하이픈(-) 없이 숫자만 입력해도 됩니다</p>}

        {list && (
          <>
            <h2>예약 내역</h2>
            {list.length === 0 && <div className="empty">예약 내역이 없습니다</div>}
            {list.map((r) => (
              <div key={r.id} className={r.past ? 'card past' : 'card'}>
                <div className="card-body">
                  <div className="card-title">
                    {slotText(r.date, r.hour)}
                    <span className={`badge ${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span>
                    {r.past && r.status !== 'CANCELLED' && <span className="badge done">지난 예약</span>}
                  </div>
                  <div className="muted">{r.name} · {r.phoneMasked}</div>
                  <div className="meta">신청 일시 {r.createdAt}</div>
                  {r.status === 'CANCELLED' && r.cancelledBy === 'ADMIN' && (
                    <div className="reason">관리자 취소 사유: {r.cancelReason}</div>
                  )}
                </div>
                {!r.past && r.status !== 'CANCELLED' && (
                  <button className="btn danger-outline" onClick={() => setConfirm(r)}>취소</button>
                )}
              </div>
            ))}
          </>
        )}
      </main>

      {confirm && (
        <Modal title={`${slotText(confirm.date, confirm.hour)} 예약을 취소할까요?`} busy={busy} onClose={() => setConfirm(null)}>
          <div className="btn-row">
            <button className="btn outline" disabled={busy} onClick={() => setConfirm(null)}>닫기</button>
            <button className="btn danger" disabled={busy} onClick={doCancel}>취소하기</button>
          </div>
        </Modal>
      )}
    </>
  )
}
