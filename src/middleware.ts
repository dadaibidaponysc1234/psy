import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_TOKEN, protectedRoutes } from "./static";

export default function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_TOKEN);
  // const user = token?.value ? Utils.getUserFromToken(token?.value) : undefined
  //   const isAuthenticated = user && Utils.isUserTokenValid(user) ? true : false
  // const isAuthenticated = !!token;

  // if (isAuthenticated && req.nextUrl.pathname === "/admin/login") {
  //   const absoluteURL = new URL("/admin", req.nextUrl.origin);
  //   return NextResponse.redirect(absoluteURL.toString());
  // }

  // if (!isAuthenticated && protectedRoutes.includes(req.nextUrl.pathname)) {
  //   const absoluteURL = new URL("/admin/login", req.nextUrl.origin);
  //   absoluteURL.searchParams.set(
  //     "message",
  //     "You need to be logged in to access this page."
  //   );
  //   absoluteURL.searchParams.append("type", "error");
  //   req.cookies.set(AUTH_TOKEN, "");
  //   return NextResponse.redirect(absoluteURL.toString());
  // }
}
