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

export function getMessageCost(senderGender: string): number {
  return senderGender === "MALE" ? 5 : 0;
}

export const GIFT_TYPES = [
  { type: "HEART", emoji: "❤️", value: 5, label: "Coração" },
  { type: "ROSE", emoji: "🌹", value: 10, label: "Rosa" },
  { type: "STAR", emoji: "⭐", value: 25, label: "Estrela" },
  { type: "DIAMOND", emoji: "💎", value: 50, label: "Diamante" },
];
