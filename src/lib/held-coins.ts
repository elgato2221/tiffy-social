import prisma from "@/lib/prisma";

/**
 * Check if a sender has coins from recent credit card purchases (still in hold period).
 * If so, return the heldUntil date to propagate to the receiver's earning transaction.
 * PIX purchases have no hold (heldUntil is null), so they won't affect receivers.
 */
export async function getHeldUntilForSender(senderId: string): Promise<Date | null> {
  const heldPurchase = await prisma.transaction.findFirst({
    where: {
      userId: senderId,
      type: "PURCHASE",
      heldUntil: { gt: new Date() },
    },
    orderBy: { heldUntil: "desc" },
    select: { heldUntil: true },
  });

  return heldPurchase?.heldUntil || null;
}
