"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function DailyRewardModal() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [canClaim, setCanClaim] = useState(false);
  const [amount, setAmount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [claimedStreak, setClaimedStreak] = useState(0);

  useEffect(() => {
    if (!session) return;

    const checkReward = async () => {
      try {
        const res = await fetch("/api/rewards");
        const data = await res.json();

        setCanClaim(data.canClaim);
        setAmount(data.amount ?? 0);
        setStreak(data.streak ?? 0);
      } catch (error) {
        console.error("Erro ao verificar recompensa diaria:", error);
      } finally {
        setLoading(false);
      }
    };

    checkReward();
  }, [session]);

  const handleClaim = async () => {
    try {
      const res = await fetch("/api/rewards", { method: "POST" });
      const data = await res.json();

      setClaimedAmount(data.amount ?? amount);
      setClaimedStreak(data.streak ?? streak + 1);
      setClaimed(true);
    } catch (error) {
      console.error("Erro ao resgatar recompensa:", error);
    }
  };

  if (loading || !canClaim) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-sm mx-auto rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-2xl">
        {/* Unclaimed state */}
        {!claimed && (
          <div className="flex flex-col items-center text-center">
            <span className="text-5xl mb-3">🎁</span>
            <h2 className="text-2xl font-bold text-purple-400 mb-1">
              Recompensa Diaria!
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Volte todos os dias para ganhar ainda mais!
            </p>

            <div className="mb-5 flex w-full items-center justify-around rounded-2xl bg-gray-800 py-4">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium uppercase text-gray-400">
                  Sequencia
                </span>
                <span className="text-2xl font-bold text-purple-400">
                  {streak} {streak === 1 ? "dia" : "dias"}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-700" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium uppercase text-gray-400">
                  Recompensa
                </span>
                <span className="text-2xl font-bold text-purple-400">
                  {amount} moedas
                </span>
              </div>
            </div>

            <button
              onClick={handleClaim}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-400 to-purple-600 py-3 text-lg font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-purple-700 active:scale-95"
            >
              Resgatar
            </button>
          </div>
        )}

        {/* Claimed state */}
        {claimed && (
          <div className="flex flex-col items-center text-center">
            <span className="text-5xl mb-3">🎉</span>
            <h2 className="text-2xl font-bold text-purple-400 mb-1">
              Resgatado!
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Voce ganhou sua recompensa de hoje!
            </p>

            <div className="mb-5 flex w-full items-center justify-around rounded-2xl bg-gray-800 py-4">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium uppercase text-gray-400">
                  Sequencia
                </span>
                <span className="text-2xl font-bold text-purple-400">
                  {claimedStreak} {claimedStreak === 1 ? "dia" : "dias"}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-700" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium uppercase text-gray-400">
                  Ganhou
                </span>
                <span className="text-2xl font-bold text-purple-400">
                  +{claimedAmount} moedas
                </span>
              </div>
            </div>

            <button
              onClick={() => setCanClaim(false)}
              className="w-full rounded-2xl border-2 border-purple-500 py-3 text-lg font-semibold text-purple-400 transition hover:bg-gray-800 active:scale-95"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
