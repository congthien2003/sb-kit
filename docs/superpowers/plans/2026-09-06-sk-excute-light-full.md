# Plan: sk-excute light/full, approval và evidence reuse

Trạng thái: Đã triển khai Inline theo yêu cầu “Ok triển khai inline đi”; các giới hạn kiểm tra được ghi bên dưới.

## Mục tiêu và quyết định đề xuất

- Thêm workflow `light` và `full`; phân biệt với execution mode `Inline` và `Sub-agent`.
- `light`: điều tra → spec + plan gộp → self-review và một reviewer độc lập → một lần người dùng duyệt → triển khai.
- `full`: giữ spec và plan với hai lần review/duyệt riêng.
- Chọn workflow theo phạm vi/rủi ro và thông báo lý do ngắn gọn. Dùng `light` cho thay đổi nhỏ, đường đi đã rõ, ít rủi ro; dùng `full` cho thay đổi contract, auth/security, migration, nhiều boundary hoặc còn quyết định quan trọng chưa rõ. Không chỉ đếm file. Tôn trọng lựa chọn người dùng và instructions áp dụng; báo rõ khi phát hiện cần nâng mức xử lý.
- Trình bày execution mode ngay trong lần xin duyệt plan. Tái sử dụng lựa chọn đã có cho task hiện tại; chỉ áp dụng xuyên task nếu người dùng đã nêu preference cho cả session. Nếu chưa chọn, đề xuất mode cụ thể cùng plan; việc duyệt toàn bộ đề xuất bao gồm mode đã nêu rõ. Nếu câu trả lời chỉ duyệt một phần hoặc mode còn mơ hồ, chỉ hỏi phần thiếu.
- Không hỏi mode lần nữa sau khi duyệt. Nếu đã chọn Sub-agent nhưng host không hỗ trợ, vẫn cần người dùng chọn Inline hoặc dừng; không tự fallback.
- Tái sử dụng evidence trong session khi còn phù hợp và đã kiểm tra độ mới. Không tạo cache hoặc công cụ mới.
- Giữ các yêu cầu duyệt trước khi sửa, review độc lập khi host hỗ trợ, bảo toàn thay đổi của người dùng, quyền chạy kiểm tra và không tự commit.

## Evidence đã kiểm tra

- Working tree sạch trước khi tạo plan này.
- `sk-excute/SKILL.md` đang yêu cầu hai approval gate, gọi explorer lại trước plan, và hỏi execution mode sau plan approval.
- Explorer chưa định nghĩa baseline/delta; reviewer chỉ nhận draft `spec` hoặc `plan`.
- Implementer đã nhận approved plan và constraints đầy đủ, không cần đổi contract.
- README và `landing/index.html` đang mô tả trình tự cũ.
- CLI chỉ cài/copy các skill; không thực thi workflow. `test-cli.js` kiểm tra installer, không chứng minh hành vi agent theo skill.

## Phạm vi file và thứ tự triển khai

### 1. Cập nhật workflow chính

File: `.agents/skills/sk-excute/SKILL.md` — frontmatter, Rules, role packets, Workflow và Output shape.

