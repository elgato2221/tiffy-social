"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"choice" | "login">("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setSuccess("Email verificado com sucesso! Faca login para continuar.");
      setMode("login");
    }
    const errorParam = searchParams.get("error");
    if (errorParam === "token-expirado") {
      setError("Link de verificacao expirado. Faca login e solicite um novo.");
      setMode("login");
    } else if (errorParam === "token-invalido") {
      setError("Link de verificacao invalido.");
      setMode("login");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth passes the error message from authorize() throw
        const msg = result.error;
        if (msg.includes("banida") || msg.includes("suspensa")) {
          setError(msg);
        } else {
          setError("Email ou senha incorretos.");
        }
      } else {
        router.push("/feed");
        router.refresh();
      }
    } catch {
      setError("Ocorreu um erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnonymous() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/anonymous", { method: "POST" });
      if (!res.ok) throw new Error("Erro ao criar conta");

      const data = await res.json();

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Erro ao entrar. Tente novamente.");
      } else {
        router.push("/feed");
        router.refresh();
      }
    } catch {
      setError("Erro ao criar perfil anonimo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Choice screen
  if (mode === "choice") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">
              Tiffy Social
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Uma rede social para solteiros que monetiza usuarios
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Anonymous */}
            <button
              onClick={handleAnonymous}
              disabled={loading}
              className="w-full rounded-2xl bg-gray-900 border border-gray-800 p-6 text-left transition hover:border-gray-600 hover:bg-gray-800/80 disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Perfil Anonimo</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Navegue, curta e comente sem revelar sua identidade
                  </p>
                </div>
              </div>
            </button>

            {/* Public */}
            <Link
              href="/register"
              className="block w-full rounded-2xl bg-gradient-to-r from-purple-500/10 to-purple-500/10 border border-purple-500/30 p-6 text-left transition hover:from-purple-500/20 hover:to-purple-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Criar Conta Publica</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Crie seu perfil, publique e monetize
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Already have account */}
          <div className="mt-8 text-center">
            <button
              onClick={() => setMode("login")}
              className="text-sm text-gray-400 hover:text-purple-400 transition"
            >
              Ja tem uma conta? <span className="font-semibold text-purple-500">Entrar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Tiffy Social
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Bem-vindo de volta
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Entrar
          </h2>

          {success && (
            <div className="bg-green-900/30 border border-green-800 text-green-400 text-sm rounded-lg p-3 mb-4 text-center">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="Digite sua senha"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-white placeholder-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-400 hover:text-purple-400 transition"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode("choice")}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
