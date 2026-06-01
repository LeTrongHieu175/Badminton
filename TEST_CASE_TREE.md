# TEST CASE TREE - SMART BADMINTON COURT MANAGEMENT SYSTEM

## 1. Mục tiêu

Tài liệu này tổng hợp test case dạng cây cho toàn bộ dự án `web + backend + ai-service`, theo đúng form:

- `Test ID`
- `Chức năng`
- `Điều kiện trước`
- `Mô tả`
- `Dữ liệu Test`
- `Kết quả mong muốn`
- `Kết quả thực tế`
- `Pass/Fail`

`Kết quả thực tế` và `Pass/Fail` được để trống để đội test điền khi thực thi.

## 2. Dữ liệu dùng chung

- Admin seed: `admin@smartbadminton.com / admin123`
- User seed: `john@example.com / user123`
- Hệ thống đã chạy đủ `web`, `backend`, `postgres`, `redis`, `ai-service`
- DB đã seed dữ liệu sân, slot, booking mẫu
- Với test webhook SePay: cần cấu hình `SEPAY_IPN_SECRET`, `SEPAY_TRANSFER_PREFIX`, `BANK_*`

## 3. Test Tree

```text
1. Xác thực và phân quyền
   1.1 Đăng ký
   1.2 Đăng nhập
   1.3 Phiên đăng nhập
   1.4 Chặn truy cập trái quyền

2. Hồ sơ người dùng
   2.1 Xem hồ sơ
   2.2 Cập nhật thông tin
   2.3 Đổi mật khẩu

3. Cài đặt hệ thống
   3.1 Xem cài đặt
   3.2 Cập nhật tiền tệ hiển thị
   3.3 Cập nhật thời gian giữ chỗ

4. Sân và slot cho người dùng
   4.1 Danh sách sân
   4.2 Chi tiết sân
   4.3 Khả dụng theo ngày

5. Gợi ý AI
   5.1 Gợi ý cá nhân hóa
   5.2 Gợi ý fallback
   5.3 Trường hợp không có slot

6. Đặt sân
   6.1 Tạo booking
   6.2 Kiểm tra lock
   6.3 Kiểm tra dữ liệu không hợp lệ

7. Thanh toán
   7.1 Tạo payment intent
   7.2 Webhook xác nhận thanh toán
   7.3 Webhook lỗi / trùng / sai số tiền

8. Lịch sử đặt sân và hoàn tiền
   8.1 Xem lịch sử
   8.2 Hủy booking LOCKED
   8.3 Refund booking CONFIRMED

9. Dashboard người dùng
   9.1 Thống kê
   9.2 Danh sách booking gần đây

10. Quản trị sân và slot
    10.1 CRUD sân
    10.2 CRUD slot

11. Quản trị người dùng
    11.1 Xem danh sách
    11.2 Tạo tài khoản
    11.3 Sửa / phân quyền / vô hiệu hóa
    11.4 Reset mật khẩu

12. Quản trị booking
    12.1 Lọc danh sách booking
    12.2 Hoàn thành booking
    12.3 Hủy / hoàn tiền

13. Dashboard admin và analytics
    13.1 Overview
    13.2 Revenue
    13.3 Peak hours
    13.4 Utilization
    13.5 Top users

14. AI service trực tiếp
    14.1 Health
    14.2 Recommendation
    14.3 Score recommendations
    14.4 Admin insights
```

## 4. Chi tiết test case

### 4.1 Xác thực và phân quyền

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_AUTH_01 | Đăng nhập user (`/auth/login`, Home) | Tài khoản user seed tồn tại, active | Đăng nhập bằng email hợp lệ | `identifier=john@example.com`<br>`password=user123` | Đăng nhập thành công, trả về `accessToken`, điều hướng `/dashboard` | HTTP 200; user=john@example.com; accessToken tồn tại | Pass |
| TC_AUTH_02 | Đăng nhập admin (`/auth/login`, Home) | Tài khoản admin seed tồn tại, active | Đăng nhập bằng email admin hợp lệ | `identifier=admin@smartbadminton.com`<br>`password=admin123` | Đăng nhập thành công, điều hướng `/admin` | HTTP 200; role=admin; email=admin@smartbadminton.com | Pass |
| TC_AUTH_03 | Đăng nhập bằng username | Có user hợp lệ trong DB | Đăng nhập bằng username thay vì email | `identifier=john` hoặc username seed thực tế<br>`password=user123` | Đăng nhập thành công nếu username đúng | HTTP 200; username=john_2; đăng nhập bằng username hiện tại thành công | Pass |
| TC_AUTH_04 | Đăng nhập sai mật khẩu | User tồn tại | Kiểm tra xử lý khi nhập sai mật khẩu | `identifier=john@example.com`<br>`password=wrong123` | API trả `401 Invalid credentials`, UI hiển thị lỗi đăng nhập | HTTP 401; code=INVALID_CREDENTIALS; message=Invalid credentials | Pass |
| TC_AUTH_05 | Đăng nhập thiếu dữ liệu | Không | Bỏ trống identifier hoặc password | `identifier=''` hoặc `password=''` | API trả `400`, không tạo phiên đăng nhập | HTTP 400; code=VALIDATION_ERROR; message=identifier and password are required | Pass |
| TC_AUTH_06 | Đăng ký tài khoản mới (`/auth/register`) | Email, username, phone chưa tồn tại | Đăng ký thành công user mới | `username=testuser01`<br>`email=testuser01@example.com`<br>`phone=0901111111`<br>`password=secret123` | Tạo user role `user`, trả token, tự đăng nhập sau đăng ký | HTTP 201; created user=run1780297823674_auth@example.com; accessToken cấp ngay sau đăng ký | Pass |
| TC_AUTH_07 | Đăng ký trùng email | Email đã tồn tại | Đăng ký bằng email đã đăng ký | `email=john@example.com` | API trả `409 EMAIL_EXISTS`, UI báo trùng email | HTTP 409; code=EMAIL_EXISTS | Pass |
| TC_AUTH_08 | Đăng ký dữ liệu không hợp lệ | Không | Kiểm tra validation phone và password | `phone=12abc`<br>`password=123` | API trả `400 VALIDATION_ERROR`, không tạo tài khoản | HTTP 400; code=VALIDATION_ERROR; message=phone must be 8-20 chars and only digits/+()/ - | Pass |
| TC_AUTH_09 | Lấy thông tin user hiện tại (`/auth/me`) | Đã đăng nhập | Gọi API lấy hồ sơ hiện tại | Bearer token hợp lệ | Trả đúng thông tin user đang đăng nhập | HTTP 200; current user=john@example.com; role=user | Pass |
| TC_AUTH_10 | Chặn truy cập trang protected | Chưa đăng nhập | Truy cập `/courts`, `/dashboard`, `/bookings`, `/profile` | URL protected | Bị điều hướng về `/` | UI redirect về /; heading=Nền tảng vận hành sân cầu lông theo chuẩn thương mại | Pass |
| TC_AUTH_11 | Chặn truy cập API admin từ user thường | Đăng nhập bằng user thường | Gọi `/users` hoặc `/analytics/overview` | Bearer token user | API trả `403 FORBIDDEN` | HTTP 403; code=FORBIDDEN | Pass |

