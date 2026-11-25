// 사용법: README 'E2E 테스트' 참고. 기준일 2026-11-25(수) 21시 이후 데이터 기준으로 작성됨
const OUT = process.argv[2] || '.'
const BASE = process.env.BASE || 'http://localhost:5173'
const API = process.env.API || 'http://localhost:8080/api'
const ADMIN_PW = process.env.ADMIN_PW
if (!ADMIN_PW) { console.error('ADMIN_PW 환경변수가 필요합니다'); process.exit(1) }
import fs from 'node:fs'
let list
for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9333/json/list')).json(); if (list.length) break } catch {} await new Promise(r => setTimeout(r, 300)) }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0; const pend = {}
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id] } }
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })) })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval error'); return r.result?.result?.value }
const go = async (path) => { await send('Page.navigate', { url: BASE + path }); await sleep(1200) }
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')) }
const waitFor = async (cond, ms = 5000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(`return !!(${cond})`)) return true; await sleep(150) } return false }
const H = `
  window.__set = (sel, v) => { const el = document.querySelector(sel); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) };
  window.__click = (sel, text) => { const el = [...document.querySelectorAll(sel)].find(e => e.textContent.trim().includes(text)); if (!el) throw new Error('not found: ' + sel + ' ' + text); el.click(); return true };
  window.__text = () => document.body.innerText;`
const helpers = () => ev(H)
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }
const step = async (name, fn) => { try { await fn() } catch (e) { check(name, false, 'exception: ' + e.message) } }

await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

const PHONE = '01055556666'
// ---------- 사용자 ----------
await step('U1 오늘 지난 시간은 마감 글자 없이 비활성', async () => {
  await go('/'); await helpers()
  const r = await ev(`const b=[...document.querySelectorAll('.time-btn')]; return {n:b.length, allPast:b.every(x=>x.classList.contains('past')&&x.disabled), noTag:b.every(x=>!x.textContent.includes('마감'))}`)
  check('U1 오늘 지난 시간은 마감 글자 없이 비활성', r.n === 7 && r.allPast && r.noTag, JSON.stringify(r))
  const first = await ev(`return document.querySelector('.date-btn').classList.contains('selected') && document.querySelectorAll('.date-btn').length`)
  check('U1b 날짜 7개, 오늘이 첫 번째로 선택됨', first === 7, String(first))
  await shot('u1_home')
})

await step('U2 예약된 시간은 마감 표시', async () => {
  await ev(`__click('.date-btn','11.26')`); await sleep(200)
  const r = await ev(`return [...document.querySelectorAll('.time-btn.closed')].map(b=>b.textContent)`)
  check('U2 예약된 시간은 마감 표시(11/26 11·14·15시)', JSON.stringify(r) === JSON.stringify(['11:00마감','14:00마감','15:00마감']), JSON.stringify(r))
})

await step('U3 입력 검증', async () => {
  await ev(`__click('.date-btn','11.29')`); await sleep(100)
  await ev(`__click('.time-btn','13:00')`); await sleep(100)
  const sel = await ev(`return document.querySelector('.selected-row strong').textContent`)
  check('U3a 선택한 일정 표시', sel === '11월 29일 (일) 13:00', sel)
  await ev(`__click('button','다음')`); await sleep(300)
  await ev(`__click('button','예약하기')`); await sleep(300)
  let t = await ev(`return [...document.querySelectorAll('.field-error')].map(e=>e.textContent)`)
  check('U3b 빈 값 → 이름·연락처 오류', t.includes('이름을 입력해 주세요') && t.includes('연락처를 입력해 주세요'), JSON.stringify(t))
  await ev(`__set('#name','홍길동1'); __set('#phone','010-123-4567')`); await ev(`__click('button','예약하기')`); await sleep(300)
  t = await ev(`return [...document.querySelectorAll('.field-error')].map(e=>e.textContent)`)
  check('U3c 숫자 포함 이름·010 10자리 거절', t.includes('이름은 한글 또는 영문으로만 입력해 주세요') && t.includes('연락처 형식이 올바르지 않습니다'), JSON.stringify(t))
  const red = await ev(`return document.querySelector('#name').classList.contains('invalid') && document.querySelector('#phone').classList.contains('invalid')`)
  check('U3d 오류 칸 빨간 테두리', red)
  await shot('u3_validation')
  await ev(`__set('#name','홍길동!')`); await ev(`__click('button','예약하기')`); await sleep(300)
  t = await ev(`return document.querySelector('.field-error')?.textContent`)
  check('U3e 특수문자 이름 거절', t === '이름은 한글 또는 영문으로만 입력해 주세요', t)
  const hint = await ev(`__set('#phone','01055556666'); await new Promise(r=>setTimeout(r,100)); return document.querySelector('.field-hint')?.textContent`)
  check('U3f 연락처 하이픈 안내 문구', hint === '하이픈(-) 없이 숫자만 입력해도 됩니다', hint)
})

