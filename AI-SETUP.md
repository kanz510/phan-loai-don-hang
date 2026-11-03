# Bật chat AI cho May 🫶🏻

Mã hiện tại ưu tiên **Groq**, và có thể dự phòng bằng **xKiro**; không dùng `OPENAI_API_KEY`. AI chỉ hoạt động sau khi thêm khóa hợp lệ và triển khai Edge Function. Trong lúc chưa bật, web vẫn dùng **Tra cứu nhanh**.

> **Nhánh thử Đợt 1:** tuyệt đối không áp dụng SQL, Edge Function hoặc khóa API này lên Supabase sản xuất khi chưa phê duyệt. Dùng một Supabase test project riêng; xem `WAVE1_TEST.md`.

## 1. Chọn nhà cung cấp và thiết lập giới hạn

1. Lấy API key từ Groq cho mô hình mà tài khoản được phép dùng. Có thể thêm xKiro làm nhà cung cấp dự phòng nếu có khóa hợp lệ.
2. Kiểm tra hạn mức/tính phí của tài khoản nhà cung cấp tương ứng; không mặc định miễn phí hoặc không giới hạn.
3. **Không gửi khóa vào chat, không dán vào GitHub hoặc JavaScript của website.** Chỉ đặt khóa trong Supabase Edge Function Secrets.

## 2. Chạy SQL giới hạn số lượt hỏi

1. Mở [supabase-ai-chat.sql](supabase-ai-chat.sql), bấm **Raw**, sao chép toàn bộ.
2. Mở SQL Editor trong **Supabase test project** (không phải dự án đang lưu dữ liệu thật).
3. Dán mã, bấm **Run**. Thấy Success là xong.

Tệp này chỉ thêm bộ đếm lượt AI, **không sửa/xóa đơn hàng**. Có thể chạy lại. Mặc định mỗi tài khoản tối đa **30 câu/ngày**, cả cửa hàng **300 câu/ngày**, cách nhau ít nhất **3 giây/tài khoản**. Ngày tính theo giờ Việt Nam. Lượt gọi thất bại sau khi đã nhận xử lý vẫn tính lượt. Muốn thay mức, sửa số 30/300 trong SQL rồi chạy lại. Bộ đếm chỉ lưu ngày, tài khoản và số lượt, không lưu nội dung chat.

## 3. Đặt khóa trong Supabase Secrets

1. Trong dự án Supabase, vào **Edge Functions → Secrets**.
2. Thêm `GROQ_API_KEY` làm khóa chính. Tùy chọn thêm `XKIRO_API_KEY` để dự phòng; cần ít nhất một trong hai.
3. Model mặc định trong code: `GROQ_MODEL` = `openai/gpt-oss-120b`; `XKIRO_MODEL` = `qwen/qwen3.8-max:free`. Chỉ sửa nếu provider xác nhận model khác khả dụng.
4. Đặt `APP_ORIGIN` khớp đúng origin của website thử nghiệm. CORS không tự chấp nhận URL xem trước khác domain.

`SUPABASE_URL` và `SUPABASE_ANON_KEY` do môi trường Edge Functions cung cấp sẵn. Hàm **không cần service_role key**.

## 4. Triển khai hàm order-chat

Cách trên Dashboard:

1. Vào **Edge Functions → Deploy a new function → Via Editor** (tên nút có thể khác đôi chút).
2. Đặt tên hàm chính xác **`order-chat`**.
3. Mở [index.ts](supabase/functions/order-chat/index.ts), bấm **Raw**, sao chép toàn bộ. Thay nội dung file `index.ts` của trình soạn thảo bằng mã này. Đây là bản độc lập, không cần thêm thư viện hoặc file khác.
4. Deploy. Nếu giao diện có tùy chọn **Verify JWT with legacy secret**, có thể tắt: hàm tự xác minh token bằng Supabase Auth, kiểm tra thành viên và đọc dữ liệu bằng RLS của người dùng. Không xóa phần kiểm tra quyền trong mã.

Hoặc nếu dùng CLI, từ thư mục repository:

```sh
supabase login
supabase link --project-ref YOUR_TEST_PROJECT_REF
supabase functions deploy order-chat --project-ref YOUR_TEST_PROJECT_REF --no-verify-jwt
```

Chỉ cần SQL ở bước 2 và lệnh `functions deploy`. Không commit file chứa secret. Phải kiểm tra `YOUR_TEST_PROJECT_REF` là dự án thử nghiệm trước khi chạy.

## 5. Kiểm tra trên website

