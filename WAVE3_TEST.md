# Đợt 3: Báo cáo & xuất dữ liệu (CHỈ NHÁNH TEST)

Nhánh: test/wave3-reports-20261104, kế thừa test/wave2-mobile-sync-20261104 (đã gồm Đợt 1+2).

**Không merge vào main; không triển khai website thật, không chạy SQL hay đổi dữ liệu Supabase sản xuất.**

## Chức năng

- Trang Tổng quan: báo cáo theo năm/tháng, biểu đồ 12 tháng (giá trị đơn chưa hủy / hoa hồng ghi nhận / số đơn); chọn một cột để xem tháng.
- Bốn KPI kỳ đã chọn: số đơn tạo, giá trị đơn chưa hủy, hoa hồng đã ghi nhận, số đơn còn chờ hoa hồng.
- So sánh kỳ trước: tháng trước hoặc năm trước. Kỳ trước bằng 0 thì không suy ra %.
- CSV báo cáo: 12 tháng trong năm, tổng tiền theo đơn vị đồng, trạng thái đơn, số đơn còn chờ hoa hồng.
- Trang Đơn hàng: Xuất theo lọc CSV trên toàn bộ kết quả khớp tìm kiếm, giao hàng, thời gian, hoa hồng; không chỉ trang 10 dòng. Nút Xuất tất cả CSV vẫn giữ.

## Quy ước số liệu

- Chỉ tính từ danh sách đơn đã tải bằng tài khoản có quyền, không gửi dữ liệu cho dịch vụ biểu đồ ngoài.
- Nhóm theo created_at, múi giờ Asia/Ho_Chi_Minh. Đây KHÔNG phải ngày giao, thu tiền hay ngày thực nhận hoa hồng.
- Tổng giá trị chưa hủy loại trừ đơn Đã hủy; không coi là doanh thu đã thu hay lợi nhuận.
- Hoa hồng đã ghi nhận lấy tiền đã nhập trên đơn, **bao gồm cả đơn hủy** để đồng bộ với dashboard cũ. Không suy ra thời gian thực nhận.
- Chưa hoa hồng chỉ bao gồm đơn chưa hủy với trạng thái pending hoặc partial (áp dụng logic tương thích đơn cũ); loại không áp dụng.
- Tổng tiền dùng BigInt đơn vị đồng; dữ liệu amount_k đổi từ nghìn đồng sang đồng khi tính.
- Nếu đồng bộ thất bại, báo cáo có thể là snapshot cũ; cảnh báo kết nối của web vẫn được hiển thị.
- CSV chống kích hoạt công thức trong các ô chuỗi và dùng BOM UTF-8 cho Excel.

## Thử nghiệm an toàn

**Quan trọng:** app.js ở nhánh này vẫn có URL và anon key của Supabase sản xuất. Tách GitHub branch không tự cách ly database. Chỉ host preview có thao tác ghi sau khi chuyển sang Supabase test project, dùng đơn giả. Xem WAVE1_TEST.md.

Kiểm tra bằng dữ liệu giả trên iPhone Safari 440px và desktop:

1. Dashboard có đủ 12 cột, bảng 12 tháng, lọc năm/tháng, mở link sang danh sách theo kỳ.
2. Ranh giới UTC 16:59:59/17:00:00 đúng ngày Việt Nam.
3. Đơn đã hủy không cộng giá trị đơn nhưng hoa hồng đã ghi nhận vẫn được cộng.
4. Khi kỳ trước không có dữ liệu, không xuất hiện Infinity hoặc NaN.
5. CSV theo lọc chứa tất cả đơn khớp, không chỉ trang đầu. File dùng đúng tiếng Việt; ô chứa dấu phẩy, xuống dòng không phá CSV.
6. Dữ liệu thay đổi trong phiên khác thì báo cáo cập nhật, giữ kỳ đã chọn.
7. Đăng xuất hoặc không có quyền thì không được xem báo cáo.
8. Không ghi/xóa/sửa đơn hàng sản xuất.

Bài kiểm tra mới: node tests/wave3-report.cjs. Bài browser mock tests/regression.cjs được mở rộng. Workflow GitHub Actions wave3-test.yml chỉ trigger trên nhánh wave3. Chưa khẳng định có kết quả Chromium, Safari thật hoặc SQL Supabase thử nghiệm.

Chỉ cân nhắc merge sau khi người dùng phê duyệt riêng và kiểm thử cả ba đợt.
