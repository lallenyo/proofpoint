import { clerkMiddleware } from "@clerk/nextjs/server";

// clerkMiddleware() is permissive by default — it attaches auth info
// but does not block unauthenticated requests. Individual API routes
// check auth() themselves. Public routes like / and /demo work without
// requiring authentication.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
