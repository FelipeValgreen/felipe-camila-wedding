# Design-to-Code Map

This document bridges the creative concepts and visual specification with target implementation structures in the Next.js rebuild.

## 1. Handoff Mapping Matrix

| Designed element | Route / component | Data source | State dependencies | Responsive behavior | Accessibility | Implementation risk |
|---|---|---|---|---|---|---|
| **Personalized Entry / Opening** | `/invitacion/[token]` -> `components/OpeningScreen.tsx` | Supabase `guest_list` (fetched server-side using token) | `guestName` (string), `isOpen` (boolean) | Full screen overlay, scales elegantly on mobile. | Screen readers announce invitation opening; supports reduced motion. | Low. Requires clean fallback for invalid tokens. |
| **Chronological Story Timeline** | `/` -> `components/StoryTimeline.tsx` | Static content & assets | Current active chapter state | Stacked vertically on mobile, horizontal flow on desktop. | Alt text on all photographs; high contrast text. | Low. |
| **Ceremony & Venue Blocks** | `/` -> `components/VenueInfo.tsx` | Static coordinates and maps links | None | Side-by-side on desktop, single column on mobile. | Factual text readable at high zoom; descriptive map links. | Low. |
| **Floating Action Button (FAB)** | All pages -> `components/FAB.tsx` | None | `scrollY` (hides FAB when scroll target is reached) | Fixed bottom right, circular icon with tooltips. | Accessible focus indicators; does not block interactive components. | Low. |
| **Interactive RSVP Modal** | `/` -> `components/RSVPModal.tsx` | Supabase `rsvp_guests` (Server Action) | `isSubmitting` (bool), `isAttending` (bool) | Center modal on desktop, full-screen slide-up on mobile. | Focus traps inside modal; keyboard escape route; form labels linked to inputs. **No passes or companion counts are rendered.** | Medium. Need to handle slow-network latency. |
| **Curated Home Gallery** | `/` -> `components/LivingGallery.tsx` | Supabase `guest_photos` (filtered by active categories) | `currentCategory` (album filter tab) | Grid columns dynamically scale (1 on mobile, 3 on desktop). | Tab list matches ARIA specifications; alt text readable. | Low. |
| **Photo Upload Widget** | `/` or `/galeria` -> `components/PhotoUploadModal.tsx` | Supabase Storage and `guest_photos` table | `uploadProgress` (int), `uploadStatus` (enum) | Responsive overlay; progress bar matches screen dimensions. | Semantic file-selector buttons; live announcements of upload status. | Medium. Mobile camera library permissions. |
| **Background Music widget** | Global layout -> `components/AudioPlayer.tsx` | `assets/song.mp3` (License Unverified Warning status) | `isPlaying` (bool), `volume` (float) | Compact floating player near FAB. | Play/pause easily triggerable via keyboard; screen reader descriptions. | Low. Autoplay blocking policy handles fallback. |
| **WhatsApp Concierge Link** | `/` -> `components/ConciergeWidget.tsx` | Static WhatsApp number + prefilled message text | `rsvpSaved` (bool) | Floats above footer. | Explicit description of action (opens external WhatsApp application). | Low. |
| **Footer & Closing** | `/` -> `components/Footer.tsx` | Static | None | Clean bottom padding. | Screen-reader legible. | Low. |

---

## 2. Global State Dependencies

```text
Global Context (App State)
  ├── Guest Identity (Token -> guestName) -- No passes stored
  ├── Audio State (isPlaying, currentVolume)
  ├── Navigation State (activeRoute)
  └── Upload State (activeUploads, progressTracker)
```
- A React context provider `contexts/AppContext.tsx` will house these shared states to avoid prop drilling and guarantee consistent audio/user experience across dynamic route transitions.
