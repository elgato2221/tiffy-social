export function formatCoins(amount: number): string {
  return `${amount} moedas`;
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "agora";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return d.toLocaleDateString("pt-BR");
}

export const COMMENT_COST = 10;
export const MESSAGE_COST = 5;
export const AUDIO_COST = 25;
export const PLATFORM_FEE = 0.3; // 30% fee - receiver gets 70%

/**
 * Resize an image file to a target aspect ratio and max resolution.
 * ratio "4:5" → 1080x1350, ratio "1:1" → 1080x1080
 */
export function resizeImage(
  file: File,
  ratio: "4:5" | "1:1" = "4:5"
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1080;
      const maxH = ratio === "4:5" ? 1350 : 1080;

      const canvas = document.createElement("canvas");
      canvas.width = maxW;
      canvas.height = maxH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      // Cover crop: scale to fill, then center crop
      const scale = Math.max(maxW / img.width, maxH / img.height);
      const sw = maxW / scale;
      const sh = maxH / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, maxW, maxH);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Failed to create blob"));
          const resized = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
          });
          resolve(resized);
        },
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export const GIFT_TYPES = [
  { type: "HEART", emoji: "❤️", value: 5, label: "Coração" },
  { type: "ROSE", emoji: "🌹", value: 10, label: "Rosa" },
  { type: "FLOWERS", emoji: "💐", value: 100, label: "Flores" },
  { type: "PERFUME", emoji: "🧴", value: 200, label: "Perfume" },
  { type: "TEDDY_BEAR", emoji: "🧸", value: 500, label: "Ursinho" },
  { type: "IPHONE", emoji: "📱", value: 1000, label: "iPhone" },
  { type: "CAR", emoji: "🚗", value: 2000, label: "Carro" },
  { type: "MANSION", emoji: "🏰", value: 5000, label: "Mansão" },
  { type: "YACHT", emoji: "🛥️", value: 10000, label: "Iate" },
];
