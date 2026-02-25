import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// In-memory rate limiting for middleware
const ipRequests = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Cleanup every 2 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of ipRequests.entries()) {
      if (now > entry.resetAt) ipRequests.delete(key);
    }
  }, 120_000);
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    let limit = 60; // 60 req/min default
    const window = 60_000;

    // Skip rate limiting for payment webhooks
    if (request.nextUrl.pathname === "/api/crypto/webhook" || request.nextUrl.pathname === "/api/mercadopago/webhook") {
      limit = 200;
    } else if (request.nextUrl.pathname === "/api/auth/callback/credentials") {
      // Strict limit on actual login attempts (5/min)
      limit = 5;
    } else if (request.nextUrl.pathname.startsWith("/api/auth/")) {
      limit = 10; // 10 req/min for other auth routes
    } else if (
      request.nextUrl.pathname === "/api/messages" &&
      request.method === "POST"
    ) {
      limit = 30; // 30 messages/min
    } else if (request.nextUrl.pathname === "/api/local-upload" || request.nextUrl.pathname === "/api/blob-upload") {
      limit = 10; // 10 uploads/min
    } else if (request.nextUrl.pathname === "/api/users" && request.method === "POST") {
      limit = 3; // 3 registrations/min per IP
    }

    if (!checkRateLimit(ip, limit, window)) {
      return NextResponse.json(
        { error: "Muitas requisicoes. Tente novamente em breve." },
        { status: 429 }
      );
    }
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const token = await getToken({ req: request });
    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
