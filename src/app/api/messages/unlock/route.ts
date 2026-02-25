import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PLATFORM_FEE } from "@/lib/utils";
import { unlockChatMediaSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const validation = validateBody(unlockChatMediaSchema, body);
    if (!validation.success) return validation.response;
    const { messageId } = validation.data;

    const message = await prisma.message.findUnique({ where: { id: messageId } });

    if (!message || message.type !== "locked_media" || !message.mediaPrice) {
      return NextResponse.json({ error: "Mensagem invalida" }, { status: 400 });
    }
    if (message.mediaUnlocked) {
      return NextResponse.json({ error: "Ja desbloqueada" }, { status: 400 });
    }
    if (message.receiverId !== userId) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
    if (!buyer || buyer.coins < message.mediaPrice) {
      return NextResponse.json({ error: "Moedas insuficientes" }, { status: 403 });
    }

    const platformFee = Math.floor(message.mediaPrice * PLATFORM_FEE);
    const sellerAmount = message.mediaPrice - platformFee;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { coins: { decrement: message.mediaPrice! } } });
      await tx.user.update({ where: { id: message.senderId }, data: { coins: { increment: sellerAmount } } });
      await tx.message.update({ where: { id: messageId }, data: { mediaUnlocked: true, mediaUnlockedBy: userId } });

      await tx.transaction.create({
        data: { userId, type: "MEDIA_UNLOCK", amount: -message.mediaPrice!, description: "Midia desbloqueada no chat" },
      });
      await tx.transaction.create({
        data: { userId: message.senderId, type: "MEDIA_EARNING", amount: sellerAmount, description: "Ganho de midia no chat" },
      });
    });

    return NextResponse.json({ success: true, mediaUrl: message.mediaUrl });
  } catch {
    return NextResponse.json({ error: "Erro ao desbloquear" }, { status: 500 });
  }
}
