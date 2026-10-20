# Synthetic data

Dữ liệu giả sinh từ persona bằng LLM, ghi vào kho thô để các giai đoạn sau (Match, Enrich, Aggregate) có dữ liệu chạy. Dữ liệu giả và thật được phép trộn lẫn; cột `origin` vẫn giữ để lọc khi cần.

Phạm vi hiện tại (giai đoạn 2) là **một đường ống tạo dữ liệu**, chưa phải hệ thống dự báo. Persona ban đầu không cần chính xác; sẽ nâng cấp dần sau khi mở rộng sources. Xem [plan.md](plan.md#giai-đoạn-2--dữ-liệu-giả-persona--connector-ảo--kho-thô).

```
personas ─┐
          ├─ panel ─▶ connector ảo ─▶ collect_runs ─▶ content_items (post, comment, reply)
brief  ───┘
```

## Cách hoạt động

- Connector ảo là một `DirectConnector` (`fetchRecords` sinh record thô, `normalize` ghi vào kho thô). Workflow thu thập hiện có lưu record thành payload R2 rồi normalize như mọi connector khác, nên có thể parse lại bằng `renormalize-collect-run`.
- Dữ liệu ghi vào `sources`, `authors`, `content_items` với `origin = synthetic`. Truy vết một lô theo `collect_run_id`.
- Từ bước Match trở đi, dữ liệu giả đi **cùng pipeline** với dữ liệu thật. Không có nhánh code riêng.
- Kho thô dùng chung giữa các workspace, nên mọi số liệu đưa cho khách hàng phải lọc theo `origin`.

## Persona, panel, brief

Ba thứ tách riêng:

| Thực thể | Vai trò |
|---|---|
| **Persona** | Một kiểu người, ổn định, dùng lại được. Ví dụ "Nhà đầu tư lướt sóng". |
| **Panel** | Tập persona kèm tỷ lệ (`weight`), đại diện một cộng đồng. Ví dụ "Group review BĐS". |
| **Brief** | Điều xảy ra, đưa vào mỗi lần sinh. Ví dụ "Chủ đầu tư dự án X thông báo lùi bàn giao 6 tháng". |

**`personas`**
- `name`, `kind` (`individual`, `organization`), `description` (1–2 câu), `tone` (giọng văn, văn bản tự do), `concerns` (danh sách aspect quan tâm)
- `attributes` (jsonb, mặc định `{}`) và `version`: chỗ để thêm thuộc tính khi persona phức tạp hơn mà không cần migration
- `source` (`template`, `manual`, `llm_generated`), `review_status`

**`persona_panels`** và **`persona_panel_members`** (`panel_id`, `persona_id`, `weight`).

**`authors.persona_id`**: tác giả giả được tạo lười theo persona và nhất quán giữa các bài.

Ba cách tạo persona (bắt đầu với hai cách đầu):
1. Chọn từ thư viện mẫu (seed 8–10 archetype BĐS).
2. Tạo tay.
3. Sinh từ mô tả ngắn bằng LLM, người dùng sửa và duyệt.

Persona đưa vào prompt phải ngắn (khoảng 150 token).

## Connector ảo

Tham số của run (`collect_runs.params`; source là `collect_runs.source_id`):

```
{ panelId, brief, postCount, commentsPerPost: [min, max],
  window: { from, to }, language, seed, model, styleSourceId?, distractors[] }
```

Mã nguồn: connector ở `lib/connectors/synthetic/`, phần sinh ở `lib/personas/` (kế hoạch, tác giả, prompt, nhiễu). Tham số điều chỉnh nằm ở `lib/personas/config.ts`.

Bên trong `fetchRecords`:
1. **Code lập kế hoạch** (`plan-threads`): số bài, số comment mỗi bài (lệch về ít comment), persona đăng bài và bình luận theo `weight`, `published_at` rải theo giờ Việt Nam, cảm xúc, aspect (lấy từ `concerns` của persona) và độ dài của từng item. `seed` làm kế hoạch lặp lại được.
2. **Gán tác giả** (`assign-thread-authors`): persona cá nhân dùng lại một tác giả đã có (tỷ lệ cấu hình) hoặc tạo tác giả mới; persona tổ chức luôn là một tài khoản. Người đăng bài đôi khi tự trả lời lại.
3. **LLM viết từng thread** (1 post cùng comment và reply trong một lần gọi), persona định nghĩa một lần rồi được tham chiếu. Trả JSON có cấu trúc; thiếu item thì thử lại, vẫn thiếu thì bỏ cả thread. Few-shot lấy từ vài comment thật của `styleSourceId`.
4. **Code ghép lại**: `external_id` (`syn:{run}:{n}`), cây `parent_id`/`root_id`, engagement ngẫu nhiên, nhiễu. Comment nhiễu (spam, ngoài chủ đề, ca trùng tên từ `distractors`) lấy từ danh sách cố định, không qua LLM; comment và reply còn có thể bị bỏ dấu hoặc gõ sai.

Payload R2 là danh sách record phẳng (mỗi record một post, comment hoặc reply kèm spec), nên `collect:renormalize` chạy lại mà không gọi LLM.

Một yêu cầu sinh nhiều hơn `maxThreadsPerRun` được chia thành nhiều run (`startSyntheticGeneration`), run thứ `i` dùng `seed + i`.

Spec của từng item được ghi vào `content_items.metadata`: `personaId`, `panelId`, `brief`, `threadIndex`, `sentiment`, `aspect`, `length`, `briefRelevance` (`direct`, `related`, `general`: bám sự kiện trong brief nhiều hay ít), `noise` (`spam`, `off-topic`, `distractor` hoặc null), `degraded` (`typo`, `no-diacritics`). Đây chỉ là dấu vết lúc sinh, không dùng làm nhãn để kiểm chứng (xem [D12](decisions.md#d12--dữ-liệu-giả-không-dùng-để-kiểm-chứng-2026-10-14)).

`sources` giả: `origin = synthetic`, `platform = facebook`, `source_type = group`, để hạ nguồn thấy cùng hình dạng với dữ liệu thật.

Giới hạn cần đo: `fetchRecords` chạy trong một bước workflow, nên số thread mỗi run phải đủ nhỏ để không vượt giới hạn thời gian. Nếu cần, chia thành nhiều run.

## Lưu ý

- LLM viết nội dung có xu hướng "sạch" và đồng nhất hơn mạng xã hội thật. Cần trộn nhiễu: lỗi chính tả, nội dung không liên quan, spam, các ca trùng tên (ví dụ "La Pura" là nước hoa).
- Nội dung sinh ra không tất định. Muốn tái hiện đúng, giữ payload R2 và `metadata`; `seed` chỉ cố định kế hoạch (số lượng, thời điểm, phân bổ persona).
- Dữ liệu giả không dùng để đo chất lượng Match và Enrich; chỉ đo trên mẫu thật gán nhãn tay (D12). Sau khi vào kho thô, dữ liệu giả được xử lý như dữ liệu thật.
- Nghiên cứu về LLM đóng vai persona cho thấy xu hướng đồng nhất hóa và rập khuôn; vì vậy đầu ra chưa được coi là dự báo phản ứng cộng đồng.

## Để sau

- **`scenarios`** (timeline sự kiện, tham số phản ứng).
- **Chế độ replay**: phát dần theo thời gian, để test cảnh báo (giai đoạn 6).
- **Dự báo phản ứng**: dự đoán phân bố phản ứng theo panel và stimulus, chạy nhiều lượt, hiệu chỉnh theo tần suất lịch sử, so với baseline không persona, backtest trên sự kiện thật. Chỉ làm khi có dữ liệu thật từ nhiều nguồn để đối chiếu.
- **Persona phức tạp hơn**: khai thác từ dữ liệu thật (gom cụm tác giả và comment), mẫu giọng văn gắn theo persona, thuộc tính hành vi (giờ hoạt động, độ trễ phản ứng, mức ảnh hưởng).
- **Cô lập dữ liệu giả theo project**, nếu cần. Không còn cột `projects.mode`.
