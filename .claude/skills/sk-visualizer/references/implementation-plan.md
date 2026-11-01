# Implementation plan visualization

Use this reference for a delivery plan. The reader finishes knowing what will be delivered, in what order, and how completion is checked.

## Sections

These sections guide the reading sequence. Follow the section rules in `SKILL.md` to adapt them to the content.

| # | Vietnamese | English | Presence | Contains |
|---|---|---|---|---|
| 1 | Mục tiêu | Goal | Core | The intended delivery and its main outcome |
| 2 | Phạm vi | Scope | Optional | What the plan covers and leaves out |
| 3 | Các bước thực hiện | Steps | Core | Ordered tasks or phases in `.steps`, each with its output; a table when tasks share the same fields |
| 4 | Phụ thuộc và rủi ro | Dependencies and risks | Optional | Dependencies, blockers, and risks in a `callout-warn` or a short list |
| 5 | Checklist hoàn thành | Completion checklist | Optional | Definition of done in a `.checklist` |

The takeaway in the page header states what will be delivered in one sentence.

## Source fidelity

Never invent dates, durations, milestones, owners, statuses, dependencies, outputs, or completion states. When dates are absent, use the ordered steps without a timeline. Show owners and status only when the source provides them, using `.pill` for a provided status. Put long task detail in `<details class="more">`.
