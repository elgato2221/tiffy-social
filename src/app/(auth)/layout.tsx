"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="w-full max-w-full overflow-x-hidden">
        {children}
      </div>
    </LanguageProvider>
  );
}
