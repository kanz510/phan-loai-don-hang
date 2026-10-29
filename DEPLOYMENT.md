# Kích hoạt đăng nhập và lưu đơn chung

## Nâng cấp hoa hồng (dự án đang hoạt động)

Chạy [supabase-commission.sql](supabase-commission.sql) trong SQL Editor của đúng dự án Supabase. Tệp thêm `commission_amount` (đồng nguyên, mặc định 0), ràng buộc độc lập về số tiền và chỉ mở thêm quyền INSERT/UPDATE cột đó cho thành viên. Không thay chính sách RLS, ngày tạo, trạng thái, phiên bản hoặc các giá trị đơn hiện có. Có thể chạy lại mà không đặt lại hoa hồng đã nhập. Không cần chạy lại toàn bộ script phân quyền.

Sau đó tải lại danh sách để ứng dụng nhận cột mới. Xác minh nhập/sửa hoa hồng trên một đơn thử, tải lại và xem tổng ở trang tổng quan. Hủy đơn giữ hoa hồng thực nhận. Nếu chưa chạy SQL, ứng dụng đọc theo schema cũ, lưu đơn hoa hồng 0 được, nhưng không nhận lưu hoa hồng khác 0; nội dung nhập được giữ để tránh mất thông tin. Không có thao tác ghi thử lên đơn thật trong kiểm thử tự động.

Bộ lọc thời gian không cần nâng cấp SQL; dùng `created_at` hiện có, quy đổi sang giờ Việt Nam và tính cả hai đầu khoảng ngày.


## Nâng cấp riêng cho hủy đơn (dự án đang hoạt động)

Chạy [supabase-cancel-orders.sql](supabase-cancel-orders.sql) trong SQL Editor của đúng dự án Supabase. Tệp này bổ sung `Đã hủy` vào ràng buộc `orders_input_valid`, giữ các kiểm tra tiền/tên/thanh toán và không đổi bản ghi, quyền, thành viên hay trigger phiên bản. Có thể chạy lại. Không cần chạy lại toàn bộ script phân quyền chỉ để thêm hủy đơn.

Nếu chưa chạy, nút hủy không thể ghi vào server vì ràng buộc cũ chỉ nhận ba trạng thái; frontend báo lỗi, không hiển thị thành công giả. Sau khi chạy, kiểm tra bằng đơn thử được tạo cho việc kiểm thử, không hủy đơn thật chỉ để xác minh. Kiểm tra trạng thái sau tải lại và trên tài khoản thứ hai. Hủy không tự thực hiện hoàn tiền.


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

## Bật chat AI (tùy chọn)

Làm theo [AI-SETUP.md](AI-SETUP.md). Cần chạy `supabase-ai-chat.sql`, đặt `OPENAI_API_KEY` trong Supabase Secrets và deploy Edge Function `order-chat`. Đẩy GitHub Pages hoặc kết nối GitHub với Supabase không tự triển khai hàm hoặc thêm khóa. Frontend giữ Tra cứu nhanh hoạt động khi chưa có AI. Không đưa khóa OpenAI vào mã web hoặc GitHub.


## Frontend release / Home Screen updates

Every frontend release must change the `app-version` meta tag in all four HTML entry points and use that same version in their local JS/CSS URLs (including `app-update.js`). Commit these changes atomically with the assets. The updater checks the deployed HTML with `cache: no-store` on launch/resume and reloads to a versioned page URL when safe. Active order/login inputs or a chat request postpone automatic reload; a visible update button remains available. It does not clear Supabase auth or Em Kem history. A copy already suspended on an older build without the updater needs one manual reload to bootstrap this feature.
