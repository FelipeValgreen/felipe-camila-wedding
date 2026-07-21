# Rollback Plan

This plan establishes the procedures for restoring service to a known stable state if a deploy causes critical errors in production.

## 1. Rollback Criteria

A rollback must be executed immediately if any of the following occur:
- **P0 - RSVP Blocked:** Guests are unable to submit RSVPs (Supabase queries fail or API routes crash).
- **P0 - Data Corruption:** Database inserts fail, return incorrect schema errors, or leak guest details.
- **P1 - Critical UI Breakage:** Landing page fails to render, loops indefinitely, or behaves incorrectly on mobile viewports.
- **P2 - Music or Media loop:** Audio widget freezes background threads or causes high resource utilization on mobile Safari.

---

## 2. Code Rollback Steps (Vercel & Git)

### Step 1: Redeploy the last stable Vercel deployment
We will use the Vercel Dashboard or CLI to immediately redeploy the prior stable commit without rebuilding:
```bash
# 1. Fetch deployment list
vercel list felipe-camila-wedding

# 2. Rollback to the previous deployment ID (e.g. dpl_stable123)
vercel rollback dpl_stable123
```

### Step 2: Revert local branches and reset main pointer
If changes were pushed to `main`, we will perform a git reset and force push the stable head (only after approval):
```bash
# 1. Revert to stable commit SHA (e.g. 7e5d232)
git checkout main
git reset --hard 7e5d232

# 2. Force push the reset branch to origin (with push protection bypassed temporarily if needed)
git push origin main --force
```

---

## 3. Database Rollback Steps (Supabase)

If a schema migration broke client compatibility:
1. Revert database structures to the legacy snapshot by running the rollback migrations.
2. Restore table states from the exported JSON backup files (`backup_guest_list.json`, `backup_rsvp_guests.json`, `backup_guest_photos.json`) using the restoration script:
   ```bash
   # Restore raw JSON to original tables
   psql -d "$SUPABASE_DB_URL" -c "\\copy guest_list FROM 'backup_guest_list.json' WITH (FORMAT json);"
   psql -d "$SUPABASE_DB_URL" -c "\\copy rsvp_guests FROM 'backup_rsvp_guests.json' WITH (FORMAT json);"
   psql -d "$SUPABASE_DB_URL" -c "\\copy guest_photos FROM 'backup_guest_photos.json' WITH (FORMAT json);"
   ```

---

## 4. Post-Rollback Smoke Test Verification

Once rollback is complete, execute these checks:
1. **Load page:** Verify index loads under 2 seconds.
2. **Music:** Open invitation and check that audio plays at volume `0.3`.
3. **Verify RSVP:** Submit a mock guest code. Confirm guest name auto-populates, submits successfully, and opens WhatsApp.
4. **Console check:** Confirm no Javascript errors or failed network requests are logged in the browser console.
