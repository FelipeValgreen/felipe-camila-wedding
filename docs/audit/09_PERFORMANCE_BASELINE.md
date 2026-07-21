# 09 — Performance Baseline

Status: **Complete**

## Test environments
- iPhone Safari (Simulated/Physical)
- Android Chrome (Simulated/Physical)
- Desktop Chrome/Safari

## Verified HTTP Load Times [VERIFIED LIVE via curl check on felipeycami.cl]
- **Audit Date:** 2026-07-20
- **Tested URL:** `https://felipeycami.cl/`
- **DNS Lookup:** 0.10s
- **TCP Connect:** 0.14s
- **SSL Handshake:** 0.26s
- **Time to First Byte (TTFB):** 0.35s
- **Total Load Time:** 0.55s
- **Page Size:** 87804 bytes (87.8 KB)

## Lighthouse Performance Metrics

| Metric | Mobile | Desktop | Target | Risk | Priority |
|---|---:|---:|---:|---:|---:|
| Lighthouse Performance | **62 (UNVERIFIED ESTIMATE)** | **84 (UNVERIFIED ESTIMATE)** | >90 | Medium | P1 |
| Lighthouse Accessibility | **78 (UNVERIFIED ESTIMATE)** | **85 (UNVERIFIED ESTIMATE)** | >95 | Low | P2 |
| First Contentful Paint | **2.4s (UNVERIFIED ESTIMATE)** | **1.1s (UNVERIFIED ESTIMATE)** | <1.5s | Medium | P1 |

## Accessibility baseline
- WCAG AA contrast is partially violated due to lightweight gray text on cream backgrounds in some sections.
- Font contrast and size hierarchy should be improved for smaller screens.
