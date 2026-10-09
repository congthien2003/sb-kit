# sb-kit

CLI cài đặt bộ agent skills được đóng gói sẵn vào project hiện tại. Skills luôn được cài vào `.agents/skills`; bạn có thể chọn cài thêm cho Claude Code vào `.claude/skills`. Skill đã tồn tại sẽ được giữ nguyên. Core kit gồm `$sk-excute` cho workflow inline-first có evidence và approval gates, cùng các role contracts hỗ trợ scout, researcher, reviewer và worker tùy chọn. Agent chính giữ ownership từ spec, plan/todo đến implementation và final review. Supporting skill `$sk-create-skill` phối hợp quy trình tạo/cải thiện skill SaboKit với các workflow được tham chiếu; installer không tự cài các companion skills.

## Prerequisites

- Node.js 20.12.0 trở lên với npm/npx.
- Một project đích có quyền tạo thư mục `.agents` (và `.claude` nếu chọn cài cho Claude Code).

## Installation

Chạy lệnh trong thư mục project cần sử dụng skills:

```bash
npx sb-kit install
```

Chọn **Manual** (mặc định), **Minimal**, **Full-stack**, **UI**, hoặc **Reporting**. Preset chỉ preselect checkbox; bạn có thể chỉnh lại trước khi xác nhận.

- Minimal: `sk-excute`, reviewer, `sk-explain`, `sk-debug`, `sk-review-diff`.
- Full-stack: toàn bộ core, `vercel-react-best-practices`, `sk-debug`.
- UI: `sk-excute`, reviewer, frontend design, React practices, landing page, UI audit và `sk-review-diff`.
- Reporting: report registry.

Sau đó dùng checkbox để chọn từng skill, được chia thành ba category:

- **sk-work** — mọi skill không thuộc hai category dưới: hiện gồm `sk-debug`, `deep-research`, workflow/roles `sk-excute*`, `sk-landing-page`, `sk-release`, `sk-start-next-hono`, `sk-review-diff`, và `sk-verify-code-ui-only`.
- **assets** — `frontend-design`, `vercel-react-best-practices`, và `vercel-react-native-skills`.
- **report** — `sk-create-slide`, `sk-visualizer`, `sk-doc`, và `sk-explain`.

CLI bắt buộc chọn ít nhất một skill. Khi chọn `$sk-excute`, installer tự thêm đủ bốn role skills `sk-excute-explorer`, `sk-excute-researcher`, `sk-excute-reviewer`, và `sk-excute-implementer` vào selection. Bản đã có được giữ nguyên trong **Install missing only**; các role được chọn vẫn được mirror nếu bạn chọn cài cho Claude Code. Required companions còn thiếu được đề nghị riêng; chỉ thêm sau khi bạn xác nhận **Yes** (mặc định **No**). Decline giữ selection và cảnh báo chức năng thiếu; cancel dừng trước copy. Sau selection, chọn cách xử lý skill đã tồn tại:

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
2. Bạn chọn preset rồi chỉnh checkbox từng skill dưới các group `sk-work`, `assets`, và `report`.
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

Catalog chính thức có **19 skills**, gồm **13 core** và **6 supporting**. Các supporting skills chỉ được cài khi bạn chọn, không tự cài trong `create next-hono`.

Từ **v3.0.0**, `herdr-orchestra` không còn được đóng gói hoặc hiển thị trong picker. Installer không xóa bản đã cài trong project; bạn có thể giữ bản hiện có nếu vẫn cần workflow này.

### SaboKit core

| Skill | Mục đích |
| --- | --- |
| `sk-excute` | Inline-first: agent chính viết spec, plan/todo, triển khai và review; một reviewer kiểm tra toàn spec, giữ hai approval gates và worker tùy chọn; không tự commit. |
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
| `sk-review-diff` | Review diff được chọn, findings có severity/location/evidence; phân biệt regression với pre-existing issues, không tự patch/verify. |

`sk-create-skill` và `skill-creator` chỉ được giữ trong checkout của repository để phục vụ tác vụ nội bộ; chúng không thuộc catalog, picker hay npm package của sb-kit. Không dùng `sb-kit install` để phân phối hoặc cài hai skill này.

