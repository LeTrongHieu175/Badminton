# SMART BADMINTON COURT MANAGEMENT SYSTEM

Hệ thống quản lý sân cầu lông gồm 4 thành phần chính:
- `web` (React + Vite): giao diện người dùng và admin dashboard.
- `backend` (Node.js + Express): API nghiệp vụ, booking realtime, Redis lock, analytics.
- `ai-service` (FastAPI + scikit-learn): gợi ý khung giờ chơi từ dữ liệu lịch sử.
- `postgres` + `redis`: lưu trữ dữ liệu và cơ chế khóa slot.

## Tài khoản seed để test ngay

- `Admin`: admin@smartbadminton.com / admin123
- `User`: john@example.com / user123

## 1) Kiến trúc tổng quan

```text
Web (React)  <----HTTP---->  Backend (Express)  <----> PostgreSQL
      |                             |
      |                             +----> Redis (slot lock)
      |
      +----HTTP----> AI Service (FastAPI, KMeans)
```

### Port mặc định
- `web`: `5173` (dev server Vite)
- `backend`: `4000`
- `ai-service`: `8001`
- `postgres`: `5432`
- `redis`: `6379`

## 2) Cấu trúc thư mục

```text
Badminton/
  backend/
  web/
  ai-service/
  database/
  docker-compose.yml
```

- `backend/src`: controller, service, repository, socket, middleware.
- `web/src`: pages, components, layouts, hooks, services.
- `ai-service/app`: dataset, model recommendation, service layer.
- `database/`: schema + seed dữ liệu tổng quát (độc lập).

Lưu ý:
- Docker Compose hiện đang mount DB init script từ `backend/src/db/schema.sql` và `backend/src/db/seed.sql`.

## 3) Luồng hoạt động nghiệp vụ

### 3.1 Booking realtime an toàn đồng thời
1. User chọn `court + slot + date`.
2. Backend kiểm tra DB, dọn lock hết hạn.
3. Backend lock Redis với key:
   `lock:court:{courtId}:slot:{slotId}:date:{date}`
4. TTL lock là `300s`.
5. Tạo booking trạng thái `LOCKED`.
6. Thanh toán thành công thì chuyển `CONFIRMED`.
7. Hết hạn lock thì job nền chuyển `CANCELLED`.
8. Khi tạo/cancel/confirm booking, backend emit Socket.IO event:
   `slot_updated`.

### 3.2 Analytics
Backend cung cấp:
- doanh thu,
- giờ cao điểm,
- mức sử dụng sân,
- top user theo chi tiêu.

### 3.3 AI Recommendation
`ai-service` dùng dataset `booking_history.csv` (10,000 dòng), phân tích lịch sử theo user, phát hiện khung giờ ưa thích, kết hợp KMeans để trả về top 3 khung giờ đề xuất.

## 4) Chạy nhanh bằng Docker Compose (khuyến nghị)

Yêu cầu:
- Docker Desktop (hoặc Docker Engine + Compose plugin).

### Start toàn bộ hệ thống (`web` + `backend` + `ai-service` + `postgres` + `redis`)
```bash
docker compose up -d
```

### Kiểm tra service
```bash
curl http://localhost:5173
curl http://localhost:4000/health
curl http://localhost:8001/health
```

### Tài khoản mẫu (seed)
- Admin: `admin@smartbadminton.com` / `admin123`
- User: `john@example.com` / `user123`

### Stop
```bash
docker compose down
```

### Reset dữ liệu (xóa volume)
```bash
docker compose down -v
docker compose up -d
```

## 5) Chạy thủ công từng service (không dùng Docker)

Yêu cầu:
- Node.js `>=20`
- Python `>=3.9`
- PostgreSQL
- Redis

## 5.1 Database
Chọn một trong hai bộ script:
- Bộ backend: `backend/src/db/schema.sql` + `backend/src/db/seed.sql`
- Bộ tổng quát: `database/schema.sql` + `database/seed.sql`

Ví dụ nhanh nhất với script Node của backend:
```bash
cd backend
npm install
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/smart_badminton"
npm run db:setup
```

Nếu muốn dùng `psql` thủ công, bạn vẫn có thể chạy:
```bash
psql "$DATABASE_URL" -f backend/src/db/schema.sql
psql "$DATABASE_URL" -f backend/src/db/seed.sql
```

