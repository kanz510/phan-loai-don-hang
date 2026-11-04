# DEMO Đợt 1 + 2 + 3 (dữ liệu giả, không kết nối Supabase)

**Mở trên iPhone / máy tính:**
- Tổng quan + biểu đồ: https://raw.githack.com/kanz510/phan-loai-don-hang/test/wave3-demo-20261104/index.html
- Danh sách + bộ lọc + CSV: https://raw.githack.com/kanz510/phan-loai-don-hang/test/wave3-demo-20261104/orders.html
- Thêm đơn: https://raw.githack.com/kanz510/phan-loai-don-hang/test/wave3-demo-20261104/order.html
- Tài khoản / lịch sử thao tác mẫu: https://raw.githack.com/kanz510/phan-loai-don-hang/test/wave3-demo-20261104/account.html

Các link này dùng dịch vụ raw.githack.com phục vụ file HTML trực tiếp từ nhánh GitHub test; không phải GitHub Pages hoặc một deployment chính thức. Nếu dịch vụ preview bên ngoài bị chặn / không tải asset, dùng mã nguồn trong nhánh hoặc tự host bộ file tĩnh.

Đây là nhánh đặc biệt `test/wave3-demo-20261104` kế thừa `test/wave3-reports-20261104`, chỉ nhằm thử UI và các thao tác với **115 đơn ngẫu nhiên giả**. Không có kết nối Supabase, không có AI API thật. Em Kem ở chế độ tra cứu nhanh.

- Dữ liệu demo lưu trong `sessionStorage` của trình duyệt, có thể bị mất khi đóng tab.
- Bấm `Đặt lại dữ liệu mẫu` để khôi phục 115 đơn ban đầu.
- Tính năng thêm, sửa, giao, hủy, xóa, lọc và xuất CSV hoạt động trên dữ liệu mẫu trong tab.
- Bản test này không xác nhận khả năng đọc/ghi database thật, triển khai Edge Function hay hiệu năng khi có dữ liệu sản xuất.
- Không merge vào `main` và không thay đổi cấu hình deploy sản xuất.
