# Technical doc visualization

Use this reference for a page that teaches a concept, pattern, or technology. The reader finishes understanding what problem it solves, how it works, how to apply it, and where it goes wrong.

## Sections

These sections guide the reading sequence. Follow the section rules in `SKILL.md` to adapt them to the content.

| # | Vietnamese | English | Presence | Contains |
|---|---|---|---|---|
| 1 | Vấn đề | Problem | Core | What goes wrong without this, and why it matters |
| 2 | Cách hoạt động | How it works | Core | The mechanism, with a diagram or steps when the flow is hard to follow in prose |
| 3 | Triển khai | Implementation | Optional | How to apply it, with short code; long code goes in `<details class="more">` |
| 4 | Cạm bẫy | Pitfalls | Optional | The pitfalls that matter most and how to handle them, in one table |
| 5 | Khuyến nghị | Recommendations | Optional | When to use it, when not to, and the alternatives; a comparison of alternatives goes here, as `.options` or a table |
| 6 | Checklist | Checklist | Optional | What to confirm before relying on it |
| 7 | Nguồn tham khảo | References | Optional | Links to the pages consulted; present whenever the page used the web |

The takeaway in the page header states the core idea and its main tradeoff in one sentence.

A comparison of alternatives belongs in Recommendations. If Pitfalls and a comparison both use tables, separate them with an `<h3>` subheading.

## Sources

Follow the Sources section of `SKILL.md`. A document the user provides sets the page's scope, so stay close to it. When a code sample comes from the web, state the version it targets.