await step('U4 정상 예약', async () => {
  await ev(`__set('#name','테스트'); __set('#phone','${PHONE}')`); await ev(`__click('button','예약하기')`)
  const ok = await waitFor(`location.pathname==='/done'`)
  const t = await ev(`return __text()`)
  check('U4 정상 예약 → 완료 화면·마스킹', ok && t.includes('예약이 완료되었습니다') && t.includes('010-****-6666') && t.includes('11월 29일 (일) 13:00'), ok ? '' : 'path ' + await ev('return location.pathname'))
  await shot('u4_done')
})

await step('U5 1인1건 팝업', async () => {
  await go('/'); await helpers()
  await ev(`__click('.date-btn','11.30')`); await ev(`__click('.time-btn','10:00')`); await ev(`__click('button','다음')`); await sleep(200)
  await ev(`__set('#name','테스트'); __set('#phone','010-5555-6666')`); await ev(`__click('button','예약하기')`)
  const pop = await waitFor(`document.querySelector('.modal-title')?.textContent==='이미 신청한 예약이 있습니다'`)
  const btns = await ev(`return [...document.querySelectorAll('.modal button')].map(b=>b.textContent)`)
  check('U5a 이미 신청한 예약 팝업 + 닫기/내 예약보기', pop && JSON.stringify(btns) === '["닫기","내 예약보기"]', JSON.stringify(btns))
  await shot('u5_already')
  await ev(`__click('.modal button','내 예약보기')`)
  const ok = await waitFor(`location.pathname==='/my' && document.querySelector('.card')`)
  const t = await ev(`return document.querySelector('.card')?.innerText`)
  check('U5b 내 예약보기 → 자동 조회(일시·상태·신청일시)', ok && t.includes('11월 29일 (일) 13:00') && t.includes('대기') && t.includes('신청 일시'), t?.replace(/\n/g, ' | '))
  await shot('u5_my')
})

await step('U6 내 예약 취소', async () => {
  await ev(`__click('.card button','취소')`)
  const m = await waitFor(`document.querySelector('.modal-title')?.textContent.includes('예약을 취소할까요?')`)
  await ev(`__click('.modal button','취소하기')`)
  const ok = await waitFor(`document.querySelector('.card .badge')?.textContent==='취소됨'`)
  const noBtn = await ev(`return !document.querySelector('.card button')`)
  check('U6 취소 확인 팝업 → 취소됨, 취소 버튼 사라짐', m && ok && noBtn)
})

await step('U7 관리자 취소 사유 사용자 표시', async () => {
  await go('/my'); await helpers()
  await ev(`__set('#phone','01034567890')`); await ev(`__click('button','조회')`)
  const ok = await waitFor(`document.querySelector('.reason')`)
  const t = await ev(`return document.querySelector('.reason')?.textContent`)
  check('U7 관리자 취소 사유 표시', ok && t.startsWith('관리자 취소 사유:'), t)
  await ev(`__set('#phone','01098765432')`); await ev(`__click('button','조회')`)
  const empty = await waitFor(`document.querySelector('.empty')?.textContent==='예약 내역이 없습니다'`)
  check('U7b 내역 없음 표시', empty)
})

await step('U8 다른 사람이 먼저 잡은 시간', async () => {
  await go('/'); await helpers()
  await ev(`__click('.date-btn','12.1')`); await ev(`__click('.time-btn','16:00')`); await ev(`__click('button','다음')`); await sleep(200)
  await fetch(API + '/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-12-01', hour: 16, name: '선점자', phone: '01077778888', viewedToday: '2026-11-25' }) })
  await ev(`__set('#name','늦은사람'); __set('#phone','01011112222')`); await ev(`__click('button','예약하기')`)
  const ok = await waitFor(`document.querySelector('.banner-error')?.textContent.includes('이미 예약된 시간입니다')`)
  check('U8 먼저 잡힌 시간 제출 → 오류 배너', ok)
  await shot('u8_taken')
  await ev(`__click('button','변경')`); await sleep(500)
  const closed = await ev(`return [...document.querySelectorAll('.time-btn.closed')].map(b=>b.textContent)`)
  check('U8b 변경 → 해당 시간 마감 반영', closed.includes('16:00마감'), JSON.stringify(closed))
})

