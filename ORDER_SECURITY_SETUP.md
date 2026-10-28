# Triển khai bảo mật đơn hàng

1. Sao lưu bảng `public.orders` trước khi chạy SQL.
2. Tạo tài khoản trong Supabase Authentication và lấy UUID.
3. Tạo bảng thành viên, thêm UUID được phép truy cập.
4. Chỉ sau khi có thành viên, áp dụng `supabase-security-migration.sql` trong SQL Editor.
5. Kiểm tra đăng nhập và quyền truy cập trên môi trường thử nghiệm trước khi triển khai thật.

Không chạy SQL reset hoặc xóa bảng đơn hàng. Không đưa service role key vào HTML công khai.
