# Spec visualization

Use this reference when a specification must become easier to read than its source Markdown. The reader finishes knowing what will be built, what will not, and how it will be accepted.

## Sections

These sections guide the reading sequence. Follow the section rules in `SKILL.md` to adapt them to the content.

| # | Vietnamese | English | Presence | Contains |
|---|---|---|---|---|
| 1 | Ngữ cảnh | Context | Core | The problem and the single intended outcome |
| 2 | Phạm vi | Scope | Optional | What is in scope and what is explicitly out of scope, as two `.option` cards (in, out) |
| 3 | Chi tiết yêu cầu | Requirements | Core | Requirements in a compact hierarchy; a table for repeated fields; a Mermaid diagram when a flow or sequence is hard to follow in prose |
| 4 | Quyết định và giả định | Decisions and assumptions | Optional | Consequential decisions in a `callout-info`, assumptions as a short list |
| 5 | Tiêu chí nghiệm thu | Acceptance criteria | Optional | Test cases or criteria in a `.checklist` or a table |

The takeaway in the page header states the intended outcome in one sentence.

## Source fidelity

Condense and structure source prose instead of reproducing the Markdown. Never invent requirements, flows, decisions, non-goals, or acceptance criteria. Keep long supporting material in `<details class="more">`.
