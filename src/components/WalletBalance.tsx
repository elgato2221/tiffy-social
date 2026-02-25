"use client";

interface WalletBalanceProps {
  balance: number;
  compact?: boolean;
}

export default function WalletBalance({ balance, compact = false }: WalletBalanceProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-lg">🪙</span>
        <span className="text-sm font-bold text-purple-400">
          {balance.toLocaleString("pt-BR")}
        </span>
        <span className="text-xs text-gray-400">moedas</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/40 border border-gray-800/60 p-8 mb-6">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative flex flex-col items-center">
        {/* Coin circle */}
        <div className="relative">
          <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30 ring-4 ring-purple-400/20">
            <span className="text-3xl">🪙</span>
          </div>
        </div>

        {/* Balance amount */}
        <p className="mt-5 text-5xl font-extrabold text-white tracking-tight">
          {balance.toLocaleString("pt-BR")}
        </p>
        <p className="text-sm text-gray-400 mt-1 font-medium">moedas disponiveis</p>
      </div>
    </div>
  );
}
