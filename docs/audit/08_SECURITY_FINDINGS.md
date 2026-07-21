# 08 — Security Findings

Status: **Complete**

## Scope

An audit of exposed configurations and access permissions has been conducted.

### SEC-001 — Permissive RLS on Guest list
- **Evidence:** `supabase_migration.sql` L18-19 enables SELECT public access to `guest_list` using `true`.
- **Impact:** Anyone can brute force guest codes (e.g. FAM2026) and extract names.
- **Complexity:** Low.
- **Risk:** High.
- **Priority:** P0
- **Affected resources:** `guest_list` table
- **Acceptance criterion:** Restrict select to only matching inputs instead of public listing.

### SEC-002 — Open Write access on Storage Bucket
- **Evidence:** `debug_storage.js` shows anonymous public uploads without size or type verification.
- **Impact:** Risk of storage abuse, denial of service, or uploading malicious binaries.
- **Complexity:** Medium.
- **Risk:** High.
- **Priority:** P0
- **Affected resources:** `wedding-photos` bucket
- **Acceptance criterion:** Implement server-side validation or restricted uploads using JWT.

### SEC-003 — HTML Injection Risk (XSS)
- **Evidence:** Code in `js/main.js` inserts text inputs from RSVPs into elements using `innerHTML`.
- **Impact:** Attackers can inject malicious Javascript scripts into the browser.
- **Complexity:** Low.
- **Risk:** High.
- **Priority:** P0
- **Affected resources:** RSVP rendering logic
- **Acceptance criterion:** Always use `textContent` or sanitize inputs before rendering.

### SEC-004 — Web3Forms Key Abuse
- **Evidence:** `js/supabase-client.js` L159 hardcodes the Web3Forms key.
- **Impact:** Attackers can extract the key to send spam emails using Web3Forms.
- **Complexity:** Low.
- **Risk:** Medium.
- **Priority:** P1
- **Affected resources:** Web3Forms integration
- **Acceptance criterion:** Relocate API key to server-side environments.
