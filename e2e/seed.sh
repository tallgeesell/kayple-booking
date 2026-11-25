A=${API:-http://localhost:8080/api}; J='Content-Type: application/json'; C=$1/cj
curl -s -o /dev/null --retry 40 --retry-delay 2 --retry-connrefused $A/slots
mk(){ curl -s -o /dev/null -X POST $A/reservations -H "$J" -d "{\"date\":\"$1\",\"hour\":$2,\"name\":\"$3\",\"phone\":\"$4\",\"viewedToday\":\"2026-11-25\"}"; }
mk 2026-11-26 11 김예약 010-2345-6789; mk 2026-11-26 14 홍길동 010-1234-5678; mk 2026-11-26 15 박철수 010-4567-8901; mk 2026-11-28 10 이영희 010-3456-7890
curl -s -c $C -X POST $A/admin/login -H "$J" -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PW:?ADMIN_PW 환경변수가 필요합니다}\"}" >/dev/null
curl -s -b $C -X POST $A/admin/reservations/1/approve >/dev/null
curl -s -b $C -X POST $A/admin/reservations/4/cancel -H "$J" -d '{"reason":"상담사 일정 변경으로 취소되었습니다. 다른 시간으로 다시 신청 부탁드립니다."}' >/dev/null
