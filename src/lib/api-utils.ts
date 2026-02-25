import { ZodSchema } from "zod";
import { NextResponse } from "next/server";

export function validateBody<T>(schema: ZodSchema<T>, data: unknown):
  { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || "Dados invalidos";
    return {
      success: false,
      response: NextResponse.json(
        { error: firstError, details: errors },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
