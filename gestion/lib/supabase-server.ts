import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.error('[CONFIGURATION_ERROR] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.');
    throw new Error('CONFIGURATION_ERROR: Required Supabase server environment variables are missing.');
  }

  const reqHeaders = headers();
  const authHeader = reqHeaders.get('authorization');
  const globalHeaders: Record<string, string> = {};
  if (authHeader && authHeader.startsWith('Bearer ')) {
    globalHeaders['Authorization'] = authHeader;
  }

  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  };

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      global: {
        headers: globalHeaders
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  );
}
