const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const dayName = (s) => DAYS[parseDate(s).getDay()]
export const shortDate = (s) => { const d = parseDate(s); return `${d.getMonth() + 1}.${d.getDate()}` }
export const longDate = (s) => { const d = parseDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayName(s)})` }
export const hourText = (h) => `${String(h).padStart(2, '0')}:00`
export const slotText = (date, hour) => `${longDate(date)} ${hourText(hour)}`

export const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/
export const isValidPhone = (p) => PHONE_RE.test(p.replace(/\s/g, ''))

export const STATUS_LABEL = { PENDING: '대기', CONFIRMED: '승인', CANCELLED: '취소됨' }

export function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