### 4.2 Hồ sơ người dùng

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_PROF_01 | Xem hồ sơ (`/profile`) | Đã đăng nhập | Mở trang hồ sơ cá nhân | User token hợp lệ | Hiển thị đúng username, full name, email, phone, role, trạng thái | HTTP 200; username=run1780297823674_auth; email=run1780297823674_auth@example.com; phone=0917823894 | Pass |
| TC_PROF_02 | Cập nhật hồ sơ thành công (`PATCH /auth/me`) | Đã đăng nhập, dữ liệu mới chưa trùng | Sửa username/fullName/phone | `username=john_new`<br>`fullName=John Test`<br>`phone=0902222222` | Lưu thành công, UI cập nhật dữ liệu mới, local storage đồng bộ | HTTP 200; username=run1780297823674_auth_updated; fullName=Auth User Updated; phone=0957824387 | Pass |
| TC_PROF_03 | Cập nhật hồ sơ trùng username/phone | Đã đăng nhập, DB có user khác dùng dữ liệu đó | Sửa sang username hoặc phone đã tồn tại | `username=existing_user` hoặc `phone` trùng | API trả `409`, không cập nhật dữ liệu | HTTP 409; code=USERNAME_EXISTS; message=Username already registered | Pass |
| TC_PROF_04 | Đổi mật khẩu thành công (`PATCH /auth/me/password`) | Đã đăng nhập, biết mật khẩu cũ | Đổi mật khẩu hợp lệ | `currentPassword=user123`<br>`newPassword=newpass123`<br>`confirmPassword=newpass123` | API thành công, đăng nhập lại bằng mật khẩu mới được | HTTP 200; đổi mật khẩu thành công; đăng nhập lại được với mật khẩu mới | Pass |
| TC_PROF_05 | Đổi mật khẩu sai mật khẩu hiện tại | Đã đăng nhập | Nhập sai current password | `currentPassword=wrong123` | API trả `401`, mật khẩu không đổi | HTTP 401; code=INVALID_CREDENTIALS; message=Current password is incorrect | Pass |
| TC_PROF_06 | Đổi mật khẩu xác nhận không khớp | Đã đăng nhập | `newPassword` khác `confirmPassword` | `newPassword=newpass123`<br>`confirmPassword=newpass456` | API trả `400`, không cập nhật | HTTP 400; code=VALIDATION_ERROR; message=Password confirmation does not match | Pass |
| TC_PROF_07 | Đổi mật khẩu trùng mật khẩu cũ | Đã đăng nhập | Đặt mật khẩu mới giống mật khẩu hiện tại | `currentPassword=user123`<br>`newPassword=user123`<br>`confirmPassword=user123` | API trả `400`, báo phải khác mật khẩu cũ | HTTP 400; code=VALIDATION_ERROR; message=New password must be different from current password | Pass |

### 4.3 Cài đặt hệ thống

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_SET_01 | Xem cài đặt (`GET /settings`) | Backend chạy | Truy cập lấy cài đặt hệ thống không cần đăng nhập | Không | Trả `displayCurrency`, `bookingHoldMinutes`, `updatedAt` | HTTP 200; displayCurrency=EUR; bookingHoldMinutes=20 | Pass |
| TC_SET_02 | Admin cập nhật cài đặt hợp lệ | Đăng nhập admin | Lưu tiền tệ và thời gian giữ chỗ hợp lệ | `displayCurrency=EUR`<br>`bookingHoldMinutes=20` | API thành công, trang Admin Settings hiển thị giá trị mới | HTTP 200; displayCurrency=EUR; bookingHoldMinutes=20 | Pass |
| TC_SET_03 | User thường sửa cài đặt | Đăng nhập user thường | Gọi `PATCH /settings` | Bearer token user | API trả `403 FORBIDDEN` | HTTP 403; code=FORBIDDEN | Pass |
| TC_SET_04 | Cập nhật tiền tệ không hỗ trợ | Đăng nhập admin | Gửi currency ngoài danh sách | `displayCurrency=JPY` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=displayCurrency must be one of: VND, USD, EUR | Pass |
| TC_SET_05 | Cập nhật booking hold ngoài khoảng cho phép | Đăng nhập admin | Gửi số phút `<1` hoặc `>120` | `bookingHoldMinutes=0` hoặc `121` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=bookingHoldMinutes must be an integer between 1 and 120 | Pass |