### 5.2 Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 5.3 AI Service
```bash
cd ai-service
python3 -m pip install -r requirements.txt
python3 app/dataset/generate_dataset.py
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 5.4 Web
```bash
cd web
npm install
cp .env.example .env
```

Chạy:
```bash
npm run dev
```

## 6) API chính

### Backend (`http://localhost:4000`)
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /courts`
- `GET /courts/:id`
- `GET /courts/:id/availability?date=YYYY-MM-DD`
- `POST /bookings`
- `GET /bookings/user/:id`
- `DELETE /bookings/:id`
- `POST /payments/create-intent`
- `POST /payments/webhook`
- `GET /analytics/revenue?start_date&end_date`
- `GET /analytics/peak-hours?start_date&end_date`
- `GET /analytics/utilization?start_date&end_date`
- `GET /analytics/top-users?start_date&end_date`
- `GET /users` (admin)
- `PATCH /users/:id/role` (admin)

Payload đăng ký:
```json
{
  "username": "player_new",
  "mail": "player_new@example.com",
  "phone": "0901234567",
  "password": "secret123"
}
```

### AI Service (`http://localhost:8001`)
- `GET /health`
- `GET /ai/recommendation/{user_id}`

Ví dụ response:
```json
{
  "recommended_slots": ["18:00", "19:00", "20:00"]
}
```

## 7) Socket.IO realtime

Event:
- `slot_updated`

Payload mẫu:
```json
{
  "courtId": 1,
  "slotId": 4,
  "date": "2026-03-10",
  "status": "CONFIRMED",
  "bookingId": 123,
  "lockExpiresAt": "2026-03-10T12:05:00.000Z",
  "updatedAt": "2026-03-10T12:00:10.000Z"
}
```

## 8) Lệnh kiểm thử / build

### Backend
```bash
cd backend
npm test
```

### Web
```bash
cd web
npm run build
```

### AI service
```bash
cd ai-service
python3 -m py_compile main.py app/models/recommendation_model.py app/services/recommendation_service.py
```

## 9) Ghi chú quan trọng

- `web` có cơ chế fallback sang mock data nếu backend chưa sẵn sàng.
- Biến môi trường `AI_SERVICE_BASE_URL` đã có trong `docker-compose.yml`, nhưng backend hiện chưa expose endpoint proxy AI; có thể gọi AI service trực tiếp từ frontend hoặc bổ sung endpoint backend sau.

## Phụ lục A: Deploy Railway hoàn chỉnh

### Mục tiêu

Triển khai đầy đủ các thành phần:
- `web`
- `backend`
- `ai`
- `postgres`
- `redis`

Đây là cấu hình giữ nguyên hầu hết hành vi đang chạy local:
- frontend public,
- backend public,
- AI service chạy thật,
- Redis lock bật,
- job hết hạn booking bật,
- backend tự tạo schema và seed dữ liệu demo ở lần đầu.

### Những gì repo đã hỗ trợ sẵn cho Railway

- `backend` có [backend/railway.json](backend/railway.json) và env mẫu [backend/.env.railway.example](backend/.env.railway.example).
- `web` có [web/railway.json](web/railway.json) và env mẫu [web/.env.railway.example](web/.env.railway.example).
- `ai-service` có [ai-service/railway.json](ai-service/railway.json) và env mẫu [ai-service/.env.example](ai-service/.env.example).
- Backend tự apply `schema.sql` lúc boot nếu `AUTO_APPLY_SCHEMA=true`.
- Backend có thể seed dữ liệu demo lúc boot nếu `AUTO_RUN_SEED=true`.

### Tên service nên dùng

Để reference variables trong Railway hoạt động đúng như file mẫu, nên đặt đúng các tên:
- `web`
- `backend`
- `ai`
- `postgres`
- `redis`

### 1) Chuẩn bị repo

```bash
git add .
git commit -m "prepare full railway deployment"
git push
```

### 2) Tạo project Railway

1. Vào `https://railway.com`
2. Đăng nhập bằng GitHub
3. Chọn `New Project`
4. Tạo project trống hoặc import repo

### 3) Thêm `postgres` và `redis`

Trong cùng project:
1. Bấm `+ New`
2. Chọn `Database -> PostgreSQL`
3. Đổi tên service thành `postgres`
4. Lặp lại với `Database -> Redis`
5. Đổi tên service thành `redis`

Không cần tự nhập connection string nếu backend dùng reference variable tới `postgres.DATABASE_URL` và `redis.REDIS_URL`.

### 4) Thêm `backend`

1. Bấm `+ New`
2. Chọn `GitHub Repo`
3. Chọn repo này
4. Đặt tên service là `backend`
5. Vào `Settings`
6. Đặt `Root Directory` là `/backend`
7. Đặt config file là `/backend/railway.json`
8. Trong `Variables`, copy nội dung từ [backend/.env.railway.example](backend/.env.railway.example)

Biến quan trọng:

```env
PORT=4000
NODE_ENV=production
DATABASE_URL=${{postgres.DATABASE_URL}}
REDIS_URL=${{redis.REDIS_URL}}
REDIS_ENABLED=true
BOOKING_EXPIRY_JOB_ENABLED=true
AUTO_APPLY_SCHEMA=true
AUTO_RUN_SEED=true
AI_SERVICE_BASE_URL=http://${{ai.RAILWAY_PRIVATE_DOMAIN}}:${{ai.PORT}}
APP_ORIGIN=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
SOCKET_CORS_ORIGIN=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
```

