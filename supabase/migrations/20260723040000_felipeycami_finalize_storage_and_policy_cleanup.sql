-- Migration: Finalize Storage and Policy Cleanup V4.2
-- File: supabase/migrations/20260723040000_felipeycami_finalize_storage_and_policy_cleanup.sql

-- 1. Configure bucket limits and allowed MIME types on storage.buckets
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'wedding-photos';

-- 2. Drop all duplicate/broad storage policies on storage.objects by exact name
DROP POLICY IF EXISTS "Public Access to Wedding Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Objects wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Deny Anon List wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage wedding-photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage storage wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Validated Public Upload wedding-photos" ON storage.objects;

-- 3. Create single authenticated admin storage management policy
CREATE POLICY "Admin Manage storage wedding-photos" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'wedding-photos' AND (SELECT security.get_my_role()) IS NOT NULL
) WITH CHECK (
  bucket_id = 'wedding-photos' AND (SELECT security.get_my_role()) IN ('editor', 'owner')
);

-- 4. Create single restricted public upload policy for guest uploads
CREATE POLICY "Validated Public Upload wedding-photos" ON storage.objects
FOR INSERT TO public
WITH CHECK (
  bucket_id = 'wedding-photos' AND
  (name LIKE 'guest_uploads/%') AND
  (name LIKE '%.jpg' OR name LIKE '%.jpeg' OR name LIKE '%.png' OR name LIKE '%.webp')
);

-- 5. Consolidate policies on admin_profiles to eliminate SELECT duplication
DROP POLICY IF EXISTS "Admin Profiles Select" ON public.admin_profiles;
DROP POLICY IF EXISTS "Auth Select admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Owner Manage admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admin Select admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Owner Insert admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Owner Update admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Owner Delete admin_profiles" ON public.admin_profiles;

CREATE POLICY "Admin Select admin_profiles" ON public.admin_profiles FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Owner Insert admin_profiles" ON public.admin_profiles FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) = 'owner' );
CREATE POLICY "Owner Update admin_profiles" ON public.admin_profiles FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' ) WITH CHECK ( (SELECT security.get_my_role()) = 'owner' );
CREATE POLICY "Owner Delete admin_profiles" ON public.admin_profiles FOR DELETE TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' );

-- 6. Consolidate policies on guest_photos to eliminate duplicate SELECT policies
DROP POLICY IF EXISTS "Public photos are viewable by everyone" ON public.guest_photos;
DROP POLICY IF EXISTS "Anyone can upload photos" ON public.guest_photos;
DROP POLICY IF EXISTS "Permitir insertar a todos" ON public.guest_photos;
DROP POLICY IF EXISTS "Public Insert guest_photos" ON public.guest_photos;
DROP POLICY IF EXISTS "Public Select guest_photos" ON public.guest_photos;
DROP POLICY IF EXISTS "Validated Insert guest_photos" ON public.guest_photos;

CREATE POLICY "Public Select guest_photos" ON public.guest_photos FOR SELECT TO public USING (true);
CREATE POLICY "Validated Insert guest_photos" ON public.guest_photos FOR INSERT TO public WITH CHECK (
  char_length(coalesce(uploader_name, '')) <= 100 AND
  (url LIKE 'http://%' OR url LIKE 'https://%')
);