`$sk-excute` đi theo flow: agent chính điều tra phần cần thiết → tự viết spec có block IDs → một reviewer kiểm tra toàn spec → bạn approve spec → agent chính lập plan chi tiết và todo list → bạn approve plan → triển khai inline → agent chính review changes và báo evidence. Không bắt buộc scout lần hai, reviewer cho plan hay câu hỏi chọn mode. Plan chỉ cần independent review bổ sung khi có rủi ro API/schema, security, migration hoặc cross-subsystem mới chưa được spec review bao phủ; đổi scope/behavior phải duyệt lại spec.

Worker chỉ được dùng khi allocation đã được cho phép trong plan hoặc bạn chấp thuận sau đó. Giao một nhóm task liên quan cùng file scope, dependencies và acceptance criteria, không spawn theo từng todo hay gửi toàn lịch sử. Agent chính không sửa chồng file khi worker đang giữ ownership; sau handback, agent chính đọc files/diff và có thể sửa lỗi trong scope inline. Giữ nguyên tên packaged skills explorer/implementer để tương thích catalog; chúng là contract cho native scout/worker, không phải agent types bổ sung. Chỉ chạy verification được cho phép, công khai checks chưa chạy và không coi source review là runtime proof hoặc số đo tiết kiệm token.

Ví dụ skills mới: `$sk-debug Tìm nguyên nhân lỗi API, chỉ đọc source, không chạy lệnh.` và `$sk-review-diff Review staged diff, không sửa hoặc verify.` Cả hai mặc định trả report trong chat; muốn patch phải dùng `$sk-excute` và duyệt spec/plan.

`sk-excute-fast` không còn được đóng gói. Dùng `$sk-excute` cho cả task nhỏ và lớn; installer không xóa bản fast đã cài trong project.

### Supporting skills

| Skill | Mục đích |
| --- | --- |
| `sk-debug` | Chẩn đoán lỗi/log, trace caller–consumer và xếp hạng giả thuyết có evidence; read-only mặc định, không tự patch/reproduce. |
| `sk-landing-page` | Tạo landing page sản phẩm tại `landing/index.html` bằng Tailwind CSS CDN, chọn concept và font theo nội dung. |
| `frontend-design` | Hướng dẫn xây dựng giao diện frontend chất lượng production. |
| `vercel-react-best-practices` | Best practices về hiệu năng React và Next.js. |
| `vercel-react-native-skills` | Best practices cho React Native và Expo. |
| `deep-research` | Nghiên cứu chuyên sâu từ nhiều nguồn web, tổng hợp phát hiện và cung cấp báo cáo có trích dẫn. |

Chọn `sk-landing-page` trong nhóm `sk-work` khi chạy `sb-kit install`; skill này không tự cài trong luồng `create next-hono`. Ví dụ sử dụng:

```text
$sk-landing-page Tạo landing page cho sản phẩm trong repository này.
```

Skill tạo hoặc cập nhật duy nhất `<project-root>/landing/index.html`, tạo folder `landing` nếu chưa có. Trang dùng trực tiếp Tailwind CSS CDN, font theo concept và CSS/JS bổ sung inline; cần mạng để tải CDN, web font hoặc ảnh từ xa nếu có.

`sk-verify-code-ui-only` là core skill, nằm trong nhóm `sk-work` của `sb-kit install` và được cài trong `create next-hono`. Skill mặc định trả báo cáo chat theo ngôn ngữ người dùng, chỉ tạo artifact khi được yêu cầu; audit source UI tĩnh, không mở rộng sang hooks/services/logic nghiệp vụ và không tự sửa code. Nếu host không hỗ trợ hoặc không cho phép native sub-agents, skill sẽ nói rõ và audit tuần tự.

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

- Input: preset, editable checkbox trong `sk-work`, `assets`, `report`, xác nhận companion nếu cần; chọn conflict mode; rồi chọn cài cho Claude Code hay không.
- Output: danh sách skills `Added`, `Replaced`, hoặc `Skipped` cho `.agents`; có thêm output `.claude` khi chọn **Yes**.
- Conflict mode mặc định **Install missing only** không ghi đè folder skill có sẵn. **Replace selected** chỉ thay folder của skill đã checkbox.
- Error: lệnh dừng nếu không chọn skill, cancel prompt, hoặc một skill đã chọn không tồn tại trong `.agents/skills` của package.

