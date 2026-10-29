# Rà soát lưu đơn dùng chung

## Bản đang có trên GitHub trước nâng cấp

Commit `63fa25c` đã cấu hình Supabase, bỏ tự seed/reset, thêm bản SQL phân quyền nhưng frontend chưa đăng nhập. Kiểm tra hệ thống thật vẫn có 31 đơn, chưa có bảng thành viên. Kiểm tra GET chỉ lấy ID/count cho thấy truy cập ẩn danh đang được phép. Schema cũ có `orders_read using(true)` và `orders_write for all using(true) with check(true)`, cho phép đọc/ghi không cần đăng nhập nếu đã áp dụng như tệp SQL.

## Thay đổi đề xuất

- Giữ nguyên bảng `orders` và các cột hiện có, bổ sung phiên bản và người tạo; không xóa dữ liệu.
- Đăng nhập email/mật khẩu bằng Supabase Auth. Chỉ người nằm trong `order_members` được đọc/ghi; anon bị thu hồi quyền, thành viên không thể tự cấp quyền hay sửa phiên bản/người tạo.
- Mỗi thao tác ghi tác động đúng một đơn, kiểm tra phiên bản khi sửa/xóa và trả bản ghi server về để xác nhận. Không báo thành công khi API cập nhật không tác động dòng nào.
- Bỏ tự seed bảng rỗng, bỏ nút reset toàn bộ dùng chung, không fallback sang mẫu khi SDK/mạng lỗi.
- Không dùng CDN thay đổi phiên bản tự động; SDK MIT được lưu cùng dự án.
- Giữ nội dung khi lỗi ghi, chặn gửi lặp trong lúc chờ, thông báo lỗi ngay trong popup. Không kết thúc phiên sửa khi nhận cập nhật nền; giữ version lúc mở để phát hiện xung đột.
- Đọc nhiều lô 500 dòng, sắp xếp mới nhất trước; đồng bộ Realtime và polling 15 giây. Phản hồi đọc cũ bị bỏ qua sau khi ghi/đổi phiên.
- Dữ liệu đơn trong localStorage cũ không bị đụng tới và không tự nhập để tránh trùng đơn.

## Đã xác minh

`tests/regression.cjs` đạt bằng Chromium + SDK thật, Auth/PostgREST giả lập: chưa đăng nhập không đọc đơn, thành viên được truy cập, tài khoản chưa cấp quyền bị chặn, hai phiên trình duyệt thấy cùng dữ liệu, khôi phục phiên, CRUD, xung đột sau refresh nền, XSS, khoảng trắng, lỗi mạng, khóa gửi lặp, CSV tiếng Việt/công thức, bảng rỗng giữ rỗng sau reload, localStorage cũ nguyên vẹn, tải đủ 1.001 dòng, phân trang, không tràn ngang ở 375/768/1440px, popup toàn màn hình và bộ lọc sticky.

`tests/schema.cjs` đạt bằng PostgreSQL/PGlite: nâng cấp schema cũ giữ đơn; chạy migration hai lần; anon bị từ chối; người đăng nhập chưa là thành viên bị RLS chặn; thành viên CRUD; ghi nhận người tạo; trigger tăng version; cập nhật version cũ không tác động; không tự sửa version hoặc tự cấp thành viên; kiểm tra tiền âm/tên rỗng.

## Còn cần thực hiện trên Supabase thật

Chạy SQL, tạo tài khoản và cấp thành viên theo [DEPLOYMENT.md](DEPLOYMENT.md), rồi mới merge/deploy frontend. Phiên hiện tại chưa có quyền quản trị dự án Supabase; chưa thể áp dụng RLS hoặc xác minh đăng nhập/Realtime thật. Tạo PR nháp để tránh frontend đăng nhập bị đưa lên trước khi backend sẵn sàng.

## Đề xuất tiếp theo

- Nhật ký thao tác, hoàn tác xóa và nhập/xuất JSON có đối chiếu để phục hồi dữ liệu.
- Luồng đặt lại mật khẩu, quản lý thành viên nếu cần (phải qua backend tin cậy, không nhúng khóa quản trị).
- Phân trang/lọc/tổng tiền phía server khi dữ liệu lớn. Hiện phân trang UI nhưng vẫn tải toàn bộ dữ liệu vào bộ nhớ; nhiều lô đọc không phải một snapshot transaction.
- Idempotency cho thao tác thêm để xử lý mạng mất phản hồi sau khi server đã tạo đơn; hiện khóa gửi lặp chỉ bảo vệ lúc yêu cầu đang chờ, cần tải lại kiểm tra trước khi thử lại khi lỗi mạng.
- Tách phương thức thanh toán và trạng thái thanh toán theo quy tắc nghiệp vụ đã xác nhận.


## Tách các phần thành trang riêng

Trang `index.html` chỉ giữ thống kê và ba thao tác nhanh. Danh sách ở `orders.html`, thêm/sửa ở `order.html`, đăng nhập/tài khoản ở `account.html`. Dùng chung `styles.css`, `app.js`, phiên Supabase và thanh điều hướng. Không thay schema, quyền hoặc dữ liệu máy chủ.

Đã cập nhật kiểm thử Chromium + SDK/Auth/PostgREST giả lập và chạy đạt: điều hướng giữa bốn trang, yêu cầu đăng nhập rồi quay về trang đích, đường dẫn dưới `/shop/` như GitHub Pages, giữ bộ lọc/trang sau reload/hủy/lưu, mở sửa bằng ID, ID không tồn tại không được lưu thành đơn mới, chặn URL quay lại ra ngoài website, xung đột sửa và lỗi lưu giữ nội dung. Các kiểm thử dữ liệu chung, CSV, XSS, 1.001 đơn, bảng rỗng và localStorage cũ tiếp tục đạt. Cả bốn trang không tràn ngang ở 375/768/1440px; đã xem ảnh tổng quan desktop/mobile và trang biểu mẫu mobile. Không thêm nút sao lưu theo yêu cầu người dùng. Kiểm thử không ghi dữ liệu lên Supabase thật.
