"use client";

import { CoinIcon } from "@/components/ui/CoinIcon";

interface WalletBalanceProps {
  balance: number;
  compact?: boolean;
}

export default function WalletBalance({ balance, compact = false }: WalletBalanceProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <CoinIcon size="sm" />
        <span className="text-sm font-bold text-white">
          {balance.toLocaleString("pt-BR")}
        </span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-amber-950/30 border border-gray-800/60 p-8 mb-6">
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/8 rounded-full blur-3xl" />

      <div className="relative flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
          <CoinIcon size="lg" />
        </div>

        <p className="mt-5 text-5xl font-extrabold text-white tracking-tight">
          {balance.toLocaleString("pt-BR")}
        </p>
        <p className="text-sm text-gray-400 mt-1 font-medium">moedas disponiveis</p>
      </div>
    </div>
  );
}