await step('U9 자정 넘김 팝업', async () => {
  await go('/'); await helpers()
  await ev(`__click('.date-btn','11.27')`); await sleep(200); await ev(`__click('.time-btn','11:00')`); await sleep(200)
  const picked = await ev(`return document.querySelector('.selected-row strong').textContent`)
  check('U9 사전: 11/27 11:00 선택됨', picked === '11월 27일 (금) 11:00', picked)
  // 브라우저 시계를 다음 날 00:01 로 바꿔 화면을 열어둔 채 자정이 지난 상황을 재현
  await ev(`const R=Date; const off=new R(2026,10,26,0,1).getTime()-R.now(); window.Date=class extends R{constructor(...a){a.length?super(...a):super(R.now()+off)} static now(){return R.now()+off}}`)
  await ev(`__click('button','다음')`)
  const ok = await waitFor(`document.querySelector('.modal-title')?.textContent==='날짜가 바뀌었습니다'`)
  check('U9a 자정 지난 뒤 [다음] → 날짜 변경 팝업', ok)
  await shot('u9_date_changed')
  const r = await fetch(API + '/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-11-27', hour: 11, name: '홍길동', phone: '01033334444', viewedToday: '2026-11-24' }) })
  const b = await r.json()
  check('U9b 서버도 지난 날 화면의 제출 거절(DATE_CHANGED)', r.status === 409 && b.code === 'DATE_CHANGED', r.status + ' ' + b.code)
})

// ---------- 관리자 ----------
await step('A1 관리자 로그인', async () => {
  await go('/admin'); await helpers()
  const login = await waitFor(`document.querySelector('h1')?.textContent==='관리자 로그인'`)
  const r = await fetch(API + '/admin/reservations?year=2026&month=11')
  check('A1a 비로그인 → 로그인 화면 / API 401', login && r.status === 401, 'api ' + r.status)
  await ev(`__set('#u','admin'); __set('#p','1234')`); await ev(`__click('button','로그인')`)
  const err = await waitFor(`document.querySelector('.field-error')?.textContent==='아이디 또는 비밀번호가 올바르지 않습니다'`)
  check('A1b 틀린 비밀번호 → 오류', err)
  await shot('a1_login_error')
  await ev(`__set('#p','${ADMIN_PW}')`); await ev(`__click('button','로그인')`)
  const cal = await waitFor(`document.querySelector('.calendar')`)
  check('A1c 올바른 비밀번호 로그인 → 캘린더', cal)
})

await step('A2 캘린더·월 탭', async () => {
  const tabs = await ev(`return [...document.querySelectorAll('.tab')].map(t=>t.textContent).join(',')`)
  check('A2a 1~12월 탭', tabs === Array.from({ length: 12 }, (_, i) => `${i + 1}월`).join(','), tabs)
  const chip = await ev(`const c=[...document.querySelectorAll('.cal-cell')].find(x=>x.querySelector('.cal-day')?.textContent==='26'); return c?.innerText.replace(/\\n/g,' ')`)
  check('A2b 날짜 칸에 상태별 건수', chip?.includes('대기') && chip?.includes('승인'), chip)
  await ev(`__click('.tab','12월')`); await sleep(500)
  const q = await ev(`return location.search`)
  const dec1 = await ev(`const c=[...document.querySelectorAll('.cal-cell')].find(x=>x.querySelector('.cal-day')?.textContent==='1'); return c?.innerText.replace(/\\n/g,' ')`)
  check('A2c 12월 탭 전환(12/1 예약 표시)', q.includes('month=12') && dec1?.includes('대기 1'), q + ' / ' + dec1)
  await ev(`__click('.tab','11월')`); await sleep(500)
  await shot('a2_calendar')
})