### 4.4 Sân và slot cho người dùng

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_COURT_01 | Xem danh sách sân active (`GET /courts`) | Đã đăng nhập | Lấy danh sách sân cho user thường | Không | Chỉ trả sân `isActive=true` | HTTP 200; returned 15 sân active; sân inactive test không xuất hiện | Pass |
| TC_COURT_02 | Admin xem cả sân inactive | Đăng nhập admin, có sân inactive | Gọi `/courts?includeInactive=true` | `includeInactive=true` | Trả cả sân active và inactive | HTTP 200; admin thấy sân inactive id=18 | Pass |
| TC_COURT_03 | User thường yêu cầu includeInactive | Đăng nhập user, có sân inactive | Gọi `/courts?includeInactive=true` | `includeInactive=true` | Hệ thống vẫn chỉ trả sân active | HTTP 200; includeInactive bị bỏ qua với user thường | Pass |
| TC_COURT_04 | Xem chi tiết sân hợp lệ (`GET /courts/:id`) | Đã đăng nhập, sân active tồn tại | Mở chi tiết 1 sân | `courtId` hợp lệ | Trả thông tin sân và danh sách slot | HTTP 200; court=run1780297823674 Court Main; slots=4 | Pass |
| TC_COURT_05 | User xem sân inactive | Có sân inactive, đăng nhập user | Gọi `/courts/:id` vào sân inactive | `courtId` inactive | API trả `404 COURT_NOT_FOUND` | HTTP 404; code=COURT_NOT_FOUND | Pass |
| TC_COURT_06 | Admin xem sân inactive | Có sân inactive, đăng nhập admin | Gọi `/courts/:id` vào sân inactive | `courtId` inactive | Trả thành công, kèm slot kể cả inactive | HTTP 200; admin đọc được sân inactive run1780297823674 Court Inactive | Pass |
| TC_COURT_07 | Xem khả dụng sân theo ngày | Đã đăng nhập, sân active có slot | Gọi `/courts/:id/availability?date=YYYY-MM-DD` | `date=2026-06-10` | Trả danh sách slot với trạng thái `AVAILABLE/LOCKED/CONFIRMED` | HTTP 200; availability trả 4 slot; trạng thái đầu tiên=AVAILABLE | Pass |
| TC_COURT_08 | Xem khả dụng với ngày sai format | Đã đăng nhập | Gọi availability với ngày sai | `date=10-06-2026` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=date must follow YYYY-MM-DD format | Pass |
| TC_COURT_09 | Xem khả dụng cho sân không tồn tại | Đã đăng nhập | Gọi availability với `courtId` không tồn tại | `courtId=999999` | API trả `404 COURT_NOT_FOUND` | HTTP 404; code=COURT_NOT_FOUND | Pass |

### 4.5 Gợi ý AI

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_REC_01 | Gợi ý sân cá nhân hóa (`GET /recommendations/courts`) | Đăng nhập user, user có lịch sử booking, AI service hoạt động | Lấy gợi ý cho ngày cụ thể | `date=2026-06-10` | Trả `recommendedOptions`, `recommendedCourtIds`, `strategy=personalized` hoặc `cold_start` hợp lệ | HTTP 200; strategy=personalized; aiStatus=ok; options=3 | Pass |
| TC_REC_02 | Gợi ý fallback khi AI down | Đăng nhập user, AI service tắt/chậm | Lấy gợi ý trong khi AI không phản hồi | `date=2026-06-10` | API vẫn trả gợi ý, `aiStatus=unavailable`, `strategy=fallback` | Request tới backend thất bại khi AI service dừng: fetch failed | Fail |
| TC_REC_03 | Không có slot trống để gợi ý | Đăng nhập user, ngày test không còn slot AVAILABLE | Lấy gợi ý cho ngày kín lịch | `date` full booking | Trả `recommendedOptions=[]`, `strategy=empty` hoặc danh sách rỗng phù hợp | HTTP 200; strategy=empty; recommendedOptions=0 | Pass |
| TC_REC_04 | Gọi gợi ý thiếu ngày | Đăng nhập user | Gọi API không truyền `date` | Không có `date` query | API trả `400` do thiếu query bắt buộc | HTTP 400; code=VALIDATION_ERROR; message=Missing required query fields: date | Pass |
| TC_REC_05 | User chưa đăng nhập gọi gợi ý | Chưa đăng nhập | Truy cập `/recommendations/courts` | Không token | API trả `401 UNAUTHORIZED` | HTTP 401; code=UNAUTHORIZED | Pass |

