import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { protectedRoute, publicRoute } from './routes';
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {

    const path = request.nextUrl.pathname;
    console.log(path, typeof(path))

    const isPublicPath = path === "/login" || path === "/signup"

    const token = request.cookies.get("token")?.value;

    if( path && path === "/"){
        return NextResponse.redirect(new URL( "/home" , request.url))
    }

    if( path && protectedRoute.includes(path) && !token){
        return NextResponse.redirect(new URL( "/login" , request.url))
    }

    if( path && publicRoute.includes(path) && token){
        return NextResponse.redirect(new URL( "/home" , request.url))
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
      "/booknow"
    ],
  }