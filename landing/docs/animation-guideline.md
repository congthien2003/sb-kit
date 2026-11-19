# Motion Guidelines

Keep motion optional, brief, and subordinate to content. The starter uses CSS transitions for interaction feedback and Lenis for root smooth scrolling; Lenis respects reduced motion by disabling smoothing and making programmatic scrolls instant.

## Defaults

- Do not animate content merely because it enters the viewport.
- Prefer color, opacity, and transform transitions for hover and focus feedback.
- Avoid autoplaying ambient motion, long page transitions, and scroll hijacking.
- Never make motion necessary to understand content or complete an action.
- Preserve visible focus and keyboard behavior while elements transition.

## Reduced motion

All nonessential motion must be removed when the user requests reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

The global stylesheet provides this baseline. Components that introduce additional motion must preserve the same behavior and be checked with reduced-motion emulation.

## Verification

For each new interaction, verify keyboard activation, focus visibility, and the reduced-motion state at mobile and desktop widths. Add an animation dependency only when a specific interaction cannot be implemented clearly with CSS and the dependency is justified by the resulting UI.
