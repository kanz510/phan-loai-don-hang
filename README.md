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

## Hoa hồng đã nhận và lọc ngày

Mỗi đơn có ô **Hoa hồng đã nhận · nghìn đồng**, nhập `50` = `50.000 ₫`, `12.5` = `12.500 ₫`. Cùng đơn vị nhập với số tiền đơn. Hỗ trợ tối đa ba chữ số sau dấu chấm, ví dụ `1.001` = `1.001 ₫`. Để trống tương đương 0. Số hoa hồng được hiển thị trong danh sách và có tổng riêng ở trang tổng quan. Đây là tiền thực nhận người dùng ghi nhận, nên tổng hoa hồng gồm cả đơn đã hủy; sửa số về 0 hoặc điều chỉnh nếu khoản đó đã được hoàn/trừ. Hoa hồng không tự tính theo giá trị đơn và không tự thay đổi khi hủy.

Cần chạy một lần [supabase-commission.sql](supabase-commission.sql) trong SQL Editor của dự án đang dùng để thêm cột và quyền ghi. Đơn cũ mặc định 0. Nếu chưa nâng cấp, ứng dụng vẫn đọc/lưu được đơn không có hoa hồng; nhập hoa hồng khác 0 sẽ báo lỗi và giữ biểu mẫu, không báo thành công giả. Sau khi chạy SQL, tải lại danh sách để kích hoạt. Không cần chạy lại toàn bộ script phân quyền. Các script cài đặt đầy đủ đã bao gồm cột mới.

Mục **Lọc theo thời gian** ở danh sách dùng ngày tạo đơn theo **Asia/Ho_Chi_Minh (UTC+7)**:

- **Theo tháng / năm:** chọn năm và tháng, hoặc chọn “Cả năm”.
- **Theo khoảng ngày:** tính cả ngày đầu/ngày cuối. Có thể chỉ chọn từ ngày hoặc đến ngày; để cả hai trống không giới hạn ngày.
- Hai chế độ hoạt động riêng, kết hợp được tìm kiếm/thanh toán/trạng thái. Khoảng ngày đảo ngược báo lỗi rõ ràng. Đổi lọc về trang 1; URL giữ bộ lọc sau reload hoặc quay lại từ sửa đơn.
- Tổng hoa hồng cuối danh sách tính trên **toàn bộ kết quả lọc**, không chỉ trang hiện tại. Thẻ tổng quan tính toàn bộ đơn.
- Ngày tạo hiển thị trong danh sách và trên trang sửa; đơn cũ được nhập cùng một đợt có thể có cùng ngày tạo. Không suy luận ngày bán từ tên/ghi chú. Ngày tạo chưa có công cụ chỉnh sửa trong giao diện.
- CSV xuất tất cả đơn như trước, bổ sung hoa hồng theo đồng và ngày tạo theo giờ Việt Nam, giữ nguyên sáu cột cũ đầu tiên.


Đổi cách nhập hoa hồng không đổi dữ liệu đã lưu: nội bộ và CSV vẫn dùng đồng nguyên. Khi mở sửa, khoản đã lưu 50.000đ tự hiển thị `50`; lưu lại không làm số tiền tăng 1.000 lần. Không cần chạy thêm SQL cho thay đổi đơn vị nhập này.

## Trợ lý Hỏi May: AI và tra cứu nhanh

Nút **Hỏi May** ở góc phải các trang tổng quan, danh sách và biểu mẫu, chỉ hiện khi tài khoản có quyền truy cập. `order-assistant.js` có hai chế độ. **Tra cứu nhanh** đọc danh sách đã đồng bộ trong bộ nhớ, không gọi AI. **AI** dùng Supabase Edge Function để gọi OpenAI, hiểu câu hỏi tự nhiên và nhớ tối đa 8 tin nhắn gần nhất trong trang. Xem [AI-SETUP.md](AI-SETUP.md) để thêm khóa máy chủ, SQL giới hạn lượt và triển khai hàm. Chưa cấu hình thì mặc định vẫn dùng Tra cứu nhanh. Cả hai chỉ đọc đơn, không lưu cuộc chat lâu dài. Đăng xuất/đổi tài khoản sẽ xóa cuộc chat. Trang tài khoản không hiển thị trợ lý.

Ví dụ: `Tìm đơn của Lan`, `Tìm son Dior`, `Đơn chưa giao`, `Đơn đã hủy tháng 10/2026`, `Hoa hồng tháng này`, `Tổng quan hôm nay`, `Tổng quan ngày 29/10/2026`, `Tổng quan năm 2026`. Có thể dùng không dấu; hỗ trợ hôm qua, tháng trước, năm trước. Tháng không ghi năm dùng năm hiện tại tại Việt Nam. Khoảng ngày, tuần/quý hoặc lọc thanh toán cần dùng trang Đơn hàng. Tìm kiếm tên/sản phẩm là một câu hỏi riêng.

Bot dùng tất cả đơn được tải theo quyền thành viên, không dùng bộ lọc/phân trang đang mở; liên kết kết quả dẫn tới danh sách có bộ lọc tương ứng. Thời gian theo **ngày tạo đơn tại Việt Nam**, hoa hồng là tiền thực nhận (kể cả đơn hủy), giá trị đơn loại trừ đơn hủy. Nếu chưa tải xong hoặc đang báo lỗi đồng bộ, bot yêu cầu cập nhật thay vì trả số cũ. Tra cứu nhanh không cần SQL hoặc khóa API mới; AI cần kích hoạt theo hướng dẫn riêng.
