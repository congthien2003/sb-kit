---
name: sk-app-context
description: Create or update a short PRODUCT.md that records who an existing app is for, who uses it, their main tasks, and the UI/UX priorities, so agents stay on-topic and decide in favor of the real users. Use in English or Vietnamese, for example "init app context", "define who this app is for", "tạo file mô tả đối tượng người dùng", "app này dành cho ai", "định nghĩa lại bối cảnh ứng dụng". Do not use to turn a new idea into project docs (use sk-idea-to-docs) or to document code or APIs (use sk-doc). It does not implement, commit or run tests.
---

# App context

Write one short file, `PRODUCT.md`, that tells an agent who the app serves and what they do with it. The point is steering: when an agent must choose between two valid designs, the file says which one fits the users. The skill is self-contained and depends on no other skill.

## Rules

- Read root and applicable nested `AGENTS.md` files. Write the file in the user's language.
- Infer from the repository first (README, `package.json` or other manifest, routes, pages, key components, existing docs). Never ask for something the repository or the conversation already answers.
- Label every statement as **Confirmed** (user said it) or **Assumption** (inferred). Show the labeled draft to the user before writing. Remove the labels from the written file once the user confirms or corrects each item.
- Ask one short question at a time, only about points that change who the users are or how the UI should be prioritized. Offer a recommended answer with each question.
- Do not invent users, tasks, or metrics. Omit a section instead of filling it with guesses.
- Do not overwrite an existing `PRODUCT.md`. Show the proposed changes and wait for explicit confirmation before writing.
- Do not edit `AGENTS.md` or `CLAUDE.md` unless the user agrees. After writing, offer to add one line there that points to `PRODUCT.md`, because agents only auto-load those files.
- Do not commit, scaffold, change application code, or run build, test, or lint commands.

## Workflow

1. **Survey.** Read the sources above, bounded to what shows the product's purpose, screens, and users. Skip generated files and dependencies.
2. **Draft.** Load `templates/product.md` and fill the sections it lists from the evidence, labeling each item.
3. **Confirm.** Present the labeled draft and ask the open questions one at a time. Typical ones: who uses it daily, how technical they are, on which device, what they must finish fastest, what the app must not become.
4. **Write.** Create `PRODUCT.md` at the project root (or update it after confirmation). Keep it to roughly 40-80 lines so agents actually read it.
5. **Offer the pointer.** Propose the one-line reference for `AGENTS.md` or `CLAUDE.md` and apply it only on approval.

## Writing the decision rules

The decision rules are the most useful part. Write them as "when unsure, prefer X over Y" tied to this app's users, for example an internal tool preferring dense tables, plain inputs, and readable detail modals over decoration. Each rule should be something an agent can apply to a concrete UI or scope choice.

## Hand-off

Report the file written or proposed, which items remain assumptions, and whether the pointer line was added. State that nothing was committed and no commands were run.
