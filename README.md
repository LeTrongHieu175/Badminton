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

Ví dụ dùng bộ backend:
```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/smart_badminton"
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
```

Tạo `.env` cho web:
```env
VITE_API_URL=http://localhost:4000
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
