import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Presence check only, to send visitors to the right login page. Every API route verifies the session itself.
export function middleware(request: NextRequest) {

    const path = request.nextUrl.pathname;

    const adminToken = request.cookies.get("actechtoken")?.value;
    const technicianToken = request.cookies.get("techtoken")?.value;

    if( path === "/admin" && adminToken){
        return NextResponse.redirect(new URL( "/admin/dashboard" , request.url))
    }

    if( path === "/"){
        return NextResponse.redirect(new URL( "/home" , request.url))
    }

    if( path.startsWith('/admin') && !adminToken){
        return NextResponse.redirect(new URL( "/login" , request.url))
    }

    if( path.startsWith('/technician') && path !== "/technician/login" && !technicianToken){
        return NextResponse.redirect(new URL( "/technician/login" , request.url))
    }

    return
}

export const config = {
    matcher: [
      "/",
      "/login",
      "/signup",
      "/home",
      "/services",
      "/booknow",
      "/admin",
      "/admin/dashboard",
      "/admin/bookings",
      "/admin/bookings/:path*",
      "/admin/services",
      "/admin/services/:path*",
      "/admin/service-areas",
      "/admin/technicians",
      "/admin/technicians/:path*",
      "/admin/notifications",
      "/admin/finance",
      "/admin/finance/:path*",
      "/technician",
      "/technician/:path*"
    ],
  }
