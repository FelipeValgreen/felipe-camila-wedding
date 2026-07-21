# Rollback Plan

This plan establishes the procedures for restoring service to a known stable state if a deploy causes critical errors in production.

## 1. Rollback Criteria

A rollback must be executed immediately if any of the following occur:
- **P0 - RSVP Blocked:** Guests are unable to submit RSVPs (Supabase queries fail or API routes crash).
- **P0 - Data Corruption:** Database inserts fail, return incorrect schema errors, or leak guest details.
- **P1 - Critical UI Breakage:** Landing page fails to render, loops indefinitely, or behaves incorrectly on mobile viewports.

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
2. Restore table states from the decrypted JSON backup files using the restoration script:
   ```bash
   # Decrypt backup
   gpg -d /tmp/supabase_backup.dump.gpg > /tmp/supabase_backup.dump
   
   # Run pg_restore
   pg_restore -d "$PG_CONNECTION_STRING" --clean --no-owner /tmp/supabase_backup.dump
   
   # Delete unencrypted temporary files
   rm -f /tmp/supabase_backup.dump
   ```

---

## 4. Post-Rollback Smoke Test Verification

Once rollback is complete, execute these checks:
1. **Load page:** Verify index loads under 2 seconds.
2. **Verify RSVP:** Submit a mock guest code. Confirm guest name auto-populates, submits successfully, and opens WhatsApp.
3. **Console check:** Confirm no Javascript errors or failed network requests are logged in the browser console.
