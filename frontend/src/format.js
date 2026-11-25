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

// 서버(PhoneNumbers)와 같은 규칙: 하이픈·공백 제거 후 010은 11자리, 011·016~019는 10~11자리
export const PHONE_RE = /^(010\d{8}|01[16789]\d{7,8})$/
export const isValidPhone = (p) => PHONE_RE.test(p.replace(/[\s-]/g, ''))
// 서버와 같은 규칙: 한글 완성형·영문·공백만
export const NAME_RE = /^[가-힣a-zA-Z ]+$/

export const STATUS_LABEL = { PENDING: '대기', CONFIRMED: '승인', CANCELLED: '취소됨' }

export function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
