import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export const proxy = async (request: NextRequest) => {
  return await updateSession(request);
};

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image|svg|ico|txt|png|webp|jpg|jpeg|gif|woff2? (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff2?)$).*)",
  ],
};
