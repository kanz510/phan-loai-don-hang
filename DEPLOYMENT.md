# Kích hoạt đăng nhập và lưu đơn chung

## Trạng thái và thứ tự triển khai

Dự án Supabase đã có bảng `orders` và 31 đơn. Bản nâng cấp giữ nguyên bảng, ID và dữ liệu này; **không tự thêm đơn mẫu, không xóa bảng**. Chỉ deploy frontend mới sau khi thực hiện bước 1–3 bên dưới. Nếu chưa chạy migration, bản mới sẽ từ chối truy cập thay vì quay về dữ liệu giả/localStorage.

### 1. Tạo tài khoản

Trong đúng dự án Supabase đã cấu hình tại `index.html`, vào **Authentication → Users → Add user → Create new user**. Tạo tài khoản email/mật khẩu cho chủ cửa hàng và nhân viên; xác nhận email theo cấu hình Auth. Không bật đăng ký công khai. Không gửi mật khẩu qua GitHub hoặc ghi vào mã nguồn.

Ứng dụng chưa có luồng tự đặt lại mật khẩu; chủ dự án quản lý tài khoản qua dashboard. Các tài khoản được cấp quyền đều có thể thêm/sửa/xóa đơn chung.

### 2. Nâng cấp cơ sở dữ liệu

Sao lưu bảng `orders` trước khi thay đổi cấu hình. Trong **SQL Editor**, chạy toàn bộ [supabase-security-migration.sql](supabase-security-migration.sql) (nội dung tương đương `supabase-schema.sql`, chỉ cần chạy một tệp). Script thực hiện trong transaction, giữ nguyên dữ liệu, thêm `version`/`created_by`, bật Realtime nếu publication tồn tại và thay các policy truy cập công khai bằng policy thành viên.

Script đã kiểm thử trên PostgreSQL qua PGlite với schema cũ và một đơn hiện có; có thể chạy lại. Không có lệnh xóa/truncate đơn. `NOT VALID` cho phép giữ các bản ghi cũ, nhưng dữ liệu mới/cập nhật phải thỏa các ràng buộc.

### 3. Cấp quyền thành viên

Sao chép UUID của từng người từ trang Users. Chạy riêng trong SQL Editor (thay UUID thật):

```sql
insert into public.order_members(user_id, role)
values ('UUID_TAI_KHOAN_CHU_CUA_HANG', 'admin')
on conflict(user_id) do update set role=excluded.role;

insert into public.order_members(user_id, role)
values ('UUID_TAI_KHOAN_NHAN_VIEN', 'editor')
on conflict(user_id) do update set role=excluded.role;
```

Cả hai vai trò đều quản lý đơn. Chỉ chủ dự án qua dashboard/SQL Editor có thể cấp hoặc thu hồi thành viên; frontend không có quyền tự nâng vai trò. Thu hồi bằng `delete from public.order_members where user_id='UUID';`.

### 4. Deploy frontend

Merge PR vào `main` sau bước 1–3. Với GitHub Pages cấu hình deploy từ `main`, GitHub tự xuất bản các tệp HTML/JS cùng thư mục `vendor`. Không cần build. Nếu chưa cấu hình Pages, chọn **Settings → Pages → Deploy from a branch → main / (root)**.

`SUPABASE_URL` và `SUPABASE_ANON_KEY` trong `index.html` là endpoint và key công khai hiện có. Quyền truy cập được bảo vệ bằng Auth + RLS ở server. **Không dùng service_role/secret key trong frontend hoặc commit vào GitHub.**

### 5. Xác minh trên hệ thống thật

- Chưa đăng nhập: chỉ thấy biểu mẫu đăng nhập; API anon không đọc/ghi được `orders`.
- Chủ cửa hàng đăng nhập: thấy đúng 31 đơn cũ, không bị nhân đôi.
- Nhân viên dùng trình duyệt/thiết bị khác đăng nhập: thấy cùng danh sách; thêm một đơn thử, chủ cửa hàng nhận cập nhật qua Realtime hoặc lần tải lại/poll kế tiếp (15 giây khi tab hiển thị).
- Hai người mở sửa cùng một đơn: lần lưu cũ hơn bị từ chối; nội dung chưa lưu vẫn được giữ để đối chiếu. Không bấm Lưu lặp lại khi lỗi mạng vì yêu cầu trước có thể đã tới server; tải lại để kiểm tra trước.
- Tài khoản không nằm trong `order_members`: không thấy dữ liệu và không ghi được qua API.
- Xóa đơn thử theo quy trình thông thường; không dùng khôi phục dữ liệu mẫu.

## Dữ liệu cũ trong trình duyệt

Khóa `phan-loai-don-hang-v2` không bị đọc, sửa hoặc xóa trong bản mới. Không tự đẩy dữ liệu cục bộ lên server để tránh trùng các đơn đã có. Nếu còn đơn chỉ lưu trên máy cũ, cần xuất/đối chiếu rồi nhập bổ sung; chưa có công cụ nhập hàng loạt trong giao diện.

## Giới hạn kiểm thử

Kiểm thử browser dùng SDK Supabase thật kèm Auth/PostgREST giả lập, không gửi yêu cầu ghi tới dự án thật. Kiểm thử RLS chạy trên PostgreSQL qua PGlite, không thay thế xác minh Auth/Realtime thật. Chưa kiểm thử Safari/iOS. Trong phiên triển khai này chỉ kiểm tra GET ẩn danh không chứa nội dung đơn (thấy 31 bản ghi); chưa có quyền quản trị Supabase để chạy migration, tạo người dùng hoặc xác minh đăng nhập thật.
