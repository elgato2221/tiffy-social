"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao enviar email");
      }
    } catch {
      setError("Erro ao processar solicitacao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4 w-full max-w-full overflow-hidden">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Email enviado!</h2>
            <p className="text-gray-400 text-sm mb-6">
              Se existe uma conta com o email <strong className="text-white">{email}</strong>, voce recebera um link para redefinir sua senha.
            </p>
            <Link
              href="/login"
              className="text-purple-500 hover:text-purple-400 font-semibold text-sm transition"
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 w-full max-w-full overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Tiffy Social
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Recuperar sua senha
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Esqueceu a senha?
          </h2>
          <p className="text-gray-400 text-sm text-center mb-6">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </p>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Enviar link de recuperacao"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
