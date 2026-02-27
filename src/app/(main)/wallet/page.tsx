"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { timeAgo, MIN_MESSAGE_COST, MAX_MESSAGE_COST } from "@/lib/utils";
import WalletBalance from "@/components/WalletBalance";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { useLanguage } from "@/contexts/LanguageContext";

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
  withdrawMethod: string;
  pixKey?: string;
  paypalEmail?: string;
  status: string;
  createdAt: string;
}

interface WithdrawData {
  withdrawals: WithdrawalRequest[];
  verified: boolean;
  totalEarned: number;
  heldCoins: number;
  availableForWithdrawal: number;
}

/** 1 moeda ≈ R$ 0,099 (base: 100 moedas = R$ 9,90) */
function coinsToReais(coins: number): string {
  return (Math.abs(coins) * 0.099).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
      return "🎯"; // legacy
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

function getTransactionLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case "PURCHASE":
      return t("wallet.txPurchase");
    case "MESSAGE_SENT":
      return t("wallet.txMessageSent");
    case "MESSAGE_RECEIVED":
      return t("wallet.txMessageReceived");
    case "GIFT_SENT":
      return t("wallet.txGiftSent");
    case "GIFT_RECEIVED":
      return t("wallet.txGiftReceived");
    case "COMMENT_SENT":
      return t("wallet.txCommentSent");
    case "COMMENT_RECEIVED":
      return t("wallet.txCommentReceived");
    case "WITHDRAWAL":
      return t("wallet.txWithdrawal");
    case "DAILY_REWARD":
      return t("wallet.txDailyReward");
    case "GALLERY_UNLOCK":
      return t("wallet.txGalleryUnlock");
    case "GALLERY_EARNING":
      return t("wallet.txGalleryEarn");
    case "MEDIA_UNLOCK":
      return t("wallet.txMediaUnlock");
    case "MEDIA_EARNING":
      return t("wallet.txMediaEarn");
    default:
      return t("wallet.txDefault");
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
      return "bg-gray-200";
  }
}

export default function WalletPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WalletPage />
    </Suspense>
  );
}

