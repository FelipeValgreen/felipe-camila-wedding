# 09 — Performance Baseline

Status: **Pending Antigravity audit**

## Test environments

Test the current site and later staging in:

- iPhone Safari;
- Android Chrome;
- desktop Chrome or Safari;
- slow mobile network simulation;
- reduced-motion mode;
- keyboard-only navigation;
- real production-like data.

## Metrics

Record:

- Lighthouse mobile and desktop scores;
- LCP, INP and CLS;
- total transfer size;
- image transfer size;
- JavaScript and CSS size;
- font families, weights and requests;
- audio and video payloads;
- blocking third-party requests;
- console errors;
- layout shifts and broken states.

| Metric | Mobile | Desktop | Target | Risk | Priority |
|---|---:|---:|---:|---:|---:|
| Pending | Pending | Pending | Pending | Pending | Pending |

## Accessibility baseline

Audit:

- WCAG AA contrast;
- readable body size and weight;
- semantic headings;
- labels and error messages;
- focus visibility;
- keyboard traps;
- motion reduction;
- audio control;
- alt text;
- screen-reader flow;
- fixed CTAs covering content.

## Acceptance principle

Immersion is not an excuse for poor mobile performance, inaccessible motion or blocked content. Every visual signature must have a performant and accessible fallback.
