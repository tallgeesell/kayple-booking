#!/usr/bin/env bash
# 서버(ubuntu@ldj.recruit.kayple.com)에서 실행: 최신 코드 빌드 → 백엔드 재시작 → 프론트 교체
# 최초 1회: /etc/booking/booking.env 에 DB_PASSWORD, ADMIN_PASSWORD 를 넣어 둘 것 (README 참고)
set -euo pipefail
REPO_DIR="${REPO_DIR:-$HOME/kayple-booking}"
cd "$REPO_DIR"
git pull --ff-only

echo "[1/4] backend test + build"
(cd backend && ./mvnw -q -B package)

echo "[2/4] frontend build"
(cd frontend && npm ci --silent && npm run build --silent)

echo "[3/4] install"
sudo mkdir -p /opt/booking /var/www/booking
sudo cp backend/target/backend-0.0.1-SNAPSHOT.jar /opt/booking/app.jar
sudo rsync -a --delete frontend/dist/ /var/www/booking/
sudo cp deploy/booking.service /etc/systemd/system/booking.service
sudo cp deploy/nginx.conf /etc/nginx/sites-available/booking
sudo ln -sf /etc/nginx/sites-available/booking /etc/nginx/sites-enabled/booking
sudo rm -f /etc/nginx/sites-enabled/default

echo "[4/4] restart"
sudo systemctl daemon-reload
sudo systemctl enable booking >/dev/null 2>&1 || true
sudo systemctl restart booking
sudo nginx -t && sudo systemctl reload nginx

for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:8080/api/slots >/dev/null && { echo "OK: backend up"; exit 0; }
  sleep 2
done
echo "backend did not start; see: sudo journalctl -u booking -n 100" >&2
exit 1
