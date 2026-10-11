import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const PUBLIC_PATHNAMES = ["/login", "/activate-account"];

const withSessionCookies = (
  redirect: NextResponse,
  supabaseResponse: NextResponse,
  cookieHeaders: Record<string, string>
) => {
  supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  Object.entries(cookieHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
  return redirect;
};

export const updateSession = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  let cookieHeaders: Record<string, string> = {};

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookieHeaders = headers;
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  // IMPORTANT: avoid writing any logic between createServerClient and
  // supabase.auth.getUser() as it can cause random session invalidation.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !PUBLIC_PATHNAMES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return withSessionCookies(NextResponse.redirect(url), supabaseResponse, cookieHeaders);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url), supabaseResponse, cookieHeaders);
  }

  return supabaseResponse;
};
