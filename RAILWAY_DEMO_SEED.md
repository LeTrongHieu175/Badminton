# Railway Demo Seed

Muc tieu: dua du lieu demo len PostgreSQL tren Railway de web dang deploy co the hien thi ngay, nhung khong bi seed trung moi lan service restart.

## Khi nao dung

Dung khi ban muon:
- giu `AUTO_RUN_SEED=false` tren Railway,
- seed 1 lan vao DB Railway,
- co san danh sach san, slot, user mau va 1000 booking history demo.

## Script da chuan bi

Trong `backend` da co lenh:

```bash
npm run db:seed:railway-demo
```

Lenh nay se:
- apply `schema.sql`,
- chay runtime migrations,
- chay `seed.sql`,
- chi chay `seed_bookings_history_1000.sql` neu chua ton tai bo demo user `seed.vn.*@example.com`.

Neu bo demo da ton tai, script se bo qua phan 1000 booking de tranh nhan doi du lieu.

## Bo du lieu "da van hanh 1 nam"

Neu ban muon bo du lieu nhin that hon, co nhieu user da tung dat san, lich su trai deu theo ngay/gio/mua va co payment cho analytics, dung lenh:

```bash
npm run db:seed:railway-operational-demo
```

Lenh nay se:
- apply `schema.sql`,
- chay runtime migrations,
- chay `seed.sql`,
- chay `seed_operational_history_year.sql` de tao bo user va booking giong he thong da hoat dong khoang 1 nam.

Bo seed nay co:
- 240 user demo `ops.demo.*@example.com`,
- booking trong 365 ngay da qua va 21 ngay sap toi,
- trang thai `COMPLETED`, `CANCELLED`, `REFUNDED`, `CONFIRMED`, `LOCKED`,
- payment `succeeded`, `failed`, `pending` de dashboard va analytics nhin hop ly hon.

Script se tu bo qua neu DB da co user demo `ops.demo.*@example.com`.

## Bien moi truong Railway can co

Service `backend` tren Railway can duoc gan dung:

```env
DATABASE_URL=<Postgres Railway URL>
REDIS_URL=<Redis Railway URL>
APP_ORIGIN=<domain web Railway>
SOCKET_CORS_ORIGIN=<domain web Railway>
AUTO_APPLY_SCHEMA=true
AUTO_RUN_SEED=false
```

Khuyen nghi giu `AUTO_RUN_SEED=false` de tranh tu dong seed lai khi deploy lai.

## Cach chay tren Railway

### Cach 1: Railway shell

Mo shell trong service `backend`, sau do chay:

```bash
npm install
npm run db:seed:railway-demo
```

### Cach 2: Local may cua ban, tro thang vao DB Railway

Trong Railway, copy `DATABASE_URL` cua Postgres roi chay:

```bash
cd backend
DATABASE_URL='<Postgres Railway URL>' npm run db:seed:railway-demo
```

Hoac neu muon bo du lieu van hanh 1 nam:

```bash
cd backend
DATABASE_URL='<Postgres Railway URL>?sslmode=no-verify' npm run db:seed:railway-operational-demo
```

Neu script can ket noi Redis thi khong can, vi script nay chi dung PostgreSQL.

## Cach kiem tra

Sau khi seed xong, vao web Railway:
- trang danh sach san se thay san/slot,
- admin bookings se thay nhieu dong lich su,
- user list se thay them cac tai khoan demo va moi user se co lich su dat san hop ly hon.

Co the kiem tra nhanh trong DB:

```sql
SELECT COUNT(*) FROM courts;
SELECT COUNT(*) FROM court_slots;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM bookings;
```

## Luu y

- Script nay an toan de chay lai cho `seed.sql`.
- Phan `1000 booking history` chi duoc chay 1 lan theo dau hieu user demo `seed.vn.*@example.com`.
- Neu ban muon seed lai tu dau, hay xoa du lieu demo trong DB hoac tao database moi tren Railway roi chay lai script.
