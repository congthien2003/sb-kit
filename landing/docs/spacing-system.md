# Landing Page Spacing System

Use a discrete mobile/desktop spacing scale in Tailwind. These tokens switch at the `md` breakpoint; they do not use `clamp()`.

## Tokens

| Token              | Desktop | Mobile | Use                                                           |
| ------------------ | ------: | -----: | ------------------------------------------------------------- |
| `section-y`        | `120px` | `40px` | Vertical separation between major sections.                   |
| `section-x`        |  `80px` | `20px` | Horizontal section padding when not using `custom-container`. |
| `heading-gap`      |  `12px` |  `6px` | Spacing inside a section heading group.                       |
| `heading-to-tab`   |  `40px` | `20px` | Gap between a heading and filter/navigation controls.         |
| `heading-to-block` |  `80px` | `40px` | Gap between a heading and its main content.                   |
| `block-x`          |  `40px` | `20px` | Horizontal gaps between cards or peer blocks.                 |
| `block-y`          |  `40px` | `20px` | Vertical gaps between rows of content.                        |

`custom-container` provides a centered max-width and responsive horizontal padding. Prefer it for page sections; apply the section spacing to the section wrapper.

## Usage

```tsx
<section className="py-mobile-section-y md:py-section-y">
  <div className="custom-container">
    <h2>Section heading</h2>
    <div className="mt-mobile-heading-to-block md:mt-heading-to-block grid gap-x-block-x gap-y-block-y">
      {/* Section content */}
    </div>
  </div>
</section>
```