### 4.6 Đặt sân

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_BOOK_01 | Tạo booking LOCKED thành công (`POST /bookings`) | Đăng nhập user, sân active, slot active còn trống | Đặt 1 slot hợp lệ | `courtId=1`<br>`slotId=1`<br>`date=2026-06-10` | Tạo booking trạng thái `LOCKED`, có `lockExpiresAt`, UI hiện thông báo thanh toán | HTTP 201; bookingId=1245; status=LOCKED; lockExpiresAt=2026-06-01T07:30:39.106Z | Pass |
| TC_BOOK_02 | Đặt sân khi slot đang bị user khác lock | Có user khác vừa giữ chỗ slot đó | Gửi request vào slot đang lock | Dùng cùng `courtId/slotId/date` | API trả `409 SLOT_LOCKED` hoặc `SLOT_UNAVAILABLE` | HTTP 409; code=SLOT_LOCKED; message=Slot is currently locked by another user | Pass |
| TC_BOOK_03 | Đặt sân khi slot đã có booking active | Slot đã `CONFIRMED` hoặc `LOCKED` trong DB | Đặt lại cùng slot/ngày | Dùng slot đã có đơn active | API trả `409 Slot is not available` | HTTP 409; slot đã CONFIRMED nên không đặt lại được; code=SLOT_UNAVAILABLE | Pass |
| TC_BOOK_04 | Đặt sân với court không tồn tại | Đăng nhập user | Gửi `courtId` sai | `courtId=999999` | API trả `404 COURT_NOT_FOUND` | HTTP 404; code=COURT_NOT_FOUND | Pass |
| TC_BOOK_05 | Đặt sân với slot không thuộc court | Đăng nhập user | Gửi `slotId` không thuộc `courtId` | `courtId=1`, `slotId` thuộc sân khác | API trả `404 SLOT_NOT_FOUND` | HTTP 404; code=SLOT_NOT_FOUND | Pass |
| TC_BOOK_06 | Đặt sân với date sai định dạng | Đăng nhập user | Gửi ngày không phải ISO date | `date=10/06/2026` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=date must follow YYYY-MM-DD format | Pass |
| TC_BOOK_07 | Đặt sân thiếu field bắt buộc | Đăng nhập user | Bỏ trống `courtId`, `slotId` hoặc `date` | Payload thiếu field | API trả `400` từ middleware validate | HTTP 400; code=VALIDATION_ERROR; message=Missing required body fields: slotId, date | Pass |
| TC_BOOK_08 | Chưa đăng nhập đặt sân | Chưa đăng nhập | Gọi `POST /bookings` | Không token | API trả `401 UNAUTHORIZED` | HTTP 401; code=UNAUTHORIZED | Pass |
| TC_BOOK_09 | UI availability cập nhật sau khi lock thành công | Đăng nhập user, slot AVAILABLE | Đặt sân từ trang `/courts/:id/booking` | Chọn 1 slot trống | Slot vừa đặt đổi sang `LOCKED` trên UI và không chọn lại được | UI tạo booking thành công cho courtId=16; badge slot đổi sang "Đã khóa" | Pass |

### 4.7 Thanh toán

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_PAY_01 | Tạo payment intent thành công (`POST /payments/create-intent`) | Đăng nhập owner booking, booking đang `LOCKED`, chưa hết hạn | Tạo QR thanh toán | `bookingId` hợp lệ | Trả thông tin ngân hàng, `transferCode`, `qrUrl`, `lockExpiresAt` | HTTP 201; transferCode=BOOKING-1245; amountVnd=120000; bookingStatus=LOCKED | Pass |
| TC_PAY_02 | User trả tiền booking của người khác | Đăng nhập user khác owner | Gọi create-intent cho booking không thuộc mình | `bookingId` của user khác | API trả `403 FORBIDDEN` | HTTP 403; code=FORBIDDEN; message=Cannot pay for another user booking | Pass |
| TC_PAY_03 | Tạo payment intent cho booking không ở trạng thái LOCKED | Booking đã `CONFIRMED/CANCELLED/COMPLETED` | Gọi create-intent | `bookingId` không LOCKED | API trả `409 BOOKING_NOT_LOCKED` | HTTP 409; code=BOOKING_NOT_LOCKED; message=Booking is not in LOCKED state | Pass |
| TC_PAY_04 | Tạo payment intent sau khi lock hết hạn | Booking `LOCKED` nhưng `lock_expires_at < now` | Gọi create-intent | `bookingId` expired | API trả `409 BOOKING_LOCK_EXPIRED` | HTTP 409; code=BOOKING_LOCK_EXPIRED; message=Booking lock has expired | Pass |
| TC_PAY_05 | Webhook SePay xác nhận thanh toán thành công | Có payment pending, booking `LOCKED`, header secret đúng | Gửi webhook incoming, đúng số tiền và transfer code | Payload chứa `BOOKING-{id}` và amount đúng | Payment chuyển `succeeded`, booking chuyển `CONFIRMED`, slot emit realtime update | HTTP 200 webhook; booking status sau webhook=CONFIRMED | Pass |
| TC_PAY_06 | Webhook sai secret | Cấu hình SePay tồn tại | Gửi webhook thiếu/sai auth header | Header sai | API trả `401 INVALID_WEBHOOK_SIGNATURE` | HTTP 401; code=INVALID_WEBHOOK_SIGNATURE | Pass |
| TC_PAY_07 | Webhook sai số tiền | Có booking LOCKED và payment pending | Gửi webhook amount khác `amount_vnd` | Amount nhỏ/hơn so với booking | Event được nhận nhưng booking không confirm, payment không hợp lệ | HTTP 200 webhook; amount mismatch không confirm thanh toán; booking=LOCKED; payment=pending | Pass |
| TC_PAY_08 | Webhook trùng event | Đã xử lý một event trước đó | Gửi lại cùng `eventId` | Cùng payload lần 2 | Event duplicate bị bỏ qua, không tạo side effect lần 2 | HTTP 200; duplicate webhook không tạo thêm event; payment_events count=1 | Pass |
| TC_PAY_09 | Webhook đến sau khi lock đã hết hạn | Booking `LOCKED` nhưng quá hạn | Gửi webhook hợp lệ sau expiry | Payload hợp lệ | Payment có thể được ghi nhận, booking chuyển `CANCELLED`, lock được giải phóng | HTTP 200 webhook; booking chuyển CANCELLED khi lock đã hết hạn | Pass |

