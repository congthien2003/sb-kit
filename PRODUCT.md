# Bối cảnh sản phẩm

## Sản phẩm là gì

SaboKit là bộ agent skills kèm CLI giúp lập trình viên cài đặt, kiểm tra và
cập nhật skills trong project, hoặc khởi tạo workspace Next.js + Hono.
Landing page giới thiệu công dụng, catalog skills và cách bắt đầu.

## Người dùng

- Người dùng chính là lập trình viên sử dụng coding agent để phát triển phần mềm.
- Họ quen terminal, npm/npx và cấu trúc project.
- Họ thao tác chủ yếu trên máy tính, trong thư mục project đang phát triển.

## Công việc chính

1. Chọn và cài skills phù hợp vào project hiện tại.
2. Kiểm tra trạng thái và cập nhật skills đã cài, bảo toàn các tùy chỉnh cần giữ.
3. Tạo workspace nền Next.js + Hono để tiếp tục phát triển với coding agent.

## Ưu tiên UI và UX

### CLI

- Prompt ngắn, lựa chọn rõ ràng và dễ hiểu trong terminal.
- Mặc định giữ nội dung hiện có; thay thế phải có phạm vi rõ ràng.
- Cho biết nội dung và phạm vi thay đổi trước khi người dùng xác nhận.
- Báo kết quả cụ thể, giúp người dùng biết bước tiếp theo cần làm.

### Landing page

- Giúp người dùng hiểu nhanh SaboKit làm gì và khi nào nên dùng.
- Giúp tìm đúng skill và sao chép lệnh bắt đầu nhanh chóng.
- Ưu tiên nội dung tiếng Việt; giữ nguyên tên lệnh và thuật ngữ kỹ thuật cần thiết.

## Giới hạn phạm vi

Tập trung vào phân phối skills và bootstrap workspace.
Cấu hình ứng dụng chuyên sâu được tiếp tục bằng skill sau khi người dùng duyệt.

## Quy tắc quyết định cho agent

- Khi phân vân, ưu tiên bảo toàn tùy chỉnh của project hơn ghi đè tiện lợi,
  vì người dùng đang làm việc trên project có nội dung cần giữ.
- Khi phân vân, ưu tiên quyền chọn từng skill hơn cài mọi thứ,
  vì mỗi project cần một tập công cụ phù hợp.
- Khi phân vân, ưu tiên hướng dẫn có bằng chứng và điểm duyệt rõ ràng hơn
  tự động hóa khó kiểm soát, vì người dùng cần hiểu và kiểm soát thay đổi.

## Thuật ngữ

- **Skill:** Bộ hướng dẫn cho coding agent thực hiện một loại công việc.
- **Preset:** Nhóm lựa chọn skills ban đầu mà người dùng có thể chỉnh lại.
- **Mirror:** Cài cùng tập skills đã chọn sang `.claude/skills` cho Claude Code.
