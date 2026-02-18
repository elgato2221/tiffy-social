"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const COIN_PACKAGES = [
  { amount: 100, price: "R$ 9,90", popular: false },
  { amount: 500, price: "R$ 39,90", popular: true },
  { amount: 1000, price: "R$ 69,90", popular: false },
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
    default:
      return "Transacao";
  }
}

export default function WalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  const myId = session?.user?.id;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated" || !myId) return;

    async function fetchWallet() {
      try {
        const [walletRes, userRes] = await Promise.all([
          fetch("/api/wallet"),
          fetch(`/api/users/${myId}`),
        ]);

        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWallet(walletData);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUserRole(userData.role || "");
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
    setPurchasing(amount);

    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        setWallet((prev) =>
          prev
            ? {
                ...prev,
                balance: data.balance,
                transactions: [
                  {
                    id: Date.now().toString(),
                    type: "PURCHASE",
                    amount,
                    description: `Purchased ${amount} coins`,
                    createdAt: new Date().toISOString(),
                  },
                  ...prev.transactions,
                ],
              }
            : prev
        );
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao comprar moedas.");
      }
    } catch {
      alert("Erro ao comprar moedas. Tente novamente.");
    } finally {
      setPurchasing(null);
    }
  }

  // Calculate earnings for creators
  const earnings =
    wallet?.transactions
      .filter(
        (t) => t.type === "MESSAGE_RECEIVED" || t.type === "GIFT_RECEIVED"
      )
      .reduce((sum, t) => sum + t.amount, 0) || 0;

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">Carteira</h1>
      </div>

      {/* Balance */}
      <div className="px-6">
        <WalletBalance balance={wallet?.balance || 0} />
      </div>

      {/* Creator Earnings */}
      {userRole === "CREATOR" && (
        <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium">Seus Ganhos</p>
              <p className="text-lg font-bold text-amber-700">
                {earnings.toLocaleString("pt-BR")} moedas
              </p>
            </div>
          </div>
          <p className="text-xs text-amber-500 mt-2">
            Total ganho com mensagens e presentes recebidos
          </p>
        </div>
      )}

      {/* Buy Coins */}
      <div className="px-6 mb-8">
        <h2 className="text-base font-bold text-gray-800 mb-4">
          Comprar Moedas
        </h2>
        <div className="space-y-3">
          {COIN_PACKAGES.map((pkg) => (
            <button
              key={pkg.amount}
              onClick={() => handlePurchase(pkg.amount)}
              disabled={purchasing !== null}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition ${
                pkg.popular
                  ? "border-pink-500 bg-pink-50"
                  : "border-gray-100 hover:border-pink-300 hover:bg-pink-50"
              } disabled:opacity-50`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    pkg.popular
                      ? "bg-pink-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <span className="text-xl">🪙</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800">
                    {pkg.amount.toLocaleString("pt-BR")} moedas
                  </p>
                  {pkg.popular && (
                    <span className="text-xs text-pink-500 font-semibold">
                      Mais popular
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-pink-500">{pkg.price}</p>
                {purchasing === pkg.amount && (
                  <div className="mt-1 w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-6 pb-24">
        <h2 className="text-base font-bold text-gray-800 mb-4">
          Historico de Transacoes
        </h2>

        {(!wallet?.transactions || wallet.transactions.length === 0) ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Nenhuma transacao ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallet.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <span className="text-lg">{getTransactionIcon(tx.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {getTransactionLabel(tx.type)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {timeAgo(tx.createdAt)}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    tx.amount > 0 ? "text-green-500" : "text-red-500"
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
