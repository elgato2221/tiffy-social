"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { timeAgo } from "@/lib/utils";
import WalletBalance from "@/components/WalletBalance";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  pixKey: string;
  status: string;
  createdAt: string;
}

const COIN_PACKAGES = [
  { amount: 100, price: "R$ 9,90", popular: false, savings: null },
  { amount: 500, price: "R$ 39,90", popular: true, savings: null },
  { amount: 1000, price: "R$ 69,90", popular: false, savings: "Economize 29%" },
  { amount: 5000, price: "R$ 299,90", popular: false, savings: "Economize 39%" },
  { amount: 10000, price: "R$ 499,90", popular: false, savings: "Economize 49%" },
];

function getTransactionIcon(type: string): string {
  switch (type) {
    case "PURCHASE":
      return "🛒";
    case "MESSAGE_SENT":
      return "💬";
    case "MESSAGE_RECEIVED":
      return "📩";
    case "GIFT_SENT":
      return "🎁";
    case "GIFT_RECEIVED":
      return "🎀";
    case "COMMENT_SENT":
      return "💬";
    case "COMMENT_RECEIVED":
      return "📝";
    case "WITHDRAWAL":
      return "💸";
    case "DAILY_REWARD":
      return "🎯";
    case "GALLERY_UNLOCK":
      return "🔓";
    case "GALLERY_EARNING":
      return "🖼️";
    case "MEDIA_UNLOCK":
      return "🔓";
    case "MEDIA_EARNING":
      return "💎";
    default:
      return "🪙";
  }
}

function getTransactionLabel(type: string): string {
  switch (type) {
    case "PURCHASE":
      return "Compra de moedas";
    case "MESSAGE_SENT":
      return "Mensagem enviada";
    case "MESSAGE_RECEIVED":
      return "Mensagem recebida";
    case "GIFT_SENT":
      return "Presente enviado";
    case "GIFT_RECEIVED":
      return "Presente recebido";
    case "COMMENT_SENT":
      return "Comentario enviado";
    case "COMMENT_RECEIVED":
      return "Comentario recebido";
    case "WITHDRAWAL":
      return "Saque solicitado";
    case "DAILY_REWARD":
      return "Recompensa diaria";
    case "GALLERY_UNLOCK":
      return "Galeria desbloqueada";
    case "GALLERY_EARNING":
      return "Ganho de galeria";
    case "MEDIA_UNLOCK":
      return "Midia desbloqueada";
    case "MEDIA_EARNING":
      return "Ganho de midia";
    default:
      return "Transacao";
  }
}

function getTransactionIconBg(type: string): string {
  switch (type) {
    case "PURCHASE":
      return "bg-purple-500/20";
    case "MESSAGE_SENT":
    case "COMMENT_SENT":
      return "bg-purple-400/15";
    case "MESSAGE_RECEIVED":
    case "COMMENT_RECEIVED":
      return "bg-purple-500/20";
    case "GIFT_SENT":
      return "bg-purple-400/15";
    case "GIFT_RECEIVED":
      return "bg-purple-500/25";
    case "WITHDRAWAL":
      return "bg-red-500/15";
    case "DAILY_REWARD":
      return "bg-purple-400/20";
    case "GALLERY_UNLOCK":
      return "bg-purple-400/15";
    case "GALLERY_EARNING":
      return "bg-purple-500/25";
    case "MEDIA_UNLOCK":
      return "bg-purple-400/15";
    case "MEDIA_EARNING":
      return "bg-purple-500/25";
    default:
      return "bg-gray-700/50";
  }
}

export default function WalletPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WalletPage />
    </Suspense>
  );
}

function WalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "card">("crypto");
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  // Withdrawal states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const myId = session?.user?.id;
  const searchParams = useSearchParams();

  // Check for payment success/cancel from URL params
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 5000);
      // Refresh wallet data
      if (myId) {
        fetch("/api/wallet").then((r) => r.json()).then((d) => setWallet(d)).catch(() => {});
      }
    }
  }, [searchParams, myId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated" || !myId) return;

    async function fetchWallet() {
      try {
        const [walletRes, userRes, withdrawRes] = await Promise.all([
          fetch("/api/wallet"),
          fetch(`/api/users/${myId}`),
          fetch("/api/wallet/withdraw"),
        ]);

        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWallet(walletData);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUserRole(userData.role || "");
        }

        if (withdrawRes.ok) {
          const withdrawData = await withdrawRes.json();
          setWithdrawals(withdrawData);
        }
      } catch (error) {
        console.error("Erro ao carregar carteira:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWallet();
  }, [status, myId, router]);

  async function handlePurchase(amount: number) {
    if (paymentMethod === "crypto") {
      return handleCryptoPurchase(amount);
    }
    return handleCardPurchase(amount);
  }

  async function handleCardPurchase(amount: number) {
    setPurchasing(amount);

    try {
      const res = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        window.open(data.init_point, "_blank");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao criar pagamento.");
      }
    } catch {
      alert("Erro ao criar pagamento. Tente novamente.");
    } finally {
      setPurchasing(null);
    }
  }

  async function handleCryptoPurchase(amount: number) {
    setCryptoLoading(true);
    setPurchasing(amount);

    try {
      const res = await fetch("/api/crypto/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        window.open(data.invoice_url, "_blank");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao criar pagamento crypto.");
      }
    } catch {
      alert("Erro ao criar pagamento. Tente novamente.");
    } finally {
      setCryptoLoading(false);
      setPurchasing(null);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(false);

    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 5000) {
      setWithdrawError("Saque minimo: 5.000 moedas");
      return;
    }
    if (!pixKey.trim()) {
      setWithdrawError("Informe sua chave Pix");
      return;
    }

    setWithdrawing(true);

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, pixKey: pixKey.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setWithdrawSuccess(true);
        setWithdrawAmount("");
        setPixKey("");
        setWithdrawals((prev) => [data, ...prev]);
        setWallet((prev) =>
          prev ? { ...prev, balance: prev.balance - amount } : prev
        );
      } else {
        const data = await res.json();
        setWithdrawError(data.error || "Erro ao solicitar saque.");
      }
    } catch {
      setWithdrawError("Erro ao solicitar saque. Tente novamente.");
    } finally {
      setWithdrawing(false);
    }
  }

  // Calculate earnings for creators
  const earnings =
    wallet?.transactions
      .filter(
        (t) =>
          t.type === "MESSAGE_RECEIVED" ||
          t.type === "GIFT_RECEIVED" ||
          t.type === "COMMENT_RECEIVED" ||
          t.type === "GALLERY_EARNING" ||
          t.type === "MEDIA_EARNING"
      )
      .reduce((sum, t) => sum + t.amount, 0) || 0;

  const totalSpent =
    wallet?.transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

  const totalEarned =
    wallet?.transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0) || 0;

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-black via-purple-950/5 to-black min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/70 backdrop-blur-xl border-b border-gray-800/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
            <span className="text-xs font-extrabold text-amber-900">C</span>
          </div>
          <h1 className="text-xl font-bold text-white">Carteira</h1>
        </div>
      </div>

      {/* Balance */}
      <div className="px-6 pt-2">
        <WalletBalance balance={wallet?.balance || 0} />
      </div>

      {/* Stats Row */}
      <div className="px-6 -mt-2 mb-6 grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/80 border border-gray-800/50 p-4">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-2xl" />
          <p className="text-xs text-gray-500 font-medium">Total Recebido</p>
          <p className="text-lg font-bold text-purple-400 mt-0.5">
            +{totalEarned.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/80 border border-gray-800/50 p-4">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-2xl" />
          <p className="text-xs text-gray-500 font-medium">Total Gasto</p>
          <p className="text-lg font-bold text-red-400 mt-0.5">
            -{totalSpent.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Creator Earnings */}
      {userRole === "CREATOR" && (
        <div className="mx-6 mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-gray-900 to-purple-500/10 border border-purple-500/20 p-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <p className="text-xs text-purple-400/80 font-medium uppercase tracking-wider">Seus Ganhos</p>
              <p className="text-2xl font-bold text-purple-300">
                {earnings.toLocaleString("pt-BR")} <span className="text-sm font-medium text-purple-400/60">moedas</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-purple-500/50 mt-3">
            Total ganho com mensagens, presentes e comentarios
          </p>
        </div>
      )}

      {/* Buy Coins */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-white">Comprar Moedas</h2>
        </div>

        {/* Payment success message */}
        {paymentSuccess && (
          <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <p className="text-sm text-purple-400 font-medium">
                Pagamento enviado! Suas moedas serao creditadas assim que o pagamento for confirmado.
              </p>
            </div>
          </div>
        )}

        {/* Payment method selector */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setPaymentMethod("crypto")}
            className={`relative overflow-hidden flex flex-col items-center gap-2 py-4 px-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
              paymentMethod === "crypto"
                ? "bg-gradient-to-br from-purple-500/20 to-purple-500/10 text-purple-400 border-2 border-purple-500 shadow-lg shadow-purple-500/10"
                : "bg-gray-900/80 text-gray-400 border-2 border-gray-800 hover:border-gray-600"
            }`}
          >
            {paymentMethod === "crypto" && (
              <div className="absolute inset-0 bg-purple-500/5" />
            )}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
              </svg>
            </div>
            <span className="relative">Crypto</span>
          </button>
          <button
            onClick={() => setPaymentMethod("card")}
            className={`relative overflow-hidden flex flex-col items-center gap-2 py-4 px-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
              paymentMethod === "card"
                ? "bg-gradient-to-br from-blue-500/20 to-purple-500/10 text-blue-400 border-2 border-blue-500 shadow-lg shadow-blue-500/10"
                : "bg-gray-900/80 text-gray-400 border-2 border-gray-800 hover:border-gray-600"
            }`}
          >
            {paymentMethod === "card" && (
              <div className="absolute inset-0 bg-blue-500/5" />
            )}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="relative">Cartao / PIX</span>
          </button>
        </div>

        {paymentMethod === "crypto" ? (
          <div className="mb-5 p-3.5 bg-purple-500/5 border border-purple-500/15 rounded-2xl">
            <p className="text-xs text-purple-300/80">
              Pague com BTC, ETH, USDT, SOL e 300+ criptomoedas. Processado por NOWPayments.
            </p>
          </div>
        ) : (
          <div className="mb-5 p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
            <p className="text-xs text-blue-300/80">
              Pague com cartao de credito, debito ou PIX. Processado por Mercado Pago.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {COIN_PACKAGES.map((pkg) => (
            <button
              key={pkg.amount}
              onClick={() => handlePurchase(pkg.amount)}
              disabled={purchasing !== null}
              className={`group w-full relative overflow-hidden flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                pkg.popular
                  ? "border-purple-500/80 bg-gradient-to-r from-purple-500/15 via-purple-500/10 to-purple-500/15 shadow-lg shadow-purple-500/10"
                  : "border-gray-800 hover:border-purple-500/40 bg-gray-900/50 hover:bg-gray-900/80"
              } disabled:opacity-50 disabled:hover:scale-100`}
            >
              {pkg.popular && (
                <div className="absolute inset-0 bg-purple-500/5" />
              )}
              <div className="relative flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    pkg.popular
                      ? "bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30"
                      : "bg-gray-800 group-hover:bg-gray-700"
                  }`}
                >
                  <span className="text-xl font-extrabold text-amber-900">C</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-white">
                    {pkg.amount.toLocaleString("pt-BR")} moedas
                  </p>
                  <div className="flex items-center gap-2">
                    {pkg.popular && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 font-bold uppercase tracking-wider">
                        Mais popular
                      </span>
                    )}
                    {pkg.savings && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">
                        {pkg.savings}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative text-right">
                <p className={`font-bold text-lg ${pkg.popular ? "text-purple-400" : "text-purple-500"}`}>
                  {pkg.price}
                </p>
                {purchasing === pkg.amount && (
                  <div className="mt-1 w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-white">Solicitar Saque</h2>
        </div>
        <div className="relative overflow-hidden p-5 bg-gray-900/80 rounded-2xl border border-gray-800/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
          <form onSubmit={handleWithdraw} className="relative space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Quantidade de moedas (minimo: 5.000)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="5000"
                min="5000"
                className="w-full mt-1.5 px-4 py-3 bg-gray-800/80 rounded-xl border border-gray-700/50 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Chave Pix
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatoria"
                className="w-full mt-1.5 px-4 py-3 bg-gray-800/80 rounded-xl border border-gray-700/50 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
              />
            </div>

            {withdrawError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-xs text-red-400">{withdrawError}</p>
              </div>
            )}
            {withdrawSuccess && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-xs text-purple-400 font-medium">
                  Saque solicitado com sucesso! Aguarde a analise.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={withdrawing}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 disabled:opacity-50 active:scale-[0.98]"
            >
              {withdrawing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                "Solicitar Saque"
              )}
            </button>
          </form>

          {withdrawals.length > 0 && (
            <div className="relative mt-5 pt-5 border-t border-gray-800/50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Seus saques</p>
              <div className="space-y-2.5">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-800/40 hover:bg-gray-800/60 transition-colors">
                    <div>
                      <span className="font-medium text-gray-300">
                        {w.amount.toLocaleString("pt-BR")} moedas
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {timeAgo(w.createdAt)}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        w.status === "PENDING"
                          ? "bg-purple-500/10 text-purple-300"
                          : w.status === "APPROVED"
                          ? "bg-purple-500/20 text-white"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {w.status === "PENDING"
                        ? "Pendente"
                        : w.status === "APPROVED"
                        ? "Aprovado"
                        : "Recusado"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-6 pb-24">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-white">Historico de Transacoes</h2>
        </div>

        {(!wallet?.transactions || wallet.transactions.length === 0) ? (
          <div className="text-center py-12 rounded-2xl bg-gray-900/40 border border-gray-800/30">
            <span className="text-3xl mb-3 block">📭</span>
            <p className="text-gray-500 text-sm">Nenhuma transacao ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallet.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800/30 hover:bg-gray-900/80 hover:border-gray-700/50 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${getTransactionIconBg(tx.type)} flex items-center justify-center`}>
                  <span className="text-lg">{getTransactionIcon(tx.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {getTransactionLabel(tx.type)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {timeAgo(tx.createdAt)}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    tx.amount > 0 ? "text-purple-400" : "text-red-400"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
