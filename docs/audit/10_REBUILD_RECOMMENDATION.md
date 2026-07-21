# 10 — Rebuild Recommendation

Status: **Complete**

## Decision objective

Determine the roadmap and technical strategy for the world-class rebuild of the Felipe & Camila wedding invitation platform.

## Required separation

### A. Visual and Experience Proposal
- **Concept:** Editorial-fashion look ("23·10·26 — A Living Invitation").
- **Motion Language:** Subtle transitions, elegant entrance fades, and a thin continuous line indicating progress.
- **RSVP Experience:** Seamlessly integrated individual RSVP trigger leading directly to a polished modal.
- **Gallery:** Home section hosts a curated Masonry layout showing approved photos, with an inline upload action showing upload progress, success, and moderation fallbacks.

### B. Technical Proposal
- **Stack:** React + Next.js (hosted on Vercel).
- **Styling:** Vanilla CSS or CSS Modules.
- **Database:** Supabase with strict Row Level Security (RLS) policies.
- **Staging/QA:** Continuous integration using Vercel Preview Deployments.
- **Rollback:** Direct Vercel instant rollbacks.
- **Data flows:** RSVP verifies code, updates Supabase, and updates Google Sheets via Web3Forms/Apps Script.
