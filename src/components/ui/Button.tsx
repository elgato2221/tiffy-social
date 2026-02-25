"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg",
  secondary:
    "bg-gray-200 hover:bg-gray-300 text-gray-800",
  ghost:
    "bg-transparent hover:bg-gray-100 text-gray-700",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        rounded-full px-6 py-3 font-semibold text-sm
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${className}
      `}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