- Thêm tiêu chí chọn `light/full` và hai nhánh duyệt như trên; light vẫn phải có acceptance criteria, file mapping, edge cases và verification phù hợp.
- Dùng các yêu cầu nội dung/review chung, tránh sao chép toàn bộ workflow cho hai nhánh. Không bắt tạo nhiều phương án khi chỉ có một thay đổi nhỏ đã rõ.
- Thay yêu cầu “both approval gates” bằng approval tương ứng workflow; instructions yêu cầu hai lần duyệt riêng vẫn được giữ.
- Gộp execution mode vào plan approval, ghi nhận mode và phạm vi áp dụng; bỏ bước hỏi mode bắt buộc sau approval.
- Thêm freshness check trước plan và trước implementation: so sánh scope, instructions, mapped files/contracts/dependencies với baseline nội dung đã đọc. Bao gồm nội dung tracked/dirty/untracked, file thêm/xóa/đổi tên liên quan và thay đổi cấu hình/môi trường đã biết. HEAD hoặc mtime riêng lẻ không đủ.
- Nếu baseline thiếu hoặc không xác nhận được độ mới, đọc/điều tra lại đúng phần thiếu. Nếu không đổi thì dùng lại packet; nếu đổi thì refresh phần bị ảnh hưởng. Thay đổi không liên quan không làm mất toàn bộ evidence.
- Nếu phát hiện thay đổi ảnh hưởng scope, acceptance criteria, contract hoặc tính đúng của plan đã duyệt, cập nhật/review lại và xin duyệt phần bị ảnh hưởng trước khi sửa code.
- Phân biệt evidence source với kết quả runtime: source không đổi không chứng minh test/runtime cũ vẫn đúng.

Tiêu chí đạt: mỗi nhánh có điểm duyệt rõ ràng, execution mode xác định trước triển khai, không dùng evidence cũ khi thiếu căn cứ.

### 2. Đồng bộ role contracts

Phụ thuộc: quyết định workflow và freshness ở bước 1.

File: `.agents/skills/sk-excute-explorer/SKILL.md` — Input, Investigation, Output packet.

- Cho phép nhận packet trước đó và câu hỏi delta cho spec, plan hoặc bản gộp.
- Trả baseline nhận diện nội dung/phạm vi đã đọc, dependencies/instructions, phần tái sử dụng, phần đọc mới và giới hạn xác minh. Có thể dùng content digest hoặc đối chiếu nội dung trực tiếp; không bắt buộc helper hay lưu cache trên đĩa.
- Điều tra bổ sung theo boundary bị ảnh hưởng; không quét lại toàn repo mặc định.

File: `.agents/skills/sk-excute-reviewer/SKILL.md` — description, Input, checklist.

- Nhận `spec | plan | combined`; với `combined`, kiểm tra đủ spec và file-specific plan trong một review.
- Kiểm tra approval phù hợp workflow, execution mode đã khai báo/đang chờ quyết định và freshness evidence. Ở giai đoạn draft, chưa có user approval không phải lỗi.
- Giữ các verdict và nguyên tắc chỉ block finding nghiêm trọng.

Tiêu chí đạt: main skill và role dùng cùng contract; role không áp lại các bước đã bỏ ở light mode.

### 3. Đồng bộ metadata và tài liệu

Phụ thuộc: bước 1–2.

- `.agents/skills/sk-excute/agents/openai.yaml`: cập nhật mô tả/prompt cho light/full và chọn execution mode cùng plan; giữ tên skill và policy hiện có.
- `README.md`: cập nhật catalog/workflow, tiêu chí chọn mức, ví dụ yêu cầu light/full và ví dụ duyệt plan kèm mode; mô tả evidence reuse ngắn gọn.
- `landing/index.html`: chỉ cập nhật chữ trong phần workflow đang mô tả bốn bước cũ. Mô tả điều tra/chọn mức → review spec/plan → duyệt kèm mode → triển khai/kiểm tra; giải thích light gộp và full tách lần duyệt. Giữ cấu trúc/class hiện có.

Tiêu chí đạt: metadata, README và landing không còn mô tả hỏi mode bắt buộc sau khi plan đã duyệt.

### 4. Kiểm tra sau triển khai

Phụ thuộc: bước 1–3; chỉ chạy khi thực hiện plan đã duyệt và tuân thủ instructions lúc đó.

