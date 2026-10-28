# Phân loại đơn hàng

Ứng dụng quản lý đơn dùng chung qua Supabase với đăng nhập và quyền thành viên. HTML/CSS/JavaScript thuần, SDK Supabase 2.49.8 đóng gói sẵn trong `vendor/` (MIT), không cần build hay CDN.

**Trước khi xuất bản bản nâng cấp:** thực hiện [DEPLOYMENT.md](DEPLOYMENT.md) để áp dụng SQL và cấp quyền tài khoản. Frontend mới cần bảng `order_members` và cột `orders.version`; chưa cấu hình đủ sẽ không cho truy cập dữ liệu.

## Sử dụng

- Chạy `python -m http.server 8080`, mở `http://localhost:8080`, hoặc triển khai GitHub Pages. Đăng nhập bằng tài khoản do chủ cửa hàng cấp.
- Mọi thành viên được cấp quyền xem và cập nhật chung một bảng đơn; không tự đăng ký tài khoản.
- Nhập tiền theo **nghìn đồng**: `340` = `340.000 ₫`; `125.5` = `125.500 ₫`.
- 10 đơn/trang; tìm kiếm không dấu và bộ lọc áp dụng toàn bộ danh sách, đổi lọc về trang 1.
- Thêm/Sửa mở popup, điện thoại mở toàn màn hình. Hủy/×/Escape bỏ nội dung đang nhập; khi đang lưu phải chờ kết quả.
- Thống kê thu gọn; bộ lọc sticky. CSV xuất toàn bộ đơn đã tải, không chỉ trang hiện tại.
- Dữ liệu tải theo nhiều lô nên không bị cắt ở giới hạn 1.000 bản ghi mặc định. Đồng bộ qua Realtime và kiểm tra lại mỗi 15 giây khi tab đang hiển thị.
- Xung đột sửa/xóa được kiểm tra bằng phiên bản tại server. Nếu người khác đã sửa, giữ nội dung và báo lỗi để đối chiếu.
- Không tự thêm đơn mẫu, không có nút thay thế toàn bộ dữ liệu chung. LocalStorage cũ được giữ nguyên, không tự nhập lên server.

## Kiểm thử

Cần Node.js. Cài `npm install --no-save playwright@1.62.1 @electric-sql/pglite@0.3.14`. Nếu chưa có Chromium, chạy `npx playwright install chromium`.

```sh
# Mặc định dùng /usr/bin/chromium, hoặc chỉ định CHROMIUM_PATH.
node tests/regression.cjs
node tests/schema.cjs
```

Browser test dùng hai browser context và SDK thật nhưng giả lập Auth/PostgREST, không ghi tới dự án Supabase thật. SQL test dùng PostgreSQL/PGlite để kiểm tra migration trên schema cũ, RLS, quyền và xung đột phiên bản. Xem [REVIEW.md](REVIEW.md) và [DEPLOYMENT.md](DEPLOYMENT.md) về phạm vi xác minh.
