# Web App (React + Vite)

Frontend cho hệ thống SMART BADMINTON COURT MANAGEMENT SYSTEM.

Tài liệu tổng dự án:
- Xem README gốc: [`../README.md`](../README.md)

## Chạy nhanh

```bash
npm install
npm run dev
```

Mặc định frontend gọi backend tại:
- `http://localhost:4000`

Có thể override bằng `.env`:

```env
VITE_API_URL=http://localhost:4000
```

Trang chủ có form:
- Login: `username hoặc mail` + `password`
- Register: `username`, `mail`, `phone`, `password`

Tài khoản seed:
- Admin: `admin@smartbadminton.com` / `admin123`
- User: `john@example.com` / `user123`
