# Quản lý đơn hàng của May 🫶🏻

Ứng dụng quản lý đơn dùng chung qua Supabase với đăng nhập và quyền thành viên. HTML/CSS/JavaScript thuần, SDK Supabase 2.49.8 đóng gói sẵn trong `vendor/` (MIT), không cần build hay CDN.

**Trước khi xuất bản bản nâng cấp:** thực hiện [DEPLOYMENT.md](DEPLOYMENT.md) để áp dụng SQL và cấp quyền tài khoản. Frontend mới cần bảng `order_members` và cột `orders.version`; chưa cấu hình đủ sẽ không cho truy cập dữ liệu.

## Các trang

- `index.html`: chỉ thống kê tổng đơn, tổng giá trị, trạng thái giao hàng và các nút thao tác nhanh.
- `orders.html`: danh sách, tìm kiếm, bộ lọc, phân trang, xóa và xuất CSV hiện có.
- `order.html`: tạo đơn; `order.html?id=...` mở trang sửa đơn.
- `account.html`: đăng nhập, thông tin tài khoản và vai trò. Phiên đăng nhập được dùng chung giữa các trang.

Thanh điều hướng có trên mọi trang, không cần cấu hình rewrite khi chạy GitHub Pages. CSS và logic dùng chung nằm ở `styles.css` / `app.js`. Chưa đăng nhập sẽ chuyển đến trang tài khoản rồi quay về đúng trang đang mở. Bộ lọc và số trang nằm trong URL, được giữ khi tải lại hoặc quay về sau khi sửa.

## Sử dụng

- Chạy `python -m http.server 8080`, mở `http://localhost:8080`, hoặc triển khai GitHub Pages. Đăng nhập bằng tài khoản do chủ cửa hàng cấp.
- Mọi thành viên được cấp quyền xem và cập nhật chung một bảng đơn; không tự đăng ký tài khoản.
- Nhập tiền theo **nghìn đồng**: `340` = `340.000 ₫`; `125.5` = `125.500 ₫`.
- 10 đơn/trang; tìm kiếm không dấu và bộ lọc áp dụng toàn bộ danh sách, đổi lọc về trang 1.
- Thêm/Sửa mở trang biểu mẫu riêng, lưu thành công quay lại danh sách. Hủy hoặc liên kết quay lại giữ nguyên bộ lọc/số trang. Trình duyệt nhắc trước khi rời trang có nội dung chưa lưu.
- Tổng quan chỉ hiện số liệu và thao tác nhanh; danh sách có bộ lọc sticky. CSV xuất toàn bộ đơn đã tải, không chỉ trang hiện tại. Không bổ sung nút/chức năng sao lưu mới.
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

Browser test dùng hai browser context và SDK thật nhưng giả lập Auth/PostgREST, không ghi tới dự án Supabase thật. SQL test dùng PostgreSQL/PGlite để kiểm tra migration trên schema cũ, RLS, quyền và xung đột phiên bản. Kiểm thử giao diện còn kiểm tra tải trực tiếp từng trang, quay lại đúng bộ lọc/số trang, ID không tồn tại, chặn liên kết quay lại ra ngoài website và đường dẫn dưới thư mục con như GitHub Pages. Xem [REVIEW.md](REVIEW.md) và [DEPLOYMENT.md](DEPLOYMENT.md) về phạm vi xác minh.

## Màu sắc và chuyển động

Đơn đã giao có nền xanh lá, chưa giao có nền vàng cam, chưa rõ có nền xanh xám; nhãn chữ và biểu tượng luôn đi kèm màu. Có bộ lọc nhanh theo trạng thái với số đơn. Thống kê, thao tác nhanh và các nút dùng biểu tượng SVG nội bộ trong `icons.svg`, không cần tải font/icon từ dịch vụ ngoài. Hiệu ứng mở trang và hover ngắn; tự tắt animation/transition khi thiết bị bật giảm chuyển động. Các dòng đơn không có animation lặp khi đồng bộ nền.

## Hủy đơn

Danh sách có nút **Hủy đơn** với xác nhận. Hủy chỉ đổi trạng thái thành **Đã hủy**, giữ nguyên bản ghi, số tiền, phương thức thanh toán và ghi chú; không tự hoàn tiền. Đơn đã hủy có nền hồng, bộ lọc riêng, thẻ thống kê và lối vào từ trang tổng quan. Đơn đã hủy không còn nút hủy lặp; vẫn có thể mở Sửa để điều chỉnh trạng thái nếu cần. Xóa vẫn là tác vụ riêng, có xác nhận.

**Cần nâng cấp Supabase một lần:** chạy [supabase-cancel-orders.sql](supabase-cancel-orders.sql) trong SQL Editor bằng tài khoản chủ dự án. Nếu chưa chạy, giao diện báo lỗi và giữ nguyên trạng thái khi máy chủ từ chối. Tệp chỉ mở rộng ràng buộc dữ liệu, không thay đơn hay quyền. Các script schema đầy đủ cũng đã cập nhật cho cài đặt mới.

Tổng số đơn vẫn gồm cả đơn hủy; **Giá trị đơn chưa hủy** chỉ cộng đơn còn hiệu lực. Khi lọc đơn hủy, danh sách vẫn hiển thị số tiền gốc từng đơn để đối chiếu, tổng giá trị còn hiệu lực bằng 0. Xuất CSV vẫn gồm mọi đơn và trạng thái thực tế, bao gồm đơn hủy.

## Phong cách Peach Boutique

Giao diện dùng bảng màu đã chọn: coral `#F28076`, blush `#FFB6AF`, kem `#FAE0C7`, peach `#FBC193`, mint `#4EB09B`. Nền kem hồng, panel trắng ấm, tiêu đề serif nâu và logo chữ m; nút chính coral dùng chữ nâu đậm để dễ đọc. Mint dành chủ yếu cho đơn đã giao; chưa giao màu peach, đã hủy coral nhạt, chưa rõ xám ấm. Cả bốn trang dùng chung phong cách và vẫn hỗ trợ giảm chuyển động.
