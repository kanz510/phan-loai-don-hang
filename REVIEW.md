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


## Cải thiện giao diện và màu trạng thái giao hàng

Thay stylesheet cũ bằng bộ giao diện thống nhất: nền sáng có điểm màu, thẻ thống kê teal/tím/xanh/cam, khoảng cách rõ ràng, nút gradient và biểu tượng SVG nội bộ. Mỗi dòng đơn gắn `data-delivery` để nền xanh lá (đã giao), vàng cam (chưa giao), xanh xám (chưa rõ) cùng viền nhận diện, biểu tượng và nhãn chữ. Trên mobile màu được áp dụng cho toàn bộ thẻ đơn. Hover giữ nguyên nhóm màu trạng thái. Bổ sung bộ lọc trạng thái nhanh có số đơn, đồng bộ với select và URL hiện có.

Animation giới hạn ở mở trang, thao tác nhanh, hover/nhấn nút và chỉ báo đang lưu; không tạo hiệu ứng lặp cho dòng đơn khi polling. `prefers-reduced-motion` tắt các animation và transition. Đã mở rộng kiểm thử browser để xác nhận ba nền khác nhau, bộ lọc nhanh, giảm chuyển động và giữ các luồng CRUD/auth/CSV/điều hướng. Kiểm tra responsive cả bốn trang ở 375/768/1440px bằng dữ liệu mô phỏng có cả ba trạng thái.


## Tên May và tác vụ hủy đơn

Đổi tên hiển thị và title của cả bốn trang thành **Quản lý đơn hàng của May 🫶🏻**. Thêm `Đã hủy` vào lựa chọn trạng thái, bộ lọc nhanh, URL, bảng/thẻ nền hồng, dashboard và thao tác nhanh. Tác vụ hủy có xác nhận, giữ nguyên bản ghi và thông tin tiền/thanh toán/ghi chú, ghi qua API cập nhật có kiểm tra version. Không hủy lặp và không tự hoàn tiền. Giá trị còn hiệu lực loại đơn hủy khỏi tổng, số đơn hủy được tính riêng và không bị cộng nhầm vào “Chưa rõ”. CSV giữ đủ các đơn.

Script nâng cấp riêng `supabase-cancel-orders.sql` thay duy nhất ràng buộc nhập liệu trong transaction và có thể chạy lại. Các script schema đầy đủ cũng chấp nhận trạng thái mới. Chưa có quyền quản trị Supabase trong phiên này nên chưa áp dụng script vào hệ thống thật. Frontend tương thích ba trạng thái cũ và báo lỗi nếu hủy bị ràng buộc máy chủ từ chối.

Kiểm thử browser đạt: hủy thành công/không xác nhận/server chưa hỗ trợ/xung đột phiên bản; bản ghi, số tiền và thanh toán được giữ; không hiện nút hủy lần hai; bộ lọc hủy giữ sau reload; bốn màu nền khác nhau; tên May ở title/header mọi trang; các luồng cũ và responsive 375/768/1440px. SQL/PGlite đạt: constraint cũ từ chối trạng thái mới; nâng cấp hủy chạy hai lần không đổi bản ghi; thành viên hủy được, tăng version, giữ tiền/thanh toán và từ chối cập nhật với version cũ. Các kiểm thử không ghi vào dự án Supabase thật.


## Phương án 3 — Peach Boutique

Áp dụng lựa chọn người dùng trên toàn bộ CSS: nền `#FFF5F0`, panel `#FFFCF9`, chữ `#593E36`, nút coral `#F28076` với chữ nâu `#512A24`, khối peach/kem và điều hướng blush. Tiêu đề trang/đăng nhập/biểu mẫu dùng serif; dữ liệu, nhãn nhập và nút giữ sans-serif. Logo đổi sang monogram m bằng CSS. Bỏ xanh đậm, tím và vòng tròn trang trí cũ; làm nổi bật thao tác Thêm đơn bằng coral.

Giữ bốn màu trạng thái và nhãn/icon: đã giao mint, chưa giao peach, đã hủy coral nhạt, chưa rõ xám ấm. Không thay mã dữ liệu, SQL, quyền hoặc nghiệp vụ. Chữ nút coral có tỷ lệ tương phản 4.76:1, chữ phụ trên nền đạt 5.53:1. Hover dùng chữ nâu đậm hơn để giữ độ tương phản. Giữ focus, chuyển động nhẹ và prefers-reduced-motion.

Chạy lại tests/regression.cjs bằng Chromium + SDK thật với API giả lập: các luồng hiện có, bốn trạng thái và cả bốn trang ở 375/768/1440px đều đạt. Đã rà ảnh tổng quan/danh sách desktop và tổng quan/biểu mẫu mobile theo phương án đã chọn. Không ghi thử lên dữ liệu thật.
