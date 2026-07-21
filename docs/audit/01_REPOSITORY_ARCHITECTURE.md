# 01 — Repository Architecture

Status: **Complete**

## Required inventory

### Complete Directory Tree
```text
├── .agents/
│   └── rules/             # Binding agent guidelines (Creative, Security, DoD)
├── docs/
│   ├── audit/             # This audit dossier
│   └── product/           # PRD and visual direction specifications
├── admin/                 # Admin view templates
├── assets/                # Audio files (song.mp3) and custom static assets
├── css/                   # Stylesheets (main CSS)
├── debug_env/             # Node dependency test space
├── fotos/                 # Legacy/dedicated upload route
├── galeria/               # Legacy/dedicated full gallery view
├── images/                # Site photographs and brand icons
├── js/                    # Main logic, Supabase client configuration
├── index.html             # Main entry point landing page
├── site.webmanifest       # PWA manifest linking stamp icon
└── supabase_migration.sql # Database schema definitions
```

### Application Stack and Runtime
- **Frontend:** Vanilla HTML5, Vanilla CSS, ES6+ Javascript.
- **Backend-as-a-Service:** Supabase (Database, Auth, Storage).
- **Hosting:** Vercel (static site deployment).

### Build System and Package Management
- Currently no build compiler (zero-config static deployment).
- `debug_env/` contains local dependencies (`@supabase/supabase-js`) managed via npm.

### Entry Points and Boundaries
- `index.html` acts as the main entry point, containing inline JS logic and importing CSS/JS from subfolders.
- JavaScript logic resides in `js/main.js` and `js/supabase-client.js`.

### Third-Party Scripts and CDNs
- **FontAwesome CDN:** CSS loader for icons.
- **Google Fonts CDN:** Inter, Lora, Playfair Display, Montserrat.
- **Supabase CDN:** `@supabase/supabase-js` library.
- **Web3Forms API:** RSVP fallback notification client.

### Git Remotes and Branch Strategy
- **Origin:** `https://github.com/FelipeValgreen/felipe-camila-wedding.git`
- **Active Audit Branch:** `audit/world-class-rebuild`

## Architecture diagram

```text
Browser Client
  ├── [Static HTML / CSS / JS]
  ├── [Supabase client via CDN] ──────> Supabase Database & Storage (mwumnywbvjxekskfrlms)
  ├── [Web3Forms RSVP Backup] ───────> Web3Forms API
  └── [WhatsApp Link Redirect] ──────> WhatsApp API (Direct chat)
```

## Technical-debt table

| Area | Current implementation | Evidence | Risk | Priority | Recommended disposition |
|---|---|---|---:|---:|---|
| Landing UI | Monolithic layout with inline script components | `index.html` L98-250 | High | P1 | Rebuild as React components |
| DB Access | Global Client instance with exposed credentials | `js/supabase-client.js` | Low | P2 | Move credentials to environment variables |
| Script loading | Blocking scripts loaded via CDNs in `<head>` | `index.html` L39-46 | Medium | P2 | Use static bundling / tree shaking |
