import { z } from "zod";

// Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
export const passwordSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiuscula")
  .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minuscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um numero");

// Registration
export const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(50, "Nome muito longo"),
  username: z.string().min(3, "Username muito curto").max(20, "Username muito longo").regex(/^[a-zA-Z0-9_]+$/, "Username so pode conter letras, numeros e _"),
  email: z.string().email("Email invalido"),
  password: passwordSchema,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
});

// Message send
export const sendMessageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().min(1, "Mensagem vazia").max(2000, "Mensagem muito longa"),
  type: z.enum(["text", "audio", "locked_media", "gift"]).default("text"),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(["photo", "video"]).optional(),
  mediaPrice: z.number().int().min(1).max(10000).optional(),
});

// Unlock chat media
export const unlockChatMediaSchema = z.object({
  messageId: z.string().min(1),
});

// Video create (upload route)
export const createVideoSchema = z.object({
  url: z.string().min(1),
  caption: z.string().max(500).optional(),
  duration: z.number().int().min(1).max(300).optional(),
});

// Comment create
export const createCommentSchema = z.object({
  content: z.string().min(1, "Comentario vazio").max(1000, "Comentario muito longo"),
  parentId: z.string().optional(),
});

// Gift send
export const sendGiftSchema = z.object({
  receiverId: z.string().min(1),
  type: z.string().min(1),
  value: z.number().int().positive(),
});

// Report create
export const createReportSchema = z.object({
  reason: z.string().min(3, "Motivo muito curto").max(500),
  videoId: z.string().optional(),
  commentId: z.string().optional(),
});

// Gallery item create
export const createGalleryItemSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["PHOTO", "VIDEO"]).default("PHOTO"),
  price: z.number().int().min(1).max(10000).default(10),
  caption: z.string().max(300).optional().nullable(),
});

// Gallery unlock
export const unlockGallerySchema = z.object({
  itemId: z.string().min(1),
});

// Follow
export const followSchema = z.object({
  followingId: z.string().min(1),
});

// Wallet purchase
export const purchaseCoinsSchema = z.object({
  amount: z.number().int().positive(),
});

// Withdrawal
export const withdrawalSchema = z.object({
  amount: z.number().int().min(100, "Minimo 100 moedas para saque"),
  withdrawMethod: z.enum(["PIX", "PAYPAL"]),
  pixKey: z.string().min(5, "Chave PIX invalida").max(100).optional(),
  paypalEmail: z.string().email("Email PayPal invalido").optional(),
}).refine(
  (data) => {
    if (data.withdrawMethod === "PIX") return !!data.pixKey;
    if (data.withdrawMethod === "PAYPAL") return !!data.paypalEmail;
    return false;
  },
  { message: "Informe os dados do metodo de saque escolhido" }
);

// User profile update
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(300).optional().nullable(),
  avatar: z.string().optional().nullable(),
  messageCost: z.number().int().min(5).max(100).optional(),
});

// Verification
export const verificationSchema = z.object({
  selfieUrl: z.string().min(1),
});

// Admin verification action
export const adminVerificationSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(500).optional(),
});

// Admin user action
export const adminUserActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["BAN", "SUSPEND", "ACTIVATE", "CHANGE_ROLE"]),
  role: z.enum(["USER", "ADMIN"]).optional(),
  reason: z.string().max(500).optional(),
});

// Admin report action
export const adminReportActionSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
});

// Admin withdrawal action
export const adminWithdrawalActionSchema = z.object({
  withdrawalId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(500).optional(),
});

// Forgot password
export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalido"),
});

// Reset password
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
