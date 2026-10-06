# sb-kit

CLI cài đặt bộ agent skills được đóng gói sẵn vào project hiện tại. Skills luôn được cài vào `.agents/skills`; bạn có thể chọn cài thêm cho Claude Code vào `.claude/skills`. Skill đã tồn tại sẽ được giữ nguyên. Core kit gồm `$sk-excute` cho workflow inline-first có evidence và approval gates, `$sk-excute-fast` cho thay đổi nhỏ, cùng các role contracts hỗ trợ scout, researcher, reviewer và worker tùy chọn. Agent chính giữ ownership từ spec, plan/todo đến implementation và final review. Supporting skill `$sk-create-skill` phối hợp quy trình tạo/cải thiện skill SaboKit với các workflow được tham chiếu; installer không tự cài các companion skills.

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

CLI chỉ tạo base project có thể mở bằng coding agent. PostgreSQL, Drizzle, auth, same-origin proxy, module conventions và R2 tùy chọn được `$sk-start-next-hono` cấu hình ở bước sau, sau khi agent inspect source và bạn approve plan. Bootstrap cũng cài trọn bộ role contracts của `$sk-excute`; agent chính triển khai inline mặc định và chỉ dùng native sub-agents khi có nhu cầu cụ thể.

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

The installed sk-excute workflow is inline-first. The main agent owns the
spec, detailed plan/todos, implementation, integration, and final review.
Obtain approval for the reviewed spec, then the detailed plan, before edits.
Only native scout, researcher, worker, and reviewer roles may be dispatched.
Use scout/researcher only for concrete missing evidence within permissions;
review the whole spec once, and add plan/change review only for material risk
or user request. The worker is optional and receives authorized approved
tasks with exclusive file ownership. Review its changed files after handback.
If required independent review or an authorized worker is unavailable or
fails, disclose status and ask before fallback or takeover.
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

`$sk-excute` triển khai inline mặc định và chỉ cho phép native roles `scout`, `researcher`, `worker`, `reviewer` khi host hỗ trợ. Không bundled orchestrator, CLI delegation hay dependency riêng. Scout/researcher chỉ giải quyết câu hỏi còn thiếu; external research phải tuân thủ consent, offline và privacy policy. Nếu không có reviewer độc lập, agent phải xin bạn chấp thuận self-review fallback hoặc dừng. Worker không khả dụng hoặc thất bại phải báo status/partial changes và xin phép trước khi agent chính takeover; không đổi ownership âm thầm.

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

Package có **20 skills**, gồm **13 core** và **7 supporting**. Các supporting skills chỉ được cài khi bạn chọn, không tự cài trong `create next-hono`.

Từ **v3.0.0**, `herdr-orchestra` không còn được đóng gói hoặc hiển thị trong picker. Installer không xóa bản đã cài trong project; bạn có thể giữ bản hiện có nếu vẫn cần workflow này.

### SaboKit core

| Skill | Mục đích |
| --- | --- |
| `sk-excute` | Inline-first: agent chính viết spec, plan/todo, triển khai và review; một reviewer kiểm tra toàn spec, giữ hai approval gates và worker tùy chọn; không tự commit. |
| `sk-excute-fast` | Fast path cho task nhỏ: rapid brainstorm → micro-spec → approve → file-specific mini-plan → approve → triển khai inline và verify; tự escalate sang `sk-excute` khi scope/risk lớn. |
| `sk-excute-explorer` | Contract cho scout read-only, trả evidence về code/tài liệu local còn thiếu; tái sử dụng packet cho spec/plan, không bắt buộc scout lại. |
| `sk-excute-researcher` | Researcher trả citations cho câu hỏi public external cần thiết, tuân thủ consent/privacy và ưu tiên primary source đúng version. |
| `sk-excute-reviewer` | Review toàn spec theo block; review plan/changes có mục tiêu khi cần. Trả `Pass`, `Pass with non-blocking findings`, hoặc `Blocked`. |
| `sk-excute-implementer` | Contract cho worker tùy chọn: triển khai nhóm task đã duyệt, giữ exclusive file ownership rồi handback để agent chính review/integrate; không commit. |
| `sk-visualizer` | Biến prompt, spec, plan hoặc docs thành một HTML visualization dễ đọc. |
| `sk-release` | Chuẩn bị release: draft changelog, đề xuất SemVer, release summary và checklist; không tự commit/push/tag. |
| `sk-doc` | Sinh một Markdown document từ codebase, gồm README, API docs, changelog hoặc usage guide. |
| `sk-explain` | Giải thích source code, flow, state transition và các nhánh xử lý dựa trên file references. |
| `sk-create-slide` | Tạo HTML presentation từ ý tưởng hoặc chuyển đổi PPT/PPTX. |
| `sk-start-next-hono` | Hoàn thiện workspace Next.js + Hono đã bootstrap với Drizzle, auth, proxy và convention modular monolith. |
| `sk-verify-code-ui-only` | Audit UI-only read-only theo chuẩn repo về component reuse, typography và spacing; báo evidence locations, có thể dùng native sub-agents nếu host hỗ trợ và cho phép. |

