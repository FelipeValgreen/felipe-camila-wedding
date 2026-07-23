-- Migration: Remove Legacy Storage Upload Policy V4.2
-- File: supabase/migrations/20260723050000_felipeycami_remove_legacy_storage_upload_policy.sql

-- 1. Drop old broad upload policy and current public upload policy on storage.objects
DROP POLICY IF EXISTS "Anyone can upload to Wedding Photos" ON storage.objects;
DROP POLICY IF EXISTS "Validated Public Upload wedding-photos" ON storage.objects;

-- 2. Create single strict public upload policy using storage.foldername(name)
CREATE POLICY "Validated Public Upload wedding-photos" ON storage.objects
FOR INSERT TO public
WITH CHECK (
  bucket_id = 'wedding-photos' AND
  (storage.foldername(name))[1] = 'guest_uploads' AND
  (name LIKE '%.jpg' OR name LIKE '%.jpeg' OR name LIKE '%.png' OR name LIKE '%.webp') AND
  char_length(name) > 14
);
