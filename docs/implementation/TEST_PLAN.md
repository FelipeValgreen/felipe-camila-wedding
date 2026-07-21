# Test Plan

This document establishes the validation strategy, testing environments, and test checklist to ensure compliance with the Definition of Done (DoD).

## 1. Test Environments & Devices

Every feature must pass visual and functional QA in:
- **iOS Safari:** iPhone (Physical device or XCode Simulator).
- **Android Chrome:** Android (Physical device or Android Studio Emulator).
- **Desktop Chrome / Safari:** Modern desktop browsers.
- **Slow Mobile Simulation:** Chrome DevTools network throttling (Fast 3G / Slow 3G settings).
- **Reduced Motion Simulation:** Browser setting `prefers-reduced-motion: reduce`.
- **Keyboard-only Mode:** Tab navigation, focus visible state, and escape key modal closings.

---

## 2. Functional Test Matrix

### A. Individual RSVP Form
- **Test Case RSVP-01 (Happy Path):** Enter valid code (`FAM2026`). Verify name auto-populates. Submit RSVP with attending `true`. Verify record is saved in Supabase database and WhatsApp opens with prefilled Chilean Spanish copy. **Verify no passes text or counts are rendered.**
- **Test Case RSVP-02 (Offline/Failure):** Disable internet connection and submit form. Verify that:
  - Redirection to WhatsApp is blocked.
  - A friendly error message is displayed: *"Lo sentimos, no pudimos conectar con el servidor. Tu confirmación no ha sido guardada. Por favor, reintenta."*
  - Form states and inputs are preserved.
- **Test Case RSVP-03 (Token/Auth Validation):** Attempt to query `/api/rsvp` directly with an invalid code. Verify database returns a 404/Empty collection and doesn't leak other guest rows.

### B. Living Gallery & Photo Upload
- **Test Case GAL-01 (Responsive Rendering):** Verify that the home gallery renders Masonry column count (1 column on mobile, 3 columns on wide desktop).
- **Test Case GAL-02 (Upload Constraints):** Drag an invalid file format (e.g. `.txt`) or an oversized file (>10MB). Verify client blocks upload and alerts user: *"El archivo supera el tamaño máximo de 10MB o no es un formato válido (JPG, PNG)."*
- **Test Case GAL-03 (Upload Progress):** Select a valid `.jpg`. Verify upload progress is shown (0% to 100%) and a loading spinner displays.
- **Test Case GAL-04 (Auto Refresh):** On successful upload, verify the gallery grid immediately pulls the new asset and displays it (or shows a "Pendiente de aprobación" overlay if moderation is enabled) without requiring a hard refresh or project redeploy.

### C. Background Audio widget
- **Test Case AUD-01 (Autoplay Policy):** Open page. Verify music remains paused. Click envelope seal. Verify music starts playing at low volume (`0.3`).
- **Test Case AUD-02 (Route Persistence):** Navigate from `/` to `/galeria` and back. Verify music plays continuously without restart or volume spikes.

---

## 3. Accessibility & Performance Benchmarks

- **Contrast check:** Verify contrast ratio of body copy meets WCAG AA (minimum 4.5:1).
- **Lighthouse Goals:**
  - Mobile Score: >90
  - Desktop Score: >95
  - Largest Contentful Paint (LCP): <2.0s
  - Cumulative Layout Shift (CLS): 0.0