Dùng `$sk-create-skill` khi muốn tạo hoặc cải thiện một SaboKit skill (ví dụ `$sk-create-skill Tạo skill kiểm tra migration scripts.`). Trước khi dùng, cài và tự chọn `$sk-excute` cùng các role skills phù hợp, và `skill-creator`; sb-kit không tự cài các companion này. Skill dừng nếu thiếu companion bắt buộc và không tự cài thay.

`$sk-excute` đi theo flow: agent chính điều tra phần cần thiết → tự viết spec có block IDs → một reviewer kiểm tra toàn spec → bạn approve spec → agent chính lập plan chi tiết và todo list → bạn approve plan → triển khai inline → agent chính review changes và báo evidence. Không bắt buộc scout lần hai, reviewer cho plan hay câu hỏi chọn mode. Plan chỉ cần independent review bổ sung khi có rủi ro API/schema, security, migration hoặc cross-subsystem mới chưa được spec review bao phủ; đổi scope/behavior phải duyệt lại spec.

Worker chỉ được dùng khi allocation đã được cho phép trong plan hoặc bạn chấp thuận sau đó. Giao một nhóm task liên quan cùng file scope, dependencies và acceptance criteria, không spawn theo từng todo hay gửi toàn lịch sử. Agent chính không sửa chồng file khi worker đang giữ ownership; sau handback, agent chính đọc files/diff và có thể sửa lỗi trong scope inline. Giữ nguyên tên packaged skills explorer/implementer để tương thích catalog; chúng là contract cho native scout/worker, không phải agent types bổ sung. Chỉ chạy verification được cho phép, công khai checks chưa chạy và không coi source review là runtime proof hoặc số đo tiết kiệm token.

Dùng `$sk-excute-fast` khi task chỉ có blast radius nhỏ (thường 1–3 files): workflow vẫn giữ hai approval gates nhưng thay explorer/reviewer độc lập bằng rapid scan, micro-spec và mini-plan 2–5 bước, rồi triển khai inline. Skill sẽ yêu cầu chuyển sang `$sk-excute` nếu phát hiện thay đổi cross-subsystem, public API/schema, security-sensitive, external research hoặc rủi ro contract đáng kể.

### Supporting skills

| Skill | Mục đích |
| --- | --- |
| `sk-landing-page` | Tạo landing page sản phẩm tại `landing/index.html` bằng Tailwind CSS CDN, chọn concept và font theo nội dung. |
| `frontend-design` | Hướng dẫn xây dựng giao diện frontend chất lượng production. |
| `vercel-react-best-practices` | Best practices về hiệu năng React và Next.js. |
| `vercel-react-native-skills` | Best practices cho React Native và Expo. |
| `deep-research` | Nghiên cứu chuyên sâu từ nhiều nguồn web, tổng hợp phát hiện và cung cấp báo cáo có trích dẫn. |
| `sk-create-skill` | Điều phối tạo, cải thiện, đổi tên rõ ràng hoặc tích hợp SaboKit skill theo workflow được tham chiếu; không chép lại quy trình approval/implementation. |
| `skill-creator` | Hướng dẫn tạo, cải thiện và đánh giá skill; companion được chọn riêng cho `sk-create-skill`. |

Chọn `sk-landing-page` trong nhóm `sk-work` khi chạy `sb-kit install`; skill này không tự cài trong luồng `create next-hono`. Ví dụ sử dụng:

```text
$sk-landing-page Tạo landing page cho sản phẩm trong repository này.
```

Skill tạo hoặc cập nhật duy nhất `<project-root>/landing/index.html`, tạo folder `landing` nếu chưa có. Trang dùng trực tiếp Tailwind CSS CDN, font theo concept và CSS/JS bổ sung inline; cần mạng để tải CDN, web font hoặc ảnh từ xa nếu có.

`sk-verify-code-ui-only` nằm trong nhóm `report` của `sb-kit install` và được cài trong `create next-hono` như một core skill. Skill mặc định trả báo cáo chat theo ngôn ngữ người dùng, chỉ tạo artifact khi được yêu cầu; audit source UI tĩnh, không mở rộng sang hooks/services/logic nghiệp vụ và không tự sửa code. Nếu host không hỗ trợ hoặc không cho phép native sub-agents, skill sẽ nói rõ và audit tuần tự.

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
