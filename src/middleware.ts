import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { protectedRoute, publicRoute } from './routes';
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {

    const path = request.nextUrl.pathname;
    console.log(path, typeof(path))

    const isPublicPath = path === "/login" || path === "/signup"

    const token = request.cookies.get("actechtoken")?.value;
    console.log("token : ",token)

    if( path && path === "/admin" && token){
        return NextResponse.redirect(new URL( "/admin/dashboard" , request.url))
    }

    if( path && path === "/"){
        return NextResponse.redirect(new URL( "/home" , request.url))
    }
    
    if( path && path.startsWith('/admin') && !token){
        return NextResponse.redirect(new URL( "/login" , request.url))
    }
    
    return
}
 
// See "Matching Paths" below to learn more
export const config = {
    matcher: [
      "/",
      "/login",
      "/signup",
      "/home",
      "/services",
      "/booknow",
      "/admin",
      "/admin/bookings",
      "/admin/bookings/:path*"
    ],
  }