### `sb-kit doctor [--json]`

Inspect `.agents/skills` và `.claude/skills` offline, chỉ đọc, không chạy code trong skill và không tạo/repair metadata. `--json` trả schema version 1, `skills`, `findings` và `exitCode`; text dùng cùng findings.

- `unchanged`, `local-modified`, `upstream-changed`, `both-changed`: so hash local/package với install baseline.
- `untracked-identical`: legacy khớp source nhưng chưa có receipt; `unknown`: legacy khác source, không kết luận nguồn thay đổi.
- `unmanaged`: skill ngoài package, gồm bản fast cũ; không xóa hay update.
- Companion thiếu và mirror cùng tên khác nội dung được báo riêng. Không có `.claude` không phải lỗi; role reviewer còn phụ thuộc host và explicit fallback consent.
- Exit `0`: clean/info; `1`: cần chú ý; `2`: lỗi metadata/path/read hoặc mutation đang pending.

### `sb-kit update`

Update interactive, **offline** từ package sb-kit đang chạy; không fetch npm/GitHub. Nếu cần source mới, bạn tự chọn phiên bản CLI trước. Chọn roots (`.agents` mặc định, Claude/both phải opt-in), rồi chọn skill đã cài và còn trong package.

CLI preview file added/removed/changed và excerpts giới hạn; binary, file lớn hoặc nội dung sensitive-like chỉ có summary. Redaction heuristic không bảo đảm phát hiện mọi secret. Bản Unknown/local-modified cần overwrite consent bổ sung, sau đó final confirmation mặc định **No**. Cancel trước apply không tạo metadata, lock hay backup. Bản giống source được Skipped, không reseed receipt.

Trước replace, CLI lưu đầy đủ originals và prior receipt state tại `.sb-kit/backups/<operation-id>/<root>/<skill>/`, gồm `original/`, `before-state.json` và `recovery.md`. Backups được giữ cả khi thành công; không auto-prune hay auto-restore. Swap/recheck/rollback theo từng target, **không atomic toàn selection**: nếu target sau lỗi, target trước đã thành công vẫn giữ và được báo rõ.

Update dùng **strict durability**: file bytes, directory entries của backups/staging, journal và receipts phải qua `fsync` barriers trước destructive swap/commit. CLI preflight directory barriers trên project và các roots đã chọn; nếu Node/platform/filesystem không hỗ trợ open/flush directory thì dừng trước overwrite, không tự fallback sang bảo đảm yếu hơn. Lỗi flush về sau kích hoạt rollback hoặc manual recovery. Đây là yêu cầu đối với filesystem thực sự thực thi `fsync`, không phải bảo đảm về hardware bỏ qua flush. `install` không bị áp strict-update gate này.

Báo cáo lỗi liệt kê Completed, Failed, Skipped và Unattempted, kèm recovery status cấp operation (kể cả lỗi finalize không gắn với target) và backups giữ lại. Nếu rollback không hoàn tất hoặc journal/lock pending, doctor báo lỗi và mutation bị chặn. Dừng active writers, đọc `.sb-kit/operation.json` và `recovery.md`; kiểm tra backup trước khi restore toàn folder cùng receipt tương ứng. Chỉ clear journal/lock thủ công sau khi trạng thái consistent. Không copy receipt snapshot của target cũ đè lên receipts của các target thành công sau đó.

Safe-update backups không áp dụng hồi tố cho `install → Replace selected` cũ. Skill ngoài package, bao gồm fast legacy, không bị update hoặc xóa.

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

Khi thực sự cài/thay skill, CLI ghi `.sb-kit/state.json` với package version lúc cài và SHA256 raw bytes theo từng root/skill. `Skipped` không cập nhật baseline; skill legacy chưa có receipt vẫn là Unknown. Đây không phải per-skill SemVer và không thay `skills-lock.json`. Metadata hỏng hoặc mutation chưa hoàn thành sẽ chặn thay đổi tiếp theo; xem `.sb-kit/operation.json` và recovery paths trước khi retry.

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
