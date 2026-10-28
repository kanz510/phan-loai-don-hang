# Phân loại đơn hàng

Ứng dụng HTML/CSS/JavaScript thuần để thêm, sửa, xóa, tìm kiếm và lọc đơn hàng. Không cần build, không dùng CDN hoặc dịch vụ bên ngoài.

## Chạy ứng dụng

Mở `index.html` trực tiếp hoặc chạy `python -m http.server 8080` tại thư mục dự án rồi truy cập `http://localhost:8080`. Có thể triển khai trực tiếp bằng GitHub Pages.

- Số tiền nhập theo **nghìn đồng**: `340` tương ứng `340.000 ₫`, `125.5` tương ứng `125.500 ₫`.
- Giữ nguyên 31 đơn mẫu và khóa localStorage `phan-loai-don-hang-v2`, tương thích dữ liệu cũ hợp lệ.
- Danh sách hiển thị **10 đơn mỗi trang**; nút Trước/Sau có ở cả đầu và cuối danh sách. Đổi tìm kiếm hoặc bộ lọc luôn trở về trang 1.
- **+ Thêm đơn** và **Sửa** mở popup; trên điện thoại biểu mẫu chiếm toàn màn hình. Dùng Lưu để xác nhận, Hủy/×/Escape để đóng và bỏ nội dung đang nhập.
- Thống kê mặc định thu gọn một dòng; bấm để mở chi tiết. Thanh tìm kiếm và bộ lọc luôn ở đầu màn hình khi cuộn trong danh sách.
- Bộ lọc ảnh hưởng danh sách và tổng giá trị đang hiển thị; nút **Xuất tất cả CSV** xuất mọi đơn đã lưu.
- Dữ liệu chỉ nằm trong trình duyệt/thiết bị hiện tại. CSV là bản xuất để sao lưu và xem bằng bảng tính; ứng dụng chưa hỗ trợ nhập lại CSV.
- Chỉ chọn **Khôi phục 31 đơn gốc** khi muốn thay thế toàn bộ dữ liệu hiện tại.

## Kiểm thử

Cần Node.js và Playwright (`npm install --no-save playwright@1.62.1`). Cài Chromium bằng `npx playwright install chromium`, rồi chạy:

```sh
CHROMIUM_PATH="$(node -p "require('playwright').chromium.executablePath()")" node tests/regression.cjs
```

Nếu có Chromium ở `/usr/bin/chromium`, chỉ cần `node tests/regression.cjs`. Bộ kiểm thử chạy server cục bộ, kiểm tra CRUD, XSS, tìm không dấu, CSV, lưu trữ lỗi, dữ liệu hỏng, danh sách rỗng sau tải lại, đồng bộ tab phân trang, popup, sticky bộ lọc và tràn ngang ở 375/768/1440px. Ảnh chụp được lưu tại `test-results/`.

Xem [REVIEW.md](REVIEW.md) để biết các lỗi đã sửa và đề xuất tiếp theo.
