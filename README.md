# Phân loại đơn hàng

Ứng dụng HTML/CSS/JavaScript thuần để thêm, sửa, xóa, tìm kiếm và lọc đơn hàng. Không cần build, không dùng CDN hoặc dịch vụ bên ngoài.

## Chạy ứng dụng

Mở `index.html` trực tiếp hoặc chạy `python -m http.server 8080` tại thư mục dự án rồi truy cập `http://localhost:8080`. Có thể triển khai trực tiếp bằng GitHub Pages.

- Số tiền nhập theo **nghìn đồng**: `340` tương ứng `340.000 ₫`, `125.5` tương ứng `125.500 ₫`.
- Giữ nguyên 31 đơn mẫu và khóa localStorage `phan-loai-don-hang-v2`, tương thích dữ liệu cũ hợp lệ.
- Bộ lọc ảnh hưởng danh sách và tổng giá trị đang hiển thị; nút **Xuất tất cả CSV** xuất mọi đơn đã lưu.
- Dữ liệu chỉ nằm trong trình duyệt/thiết bị hiện tại. CSV là bản xuất để sao lưu và xem bằng bảng tính; ứng dụng chưa hỗ trợ nhập lại CSV.
- Chỉ chọn **Khôi phục 31 đơn gốc** khi muốn thay thế toàn bộ dữ liệu hiện tại.

## Kiểm thử

Cần Node.js và Playwright (`npm install --no-save playwright@1.62.1`). Cài Chromium bằng `npx playwright install chromium`, rồi chạy:

```sh
CHROMIUM_PATH="$(node -p "require('playwright').chromium.executablePath()")" node tests/regression.cjs
```

Nếu có Chromium ở `/usr/bin/chromium`, chỉ cần `node tests/regression.cjs`. Bộ kiểm thử chạy server cục bộ, kiểm tra CRUD, XSS, tìm không dấu, CSV, lưu trữ lỗi, dữ liệu hỏng, danh sách rỗng sau tải lại, đồng bộ tab và tràn ngang ở 375/768/1440px. Ảnh chụp được lưu tại `test-results/`.

Xem [REVIEW.md](REVIEW.md) để biết các lỗi đã sửa và đề xuất tiếp theo.
