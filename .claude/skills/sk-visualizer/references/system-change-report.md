# Report visualization

Use this reference for any report: a system change report, audit, review, investigation, or status report. The reader gets the conclusion first, then the evidence behind it, then what to do.

## Sections

These sections guide the reading sequence. Follow the section rules in `SKILL.md` to adapt them to the content.

| # | Vietnamese | English | Presence | Contains |
|---|---|---|---|---|
| 1 | Tóm tắt | Summary | Core | The conclusion and the counts that matter, in two or three lines |
| 2 | Ngữ cảnh và phạm vi | Context and scope | Optional | What was examined, why, and what was left out |
| 3 | Chi tiết phát hiện | Findings | Core | Findings grouped by severity when the source gives one, otherwise by area; a table for repeated fields |
| 4 | Tác động | Impact | Optional | Who or what is affected and how |
| 5 | Đề xuất hành động | Recommended actions | Optional | Actions in priority order in `.steps`, with owner or due date when supplied |
| 6 | Checklist xác minh | Verification checklist | Optional | What must be or has been checked, in a `.checklist` |

The takeaway in the page header states the most important conclusion in one sentence.

## Source fidelity

Never invent a severity, status, owner, due date, evidence, or action. Use only the severity names the source provides, shown as `.pill` badges: `pill-risk` for the highest level, `pill-warn` for the middle, `pill-info` for the lowest, and `pill-good` for resolved. Put long logs and evidence in `<details class="more">`.
