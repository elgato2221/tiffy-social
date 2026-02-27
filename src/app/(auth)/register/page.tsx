"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("pt");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = Object.values(passwordChecks).every(Boolean);

  // Generate username from email
  const generateUsername = (email: string) => {
    return email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const username = generateUsername(email);
    const name = username;

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password, gender, language }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar conta. Tente novamente.");
        setLoading(false);
        return;
      }

      // Show verification message then auto-login
      setRegistered(true);

      // Auto-login after short delay
      setTimeout(async () => {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          router.push("/login");
        } else {
          router.push("/feed");
          router.refresh();
        }
      }, 3000);
    } catch {
      setError("Ocorreu um erro ao criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8 w-full max-w-full overflow-hidden">
        <div className="w-full max-w-md text-center">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("auth.accountCreated")}</h2>
            <p className="text-gray-500 text-sm mb-4">
              {t("auth.verificationSent")} <span className="text-purple-400 font-medium">{email}</span>.
              {" "}{t("auth.checkInbox")}
            </p>
            <p className="text-gray-400 text-xs">{t("auth.autoLogin")}</p>
            <div className="mt-4">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8 w-full max-w-full overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {t("auth.appName")}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {t("auth.tagline")}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            {t("auth.createAccount")}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-500 text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1">
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.createPassword")}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-gray-900 placeholder-gray-400"
              />
              {password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[
                    { ok: passwordChecks.length, key: "auth.passLength" },
                    { ok: passwordChecks.uppercase, key: "auth.passUpper" },
                    { ok: passwordChecks.lowercase, key: "auth.passLower" },
                    { ok: passwordChecks.number, key: "auth.passNumber" },
                  ].map((check) => (
                    <span
                      key={check.key}
                      className={`text-xs ${
                        check.ok ? "text-purple-400" : "text-gray-500"
                      }`}
                    >
                      {check.ok ? "\u2713" : "\u2022"} {t(check.key)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {t("auth.gender")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "MALE", key: "auth.male" },
                  { value: "FEMALE", key: "auth.female" },
                  { value: "OTHER", key: "auth.other" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    className={`py-3 px-2 rounded-xl text-sm font-semibold transition border ${
                      gender === opt.value
                        ? "bg-purple-500 border-purple-500 text-white"
                        : "bg-gray-50 border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {t(opt.key)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {t("auth.language")} / Language / Idioma
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "pt", label: "Portugues", flag: "🇧🇷" },
                  { value: "es", label: "Espanol", flag: "🇪🇸" },
                  { value: "en", label: "English", flag: "🇺🇸" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLanguage(opt.value)}
                    className={`py-3 px-2 rounded-xl text-sm font-semibold transition border flex flex-col items-center gap-1 ${
                      language === opt.value
                        ? "bg-purple-500 border-purple-500 text-white"
                        : "bg-gray-50 border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <span className="text-lg">{opt.flag}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !gender || !passwordValid}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {t("auth.hasAccountLogin")}{" "}
              <Link href="/login" className="text-purple-500 hover:text-purple-600 font-semibold transition">
                {t("auth.signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
