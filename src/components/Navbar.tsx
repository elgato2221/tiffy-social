"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface NavItem {
  label: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
  isCenter?: boolean;
  badge?: number;
}

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const isAdmin = session?.user?.role === "ADMIN";
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/users/${session.user.id}`)
        .then((res) => res.json())
        .then((data) => setVerified(!!data.verified))
        .catch(() => setVerified(false));
    }
  }, [session?.user?.id]);

  // Hide navbar inside individual chat pages (like Instagram)
  const isChatPage = pathname?.match(/^\/messages\/[^/]+$/);
  if (isChatPage) return null;

  const navItems: NavItem[] = [
    {
      label: t("nav.home"),
      href: "/feed",
      icon: (active) => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
        </svg>
      ),
    },
    {
      label: t("nav.explore"),
      href: "/explore",
      icon: (active) => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      label: t("nav.create"),
      href: "/upload",
      isCenter: true,
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: t("nav.chat"),
      href: "/messages",
      icon: (active) => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
    },
    {
      label: t("nav.profile"),
      href: "/profile",
      icon: (active) => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ];

  return (
    <>
    {/* Floating Admin button */}
    {isAdmin && pathname !== "/admin" && (
      <Link
        href="/admin"
        className="fixed bottom-20 right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-purple-600 shadow-lg shadow-purple-500/30 transition-transform hover:scale-105 active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </Link>
    )}
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

          if (item.isCenter) {
            return (
              <div key={item.href} className="relative">
                <button
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="flex -mt-5 h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/30 transition-transform hover:scale-105 active:scale-95"
                >
                  {item.icon(false)}
                </button>

                {/* Create menu popup */}
                {showCreateMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                      {verified === false ? (
                        <div className="px-4 py-4 text-center">
                          <p className="text-sm text-gray-600 mb-3">{t("nav.verifyRequired")}</p>
                          <Link
                            href="/verify"
                            onClick={() => setShowCreateMenu(false)}
                            className="inline-block px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-full hover:bg-purple-600 transition"
                          >
                            {t("nav.verifyNow")}
                          </Link>
                        </div>
                      ) : (
                        <>
                          <Link
                            href="/upload"
                            onClick={() => setShowCreateMenu(false)}
                            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition"
                          >
                            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{t("nav.videoFeed")}</p>
                              <p className="text-[11px] text-gray-400">{t("nav.videoFeedDesc")}</p>
                            </div>
                          </Link>
                          <div className="border-t border-gray-100" />
                          <Link
                            href="/gallery"
                            onClick={() => setShowCreateMenu(false)}
                            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition"
                          >
                            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{t("nav.gallery")}</p>
                              <p className="text-[11px] text-gray-400">{t("nav.galleryDesc")}</p>
                            </div>
                          </Link>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                isActive ? "text-purple-500" : "text-gray-400 hover:text-gray-900"
              }`}
            >
              {item.icon(isActive)}
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-0.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
