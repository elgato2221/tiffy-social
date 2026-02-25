export function CoinIcon({ size = "sm" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  const sizes = {
    xs: "w-3.5 h-3.5 text-[7px]",
    sm: "w-5 h-5 text-[10px]",
    md: "w-8 h-8 text-sm",
    lg: "w-16 h-16 text-2xl",
  };
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-500 flex items-center justify-center shadow-sm flex-shrink-0`}
    >
      <span className="font-extrabold text-amber-900 leading-none">C</span>
    </div>
  );
}
