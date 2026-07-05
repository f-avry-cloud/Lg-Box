import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Supabase pas encore configuré (ex. avant la première installation) :
    // on laisse passer plutôt que de faire planter tout le site.
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith("/admin");
  const isPortalArea = pathname.startsWith("/portail") && pathname !== "/portail/connexion";

  if (!user && (isAdminArea || isPortalArea)) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminArea ? "/connexion" : "/portail/connexion";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Un utilisateur déjà connecté n'a rien à faire sur les pages de connexion.
  if (user && (pathname === "/connexion" || pathname === "/portail/connexion")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/connexion" ? "/admin" : "/portail";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isAdminArea) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "employee")) {
      const url = request.nextUrl.clone();
      url.pathname = "/portail";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