### 4.8 Lịch sử đặt sân và hoàn tiền

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_HIS_01 | User xem lịch sử booking của mình (`GET /bookings/user/:id`) | Đã đăng nhập user, có booking | Mở trang `/bookings` | `userId` của chính user | Trả danh sách booking và phân trang | HTTP 200; items=20; total=205 | Pass |
| TC_HIS_02 | User xem booking user khác | Đăng nhập user thường | Gọi `/bookings/user/{id_khac}` | `id` khác user hiện tại | API trả `403 FORBIDDEN` | HTTP 403; code=FORBIDDEN | Pass |
| TC_HIS_03 | Hủy booking LOCKED thành công (`DELETE /bookings/:id`) | Booking thuộc owner hoặc admin, đang `LOCKED` | Hủy booking trước khi thanh toán | `bookingId` LOCKED | Booking chuyển `CANCELLED`, lock được release, slot mở lại | HTTP 200; bookingId=1249; status=CANCELLED | Pass |
| TC_HIS_04 | Refund booking CONFIRMED hợp lệ | Booking đã thanh toán `CONFIRMED`, còn trước giờ chơi >= 5h | Bấm hoàn tiền | `bookingId` CONFIRMED hợp lệ | Booking chuyển `REFUNDED`, `refundAmountVnd = floor(amount*0.7)` | HTTP 200; status=REFUNDED; refundAmountVnd=77000 | Pass |
| TC_HIS_05 | Refund booking CONFIRMED quá sát giờ chơi | Booking CONFIRMED nhưng còn < 5h | Thực hiện refund | `bookingId` trong cửa sổ cấm | API trả `409 REFUND_WINDOW_CLOSED` | HTTP 409; code=REFUND_WINDOW_CLOSED; message=Refund is only allowed at least 5 hours before slot start | Pass |
| TC_HIS_06 | Hủy booking đã COMPLETED | Booking đã hoàn thành | Gọi delete booking | `bookingId` COMPLETED | API trả `409 BOOKING_ALREADY_COMPLETED` | HTTP 409; code=BOOKING_ALREADY_COMPLETED; message=Completed booking cannot be cancelled | Pass |
| TC_HIS_07 | Hủy booking đã REFUNDED | Booking đã refunded | Gọi delete booking | `bookingId` REFUNDED | API trả `409 BOOKING_ALREADY_REFUNDED` | HTTP 409; code=BOOKING_ALREADY_REFUNDED; message=Booking is already refunded | Pass |
| TC_HIS_08 | UI Booking History phân nhóm active/history đúng | User có đơn `LOCKED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `REFUNDED` | Mở trang `/bookings` | Dữ liệu booking đủ trạng thái | `LOCKED/CONFIRMED` vào bảng "Sân đang đặt", còn lại vào "Lịch sử" | UI hiển thị 2 nhóm booking; activeRows=86; historyRows=14 | Pass |

### 4.9 Dashboard người dùng

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_UDASH_01 | Thống kê dashboard user | Đăng nhập user, có booking nhiều trạng thái | Mở `/dashboard` | Booking sample đủ dữ liệu | Hiển thị đúng tổng lượt đặt, số đơn confirmed/completed, pending, tổng chi phí | UI dashboard render đủ stat cards; nội dung=Tổng lượt đặt của tôi20Thống kê toàn bộ thời gianĐã xác nhận12Đang chờ2Tổng chi phí86,23 € | Pass |
| TC_UDASH_02 | Danh sách booking gần đây | Đăng nhập user | Mở dashboard user | Không | Hiển thị bảng booking gần đây, có xử lý loading/error/empty state | UI bảng lịch đặt sân gần đây hiển thị 20 dòng | Pass |

### 4.10 Quản trị sân và slot

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_ACOURT_01 | Admin xem danh sách sân (`/admin/courts`) | Đăng nhập admin | Mở trang quản lý sân | Không | Hiển thị đầy đủ danh sách sân, gồm active và inactive | HTTP 200; courts=18; có sân active và inactive | Pass |
| TC_ACOURT_02 | Admin tạo sân thành công (`POST /courts`) | Đăng nhập admin | Tạo sân mới | `name=Sân test A`<br>`location=Quận 1` | Tạo thành công sân mới, danh sách refresh | HTTP 201; tạo sân test id=17; name=run1780297823674 Court Main | Pass |
| TC_ACOURT_03 | Admin tạo sân thiếu tên | Đăng nhập admin | Gửi tạo sân không có `name` | `name=''` | API trả `400` do thiếu field bắt buộc | HTTP 400; code=VALIDATION_ERROR; message=Missing required body fields: name | Pass |
| TC_ACOURT_04 | Admin cập nhật sân | Đăng nhập admin, sân tồn tại | Sửa tên/vị trí sân | `name=Sân A1`<br>`location=Quận 3` | Cập nhật thành công | HTTP 200; name=run1780297823674 Court Main Updated; location=QA Zone Updated | Pass |
| TC_ACOURT_05 | Admin ẩn/kích hoạt lại sân | Đăng nhập admin, sân tồn tại | Toggle `isActive` | `isActive=false/true` | Sân đổi trạng thái tương ứng | HTTP 200; toggle isActive false->true thành công | Pass |
| TC_ACOURT_06 | Admin xóa mềm sân (`DELETE /courts/:id`) | Đăng nhập admin, sân tồn tại | Xóa mềm 1 sân | `courtId` hợp lệ | Sân chuyển inactive, không mất bản ghi cứng | HTTP 200; delete mềm sân id=18; isActive=false | Pass |
| TC_ACOURT_07 | User thường thao tác CRUD sân | Đăng nhập user thường | Gọi `POST/PATCH/DELETE /courts` | Payload hợp lệ | API trả `403 FORBIDDEN` | HTTP 403; code=FORBIDDEN | Pass |
| TC_ACOURT_08 | Admin tạo slot thành công (`POST /courts/:id/slots`) | Đăng nhập admin, sân tồn tại | Tạo slot mới | `startTime=18:00`<br>`endTime=19:00`<br>`priceVnd=120000` | Tạo slot thành công | HTTP 201; slot primary id=183; time=18:00-19:00 | Pass |
| TC_ACOURT_09 | Admin tạo slot endTime <= startTime | Đăng nhập admin | Tạo slot sai khoảng giờ | `startTime=19:00`<br>`endTime=18:00` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=endTime must be greater than startTime | Pass |
| TC_ACOURT_10 | Admin tạo slot trùng time range | Đăng nhập admin, sân đã có slot cùng time | Tạo slot bị conflict | Dùng giờ đã tồn tại | API trả `409 SLOT_CONFLICT` | HTTP 409; code=SLOT_CONFLICT; message=Slot time range already exists for this court | Pass |
| TC_ACOURT_11 | Admin cập nhật giá slot | Đăng nhập admin, slot tồn tại | Sửa `priceVnd` | `priceVnd=150000` | Cập nhật giá thành công | HTTP 200; slot id=183; priceVnd=150000 | Pass |
| TC_ACOURT_12 | Admin cập nhật slot invalid price | Đăng nhập admin | Gửi `priceVnd<=0` | `priceVnd=0` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=priceVnd must be a positive integer | Pass |
| TC_ACOURT_13 | Admin vô hiệu hóa slot | Đăng nhập admin, slot tồn tại | Cập nhật `isActive=false` hoặc delete slot | `slotId` hợp lệ | Slot inactive, không còn cho user đặt | HTTP 200; slot id=184; isActive=false | Pass |
| TC_ACOURT_14 | Admin xóa slot không tồn tại | Đăng nhập admin | Gọi delete slot sai id | `slotId=999999` | API trả `404 SLOT_NOT_FOUND` | HTTP 404; code=SLOT_NOT_FOUND | Pass |

### 4.11 Quản trị người dùng

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_AUSER_01 | Admin xem danh sách user (`GET /users`) | Đăng nhập admin | Mở `/admin/users` | Không | Hiển thị danh sách user active và inactive | HTTP 200; users=175; gồm cả admin/user test đã tạo | Pass |
| TC_AUSER_02 | Admin tạo user thường thành công (`POST /users`) | Đăng nhập admin | Tạo tài khoản user mới | `username=user_a01`<br>`email=user_a01@example.com`<br>`phone=0903333333`<br>`password=secret123`<br>`role=user` | Tạo thành công user mới | HTTP 201; tạo user id=178; email=run1780297823674_user2@example.com | Pass |
| TC_AUSER_03 | Admin tạo tài khoản admin thành công | Đăng nhập admin | Tạo thêm admin | Dữ liệu hợp lệ + `role=admin` | Tạo thành công admin mới | HTTP 201; tạo admin id=179; email=run1780297823674_admin2@example.com | Pass |
| TC_AUSER_04 | Admin tạo user trùng email/username/phone | Đăng nhập admin | Tạo tài khoản với dữ liệu trùng | Trùng 1 trong 3 trường | API trả `409` tương ứng | HTTP 409; code=EMAIL_EXISTS; message=Email already registered | Pass |
| TC_AUSER_05 | Admin cập nhật thông tin user | Đăng nhập admin, user tồn tại | Sửa username/fullName/email/phone | Payload hợp lệ | Cập nhật thành công | HTTP 200; username=run1780297823674_user2_updated; email=run1780297823674_user2_updated@example.com | Pass |
| TC_AUSER_06 | Admin đổi role user <-> admin | Đăng nhập admin, target user tồn tại | Thực hiện promote/demote | `role=user` hoặc `admin` | Role cập nhật thành công nếu không vi phạm invariant | HTTP 200; promote->demote user id=178 thành công | Pass |
| TC_AUSER_07 | Không được tự bỏ quyền admin cuối cùng | Chỉ còn 1 admin active, đăng nhập admin đó | Tự đổi role sang user hoặc tự deactivate | Target là chính mình | API trả `400`, hệ thống vẫn còn ít nhất 1 admin active | HTTP 400; code=VALIDATION_ERROR; message=System must have at least one active admin | Pass |
| TC_AUSER_08 | Không được deactivate admin active cuối cùng | Chỉ còn 1 admin active | Admin khác hoặc chính admin cuối cùng thao tác deactivate | `userId` admin cuối | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=System must have at least one active admin | Pass |
| TC_AUSER_09 | Admin reset mật khẩu user thành công (`PATCH /users/:id/password`) | Đăng nhập admin, user tồn tại | Đổi mật khẩu cho user | `password=temp123` | API thành công, user đăng nhập bằng mật khẩu mới được | HTTP 200; reset password thành công; user đăng nhập lại được | Pass |
| TC_AUSER_10 | Admin reset mật khẩu quá ngắn | Đăng nhập admin, user tồn tại | Gửi mật khẩu < 6 ký tự | `password=123` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=Password must have at least 6 characters | Pass |
| TC_AUSER_11 | User thường gọi API quản trị user | Đăng nhập user | Gọi `/users`, `/users/:id`, `/users/:id/password` | Token user | API trả `403 FORBIDDEN` | HTTP 403; code=FORBIDDEN | Pass |

### 4.12 Quản trị booking

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_ABOOK_01 | Admin xem toàn bộ booking (`GET /bookings`) | Đăng nhập admin | Mở `/admin/bookings` | Không | Trả danh sách booking toàn hệ thống và phân trang | HTTP 200; items=20; total=1251 | Pass |
| TC_ABOOK_02 | Admin lọc theo userName/status/date | Đăng nhập admin, DB có dữ liệu phù hợp | Lọc theo nhiều tiêu chí | `userName=john`<br>`status=CONFIRMED`<br>`dateFrom=2026-06-01`<br>`dateTo=2026-06-30` | Chỉ trả booking khớp bộ lọc | HTTP 200; filtered items=3 | Pass |
| TC_ABOOK_03 | Admin lọc với status không hợp lệ | Đăng nhập admin | Gửi status ngoài danh sách | `status=PAID` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=status must be LOCKED, CONFIRMED, COMPLETED, CANCELLED, or REFUNDED | Pass |
| TC_ABOOK_04 | Admin lọc với dateFrom > dateTo | Đăng nhập admin | Gửi khoảng ngày đảo ngược | `dateFrom=2026-06-30`<br>`dateTo=2026-06-01` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=dateFrom must be less than or equal to dateTo | Pass |
| TC_ABOOK_05 | Admin complete booking LOCKED | Đăng nhập admin, booking LOCKED tồn tại | Bấm "Hoàn thành" | `bookingId` LOCKED | Booking chuyển `COMPLETED`, payment manual thành `succeeded`, lock được giải phóng | HTTP 200; bookingId=1253; status=COMPLETED | Pass |
| TC_ABOOK_06 | Admin complete booking CONFIRMED | Đăng nhập admin, booking CONFIRMED tồn tại | Hoàn thành booking đã thanh toán | `bookingId` CONFIRMED | Booking chuyển `COMPLETED` thành công | HTTP 200; bookingId=1254; status=COMPLETED | Pass |
| TC_ABOOK_07 | Admin complete booking CANCELLED/REFUNDED | Đăng nhập admin | Thử complete booking không hợp lệ | `bookingId` CANCELLED hoặc REFUNDED | API trả `409` phù hợp | HTTP 409; code=BOOKING_ALREADY_REFUNDED; message=Refunded booking cannot be completed | Pass |
| TC_ABOOK_08 | Admin hủy booking LOCKED | Đăng nhập admin, booking LOCKED tồn tại | Bấm "Hủy" | `bookingId` LOCKED | Booking chuyển `CANCELLED` | HTTP 200; bookingId=1255; status=CANCELLED | Pass |
| TC_ABOOK_09 | Admin refund booking CONFIRMED đủ điều kiện | Đăng nhập admin, booking CONFIRMED còn >=5h | Bấm "Hoàn tiền" | `bookingId` hợp lệ | Booking chuyển `REFUNDED`, có `refundAmountVnd` | HTTP 200; bookingId=1256; status=REFUNDED; refundAmountVnd=68600 | Pass |

### 4.13 Dashboard admin và analytics

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_ANALYTICS_01 | Admin mở dashboard overview (`GET /analytics/overview`) | Đăng nhập admin, có dữ liệu booking | Mở `/admin` | Không | Trả `stats`, `charts`, `alerts`, `aiInsights`, `recentBookings` | HTTP 200; stats.totalBookings=1255; recentBookings=10 | Pass |
| TC_ANALYTICS_02 | Overview fallback khi AI insight lỗi | Đăng nhập admin, tắt AI service | Mở dashboard admin | Không | Overview vẫn tải được, `aiInsights.status=unavailable`, có khuyến nghị fallback | Request tới analytics overview thất bại khi AI service dừng: fetch failed | Fail |
| TC_ANALYTICS_03 | User thường truy cập analytics | Đăng nhập user thường | Gọi `/analytics/overview` hoặc `/analytics/revenue` | Token user | API trả `403 FORBIDDEN` | HTTP 403; code=FORBIDDEN | Pass |
| TC_ANALYTICS_04 | Lấy revenue theo khoảng ngày (`GET /analytics/revenue`) | Đăng nhập admin | Gọi API doanh thu | `start_date=2026-06-01`<br>`end_date=2026-06-30` | Trả tổng doanh thu và `dailySeries` đúng format | HTTP 200; totalRevenueVnd=867800; dailySeries=3 | Pass |
| TC_ANALYTICS_05 | Gọi revenue thiếu query bắt buộc | Đăng nhập admin | Thiếu `start_date` hoặc `end_date` | Chỉ truyền 1 đầu mốc | API trả `400` từ middleware | HTTP 400; code=VALIDATION_ERROR; message=Missing required query fields: end_date | Pass |
| TC_ANALYTICS_06 | Gọi revenue với start_date > end_date | Đăng nhập admin | Gửi khoảng ngày sai | `start_date=2026-06-30`<br>`end_date=2026-06-01` | API trả `400 VALIDATION_ERROR` | HTTP 400; code=VALIDATION_ERROR; message=start_date must be less than or equal to end_date | Pass |
| TC_ANALYTICS_07 | Lấy peak hours | Đăng nhập admin | Gọi `/analytics/peak-hours` | `start_date/end_date` hợp lệ | Trả mảng giờ cao điểm và số lượt đặt | HTTP 200; peak-hours rows=5 | Pass |
| TC_ANALYTICS_08 | Lấy utilization | Đăng nhập admin | Gọi `/analytics/utilization` | `start_date/end_date` hợp lệ | Trả `confirmedSlots`, `totalAvailableSlots`, `utilizationPercent` | HTTP 200; utilizationPercent=0.3; confirmedSlots=16 | Pass |
| TC_ANALYTICS_09 | Lấy utilization theo sân | Đăng nhập admin | Gọi `/analytics/utilization-by-court` | Không | Trả danh sách sân với công suất sử dụng | HTTP 200; utilization-by-court rows=14 | Pass |
| TC_ANALYTICS_10 | Lấy top users | Đăng nhập admin | Gọi `/analytics/top-users` | `start_date/end_date` hợp lệ<br>`limit=5` | Trả danh sách user chi tiêu cao nhất | HTTP 200; top-users rows=1 | Pass |
| TC_ANALYTICS_11 | Lấy analytics summary | Đăng nhập admin | Gọi `/analytics/summary` | Không | Trả `totalRevenueVnd`, `totalBookings`, `activeUsers`, `avgUtilizationPercent` | HTTP 200; totalRevenueVnd=948700; totalBookings=1255 | Pass |

### 4.14 AI service trực tiếp

| Test ID | Chức năng | Điều kiện trước | Mô tả | Dữ liệu Test | Kết quả mong muốn | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC_AI_01 | Health check (`GET /health`) | AI service chạy | Gọi health endpoint | Không | Trả `status=ok`, tên service, dataset path | HTTP 200; status=ok; service=ai-recommendation | Pass |
| TC_AI_02 | Recommendation đơn giản (`GET /ai/recommendation/{user_id}`) | AI service chạy, dataset tồn tại | Lấy top giờ chơi đề xuất | `user_id=1` | Trả `recommended_slots` tối đa 3 phần tử | HTTP 200; recommended_slots=09:00, 07:00, 13:00 | Pass |
| TC_AI_03 | Recommendation với user_id không hợp lệ | AI service chạy | Gọi với `user_id<=0` | `user_id=0` | API trả `400` | HTTP 400; detail=user_id must be a positive integer | Pass |
| TC_AI_04 | Score recommendations cho user có lịch sử (`POST /ai/recommendations/score`) | AI service chạy | Gửi danh sách slot trống và history | Payload hợp lệ có `history` | Trả `strategy=personalized`, danh sách `recommendedOptions` được xếp hạng | HTTP 200; strategy=personalized; recommendedOptions=2 | Pass |
| TC_AI_05 | Score recommendations cho cold start | AI service chạy | Gửi request không có history | `history=[]`, `availableSlots` hợp lệ | Trả `strategy=cold_start` | HTTP 200; strategy=cold_start; recommendedOptions=1 | Pass |
| TC_AI_06 | Score recommendations khi không có slot | AI service chạy | Gửi `availableSlots=[]` | Payload rỗng slot | Trả `strategy=empty`, `recommendedOptions=[]` | HTTP 200; strategy=empty; recommendedOptions=0 | Pass |
| TC_AI_07 | Admin insights (`POST /ai/admin-insights`) | AI service chạy | Gửi snapshot analytics cho AI tổng hợp | Payload stats/charts/alerts hợp lệ | Trả `strategy=admin_ml`, `summary`, `recommendations` | HTTP 200; strategy=admin_ml; recommendations=4 | Pass |

## 5. Gợi ý ưu tiên thực thi

Nếu cần test theo mức ưu tiên, nên chạy theo thứ tự:

1. `TC_AUTH_*`
2. `TC_COURT_*`, `TC_BOOK_*`, `TC_PAY_*`, `TC_HIS_*`
3. `TC_AUSER_*`, `TC_ACOURT_*`, `TC_ABOOK_*`
4. `TC_ANALYTICS_*`, `TC_REC_*`, `TC_AI_*`

## 6. Ghi chú

- Các test liên quan webhook, refund và lock expiry nên chạy trên môi trường có `redis` và cấu hình thanh toán giả lập đầy đủ.
- Một số test cần chuẩn bị dữ liệu riêng để tránh ảnh hưởng lẫn nhau, đặc biệt là:
  - tạo booking trên cùng `courtId/slotId/date`
  - test duplicate email/phone/username
  - test admin cuối cùng trong hệ thống
  - test refund trong và ngoài mốc `5 giờ`
