"use client";

import { useState } from "react";
import { GIFT_TYPES } from "@/lib/utils";

interface GiftModalProps {
  receiverId: string;
  receiverName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GiftModal({
  receiverId,
  receiverName,
  isOpen,
  onClose,
}: GiftModalProps) {
  const [sendingGift, setSendingGift] = useState(false);
  const [giftSent, setGiftSent] = useState<string | null>(null);

  function handleClose() {
    setGiftSent(null);
    onClose();
  }

  async function handleSendGift(gift: (typeof GIFT_TYPES)[number]) {
    setSendingGift(true);
    setGiftSent(null);

    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          type: gift.type,
          value: gift.value,
        }),
      });

      if (res.ok) {
        setGiftSent(gift.label);
        setTimeout(() => {
          setGiftSent(null);
          onClose();
        }, 1500);
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao enviar presente.");
      }
    } catch {
      alert("Erro ao enviar presente. Tente novamente.");
    } finally {
      setSendingGift(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">
            Enviar Presente para {receiverName}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {giftSent ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-lg font-semibold text-gray-800">
              {giftSent} enviado com sucesso!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {GIFT_TYPES.map((gift) => (
              <button
                key={gift.type}
                onClick={() => handleSendGift(gift)}
                disabled={sendingGift}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-pink-300 hover:bg-pink-50 transition disabled:opacity-50"
              >
                <span className="text-3xl">{gift.emoji}</span>
                <span className="text-xs font-semibold text-gray-700">
                  {gift.label}
                </span>
                <span className="text-xs text-pink-500 font-bold flex items-center gap-0.5">
                  🪙 {gift.value}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
