# sb-kit

CLI cài đặt bộ agent skills được đóng gói sẵn vào project hiện tại. Skills luôn được cài vào `.agents/skills`; bạn có thể chọn cài thêm cho Claude Code vào `.claude/skills`. Skill đã tồn tại sẽ được giữ nguyên.

## Prerequisites

- Node.js 20.12.0 trở lên với npm/npx.
- Một project đích có quyền tạo thư mục `.agents` (và `.claude` nếu chọn cài cho Claude Code).

## Installation

Chạy lệnh trong thư mục project cần sử dụng skills:

```bash
npx sb-kit install
```

Sau đó dùng phím mũi tên và Enter để chọn một nhóm:

1. **All** — cài toàn bộ skills có trong package.
2. **sb-kit only** — cài các skill core của sb-kit.
3. **Other skills only** — cài các skill còn lại.

Tiếp theo dùng phím mũi tên và Enter để chọn có cài thêm cho Claude Code không. **No** là lựa chọn mặc định.

Nếu một skill đã có ở thư mục đích, CLI giữ nguyên skill đó và báo `Skipped` thay vì ghi đè.

## Usage

Hiển thị hướng dẫn:

```bash
npx sb-kit --help
```

Luồng cài đặt:

1. CLI đọc danh sách thư mục skill trong `.agents/skills` của package.
2. Bạn dùng radio prompt để chọn nhóm skill trên terminal.
3. CLI sao chép những skill chưa có vào `.agents/skills` của project; skill có sẵn được bỏ qua.
4. Bạn chọn **No** hoặc **Yes** ở radio prompt Claude Code. Khi chọn **Yes**, CLI sao chép cùng skills từ source `.agents/skills` sang `.claude/skills`.

Ví dụ cấu trúc sau khi dùng lựa chọn mặc định **No**:

```text
your-project/
├── .agents/
│   └── skills/
│       ├── sk-excute/
│       └── sk-visualizer/
```

Chọn **Yes** sẽ tạo thêm `.claude/skills` với cùng các skill đã chọn.

## Skill catalog

### SaboKit core

| Skill | Mục đích |
| --- | --- |
| `sk-excute` | Chuyển yêu cầu triển khai thành spec và plan, chờ approval trước khi sửa code. |
| `sk-visualizer` | Biến prompt, spec, plan hoặc docs thành một HTML visualization dễ đọc. |
| `sk-release` | Chuẩn bị release: draft changelog, đề xuất SemVer, release summary và checklist; không tự commit/push/tag. |
| `sk-doc` | Sinh một Markdown document từ codebase, gồm README, API docs, changelog hoặc usage guide. |
| `sk-create-slide` | Tạo HTML presentation từ ý tưởng hoặc chuyển đổi PPT/PPTX. |

### Supporting skills

| Skill | Mục đích |
| --- | --- |
| `frontend-design` | Hướng dẫn xây dựng giao diện frontend chất lượng production. |
| `vercel-react-best-practices` | Best practices về hiệu năng React và Next.js. |
| `vercel-react-native-skills` | Best practices cho React Native và Expo. |

## CLI reference

### `sb-kit install`

Mở lựa chọn nhóm skills và cài các skill được chọn vào project hiện tại.

- Input: radio chọn nhóm skill, rồi radio chọn cài cho Claude Code hay không.
- Output: danh sách skills `Added` và `Skipped` cho `.agents`; có thêm output `.claude` khi chọn **Yes**.
- Error: lệnh dừng nếu một skill đã chọn không tồn tại trong `.agents/skills` của package.

### `sb-kit --help`

In hướng dẫn sử dụng ngắn gọn. `-h` là alias của lệnh này.

## Configuration

Không cần file cấu hình hoặc environment variable. CLI sử dụng project hiện tại làm thư mục đích.

## Examples

Cài toàn bộ skills vào project hiện tại:

```bash
npx sb-kit install
```

Khi prompt hiển thị, giữ **All** và nhấn Enter để chọn toàn bộ skills.

Tại prompt `Install for Claude Code too?`, giữ **No** và nhấn Enter để chỉ cài `.agents/skills`, hoặc chọn **Yes** để cài thêm `.claude/skills`.

Để chỉ cài bộ core, dùng phím mũi tên xuống một lần để chọn **sb-kit only**, rồi nhấn Enter.

## License

ISC
