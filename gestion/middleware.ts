import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function nonProductionApiWriteBlocked(request: NextRequest): boolean {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  if (!isApiRoute || SAFE_METHODS.has(request.method.toUpperCase())) return false;

  if (process.env.VERCEL_ENV === 'production') return false;
  return process.env.ALLOW_NON_PRODUCTION_WRITES !== 'true';
}

export async function middleware(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (nonProductionApiWriteBlocked(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'NON_PRODUCTION_WRITE_BLOCKED',
        message: 'Las escrituras del Centro de Gestión están bloqueadas en este entorno.'
      },
      { status: 403 }
    );
  }

  // API routes apply their own authentication and authorization. The middleware
  // only adds the environment-level write barrier above.
  if (isApiRoute) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[CONFIGURATION_ERROR] Supabase publishable variables missing in middleware.');
    return NextResponse.json({ ok: false, error: 'CONFIGURATION_ERROR' }, { status: 500 });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Authenticate user with getUser()
  const { data: { user } } = await supabase.auth.getUser();

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboardRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('role, active')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.active) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
