# Current to Target Architecture Plan

## 1. Architectural Baseline

### Current Architecture (Legacy monolithic static site)
- **Structure:** Single index.html containing more than 1300 lines of mixed markup, styling, and client-side logic.
- **Data Access:** Unprotected Supabase client library loaded via CDN, with hardcoded anon keys in public javascript.
- **State Management:** Ad-hoc global variable states in raw Javascript (`currentActiveFilter`, `guestPhotosCache`, `audio`, etc.) with no single-directional data flow.
- **Routing:** Anchored sections (`#envelope`, `#rsvp`, `#iglesia`, `#arboleda`) inside a single page, with separate physical directories `/galeria`, `/fotos`, and `/admin`.
- **Integrations:** Direct form submissions using plain HTTP posts/Web3Forms and raw window triggers redirecting to WhatsApp.

### Target Architecture (Modern Modular Next.js/React Site)
- **Framework:** Next.js (App Router) on Vercel.
- **Styling:** CSS Modules or Vanilla CSS aligned with a centralized design system.
- **Routing:** Clean server-rendered routing with dynamic pages:
  - `/` -> Personal landing page (accepts dynamic query token e.g., `/invitacion/[token]`).
  - `/galeria` -> Complete photo archive.
  - `/admin/moderacion` -> Protected admin console for photo/RSVP moderation.
- **State Management:** React state hooks (`useState`, `useContext`) managing unified UI states.
- **API Layer:** Next.js Server Actions or API routes (`/api/rsvp`, `/api/photos`) to run server-side validations, keeping Supabase service role operations and Web3Forms keys secure and hidden from the client browser.

---

## 2. Component Migration Mapping

```mermaid
graph TD
    subgraph Legacy [Legacy Monolith]
        index[index.html]
        mainjs[js/main.js]
        subjs[js/supabase-client.js]
    end

    subgraph Target [Target Modular Next.js]
        AppRouter[app/layout.tsx]
        HomeRoute[app/page.tsx]
        GaleriaRoute[app/galeria/page.tsx]
        InvRoute[app/invitacion/[token]/page.tsx]
        
        subgraph Components [Shared Components]
            FAB[components/FAB.tsx]
            AudioPlayer[components/AudioPlayer.tsx]
            RSVPModal[components/RSVPModal.tsx]
            GalleryGrid[components/GalleryGrid.tsx]
            PhotoUpload[components/PhotoUpload.tsx]
        end
        
        subgraph Services [Secure Services]
            SupaServer[lib/supabase-server.ts]
            SupaClient[lib/supabase-client.ts]
        end
    end

    index -.-> HomeRoute
    mainjs -.-> Components
    subjs -.-> Services
```

---

## 3. Detailed Component Decomposition

1. **`app/layout.tsx` (Global Layout):**
   - Configures site-wide HTML, metadata, and preloads custom Google Fonts (Playfair Display, Montserrat).
   - Mounts the global `<AudioPlayer />` component at the root to maintain background audio play state across navigation routes without interruptions.

2. **`components/AudioPlayer.tsx` (Music Widget):**
   - Implements custom play/pause buttons, progressive load indicators, and controls.
   - Enforces an initial volume of `0.3` and respects user interaction triggers (e.g. envelope open).
   - Enforces license unverified fallback warnings.

3. **`components/RSVPModal.tsx` (RSVP Component):**
   - Handles guest code lookups via server action (preventing raw public SELECT queries on the client side).
   - Validates attendance inputs, food restrictions, and phone numbers.
   - **Important:** No guest-facing `passes` or group-limit logic is exposed in this modal. RSVP is strictly individual.
   - Saves record to Supabase first, and opens WhatsApp on success.

4. **`components/GalleryGrid.tsx` & `PhotoUpload.tsx` (Living Gallery):**
   - Renders a responsive Masonry image layout sourced from `guest_photos` (filtered by `approved = true`).
   - Implements client-side MIME checks (JPEG/PNG only) and file size limitation (<10MB) before piping upload stream securely.
