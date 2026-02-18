"use client";

import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  name,
  required,
  className = "",
  ...rest
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-0.5 text-pink-500">*</span>}
        </label>
      )}

      <input
        id={name}
        name={name}
        required={required}
        className={`
          w-full rounded-xl border px-4 py-3 text-sm text-gray-900
          placeholder:text-gray-400
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500
          ${error ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"}
          ${className}
        `}
        {...rest}
      />

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