1. Mở bản preview từ nhánh thử kết nối tới **Supabase test project**, rồi đăng nhập tài khoản thử.
2. Mở **Em Kem**. Khi kết nối thành công, chế độ **AI** được chọn tự động. Có thể chọn bằng tay trong ô Chế độ.
3. Thử: “Đơn nào chưa giao mà chưa thanh toán?”, “Hoa hồng tháng này so với tháng trước thế nào?”, rồi hỏi tiếp “Còn năm nay?”.
4. So sánh phần **Đối chiếu từ hệ thống** dưới câu trả lời với trang Đơn hàng. Bot không có công cụ thay đổi đơn; muốn sửa/hủy vẫn dùng nút trên website.

Nếu báo “AI chưa được triển khai”: kiểm tra tên hàm và bước 4. Nếu báo “AI chưa được kích hoạt”: kiểm tra tên secret ở bước 3. Nếu báo cần `supabase-ai-chat.sql`: chạy bước 2. Nếu hết hạn mức: kiểm tra quota/RPC và tài khoản Groq/xKiro. Không cần gửi khóa cho người hỗ trợ.

## Dữ liệu và giới hạn

- Trình duyệt chỉ gửi câu hỏi và tối đa 8 tin nhắn gần nhất, không gửi mảng đơn hoặc API key. **Bản hiện tại có lưu tối đa 40 tin nhắn giao diện trong localStorage theo tài khoản, tối đa 7 ngày**, để duy trì trò chuyện khi đổi trang. Đăng xuất/đổi tài khoản sẽ đặt lại ngữ cảnh hiện tại.
- Máy chủ xác minh người dùng bằng Auth, kiểm tra `order_members`, rồi đọc bảng `orders` với JWT của **chính người dùng**. Không dùng quyền quản trị để lấy đơn.
- Nhà cung cấp AI đang sử dụng (Groq hoặc xKiro) nhận câu hỏi, ngữ cảnh chat và các kết quả tool cần thiết; mỗi trang nhóm/chi tiết tối đa 50 mục. Ghi chú chỉ được gửi khi công cụ yêu cầu. Việc xử lý/lưu giữ dữ liệu theo chính sách của nhà cung cấp thực tế.
- Chỉ có công cụ đọc với bộ lọc cho phép. Không có công cụ SQL tự do, sửa, hủy, xóa hay thêm đơn. Số liệu tiền được cộng bằng số nguyên trên máy chủ; AI diễn giải và có thể tính toán sai, cần đối chiếu các thẻ số liệu nguồn.
- Thời gian là **ngày tạo đơn theo Việt Nam**, không có ngày thực giao/nhận hoa hồng riêng. Hoa hồng cộng số thực nhận đã nhập, kể cả đơn hủy. Giá trị đơn chưa hủy không phải lợi nhuận hoặc tiền đã thu.
- Tối đa 10.000 đơn/lượt. Nếu vượt, hàm báo giới hạn thay vì trả tổng từ dữ liệu thiếu. Nhóm và chi tiết phân trang 50 mục/lần. Với câu hỏi **top 1–50**, dùng `group_top` và `group_sort` để lấy xếp hạng chính xác trên toàn bộ đơn khớp lọc mà không cần duyệt hết nhóm. Muốn liệt kê tất cả nhóm vẫn phải phân trang, và nếu không đủ trang Em Kem báo rõ thiếu. Mỗi câu tối đa 4 lượt tool và tối đa 5 vòng AI.
- Chế độ Tra cứu nhanh tiếp tục hoạt động khi AI chưa được bật, hết lượt hoặc lỗi dịch vụ. Không tự chuyển câu hỏi từ Tra cứu nhanh sang AI trả phí.

## Kiểm thử cho người phát triển

```sh
node tests/ai-chat.mjs
node tests/ai-quota.cjs
node tests/regression.cjs
```

`ai-quota.cjs` cần `@electric-sql/pglite`, browser regression cần Playwright/Chromium như README. Các bài kiểm tra dùng dịch vụ AI/Auth/REST giả lập và PostgreSQL cục bộ, không gọi AI trả phí hoặc ghi dữ liệu Supabase thật.

`core.mjs` là nguồn handler để kiểm thử bằng Node; `index.ts` là bản độc lập sinh từ nguồn để dán vào Dashboard. Test kiểm tra hai bản khớp nhau. Sau khi sửa core, tái tạo index với phần đầu `// @ts-nocheck` + ghi chú generated và phần cuối `Deno.serve(createHandler({env:(name: string)=>Deno.env.get(name)}));`.