- Chạy `python -X utf8 C:/Users/sabo/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/sk-excute`, rồi cùng lệnh cho `sk-excute-explorer` và `sk-excute-reviewer`. Kỳ vọng cả ba skill hợp lệ. Nếu thiếu Python/PyYAML, báo hạn chế, không tự thêm dependency vào repo.
- Chạy `node test-cli.js`: kỳ vọng installer checks pass; không diễn giải thành bằng chứng workflow agent đúng.
- Chạy `git diff --check`: kỳ vọng không có lỗi whitespace.
- Review độc lập bằng tình huống read-only: sửa nhỏ/light; thay đổi contract/full; đã chọn mode; duyệt plan với mode đề xuất rõ; chỉ duyệt một phần; source không đổi; dirty/untracked/instructions thay đổi; baseline thiếu; thay đổi ngoài scope; Sub-agent không khả dụng. Thêm tình huống host thiếu native dispatch: explorer/reviewer thực hiện inline với công khai fallback và giữ review contract ở cả light/full; triển khai đã chọn Sub-agent vẫn cần quyết định người dùng. Cho evaluator yêu cầu thực tế và skill đã sửa, giữ rubric đánh giá riêng; không mớm đáp án.
- Đối chiếu kết quả với số lần approval, lựa chọn mode, quyết định reuse/refresh và điểm dừng trước implementation; ghi rõ đây là đánh giá tình huống, không phải bằng chứng triển khai runtime thật.
- Kiểm tra phần workflow landing trên desktop/mobile và chụp ảnh nếu browser khả dụng; báo rõ nếu chưa kiểm tra hiển thị.
- Review diff cuối: đúng sáu file triển khai và plan này, không đổi CLI/version/dependency/skill name; không tự commit.

Không thêm test chỉ match câu chữ Markdown, test framework hoặc cơ chế cache. Không thay đổi implementer, researcher hay các skill khác.

## Cách triển khai đề xuất

Inline cho phần sửa file trong session chính; dùng sub-agent để review/đánh giá độc lập như mô tả ở trên. Người dùng có thể chọn Sub-agent khi duyệt plan này.

## Review và approval

Verdict độc lập: **Pass with non-blocking findings**; không có blocker. Đã tiếp thu cả ba góp ý: phân biệt workflow level với execution mode, cho phép một phương án đã rõ ở light, và thêm tình huống explorer/reviewer fallback khi host thiếu native dispatch.

Người dùng đã duyệt plan và chọn Inline. Đã sửa đúng sáu file triển khai theo phạm vi trên; không commit.

## Kết quả triển khai và kiểm tra

- Đã thêm light/full, gộp execution mode vào plan approval, tái sử dụng evidence sau freshness check, đồng bộ explorer/reviewer, metadata, README và chữ trong workflow landing.
- Review source độc lập: **Pass**, không có finding. Câu bổ sung về tôn trọng quyết định hoãn duyệt đã được reviewer kiểm tra lại và **Pass**.
- Đánh giá tình huống độc lập: 13 traces (A–L, với hai trường hợp I), phù hợp tiêu chí về light/full, approval toàn phần/một phần, reuse/refresh, lựa chọn execution mode theo task, mất native dispatch và giới hạn runtime evidence. Đây là mô phỏng quyết định theo skill, không phải chạy implementation thật qua toàn bộ workflow.
- `node test-cli.js`: **Passed**, exit 0; output kết thúc bằng `sb-kit bootstrap and install picker passed`.
- `git diff --check`: **Passed**, không có lỗi whitespace.
- Đối chiếu HTML bằng Python standard-library `HTMLParser`: cấu trúc tag và toàn bộ attributes của landing khớp `HEAD`; thay đổi chỉ ở text. Kiểm tra source này không chứng minh hiển thị browser.
- Ba lệnh `quick_validate.py`: **không chạy được**, `ModuleNotFoundError: No module named 'yaml'`. Không thêm dependency vào repository; chưa có kết quả validator.
- Kiểm tra desktop/mobile và screenshot: **chưa thực hiện được**. Browser URL policy chặn URL `file:///D:/Code/projects/sb-kit/landing/index.html#quy-trinh`; không thử đi vòng chính sách này.
- CLI, version, dependencies, skill names, implementer và researcher không thay đổi. Không tạo cache hay test chỉ match câu chữ.
