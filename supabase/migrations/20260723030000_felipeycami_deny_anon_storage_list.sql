-- Migration: Deny Anon Storage Bucket Listing V4.2
-- File: supabase/migrations/20260723030000_felipeycami_deny_anon_storage_list.sql

-- Drop all SELECT policies for public/anon on storage.objects
DROP POLICY IF EXISTS "Public List wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Select wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Objects wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Deny Anon List wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage wedding-photos storage" ON storage.objects;

-- Create single policy allowing only authenticated management users to list/manage storage objects
CREATE POLICY "Admin Manage wedding-photos storage" ON storage.objects FOR ALL TO authenticated USING (
  bucket_id = 'wedding-photos' AND (SELECT security.get_my_role()) IS NOT NULL
) WITH CHECK (
  bucket_id = 'wedding-photos' AND (SELECT security.get_my_role()) IN ('editor', 'owner')
);
