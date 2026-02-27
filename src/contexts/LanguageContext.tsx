"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { t as translate, Language } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "pt",
  t: (key: string) => translate(key, "pt"),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [language, setLanguage] = useState<Language>("pt");

  useEffect(() => {
    const lang = session?.user?.language as Language | undefined;
    if (lang && ["pt", "es", "en"].includes(lang)) {
      setLanguage(lang);
    }
  }, [session]);

  const tFunc = (key: string) => translate(key, language);

  return (
    <LanguageContext.Provider value={{ language, t: tFunc }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
