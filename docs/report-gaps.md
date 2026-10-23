# Các điểm còn thiếu để report đầy đủ

Ghi lại bốn chỗ report chưa khớp demo [Phát Đạt · La Pura](https://bnb-listening-demo-phat-dat-la-pura.vercel.app/), để xem hướng sau. Chưa chốt cách làm. Cảnh báo và báo cáo AI nằm ở giai đoạn 6 (`docs/plan.md`), không ghi ở đây.

## Reach

Demo có ô **Tiếp cận ước tính**: cộng follower và lượt xem thành số người có thể đã thấy nội dung.

Project thật đã bỏ ô này ([D17](decisions.md#d17--giai-đoạn-5b-số-liệu-dashboard-2026-10-15)). Thay bằng **Tương tác** (like + comment + share của chính mention) và **Tác giả** (số người khác nhau). Hai ô này giữ nguyên.

Reach ước tính không dựng lại được từ dữ liệu hiện có:

- Bài chữ Facebook không có lượt xem. Comment không có lượt xem.
- `sources.member_count` là số thành viên group, không phải số người đã thấy một bài. Cộng theo mention thì cùng một group bị tính nhiều lần.
- Cộng follower của tác giả cũng đếm trùng người và phần lớn tác giả Facebook không có follower.

`content_items.view_count` có số thật ở một phần nội dung: play count của TikTok, `video_view_count` của bài video Facebook. Comment và bài chữ là 0.

Hướng để sau:

- Ô **Lượt xem đã thu**: tổng `view_count` của mention trong kỳ, kèm số bài có view lớn hơn 0. Không gọi là reach của mọi mention.
- Case `launch` (mở bán, ưu tiên P3, chưa làm) có thể có khối **Số liệu chiến dịch** do marketing nhập: impression, reach quảng cáo, booking, chi phí. Số tự khai, tách khỏi KPI listening. Case `campaign` cũ đã gộp vào `project`, không thêm ô reach gõ tay trên Tổng quan của case dự án.
- Mục tiêu kỳ (bao nhiêu đề cập, bao nhiêu tương tác) thì mẫu số do người đặt, tử số là số hệ thống đếm. Wizard demo cũ đã có kiểu so phần trăm mục tiêu này.

## Phân loại KOL

Trang KOL & tác giả đã có cột người theo dõi và nhóm Mega / Macro / Micro / người dùng thường / báo chí (`AUTHOR_TIERS`).

`authors.author_type` trong mô hình dữ liệu đã có `kol`, `agency`, `community`, `brand`, `individual`, `media`. Chưa có bước gán loại. Facebook gần như không trả follower, nên tác giả thật hầu hết rơi vào người dùng thường. Nhóm trên demo (môi giới, cư dân, người mua) chưa nằm trong cách chia hiện tại.

Hướng để sau: lấy follower ở nguồn nào có (TikTok đã có khi quét kênh), rồi một bước gán `author_type`. Trang tác giả giữ nguyên bố cục.

## Mix kênh

Trang Kênh & nguồn đã vẽ nhiều nền tảng, cảm xúc theo kênh, bản đồ nhiệt và nguồn ảnh hưởng nhất.

Dữ liệu đang về chủ yếu từ Facebook. TikTok đã có connector, chưa chạy hết workflow thu thập. YouTube, báo điện tử, trang rao vặt và diễn đàn nằm ở giai đoạn 7 trong [plan.md](plan.md).

Vì mới có Facebook, khung **Kênh thảo luận** trên Tổng quan đang liệt kê từng group và page, chưa phải tỷ trọng nền tảng như demo.

Hướng để sau: khi nguồn mới vào kho, trang Kênh đã cộng theo nền tảng (Facebook group tách khỏi page). Không cần đổi bố cục. Tổng quan chuyển từ “theo nguồn” sang “theo kênh” khi một project có hơn một nền tảng.

## Mốc trên biểu đồ đề cập

Demo gắn chú thích tay lên cột ngày, ví dụ “23/9 · Cập nhật tiến độ hoàn thiện tháp Zenia”.

Chưa có chỗ lưu mốc của project. Tự lấy đỉnh mention làm mốc thì không biết đó là sự kiện gì.

Hướng để sau: người dùng nhập mốc (tên, ngày). Biểu đồ đề cập theo ngày vẽ chú thích ở ngày đó. Không suy mốc từ nội dung mention.
