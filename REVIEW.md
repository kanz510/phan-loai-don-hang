# Rà soát giao diện và lỗi

## Đã sửa

| Ưu tiên | Vấn đề trong bản gốc | Thay đổi |
| --- | --- | --- |
| Cao | Tên khách, sản phẩm và ghi chú đi thẳng vào `innerHTML`, có thể chạy mã HTML/JavaScript lưu trong đơn | Tạo node DOM và gán `textContent`; không tạo mã sự kiện từ dữ liệu |
| Cao | `!orders.length` khiến xóa hết đơn rồi tải lại lại sinh 31 đơn mẫu | Chỉ khởi tạo mẫu khi khóa lưu trữ chưa tồn tại, bảo toàn mảng rỗng |
| Cao | Ghi localStorage không bắt lỗi; ứng dụng có thể xóa biểu mẫu trước khi lưu thành công | Ghi thành công rồi mới thay trạng thái; giữ nội dung khi lỗi và hiển thị thông báo |
| Cao | JSON hợp lệ nhưng sai cấu trúc làm render lỗi; JSON hỏng bị tự thay dữ liệu | Kiểm tra schema, trạng thái, số tiền và ID trùng; không ghi đè dữ liệu hỏng, tạm chặn lưu |
| Trung bình | Xóa đơn đang sửa rồi Lưu gây lỗi vì không tìm thấy ID | Thoát chế độ sửa khi xóa, kiểm tra lại ID trước cập nhật, thêm nút Hủy sửa |
| Trung bình | Ô CSV có công thức có thể được bảng tính thực thi | Thêm dấu nháy đơn trước nội dung dạng công thức; giữ BOM UTF-8, escape dấu ngoặc kép, giải phóng object URL |
| Trung bình | Chuỗi chỉ có khoảng trắng vẫn được lưu | Kiểm tra sau trim và báo lỗi tại trường nhập |
| Trung bình | Hai tab có thể giữ bản dữ liệu cũ và ghi đè | Lắng nghe sự kiện storage, cập nhật danh sách và thoát phiên sửa cũ |
| Thấp | Thiếu nhãn nhập, khó đọc trên điện thoại, số tiền viết tắt dễ nhầm | Nhãn rõ ràng, focus bàn phím, thông báo aria-live, thẻ đơn trên mobile, hiển thị tiền VND |

## Tối ưu giao diện

Bố cục tổng quan gồm bốn thẻ thống kê, bộ tìm kiếm/lọc và danh sách bên trái, biểu mẫu cố định bên phải trên desktop. Mobile chuyển sang một cột và hiển thị từng đơn dạng thẻ. Màu xanh chủ đạo, khoảng cách và trạng thái dùng thống nhất. Giữ nguyên trạng thái “Chưa rõ”, không suy luận thanh toán từ ghi chú. Tìm kiếm hỗ trợ tiếng Việt không dấu; xuất CSV ghi rõ phạm vi toàn bộ đơn.

## Đề xuất tiếp theo

1. **Ưu tiên cao — Sao lưu và khôi phục:** thêm xuất/nhập JSON có kiểm tra schema, xem trước và lựa chọn gộp/thay thế. CSV hiện tại chưa thể nhập lại trong ứng dụng.
2. **Khi dùng trên nhiều máy hoặc nhiều nhân viên:** cần backend, đăng nhập, phân quyền và kiểm soát phiên bản bản ghi. localStorage không đồng bộ thiết bị; sự kiện storage chỉ giảm xung đột giữa tab, không bảo đảm giao dịch nguyên tử khi hai tab ghi đồng thời.
3. **Nghiệp vụ thanh toán:** tách “phương thức” (CK/COD/tiền mặt) và “trạng thái” (chưa thanh toán/đã thanh toán). Dữ liệu cũ đang trộn hai khái niệm; cần xác nhận quy tắc chuyển đổi để tránh suy luận sai.
4. **Khối lượng đơn tăng:** thêm phân trang, sắp xếp và mã đơn/ngày tạo. Hiện tại kết xuất toàn bộ danh sách phù hợp với 31 đơn mẫu; chưa đo hiệu năng với hàng nghìn đơn.
5. **An toàn thao tác:** thêm hoàn tác xóa và lịch sử sửa để phục hồi sai sót; hiện tại xóa/khôi phục có hộp thoại xác nhận nhưng không có lịch sử phục hồi.

## Đã kiểm tra

Kiểm thử thực bằng Chromium headless: dữ liệu mẫu 31 đơn (tổng 13.158.000 ₫), tìm không dấu, thêm/sửa/hủy/xóa, xóa đơn đang sửa rồi thêm mới, chuỗi HTML độc hại không trở thành DOM, khoảng trắng, CSV tiếng Việt và công thức, lỗi quota, dữ liệu JSON hỏng/sai schema, xóa đơn cuối rồi tải lại, cập nhật giữa hai tab, không tràn ngang ở 375/768/1440px. Chưa kiểm thử trực tiếp Safari/iOS hoặc Excel; việc chặn công thức được kiểm tra ở nội dung CSV xuất ra.
