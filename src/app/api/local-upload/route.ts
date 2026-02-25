import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Allow larger uploads (photos/videos) - Vercel default is 4.5MB
export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
]);

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 350 * 1024 * 1024; // 350MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo nao permitido. Use imagem, video ou audio." },
      { status: 400 }
    );
  }

  // Validate file size based on type
  let maxSize = MAX_IMAGE_SIZE;
  if (file.type.startsWith("video/")) {
    maxSize = MAX_VIDEO_SIZE;
  } else if (file.type.startsWith("audio/")) {
    maxSize = MAX_AUDIO_SIZE;
  }

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return NextResponse.json(
      { error: `Arquivo muito grande. Maximo ${maxMB}MB.` },
      { status: 400 }
    );
  }

  // Use Vercel Blob in production, local filesystem in dev
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const blob = await put(filename, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json({ url: blob.url });
    } catch (error) {
      console.error("Blob upload error:", error);
      return NextResponse.json(
        { error: "Erro ao enviar arquivo para o storage" },
        { status: 500 }
      );
    }
  }

  // Fallback: local filesystem (development only)
  try {
    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${uniqueName}` });
  } catch (error) {
    console.error("Local upload error:", error);
    return NextResponse.json(
      { error: "Erro ao salvar arquivo" },
      { status: 500 }
    );
  }
}
