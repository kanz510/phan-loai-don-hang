# Bật chat AI cho May bằng Groq miễn phí 🫶🏻

Bản này thay OpenAI trong `supabase/functions/order-chat/` bằng Groq miễn phí.
Code chính không đổi logic: vẫn xác minh Auth, kiểm tra `order_members`,
đọc đơn bằng RLS của chính người dùng, vẫn dùng bộ đếm lượt trong
`supabase-ai-chat.sql`, và vẫn chỉ có công cụ đọc `query_orders`.

## Thay đổi so với bản OpenAI

- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Secret: `GROQ_API_KEY` (thay cho `OPENAI_API_KEY`)
- Model mặc định: `openai/gpt-oss-120b` (đổi bằng secret `GROQ_MODEL` nếu cần)
- Đã bỏ cờ `strict` của tool và tham số `store:false` kiểu OpenAI,
  vì Groq không cần chúng.
- Thông báo lỗi đã đổi từ OpenAI sang Groq.

## 1. Tạo key Groq miễn phí

1. Đăng ký tài khoản Groq (không cần thẻ) và tạo API key.
2. **Không gửi key vào chat, không dán vào GitHub hoặc JavaScript của website.**
   Chỉ dán key vào Supabase Secrets ở bước 3.

## 2. Chạy SQL giới hạn số lượt hỏi

Giống bản gốc: mở `supabase-ai-chat.sql`, chạy toàn bộ trong
Supabase SQL Editor của đúng dự án đang lưu đơn. Thấy Success là xong.
Mặc định mỗi tài khoản tối đa 30 câu/ngày, cả cửa hàng 300 câu/ngày.
Tệp này chỉ thêm bộ đếm, không sửa/xóa đơn hàng.

## 3. Đặt key trong Supabase Secrets

Trong dự án Supabase, vào Edge Functions → Secrets, thêm:

- `GROQ_API_KEY` = key Groq vừa tạo
- Không bắt buộc: `GROQ_MODEL` = `openai/gpt-oss-120b`
- Không bắt buộc: `APP_ORIGIN` = `https://kanz510.github.io`

Không cần `OPENAI_API_KEY` cho bản này. Hàm không cần service_role key.

## 4. Triển khai hàm order-chat

Cách trên Dashboard:

1. Vào Edge Functions → Deploy a new function → Via Editor.
2. Đặt tên hàm chính xác `order-chat`.
3. Mở `supabase/functions/order-chat/index.ts` ở nhánh này, bấm Raw,
   sao chép toàn bộ và thay nội dung `index.ts` trong trình soạn thảo.
4. Deploy. Nếu có tùy chọn Verify JWT with legacy secret, có thể tắt:
   hàm tự xác minh token bằng Supabase Auth và kiểm tra thành viên.

## 5. Kiểm tra trên website

Tải lại https://kanz510.github.io/phan-loai-don-hang/ và đăng nhập,
mở Hỏi May, thử hỏi về đơn chưa giao, hoa hồng tháng này, rồi đối chiếu
phần Đối chiếu từ hệ thống với trang Đơn hàng. Bot không sửa/hủy đơn.

## Lưu ý về gói miễn phí

- Groq miễn phí có giới hạn (tham khảo khoảng 30 yêu cầu/phút,
  1.000 yêu cầu/ngày, 200.000 token/ngày) và model miễn phí có thể
  đổi tên hoặc bị giới hạn bất chợt. Nếu báo model không khả dụng,
  kiểm tra `GROQ_MODEL` và danh sách model miễn phí hiện tại của Groq.
- Chế độ Tra cứu nhanh vẫn hoạt động khi AI chưa bật, hết lượt
  hoặc lỗi dịch vụ.
