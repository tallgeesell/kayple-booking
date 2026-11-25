import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../Header.jsx'
import Modal from '../Modal.jsx'
import { api } from '../api.js'
import { dayName, shortDate, hourText, slotText, isValidPhone, toIso, NAME_RE } from '../format.js'

export default function BookPage() {
  const navigate = useNavigate()
  const [days, setDays] = useState([])
  const [loadError, setLoadError] = useState('')
  const [date, setDate] = useState(null)
  const [hour, setHour] = useState(null)
  const [step, setStep] = useState(1)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [popup, setPopup] = useState(null) // 'DATE_CHANGED' | 'ALREADY_HAS'

  // 화면을 연 날의 "오늘" = 서버가 준 첫 날짜. 자정이 지나 제출하면 서버도 한 번 더 막는다.
  const viewedToday = days[0]?.date

  async function loadSlots({ reset = false } = {}) {
    try {
      const data = await api('/slots')
      setDays(data)
      setLoadError('')
      setDate((cur) => (reset || !data.some((d) => d.date === cur) ? data[0]?.date : cur))
      if (reset) setHour(null)
    } catch (e) {
      setLoadError(e.message)
    }
  }
  useEffect(() => { loadSlots() }, [])

  const day = days.find((d) => d.date === date)
  const dateChanged = () => viewedToday && toIso(new Date()) !== viewedToday

  function goNext() {
    if (dateChanged()) { setPopup('DATE_CHANGED'); return }
    setStep(2)
  }

  function validate() {
    const e = {}
    if (!name.trim()) e.name = '이름을 입력해 주세요'
    else if (!NAME_RE.test(name.trim())) e.name = '이름은 한글 또는 영문으로만 입력해 주세요'
    else if (name.trim().length > 20) e.name = '이름은 20자 이내로 입력해 주세요'
    if (!phone.trim()) e.phone = '연락처를 입력해 주세요'
    else if (!isValidPhone(phone)) e.phone = '연락처 형식이 올바르지 않습니다'
    return e
  }

  async function submit(ev) {
    ev.preventDefault()
    setBanner('')
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    if (dateChanged()) { setPopup('DATE_CHANGED'); return }
    setSubmitting(true)
    try {
      const r = await api('/reservations', { method: 'POST', body: { date, hour, name: name.trim(), phone: phone.trim(), viewedToday } })
      navigate('/done', { state: r })
    } catch (err) {
      if (err.code === 'DATE_CHANGED') setPopup('DATE_CHANGED')
      else if (err.code === 'ALREADY_HAS_RESERVATION') setPopup('ALREADY_HAS')
      else if (err.field === 'name' || err.code === 'INVALID_NAME') setErrors({ name: err.message })
      else if (err.field === 'phone' || err.code === 'INVALID_PHONE') setErrors({ phone: err.message })
      else setBanner(err.message)
      if (err.code === 'SLOT_TAKEN' || err.code === 'PAST_SLOT') loadSlots()
    } finally {
      setSubmitting(false)
    }
  }

  function closeDateChanged() {
    setPopup(null)
    setStep(1)
    setBanner('')
    loadSlots({ reset: true })
  }

  const popups = (
    <>
      {popup === 'DATE_CHANGED' && (
        <Modal title="날짜가 바뀌었습니다" onClose={closeDateChanged}>
          <p className="modal-body">자정이 지나 예약 가능한 일정이 변경되었습니다. 오늘 날짜 기준으로 일정을 다시 선택해 주세요.</p>
          <div className="btn-row"><button className="btn primary" onClick={closeDateChanged}>확인</button></div>
        </Modal>
      )}
      {popup === 'ALREADY_HAS' && (
        <Modal title="이미 신청한 예약이 있습니다" onClose={() => setPopup(null)}>
          <p className="modal-body">진행 중인 예약은 1건만 신청할 수 있습니다. 기존 예약을 취소한 뒤 다시 신청해 주세요.</p>
          <div className="btn-row">
            <button className="btn outline" onClick={() => setPopup(null)}>닫기</button>
            <button className="btn primary" onClick={() => navigate('/my', { state: { phone: phone.trim() } })}>내 예약보기</button>
          </div>
        </Modal>
      )}
    </>
  )

  if (step === 2) {
    return (
      <>
        <Header />
        <main className="container">
          {banner && <div className="banner-error">{banner}</div>}
          <h1>예약 정보 입력</h1>
          <p className="sub">예약자 정보를 입력해 주세요</p>
          <div className="summary-box">
            <span className="muted">예약 일시</span>
            <strong>{slotText(date, hour)}</strong>
            <button className="link primary" onClick={() => { setStep(1); setBanner(''); setHour(null); loadSlots() }}>변경</button>
          </div>
          <form onSubmit={submit} noValidate>
            <label className="field-label" htmlFor="name">이름</label>
            <input id="name" className={errors.name ? 'input invalid' : 'input'} value={name} maxLength={20}
              placeholder="홍길동" onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })) }} />
            {errors.name && <p className="field-error">{errors.name}</p>}

            <label className="field-label" htmlFor="phone">연락처</label>
            <input id="phone" className={errors.phone ? 'input invalid' : 'input'} value={phone} inputMode="tel"
              placeholder="010-1234-5678" onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: undefined })) }} />
            {errors.phone
              ? <p className="field-error">{errors.phone}</p>
              : <p className="field-hint">하이픈(-) 없이 숫자만 입력해도 됩니다</p>}

            <button className="btn primary block" disabled={submitting}>{submitting ? '예약 중…' : '예약하기'}</button>
          </form>
        </main>
        {popups}
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="container">
        <h1>상담 예약하기</h1>
        <p className="sub">날짜와 시간을 선택해 주세요</p>
        {loadError && <div className="banner-error">{loadError}</div>}

        <h2>날짜 선택</h2>
        <div className="date-row">
          {days.map((d) => (
            <button key={d.date} className={d.date === date ? 'date-btn selected' : 'date-btn'} onClick={() => { setDate(d.date); setHour(null) }}>
              <span className="dow">{dayName(d.date)}</span>
              <span className="md">{shortDate(d.date)}</span>
            </button>
          ))}
        </div>

        <h2>시간 선택</h2>
        <div className="time-grid">
          {day?.slots.map((s) => {
            const cls = s.status === 'BOOKED' ? 'time-btn closed' : s.status === 'PAST' ? 'time-btn past'
              : s.hour === hour ? 'time-btn selected' : 'time-btn'
            return (
              <button key={s.hour} disabled={s.status !== 'AVAILABLE'} className={cls} onClick={() => setHour(s.hour)}
                title={s.status === 'PAST' ? '이미 지난 시간입니다' : undefined}>
                {hourText(s.hour)}{s.status === 'BOOKED' && <span className="closed-tag">마감</span>}
              </button>
            )
          })}
        </div>

        <div className="selected-row">
          <span className="muted">선택한 일정</span>
          <strong>{date && hour != null ? slotText(date, hour) : '-'}</strong>
        </div>
        <button className="btn primary block" disabled={!date || hour == null} onClick={goNext}>다음</button>
      </main>
      {popups}
    </>
  )
}
