# sb-kit

CLI cài đặt bộ agent skills được đóng gói sẵn vào project hiện tại. Skills luôn được cài vào `.agents/skills`; bạn có thể chọn cài thêm cho Claude Code vào `.claude/skills`. Skill đã tồn tại sẽ được giữ nguyên. Core kit gồm `$sk-excute` cho workflow evidence-based đầy đủ, `$sk-excute-fast` cho thay đổi nhỏ có approval gates nhanh, cùng các role explorer, researcher, reviewer, implementer để điều tra, review, và triển khai có kiểm soát. Supporting skill `$sk-create-skill` phối hợp quy trình tạo/cải thiện skill SaboKit với các workflow được tham chiếu; installer không tự cài các companion skills.

## Prerequisites

- Node.js 20.12.0 trở lên với npm/npx.
- Một project đích có quyền tạo thư mục `.agents` (và `.claude` nếu chọn cài cho Claude Code).

## Installation

Chạy lệnh trong thư mục project cần sử dụng skills:

```bash
npx sb-kit install
```

Sau đó dùng checkbox để chọn từng skill, được chia thành ba category:

- **sk-work** — mọi skill không thuộc hai category dưới: hiện gồm `deep-research`, workflow/roles `sk-excute*`, `sk-create-skill`, `skill-creator`, `sk-landing-page`, `sk-release`, và `sk-start-next-hono`.
- **assets** — `frontend-design`, `vercel-react-best-practices`, và `vercel-react-native-skills`.
- **report** — `sk-create-slide`, `sk-visualizer`, `sk-doc`, `sk-explain`, và `sk-verify-code-ui-only`.

CLI bắt buộc chọn ít nhất một skill. Sau selection, chọn cách xử lý skill đã tồn tại:

1. **Install missing only** — mặc định; giữ folder skill hiện có và báo `Skipped`.
2. **Replace selected** — chỉ thay đúng các skill đã checkbox, báo `Replaced`; skill không chọn không bị ảnh hưởng.

Cancel ở picker hoặc conflict mode sẽ dừng trước khi tạo/copy skill folder. Cuối cùng dùng phím mũi tên và Enter để chọn có mirror cùng selection và conflict mode sang Claude Code không. **No** là lựa chọn mặc định.

## Pi config profiles (optional)

Repository này cũng có Pi package độc lập để lưu/export/import persisted Pi settings và inventory extensions an toàn:

```bash
pi install ./pi-config-profiles
```

Xem [pi-config-profiles/README.md](pi-config-profiles/README.md) để biết lệnh `/pi-profile`, merge/backup và phạm vi secret-safe. Package này không thay đổi luồng `sb-kit install`.

## Create Next + Hono workspace

Khởi tạo một pnpm workspace mới gồm Next.js App Router client, Node.js Hono server, root scripts, Prettier và bộ sb-kit core skills:

```bash
npx sb-kit create next-hono my-app
```

Thêm `--claude` để mirror cùng bộ core skills vào `.claude/skills`:

```bash
npx sb-kit create next-hono my-app --claude
```

CLI chỉ tạo base project có thể mở bằng coding agent. PostgreSQL, Drizzle, auth, same-origin proxy, module conventions và R2 tùy chọn được `$sk-start-next-hono` cấu hình ở bước sau, sau khi agent inspect source và bạn approve plan. Bootstrap cũng cài trọn bộ role của `$sk-excute` để workflow multi-agent portable sẵn sàng dùng.

Sau khi scaffold thành công, CLI in prompt sẵn để gửi cho agent:

```text
Use $sk-start-next-hono to finish setting up this existing pnpm workspace.

Inspect the generated Next.js client, Hono server, root workspace files,
AGENTS.md, and Git state first. Preserve the generated applications and
existing files.

Configure the project following the skill conventions:
- PostgreSQL with Drizzle migrations on the server;
- authentication with admin/user boundaries by default;
- same-origin /api/backend/* proxy for protected client requests;
- shared environment, API error, response, logging, and database utilities;
- client and server module boundaries documented by the skill;
- Cloudflare R2 only if I explicitly request it.

Before modifying files, present a concise file-scoped plan and wait for my
approval. Follow the repository AGENTS.md. Do not commit code. Do not run
build, test, lint, or verification commands unless I explicitly allow them.
```

## Usage

Hiển thị hướng dẫn:

```bash
npx sb-kit --help
```

Luồng cài đặt:

1. CLI đọc danh sách thư mục skill trong `.agents/skills` của package.
2. Bạn dùng checkbox để chọn từng skill dưới các group `sk-work`, `assets`, và `report`.
3. Bạn chọn **Install missing only** hoặc **Replace selected**; mode này chỉ tác động những skill đã chọn.
4. CLI cài selection vào `.agents/skills`, rồi bạn chọn **No** hoặc **Yes** ở prompt Claude Code. Khi chọn **Yes**, CLI áp dụng cùng selection và conflict mode từ source `.agents/skills` sang `.claude/skills`.