Bạn cần thay thủ công ít nhất:

```env
JWT_SECRET=replace-with-a-long-random-secret
SEPAY_API_KEY=...
SEPAY_IPN_SECRET=...
SEPAY_MERCHANT_CODE=...
```

### 5) Thêm `ai`

1. Bấm `+ New`
2. Chọn cùng repo GitHub
3. Đặt tên service là `ai`
4. Vào `Settings`
5. Đặt `Root Directory` là `/ai-service`
6. Đặt config file là `/ai-service/railway.json`
7. Trong `Variables`, thêm tối thiểu:

```env
PORT=8001
```

Lưu ý:
- `ai` không bắt buộc phải có public domain nếu chỉ backend gọi nội bộ.
- Backend sẽ gọi AI qua private domain của Railway bằng `RAILWAY_PRIVATE_DOMAIN`.

### 6) Deploy `backend` và `ai`

1. Deploy `ai` trước
2. Deploy `backend` sau

Sau khi deploy backend:

```bash
curl https://<backend-domain>/health
```

Nếu chưa có domain thì tạo ở bước kế tiếp.

### 7) Tạo public domain cho `backend`

1. Mở service `backend`
2. Vào `Settings -> Networking -> Public Networking`
3. Bấm `Generate Domain`
4. Railway sẽ cấp domain miễn phí dạng:

```text
https://backend-xxxx.up.railway.app
```

### 8) Thêm `web`

1. Bấm `+ New`
2. Chọn cùng repo GitHub
3. Đặt tên service là `web`
4. Vào `Settings`
5. Đặt `Root Directory` là `/web`
6. Đặt config file là `/web/railway.json`
7. Trong `Variables`, copy nội dung từ [web/.env.railway.example](web/.env.railway.example)

Biến chính:

```env
PORT=4173
VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

### 9) Tạo public domain cho `web`

1. Mở service `web`
2. Vào `Settings -> Networking -> Public Networking`
3. Bấm `Generate Domain`
4. Railway sẽ cấp domain miễn phí dạng:

```text
https://web-xxxx.up.railway.app
```

Sau khi `web` đã có domain, Railway reference variable trong backend:

```env
APP_ORIGIN=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
SOCKET_CORS_ORIGIN=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
```

sẽ resolve được. Khi đó redeploy `backend` một lần để chắc chắn CORS khớp domain frontend.

### 10) Dòng chảy deploy khuyến nghị

Thứ tự ít lỗi nhất:
1. Tạo `postgres`
2. Tạo `redis`
3. Tạo `ai`
4. Tạo `backend`
5. Generate domain cho `backend`
6. Tạo `web`
7. Generate domain cho `web`
8. Redeploy `backend`

### 11) Kiểm tra sau deploy

Backend:
```bash
curl https://<backend-domain>/health
```

AI nếu bạn có generate domain riêng:
```bash
curl https://<ai-domain>/health
```

Frontend:
- mở `https://<web-domain>`
- đăng nhập bằng tài khoản seed
- vào danh sách sân để kiểm tra gợi ý AI
- tạo booking thử
- vào dashboard admin để kiểm tra analytics

### 12) Tài khoản seed demo

- `admin@smartbadminton.com / admin123`
- `john@example.com / user123`

### 13) Nếu dùng SePay webhook

Dùng URL:

```text
https://<backend-domain>/payments/webhook
```

### 14) Checklist lỗi hay gặp

- `web` build xong nhưng gọi API lỗi:
  `backend` chưa có public domain hoặc `VITE_API_URL` chưa resolve đúng.
- `backend` boot fail:
  `JWT_SECRET` trống, `DATABASE_URL` reference sai, hoặc `ai` chưa deploy nhưng `AI_SERVICE_BASE_URL` đã trỏ vào private domain chưa tồn tại.
- `AI unavailable` ở giao diện:
  service `ai` chưa chạy hoặc `AI_SERVICE_BASE_URL` không đúng.
- Booking tạo được nhưng lock không ổn định:
  `redis` chưa sẵn sàng hoặc `REDIS_URL` chưa map đúng.

## Phụ lục B: Muốn giữ chi phí thấp hơn

Tính đến `May 5, 2026`, Railway `Free` là `$0/tháng` nhưng chỉ có `$1` credit/tháng sau trial `$5/30 ngày`. Với cấu hình đầy đủ `web + backend + ai + postgres + redis`, bạn nên coi đây là cấu hình demo ngắn hạn hoặc dùng plan trả phí.

Nếu muốn tiết kiệm hơn:
- giữ `web + backend + ai` trên Railway,
- chuyển `postgres` sang Neon free,
- chuyển `redis` sang Upstash free hoặc tắt Redis cho bản demo,
- hoặc tắt `BOOKING_EXPIRY_JOB_ENABLED` khi chỉ cần demo UI/API.
