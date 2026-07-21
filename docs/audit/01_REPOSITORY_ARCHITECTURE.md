# 01 — Repository Architecture

Status: **Complete**

## Required inventory

### Complete Directory Tree [VERIFIED REPOSITORY]
```text
├── .agents/
│   └── rules/             # Project guidelines (Governance, Security, DoD)
├── docs/
│   ├── audit/             # This audit dossier
│   ├── implementation/    # Implementation blueprints
│   ├── product/           # PRD, Copywriting systems, and Concept specifications
│   └── reviews/           # Audit reviews and gates decisions
├── admin/                 # Admin view templates
├── assets/                # Audio files (song.mp3) and static assets
├── css/                   # Global stylesheets
├── debug_env/             # Local test dependencies
├── fotos/                 # Standalone upload files
├── galeria/               # Legacy gallery pages
├── images/                # Site photographs and brand icons
├── js/                    # Main logic, Supabase client client scripts
├── index.html             # Monolithic landing page
├── site.webmanifest       # PWA manifest
└── supabase_migration.sql # Database schema definitions
```

### Application Stack and Runtime
- **Frontend:** Vanilla HTML5, Vanilla CSS, Javascript ES6 [VERIFIED REPOSITORY].
- **Backend:** Supabase [VERIFIED LIVE via API requests].
- **Hosting:** Vercel Static Hosting [VERIFIED LIVE via HTTP `server: Vercel` headers].

### Third-Party Scripts and CDNs [VERIFIED REPOSITORY]
- FontAwesome: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`
- Google Fonts: Playfair Display, Montserrat, Amatic SC, Lora, Cinzel Decorative, Great Vibes.
- Supabase CDN: `@supabase/supabase-js` library.
- Web3Forms API: RSVP backup email client.

### Git Remotes and Branch Strategy
- **Origin remote:** `https://github.com/FelipeValgreen/felipe-camila-wedding.git` [VERIFIED REPOSITORY]
- **Active Branch:** `audit/world-class-rebuild` [VERIFIED REPOSITORY]

## Architecture diagram

```text
Browser Client
  ├── [Static HTML / CSS / JS]
  ├── [Supabase client via CDN] ──────> Supabase Database & Storage (mwumnywbvjxekskfrlms) [VERIFIED LIVE]
  ├── [Web3Forms RSVP Backup] ───────> Web3Forms API [VERIFIED REPOSITORY]
  └── [WhatsApp Link Redirect] ──────> WhatsApp API (Direct chat) [INFERRED]
```

## Technical-debt table

| Area | Current implementation | Evidence | Risk | Priority | Recommended disposition |
|---|---|---|---:|---:|---|
| Monolith UI | Single large HTML file with nested inline scripts | `index.html` L1-1321 [VERIFIED REPOSITORY] | High | P1 | Rebuild as Next.js components |
| DB Access | Global client instance initialized in browser | `js/supabase-client.js` L10-15 [VERIFIED REPOSITORY] | Low | P2 | Relocate to server-side actions |
| CDNs | Blocking scripts loaded via CDNs in HTML head | `index.html` L38-46 [VERIFIED REPOSITORY] | Medium | P2 | Bundle scripts locally in package |
