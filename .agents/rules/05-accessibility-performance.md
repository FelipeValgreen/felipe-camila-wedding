# Accessibility and Performance

## Minimum environments

No feature is complete until tested in:

- iPhone Safari;
- Android Chrome;
- desktop browser;
- slow mobile network;
- reduced-motion mode;
- keyboard-only navigation;
- real or production-like data.

## Accessibility requirements

- Target WCAG AA contrast.
- Use readable body sizes and weights.
- Preserve semantic heading order.
- Provide labels, instructions and useful validation errors.
- Keep focus visible and predictable.
- Avoid keyboard traps.
- Provide `prefers-reduced-motion` behavior.
- Provide accessible audio play / pause controls.
- Do not allow fixed CTAs to cover content.

## Performance requirements

- Optimize and size images responsively.
- Avoid unnecessary font families and weights.
- Avoid heavy WebGL or video when an editorial motion solution can achieve the same effect.
- Use progressive loading and stable layout dimensions.
- Do not block core event information or RSVP behind long animations.
- Every immersive feature needs a performant static fallback.

Document measured baselines and acceptance thresholds before implementation.