`$sk-excute` chỉ dùng native sub-agent dispatch khi host hỗ trợ. Không có runtime-specific orchestrator, CLI, hay dependency nào được bundled. Explorer/reviewer có thể được thực hiện inline và workflow sẽ công khai fallback; researcher chỉ được dispatch khi bạn yêu cầu external research rõ ràng. Nếu đã chọn mode triển khai Sub-agent nhưng host không dispatch được, agent phải hỏi bạn đổi sang Inline hoặc dừng, không được fallback âm thầm.

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

Package có **20 skills**, gồm **12 core** và **8 supporting**. Các supporting skills chỉ được cài khi bạn chọn, không tự cài trong `create next-hono`.

Từ **v3.0.0**, `herdr-orchestra` không còn được đóng gói hoặc hiển thị trong picker. Installer không xóa bản đã cài trong project; bạn có thể giữ bản hiện có nếu vẫn cần workflow này.

### SaboKit core

| Skill | Mục đích |
| --- | --- |
| `sk-excute` | Workflow evidence-based: explorer ở spec/plan, reviewer độc lập chặn blocker, approval gates, rồi chọn triển khai Inline hoặc Sub-agent; không tự commit. |
| `sk-excute-fast` | Fast path cho task nhỏ: rapid brainstorm → micro-spec → approve → file-specific mini-plan → approve → triển khai inline và verify; tự escalate sang `sk-excute` khi scope/risk lớn. |
| `sk-excute-explorer` | Điều tra codebase read-only: instructions, contracts, callers/consumers, tests, working tree và risks; trả evidence packet. |
| `sk-excute-researcher` | Nghiên cứu external có trích dẫn, chỉ khi người dùng yêu cầu rõ; ưu tiên primary source/version phù hợp. |
| `sk-excute-reviewer` | Review độc lập draft spec/plan và trả `Pass`, `Pass with non-blocking findings`, hoặc `Blocked`. |
| `sk-excute-implementer` | Triển khai plan đã duyệt trong delegated context, không commit/mở rộng scope và trả diff/verification evidence. |
| `sk-visualizer` | Biến prompt, spec, plan hoặc docs thành một HTML visualization dễ đọc. |
| `sk-release` | Chuẩn bị release: draft changelog, đề xuất SemVer, release summary và checklist; không tự commit/push/tag. |
| `sk-doc` | Sinh một Markdown document từ codebase, gồm README, API docs, changelog hoặc usage guide. |
| `sk-explain` | Giải thích source code, flow, state transition và các nhánh xử lý dựa trên file references. |
| `sk-create-slide` | Tạo HTML presentation từ ý tưởng hoặc chuyển đổi PPT/PPTX. |
| `sk-start-next-hono` | Hoàn thiện workspace Next.js + Hono đã bootstrap với Drizzle, auth, proxy và convention modular monolith. |

Dùng `$sk-create-skill` khi muốn tạo hoặc cải thiện một SaboKit skill (ví dụ `$sk-create-skill Tạo skill kiểm tra migration scripts.`). Trước khi dùng, cài và tự chọn `$sk-excute` cùng các role skills phù hợp, và `skill-creator`; sb-kit không tự cài các companion này. Skill dừng nếu thiếu companion bắt buộc và không tự cài thay.

`$sk-excute` luôn thu thập evidence explorer trước khi lên spec và rà lại mapping trước plan. Sau self-review, reviewer chỉ block lỗi nghiêm trọng/high risk; finding nhỏ được ghi nhận hoặc áp dụng khi phù hợp. Sau plan approval, chọn **Inline** để session hiện tại sửa code hoặc **Sub-agent** để implementer nhận toàn bộ plan; ở mode Sub-agent, session điều phối chỉ review và gửi findings trở lại implementer cho đến khi đạt plan hoặc gặp blocker cần người dùng quyết định.

Dùng `$sk-excute-fast` khi task chỉ có blast radius nhỏ (thường 1–3 files): workflow vẫn giữ hai approval gates nhưng thay explorer/reviewer độc lập bằng rapid scan, micro-spec và mini-plan 2–5 bước, rồi triển khai inline. Skill sẽ yêu cầu chuyển sang `$sk-excute` nếu phát hiện thay đổi cross-subsystem, public API/schema, security-sensitive, external research hoặc rủi ro contract đáng kể.

### Supporting skills

