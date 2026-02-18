import Image from "next/image";

type Size = "sm" | "md" | "lg";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: Size;
  online?: boolean;
}

const sizeStyles: Record<Size, { container: string; text: string; dot: string }> = {
  sm: {
    container: "w-8 h-8",
    text: "text-xs",
    dot: "w-2.5 h-2.5 border-[1.5px]",
  },
  md: {
    container: "w-12 h-12",
    text: "text-base",
    dot: "w-3 h-3 border-2",
  },
  lg: {
    container: "w-20 h-20",
    text: "text-2xl",
    dot: "w-4 h-4 border-2",
  },
};

export default function Avatar({
  src,
  name,
  size = "md",
  online,
}: AvatarProps) {
  const styles = sizeStyles[size];
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className={`relative inline-flex shrink-0 ${styles.container}`}>
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="rounded-full object-cover"
        />
      ) : (
        <div
          className={`
            flex items-center justify-center rounded-full
            bg-gradient-to-br from-pink-400 to-rose-500
            text-white font-semibold select-none
            ${styles.container} ${styles.text}
          `}
        >
          {initial}
        </div>
      )}

      {online && (
        <span
          className={`
            absolute bottom-0 right-0 rounded-full
            bg-green-500 border-white
            ${styles.dot}
          `}
        />
      )}
    </div>
  );
}
