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
        <span className="text-sm font-bold text-yellow-600">
          {balance.toLocaleString("pt-BR")}
        </span>
        <span className="text-xs text-gray-400">moedas</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
          <span className="text-4xl">🪙</span>
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-yellow-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029C10.792 13.807 10.304 14 10 14c-.304 0-.792-.193-1.264-.979a5.67 5.67 0 01-.421-.821H10a1 1 0 100-2H7.958a7.3 7.3 0 010-1H10a1 1 0 100-2H8.315c.163-.29.346-.559.421-.821z" />
          </svg>
        </div>
      </div>
      <p className="mt-4 text-4xl font-extrabold text-gray-800">
        {balance.toLocaleString("pt-BR")}
      </p>
      <p className="text-sm text-gray-400 mt-1">moedas</p>
    </div>
  );
}