function WalletPage() {
  const { t } = useLanguage();
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
  const [withdrawMethod, setWithdrawMethod] = useState<"PIX" | "PAYPAL">("PIX");
  const [pixKey, setPixKey] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawData, setWithdrawData] = useState<WithdrawData | null>(null);

  // Message price states
  const [messageCost, setMessageCost] = useState<number>(5);
  const [savingCost, setSavingCost] = useState(false);
  const [costSaved, setCostSaved] = useState(false);
  const [userVerified, setUserVerified] = useState(false);

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
          setMessageCost(userData.messageCost ?? 5);
          setUserVerified(userData.verified ?? false);
        }

        if (withdrawRes.ok) {
          const wd = await withdrawRes.json();
          setWithdrawData(wd);
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
    if (withdrawMethod === "PIX" && !pixKey.trim()) {
      setWithdrawError("Informe sua chave Pix");
      return;
    }
    if (withdrawMethod === "PAYPAL" && !paypalEmail.trim()) {
      setWithdrawError("Informe seu email do PayPal");
      return;
    }

    setWithdrawing(true);

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          withdrawMethod,
          pixKey: withdrawMethod === "PIX" ? pixKey.trim() : undefined,
          paypalEmail: withdrawMethod === "PAYPAL" ? paypalEmail.trim() : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWithdrawSuccess(true);
        setWithdrawAmount("");
        setPixKey("");
        setPaypalEmail("");
        setWithdrawData((prev) =>
          prev ? { ...prev, withdrawals: [data, ...prev.withdrawals], availableForWithdrawal: prev.availableForWithdrawal - amount } : prev
        );
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

  async function handleSaveMessageCost() {
    setSavingCost(true);
    setCostSaved(false);
    try {
      const res = await fetch(`/api/users/${myId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageCost }),
      });
      if (res.ok) {
        setCostSaved(true);
        setTimeout(() => setCostSaved(false), 3000);
      }
    } catch {
      // silently fail
    } finally {
      setSavingCost(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
            <span className="text-xs font-extrabold text-amber-900">T</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t("wallet.title")}</h1>
        </div>
      </div>

      {/* Balance */}
      <div className="px-6 pt-2">
        <WalletBalance balance={wallet?.balance || 0} />
      </div>

      {/* Stats Row */}
      <div className="px-6 -mt-2 mb-6 grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 p-4">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-2xl" />
          <p className="text-xs text-gray-400 font-medium">{t("wallet.totalReceived")}</p>
          <p className="text-lg font-bold text-purple-400 mt-0.5">
            +{totalEarned.toLocaleString("pt-BR")}
          </p>
          <p className="text-[11px] text-gray-400">≈ R$ {coinsToReais(totalEarned)}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 p-4">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-2xl" />
          <p className="text-xs text-gray-400 font-medium">{t("wallet.totalSpent")}</p>
          <p className="text-lg font-bold text-red-400 mt-0.5">
            -{totalSpent.toLocaleString("pt-BR")}
          </p>
          <p className="text-[11px] text-gray-400">≈ R$ {coinsToReais(totalSpent)}</p>
        </div>
      </div>

      {/* Creator Earnings */}
      {userRole === "CREATOR" && (
        <div className="mx-6 mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-white to-purple-50 border border-purple-200 p-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <p className="text-xs text-purple-500 font-medium uppercase tracking-wider">{t("wallet.earnings")}</p>
              <p className="text-2xl font-bold text-purple-600">
                {earnings.toLocaleString("pt-BR")} <span className="text-sm font-medium text-purple-400">{t("common.coins")}</span>
              </p>
              <p className="text-xs text-purple-400/70">≈ R$ {coinsToReais(earnings)}</p>
            </div>
          </div>
          <p className="text-xs text-purple-400 mt-3">
            {t("wallet.earningsDesc")}
          </p>
        </div>
      )}

      {/* Message Price Config - only for verified */}
      {userVerified && (
        <div className="mx-6 mb-6 relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900">{t("wallet.messagePrice")}</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {t("wallet.messagePriceDesc")} ({MIN_MESSAGE_COST}-{MAX_MESSAGE_COST})
          </p>
          <div className="flex items-center gap-2">
            <CoinIcon size="sm" />
            <input
              type="number"
              value={messageCost}
              onChange={(e) => setMessageCost(Math.max(MIN_MESSAGE_COST, Math.min(MAX_MESSAGE_COST, parseInt(e.target.value) || MIN_MESSAGE_COST)))}
              min={MIN_MESSAGE_COST}
              max={MAX_MESSAGE_COST}
              className="flex-1 px-4 py-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-gray-900 text-sm"
            />
            <button
              onClick={handleSaveMessageCost}
              disabled={savingCost}
              className="px-4 py-2.5 bg-purple-500 text-white text-sm font-semibold rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
            >
              {savingCost ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t("common.save")
              )}
            </button>
          </div>
          {costSaved && (
            <p className="text-xs text-green-500 font-medium mt-2">{t("wallet.messagePriceSaved")}</p>
          )}
        </div>
      )}

      {/* Buy Coins */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-gray-900">{t("wallet.buyCoins")}</h2>
        </div>

        {/* Payment success message */}
        {paymentSuccess && (
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <p className="text-sm text-purple-600 font-medium">
                {t("wallet.paymentSent")}
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
                ? "bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 border-2 border-purple-500 shadow-lg shadow-purple-500/10"
                : "bg-gray-50 text-gray-500 border-2 border-gray-200 hover:border-gray-300"
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
            <span className="relative">{t("wallet.crypto")}</span>
          </button>
          <button
            onClick={() => setPaymentMethod("card")}
            className={`relative overflow-hidden flex flex-col items-center gap-2 py-4 px-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
              paymentMethod === "card"
                ? "bg-gradient-to-br from-blue-50 to-purple-50 text-blue-600 border-2 border-blue-500 shadow-lg shadow-blue-500/10"
                : "bg-gray-50 text-gray-500 border-2 border-gray-200 hover:border-gray-300"
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
            <span className="relative">{t("wallet.cardPix")}</span>
          </button>
        </div>

        {paymentMethod === "crypto" ? (
          <div className="mb-5 p-3.5 bg-purple-50 border border-purple-200 rounded-2xl">
            <p className="text-xs text-purple-600">
              {t("wallet.cryptoDesc")}
            </p>
          </div>
        ) : (
          <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-xs text-blue-600">
              {t("wallet.cardDesc")}
            </p>
          </div>
        )}

        {/* Coin Packages - Horizontal Scroll */}
        <div className="overflow-x-auto flex gap-3 pb-4 -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {COIN_PACKAGES.map((pkg) => (
            <button
              key={pkg.amount}
              onClick={() => handlePurchase(pkg.amount)}
              disabled={purchasing !== null}
              className={`min-w-[150px] flex-shrink-0 flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                pkg.popular
                  ? "border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/10"
                  : "border-gray-200 bg-white hover:border-purple-300"
              } disabled:opacity-50 disabled:hover:scale-100`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
                  pkg.popular
                    ? "bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30"
                    : "bg-gray-100"
                }`}
              >
                <span className="text-xl font-extrabold text-amber-900">T</span>
              </div>
              <p className="font-bold text-gray-900 text-sm">
                {pkg.amount.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-gray-500 mb-1">{t("common.coins")}</p>
              {pkg.popular && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 font-bold uppercase tracking-wider mb-1">
                  {t("wallet.mostPopular")}
                </span>
              )}
              {pkg.savings && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold">
                  {pkg.savings}
                </span>
              )}
              <p className={`font-bold text-base mt-2 ${pkg.popular ? "text-purple-500" : "text-purple-500"}`}>
                {pkg.price}
              </p>
              {purchasing === pkg.amount && (
                <div className="mt-1 w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawal Section - only visible for verified users */}
      {withdrawData?.verified ? (
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-lg font-bold text-gray-900">{t("wallet.requestWithdrawal")}</h2>
          </div>

          {/* Withdrawal balance info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-medium">{t("wallet.availableForWithdrawal")}</p>
              <p className="text-lg font-bold text-green-400 mt-0.5">
                {(withdrawData.availableForWithdrawal || 0).toLocaleString("pt-BR")}
              </p>
              <p className="text-[11px] text-gray-400">≈ R$ {coinsToReais(withdrawData.availableForWithdrawal || 0)}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-medium">{t("wallet.onHold")}</p>
              <p className="text-lg font-bold text-amber-400 mt-0.5">
                {(withdrawData.heldCoins || 0).toLocaleString("pt-BR")}
              </p>
              <p className="text-[11px] text-gray-400">≈ R$ {coinsToReais(withdrawData.heldCoins || 0)}</p>
            </div>
          </div>

          {withdrawData.heldCoins > 0 && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-xs text-amber-600">
                {t("wallet.holdDesc")}
              </p>
            </div>
          )}

          <div className="relative overflow-hidden p-5 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
            <form onSubmit={handleWithdraw} className="relative space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Quantidade de moedas (minimo: 5.000)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="5000"
                  min="5000"
                  className="w-full mt-1.5 px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                />
              </div>

              {/* Withdraw method selector */}
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">
                  {t("wallet.withdrawMethod")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod("PIX")}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      withdrawMethod === "PIX"
                        ? "bg-gradient-to-br from-green-50 to-green-100 text-green-600 border-2 border-green-500 shadow-lg shadow-green-500/10"
                        : "bg-gray-100 text-gray-500 border-2 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 512 512" fill="currentColor">
                      <path d="M346.3 271.8l-60.1-60.1c-4.6-4.6-12.1-4.6-16.8 0l-60.1 60.1c-4.6 4.6-4.6 12.1 0 16.8l60.1 60.1c4.6 4.6 12.1 4.6 16.8 0l60.1-60.1c4.6-4.6 4.6-12.1 0-16.8zm91.2-91.2l-60.1-60.1c-4.6-4.6-12.1-4.6-16.8 0L256 225.1 151.4 120.5c-4.6-4.6-12.1-4.6-16.8 0l-60.1 60.1c-4.6 4.6-4.6 12.1 0 16.8L179.1 302l-104.6 104.6c-4.6 4.6-4.6 12.1 0 16.8l60.1 60.1c4.6 4.6 12.1 4.6 16.8 0L256 378.9l104.6 104.6c4.6 4.6 12.1 4.6 16.8 0l60.1-60.1c4.6-4.6 4.6-12.1 0-16.8L332.9 302l104.6-104.6c4.6-4.6 4.6-12.1 0-16.8z" />
                    </svg>
                    PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod("PAYPAL")}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      withdrawMethod === "PAYPAL"
                        ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border-2 border-blue-500 shadow-lg shadow-blue-500/10"
                        : "bg-gray-100 text-gray-500 border-2 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
                    </svg>
                    PayPal
                  </button>
                </div>
              </div>

              {/* Dynamic field based on method */}
              {withdrawMethod === "PIX" ? (
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {t("wallet.pixKey")}
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CPF, e-mail, telefone ou chave aleatoria"
                    className="w-full mt-1.5 px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {t("wallet.paypalEmail")}
                  </label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full mt-1.5 px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                  />
                </div>
              )}

              {withdrawError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-500">{withdrawError}</p>
                </div>
              )}
              {withdrawSuccess && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="text-xs text-purple-600 font-medium">
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
                  t("wallet.requestWithdrawal")
                )}
              </button>
            </form>

            {withdrawData.withdrawals.length > 0 && (
              <div className="relative mt-5 pt-5 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("wallet.yourWithdrawals")}</p>
                <div className="space-y-2.5">
                  {withdrawData.withdrawals.map((w) => (
                    <div key={w.id} className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                      <div>
                        <span className="font-medium text-gray-600">
                          {w.amount.toLocaleString("pt-BR")} {t("common.coins")}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          (≈ R$ {coinsToReais(w.amount)})
                        </span>
                        <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full font-semibold ${
                          w.withdrawMethod === "PAYPAL" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"
                        }`}>
                          {w.withdrawMethod === "PAYPAL" ? "PayPal" : "PIX"}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {timeAgo(w.createdAt)}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          w.status === "PENDING"
                            ? "bg-purple-50 text-purple-500"
                            : w.status === "APPROVED"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {w.status === "PENDING"
                          ? t("wallet.pending")
                          : w.status === "APPROVED"
                          ? t("wallet.approved")
                          : t("wallet.rejected")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : withdrawData && !withdrawData.verified ? (
        <div className="px-6 mb-8">
          <div className="relative overflow-hidden p-5 bg-gray-50 rounded-2xl border border-purple-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
            <div className="relative flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{t("wallet.verifyToWithdraw")}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("wallet.verifyRequiredDesc")}
                </p>
              </div>
              <button
                onClick={() => router.push("/verify")}
                className="mt-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98]"
              >
                {t("wallet.verifyProfile")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Transaction History */}
      <div className="px-6 pb-24">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-gray-900">{t("wallet.transactionHistory")}</h2>
        </div>

        {(!wallet?.transactions || wallet.transactions.length === 0) ? (
          <div className="text-center py-12 rounded-2xl bg-gray-50 border border-gray-200">
            <span className="text-3xl mb-3 block">📭</span>
            <p className="text-gray-400 text-sm">{t("wallet.noTransactions")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallet.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${getTransactionIconBg(tx.type)} flex items-center justify-center`}>
                  <span className="text-lg">{getTransactionIcon(tx.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getTransactionLabel(tx.type, t)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {timeAgo(tx.createdAt)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-bold ${
                      tx.amount > 0 ? "text-purple-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    ≈ R$ {coinsToReais(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
