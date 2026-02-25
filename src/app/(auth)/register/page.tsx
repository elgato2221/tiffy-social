"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
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
        body: JSON.stringify({ name, username, email, password, gender }),
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
      <div className="min-h-screen flex items-center justify-center bg-black px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Conta criada!</h2>
            <p className="text-gray-400 text-sm mb-4">
              Enviamos um email de verificacao para <span className="text-purple-400 font-medium">{email}</span>.
              Verifique sua caixa de entrada para ativar sua conta completamente.
            </p>
            <p className="text-gray-500 text-xs">Entrando automaticamente...</p>
            <div className="mt-4">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Tiffy Social
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Crie seu perfil, publique e monetize
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Criar Conta
          </h2>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha forte"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-white placeholder-gray-500"
              />
              {password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[
                    { ok: passwordChecks.length, label: "8+ caracteres" },
                    { ok: passwordChecks.uppercase, label: "Letra maiuscula" },
                    { ok: passwordChecks.lowercase, label: "Letra minuscula" },
                    { ok: passwordChecks.number, label: "Um numero" },
                  ].map((check) => (
                    <span
                      key={check.label}
                      className={`text-xs ${
                        check.ok ? "text-purple-400" : "text-gray-500"
                      }`}
                    >
                      {check.ok ? "\u2713" : "\u2022"} {check.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Genero
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "MALE", label: "Masculino" },
                  { value: "FEMALE", label: "Feminino" },
                  { value: "OTHER", label: "To nem ai!" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    className={`py-3 px-2 rounded-xl text-sm font-semibold transition border ${
                      gender === opt.value
                        ? "bg-purple-500 border-purple-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                    }`}
                  >
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
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Ja possui uma conta?{" "}
              <Link href="/login" className="text-purple-500 hover:text-purple-600 font-semibold transition">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