| Skill | Mục đích |
| --- | --- |
| `sk-landing-page` | Tạo landing page sản phẩm tại `landing/index.html` bằng Tailwind CSS CDN, chọn concept và font theo nội dung. |
| `frontend-design` | Hướng dẫn xây dựng giao diện frontend chất lượng production. |
| `vercel-react-best-practices` | Best practices về hiệu năng React và Next.js. |
| `vercel-react-native-skills` | Best practices cho React Native và Expo. |
| `deep-research` | Nghiên cứu chuyên sâu từ nhiều nguồn web, tổng hợp phát hiện và cung cấp báo cáo có trích dẫn. |
| `sk-verify-code-ui-only` | Audit UI-only read-only theo chuẩn repo về component reuse, typography và spacing; báo evidence locations, có thể dùng native sub-agents nếu host hỗ trợ và cho phép. |
| `sk-create-skill` | Điều phối tạo, cải thiện, đổi tên rõ ràng hoặc tích hợp SaboKit skill theo workflow được tham chiếu; không chép lại quy trình approval/implementation. |
| `skill-creator` | Hướng dẫn tạo, cải thiện và đánh giá skill; companion được chọn riêng cho `sk-create-skill`. |

Chọn `sk-landing-page` trong nhóm `sk-work` khi chạy `sb-kit install`; skill này không tự cài trong luồng `create next-hono`. Ví dụ sử dụng:

```text
$sk-landing-page Tạo landing page cho sản phẩm trong repository này.
```

Skill tạo hoặc cập nhật duy nhất `<project-root>/landing/index.html`, tạo folder `landing` nếu chưa có. Trang dùng trực tiếp Tailwind CSS CDN, font theo concept và CSS/JS bổ sung inline; cần mạng để tải CDN, web font hoặc ảnh từ xa nếu có.

`sk-verify-code-ui-only` nằm trong nhóm `report` của `sb-kit install`, không tự cài trong `create next-hono`. Skill mặc định trả báo cáo chat theo ngôn ngữ người dùng, chỉ tạo artifact khi được yêu cầu; audit source UI tĩnh, không mở rộng sang hooks/services/logic nghiệp vụ và không tự sửa code. Nếu host không hỗ trợ hoặc không cho phép native sub-agents, skill sẽ nói rõ và audit tuần tự.

Ví dụ:

```text
$sk-verify-code-ui-only Scan UI trong src/pages và src/components.
Kiểm tra component reuse, typography và padding-x/y theo chuẩn repo.
Tổng hợp file:line, bằng chứng và hướng thay thế; không sửa code.
Có thể chia pages/sections cho native sub-agents nếu host hỗ trợ.
```

## CLI reference

### `sb-kit install`

Mở checkbox picker theo category và cài các skill được chọn vào project hiện tại.

- Input: checkbox từng skill trong `sk-work`, `assets`, `report`; chọn conflict mode; rồi chọn cài cho Claude Code hay không.
- Output: danh sách skills `Added`, `Replaced`, hoặc `Skipped` cho `.agents`; có thêm output `.claude` khi chọn **Yes**.
- Conflict mode mặc định **Install missing only** không ghi đè folder skill có sẵn. **Replace selected** chỉ thay folder của skill đã checkbox.
- Error: lệnh dừng nếu không chọn skill, cancel prompt, hoặc một skill đã chọn không tồn tại trong `.agents/skills` của package.

### `sb-kit --help`

In hướng dẫn sử dụng ngắn gọn. `-h` là alias của lệnh này.

### `sb-kit create next-hono <project-name> [--claude]`

Tạo base pnpm workspace bằng official Next.js và Hono generators, chuẩn hóa root tooling, cài toàn bộ sb-kit core skills (bao gồm các role `$sk-excute-*`) vào `.agents/skills`, chạy format và in prompt bàn giao cho `$sk-start-next-hono`.

- Mặc định chỉ cài `.agents/skills`.
- `--claude` mirror core skills vào `.claude/skills`.
- Target phải mới hoặc rỗng; CLI không ghi đè project đã có source.
- Generator lỗi ở stage nào thì CLI dừng ở đó và giữ partial state để kiểm tra.

## Configuration

Không cần file cấu hình hoặc environment variable. `install` sử dụng project hiện tại làm thư mục đích; `create next-hono` nhận target từ `<project-name>`.

## Examples

Cài toàn bộ skills vào project hiện tại:

```bash
npx sb-kit install
```

Khi checkbox picker hiển thị, dùng phím mũi tên và Space để tick từng skill trong category phù hợp, rồi nhấn Enter. Chọn **Install missing only** để giữ skill hiện có, hoặc **Replace selected** khi muốn đồng bộ lại đúng các skill đã tick.

Tại prompt `Install for Claude Code too?`, giữ **No** và nhấn Enter để chỉ cài `.agents/skills`, hoặc chọn **Yes** để cài thêm `.claude/skills` với cùng selection/mode.

Khởi tạo base Next.js + Hono project:

```bash
npx sb-kit create next-hono my-app
```

Sau đó mở `my-app` bằng coding agent và gửi prompt mà CLI in ra để gọi `$sk-start-next-hono`.

## License

ISC
