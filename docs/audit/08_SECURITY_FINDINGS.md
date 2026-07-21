# 08 — Security Findings

Status: **Complete**

## Scope

An audit of exposed configurations and access permissions has been conducted.

### SEC-001 — Permissive RLS on Guest list
- **Evidence:** `supabase_migration.sql` enables SELECT public access to `guest_list`.
- **Impact:** Anyone can enumerate guest names and lookup codes.
- **Complexity:** Low.
- **Risk:** High.
- **Priority:** P0
- **Affected resources:** `guest_list` table
- **Acceptance criterion:** Restrict select to only matching inputs instead of public listing.

### SEC-002 — Open Write access on Storage Bucket
- **Evidence:** Storage policy allows anonymous public uploads without size or type verification.
- **Impact:** Risk of storage abuse, denial of service, or uploading malicious binaries.
- **Complexity:** Medium.
- **Risk:** High.
- **Priority:** P0
- **Affected resources:** `wedding-photos` bucket
- **Acceptance criterion:** Implement server-side validation or restricted uploads using JWT.
