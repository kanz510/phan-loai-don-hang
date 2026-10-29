# Bật chat AI cho May 🫶🏻

Mã đã sẵn sàng. AI chỉ hoạt động sau khi bạn thêm khóa OpenAI và triển khai hàm trên **đúng dự án Supabase đang lưu đơn**. Kết nối GitHub với Supabase không tự thực hiện các bước này. Trong lúc chưa bật, web vẫn dùng **Tra cứu nhanh**.

## 1. Tạo khóa OpenAI và đặt giới hạn chi tiêu

1. Mở https://platform.openai.com/api-keys và tạo một API key cho dự án của bạn.
2. Kiểm tra Billing của OpenAI API và đặt ngân sách/cảnh báo phù hợp. Gói ChatGPT Plus/Pro không bao gồm tiền dùng OpenAI API. Dịch vụ tính phí theo lượt xử lý; giới hạn ngân sách/cảnh báo của nhà cung cấp có thể không phải giới hạn cứng.
3. **Không gửi khóa vào chat, không dán vào GitHub hoặc JavaScript của website.** Bạn chỉ dán khóa vào Supabase Secrets ở bước 3.

## 2. Chạy SQL giới hạn số lượt hỏi

1. Mở [supabase-ai-chat.sql](supabase-ai-chat.sql), bấm **Raw**, sao chép toàn bộ.
2. Mở https://supabase.com/dashboard/project/jsdpdfdyxfxvlxdovnkt/sql/new
3. Dán mã, bấm **Run**. Thấy Success là xong.

Tệp này chỉ thêm bộ đếm lượt AI, **không sửa/xóa đơn hàng**. Có thể chạy lại. Mặc định mỗi tài khoản tối đa **30 câu/ngày**, cả cửa hàng **300 câu/ngày**, cách nhau ít nhất **3 giây/tài khoản**. Ngày tính theo giờ Việt Nam. Lượt gọi thất bại sau khi đã nhận xử lý vẫn tính lượt. Muốn thay mức, sửa số 30/300 trong SQL rồi chạy lại. Bộ đếm chỉ lưu ngày, tài khoản và số lượt, không lưu nội dung chat.

## 3. Đặt khóa trong Supabase Secrets

1. Trong dự án Supabase, vào **Edge Functions → Secrets**.
2. Thêm secret tên chính xác `OPENAI_API_KEY`; giá trị là khóa OpenAI vừa tạo. Bấm Save.
3. Không bắt buộc: `OPENAI_MODEL` = `gpt-4.1-mini` (mặc định), `APP_ORIGIN` = `https://kanz510.github.io` (mặc định, không có dấu `/` cuối).

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
supabase link --project-ref jsdpdfdyxfxvlxdovnkt
supabase functions deploy order-chat --project-ref jsdpdfdyxfxvlxdovnkt --no-verify-jwt
```

Chỉ cần SQL ở bước 2 và lệnh `functions deploy`. Không commit file chứa secret. Không đổi project-ref nếu chưa kiểm tra đúng dự án.

## 5. Kiểm tra trên website

1. Tải lại https://kanz510.github.io/phan-loai-don-hang/ và đăng nhập.
2. Mở **Hỏi May**. Khi kết nối thành công, chế độ **AI** được chọn tự động. Có thể chọn bằng tay trong ô Chế độ.
3. Thử: “Đơn nào chưa giao mà chưa thanh toán?”, “Hoa hồng tháng này so với tháng trước thế nào?”, rồi hỏi tiếp “Còn năm nay?”.
4. So sánh phần **Đối chiếu từ hệ thống** dưới câu trả lời với trang Đơn hàng. Bot không có công cụ thay đổi đơn; muốn sửa/hủy vẫn dùng nút trên website.

Nếu báo “AI chưa được triển khai”: kiểm tra tên hàm và bước 4. Nếu báo “AI chưa được kích hoạt”: kiểm tra tên secret ở bước 3. Nếu báo cần `supabase-ai-chat.sql`: chạy bước 2. Nếu hết hạn mức: kiểm tra số lượt hoặc Billing OpenAI. Không cần gửi khóa cho người hỗ trợ.

## Dữ liệu và giới hạn

- Trình duyệt chỉ gửi câu hỏi và tối đa 8 tin nhắn gần nhất, không gửi mảng đơn hoặc khóa OpenAI. Không lưu lịch sử chat trong localStorage; rời trang/đăng xuất/đổi tài khoản sẽ xóa ngữ cảnh. Đổi chế độ bắt đầu ngữ cảnh AI mới.
- Máy chủ xác minh người dùng bằng Auth, kiểm tra `order_members`, rồi đọc bảng `orders` với JWT của **chính người dùng**. Không dùng quyền quản trị để lấy đơn.
- OpenAI nhận câu hỏi, ngữ cảnh chat và **kết quả truy vấn cần thiết**: số liệu tổng/nhóm; khi hỏi chi tiết, tối đa 5 đơn với tên khách, mặt hàng, tiền, ngày và trạng thái. Ghi chú chỉ được gửi khi công cụ yêu cầu cho câu hỏi về ghi chú. Nội dung văn bản được giới hạn chiều dài. Việc xử lý/lưu giữ phía nhà cung cấp tuân theo điều khoản và chính sách OpenAI API; `store:false` không đồng nghĩa không có lưu giữ vì mục đích vận hành.
- Chỉ có công cụ đọc với bộ lọc cho phép. Không có công cụ SQL tự do, sửa, hủy, xóa hay thêm đơn. Số liệu tiền được cộng bằng số nguyên trên máy chủ; AI diễn giải và có thể tính toán sai, cần đối chiếu các thẻ số liệu nguồn.
- Thời gian là **ngày tạo đơn theo Việt Nam**, không có ngày thực giao/nhận hoa hồng riêng. Hoa hồng cộng số thực nhận đã nhập, kể cả đơn hủy. Giá trị đơn chưa hủy không phải lợi nhuận hoặc tiền đã thu.
- Tối đa 10.000 đơn/lượt. Nếu vượt, hàm báo giới hạn thay vì trả tổng từ dữ liệu thiếu. Nhóm tối đa 20 kết quả, chi tiết tối đa 5 đơn và có đánh dấu cắt bớt. Câu hỏi quá phức tạp cần chia nhỏ; mỗi câu tối đa 4 truy vấn công cụ/3 lượt gọi AI, thời gian máy chủ 40 giây.
- Chế độ Tra cứu nhanh tiếp tục hoạt động khi AI chưa được bật, hết lượt hoặc lỗi dịch vụ. Không tự chuyển câu hỏi từ Tra cứu nhanh sang OpenAI.

## Kiểm thử cho người phát triển

```sh
node tests/ai-chat.mjs
node tests/ai-quota.cjs
node tests/regression.cjs
```

`ai-quota.cjs` cần `@electric-sql/pglite`, browser regression cần Playwright/Chromium như README. Các bài kiểm tra dùng dịch vụ AI/Auth/REST giả lập và PostgreSQL cục bộ, không gọi AI trả phí hoặc ghi dữ liệu Supabase thật.

`core.mjs` là nguồn handler để kiểm thử bằng Node; `index.ts` là bản độc lập sinh từ nguồn để dán vào Dashboard. Test kiểm tra hai bản khớp nhau. Sau khi sửa core, tái tạo index với phần đầu `// @ts-nocheck` + ghi chú generated và phần cuối `Deno.serve(createHandler({env:(name: string)=>Deno.env.get(name)}));`.
