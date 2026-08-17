import { createBrowserClient } from '@supabase/ssr';
import { parseBooleanFlag } from './runtime-policy';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PRODUCTION_HOSTNAME = 'gestion.felipeycami.cl';

function allowsNonProductionWrites(): boolean {
  return parseBooleanFlag(process.env.NEXT_PUBLIC_ALLOW_NON_PRODUCTION_WRITES);
}

function isCanonicalProductionHost(): boolean {
  return typeof window !== 'undefined' && window.location.hostname === PRODUCTION_HOSTNAME;
}

function isProtectedSupabaseMutation(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (!MUTATING_METHODS.has(method)) return false;

  try {
    const rawUrl = input instanceof Request ? input.url : input.toString();
    const pathname = new URL(rawUrl).pathname;

    // Authentication must remain available in Preview so users can sign in.
    // Protect database/RPC and Storage object writes instead.
    return pathname.startsWith('/rest/v1/') || pathname.startsWith('/storage/v1/object');
  } catch {
    // If the target cannot be classified, do not interfere with unrelated browser requests.
    return false;
  }
}

async function guardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const writeAllowed = isCanonicalProductionHost() || allowsNonProductionWrites();

  if (!writeAllowed && isProtectedSupabaseMutation(input, init)) {
    return new Response(
      JSON.stringify({
        code: 'NON_PRODUCTION_WRITE_BLOCKED',
        message: 'Las escrituras de Supabase están bloqueadas en este entorno de gestión.'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return fetch(input, init);
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.error('[CONFIGURATION_ERROR] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.');
    throw new Error('CONFIGURATION_ERROR: Required Supabase environment variables are missing.');
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey, {
    global: {
      fetch: guardedFetch
    }
  });
}
