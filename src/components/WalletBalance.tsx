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
        <span className="text-sm font-bold text-gray-900">
          {balance.toLocaleString("pt-BR")}
        </span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 p-8 mb-6">
      {/* Purple decorative blob (Tuyyo style) */}
      <div className="absolute -top-6 -right-6 w-40 h-40 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full opacity-15 blur-2xl" />
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br from-purple-300 to-purple-500 rounded-full opacity-10 blur-2xl" />

      <div className="relative flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-xl animate-pulse" />
          <CoinIcon size="lg" />
        </div>

        <p className="mt-5 text-5xl font-extrabold text-gray-900 tracking-tight">
          {balance.toLocaleString("pt-BR")}
        </p>
        <p className="text-sm text-gray-500 mt-1 font-medium">moedas disponiveis</p>
        <p className="text-xs text-gray-400 mt-0.5">
          ≈ R$ {(balance * 0.099).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}
