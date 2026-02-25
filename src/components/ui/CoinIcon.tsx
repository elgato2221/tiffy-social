export function CoinIcon({ size = "sm" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  const sizes = {
    xs: "w-3.5 h-3.5 text-[7px]",
    sm: "w-5 h-5 text-[10px]",
    md: "w-8 h-8 text-sm",
    lg: "w-16 h-16 text-2xl",
  };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0 relative`}
      style={{
        background: "linear-gradient(145deg, #fcd34d, #f59e0b, #d97706)",
        boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.25), inset 2px 2px 4px rgba(255,255,255,0.35), 0 2px 6px rgba(245,158,11,0.4)",
      }}
    >
      <div
        className="absolute inset-[1px] rounded-full"
        style={{
          background: "linear-gradient(145deg, #fde68a, #fbbf24, #d97706)",
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4)",
        }}
      />
      <span className="font-extrabold text-amber-900 leading-none relative z-10 drop-shadow-[0_1px_0px_rgba(255,255,255,0.3)]">T</span>
    </div>
  );
}