await step('A3 날짜 클릭 → 목록 화면, 승인·취소', async () => {
  await ev(`[...document.querySelectorAll('.cal-cell')].find(x=>x.querySelector('.cal-day')?.textContent==='26').click()`)
  const ok = await waitFor(`location.pathname==='/admin/2026-11-26' && document.querySelectorAll('tbody tr').length>1`)
  check('A3a 날짜 클릭 → /admin/2026-11-26 목록', ok, await ev('return location.pathname'))
  const masked = await ev(`return [...document.querySelectorAll('tbody tr td:nth-child(3)')].every(td=>td.textContent.includes('****'))`)
  check('A3b 관리자 목록 연락처 마스킹', masked)
  // 14:00 홍길동 대기 → 승인
  await ev(`const tr=[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('14:00')); [...tr.querySelectorAll('button')].find(b=>b.textContent==='승인').click()`)
  const ap = await waitFor(`[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('14:00'))?.querySelector('.badge')?.textContent==='승인'`)
  check('A3c 대기 → 승인', ap)
  // 15:00 박철수 취소: 사유 없이 → 오류, 사유 입력 → 취소
  await ev(`const tr=[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('15:00')); [...tr.querySelectorAll('button')].find(b=>b.textContent==='취소').click()`)
  await waitFor(`document.querySelector('#reason')`)
  await ev(`__click('.modal button','취소하기')`); await sleep(200)
  const need = await ev(`return document.querySelector('.modal .field-error')?.textContent`)
  check('A3d 사유 없이 취소 → 오류', need === '취소 사유를 입력해 주세요', need)
  await ev(`__set('#reason','E2E 테스트: 상담사 개인 사정')`); await shot('a3_cancel_modal')
  await ev(`__click('.modal button','취소하기')`)
  const cc = await waitFor(`[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('15:00'))?.textContent.includes('사유: E2E 테스트: 상담사 개인 사정')`)
  check('A3e 사유 입력 → 취소됨 + 사유 표시', cc)
  await shot('a3_day')
  const oneLine = await ev(`return [...document.querySelectorAll('tbody td.nowrap')].every(td=>{ const w=document.createTreeWalker(td,NodeFilter.SHOW_TEXT); const tops=[]; let n; while((n=w.nextNode())){ if(!n.textContent.trim()) continue; const r=document.createRange(); r.selectNodeContents(n); for(const x of r.getClientRects()) tops.push(x.top) } return tops.every(t=>Math.abs(t-tops[0])<8) })`)
  check('A3g 시간·이름·연락처·상태·신청일시 한 줄 표시', oneLine)
  const noStatusReason = await ev(`const tr=[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('15:00')); return !tr.children[3].textContent.includes('사유') && tr.querySelector('.note-col .note')?.textContent.includes('E2E 테스트')`)
  check('A3h 사유는 상태 칸이 아닌 비고 칸에 표시', noStatusReason)
  // 긴 사유: 11:00 승인 건 취소
  const LONG = '긴 사유 테스트입니다. '.repeat(14).trim()
  await ev(`const tr=[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('11:00')); [...tr.querySelectorAll('button')].find(b=>b.textContent==='취소').click()`)
  await waitFor(`document.querySelector('#reason')`)
  await ev(`__set('#reason', ${JSON.stringify("LONG_PLACEHOLDER")})`.replace('"LONG_PLACEHOLDER"', JSON.stringify(LONG)))
  await ev(`__click('.modal button','취소하기')`)
  const clamped = await waitFor(`document.querySelector('.note.clamped')`)
  const lines = await ev(`const el=document.querySelector('.note.clamped'); return Math.round(el.clientHeight/parseFloat(getComputedStyle(el).lineHeight))`)
  check('A3i 긴 사유 → 2줄 + … 처리', clamped && lines === 2, 'lines ' + lines)
  await shot('a3_day_long')
  await ev(`document.querySelector('.note.clamped').click()`)
  const full = await waitFor(`document.querySelector('.note-full')`)
  const txt = await ev(`return document.querySelector('.note-full').textContent`)
  check('A3j 누르면 다이얼로그에 전문 표시', full && txt === '취소 사유: ' + LONG, (txt||'').length + '자')
  await shot('a3_note_dialog')
  await ev(`__click('.modal button','닫기')`); await sleep(200)
  const r = await (await fetch(API + '/reservations/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '01045678901' }) })).json()
  check('A3f 사용자 조회에 관리자 사유 노출', r[0]?.cancelReason === 'E2E 테스트: 상담사 개인 사정' && r[0]?.status === 'CANCELLED')
})

await step('A4 전날/다음날·돌아가기·새로고침', async () => {
  await ev(`__click('button','다음날')`)
  const n = await waitFor(`location.pathname==='/admin/2026-11-27'`)
  check('A4a 다음날 이동', n)
  await ev(`__click('a','캘린더로 돌아가기')`)
  const back = await waitFor(`location.pathname==='/admin' && location.search.includes('month=11') && document.querySelector('.calendar')`)
  check('A4b 캘린더로 돌아가기(같은 달)', back)
  await go('/admin/2026-11-26'); await helpers()
  const reload = await waitFor(`document.querySelector('h1')?.textContent==='11월 26일 (목) 예약'`)
  check('A4c 목록 주소로 바로 진입(새로고침)', reload)
})

await step('A5 로그아웃', async () => {
  await ev(`__click('.header button','로그아웃')`)
  const lo = await waitFor(`document.querySelector('h1')?.textContent==='관리자 로그인'`)
  const st = await ev(`return (await fetch('/api/admin/reservations?year=2026&month=11')).status`)
  check('A5 로그아웃 → 로그인 화면, 이후 API 401', lo && st === 401, 'api ' + st)
})

// ---------- 모바일 ----------
await step('M 모바일 폭', async () => {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  for (const p of ['/', '/my', '/admin']) {
    await go(p)
    const w = await ev(`return [document.documentElement.scrollWidth, innerWidth]`)
    check(`M 모바일(390px) ${p} 가로 스크롤 없음`, w[0] <= w[1], w.join(' ≤ '))
    await shot('m' + p.replace(/\//g, '_'))
  }
})

const fail = results.filter(r => !r.ok)
console.log(`\n총 ${results.length}개 중 통과 ${results.length - fail.length}, 실패 ${fail.length}`)
ws.close()
