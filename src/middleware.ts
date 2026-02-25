import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Per-endpoint rate limiting
const ipRequests = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = ipRequests.get(key);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of ipRequests.entries()) {
      if (now > entry.resetAt) ipRequests.delete(key);
    }
  }, 300_000);
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

    const path = request.nextUrl.pathname;
    const method = request.method;

    // Skip rate limiting for webhooks
    if (path === "/api/crypto/webhook" || path === "/api/mercadopago/webhook") {
      return response;
    }

    // Per-endpoint limits (key = ip:category)
    let limit = 300; // 300 req/min default (generous for polling)
    let category = "general";
    const window = 60_000;

    if (path === "/api/auth/callback/credentials") {
      limit = 5;
      category = "login";
    } else if (path.startsWith("/api/auth/")) {
      limit = 15;
      category = "auth";
    } else if (path === "/api/messages" && method === "POST") {
      limit = 60; // 60 messages/min (1 per second)
      category = "msg-send";
    } else if (path === "/api/local-upload" || path === "/api/blob-upload") {
      limit = 15;
      category = "upload";
    } else if (path === "/api/users" && method === "POST") {
      limit = 3;
      category = "register";
    }
    // GET requests for messages/notifications/etc = default 300/min (polling)

    const key = `${ip}:${category}`;
    if (!checkRateLimit(key, limit, window)) {
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
