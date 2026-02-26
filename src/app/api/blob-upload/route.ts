import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request): Promise<Response> {
  // NOTE: Do NOT check session here at the top level.
  // Vercel Blob sends TWO requests to this route:
  //   1. "blob.generate-client-token" - from browser (has session cookies)
  //   2. "blob.upload-completed" - from Vercel servers (NO session cookies)
  // Auth is checked inside onBeforeGenerateToken instead.

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Auth check here - only runs for token generation (browser request)
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          throw new Error("Nao autenticado");
        }

        return {
          allowedContentTypes: [
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "audio/webm",
            "audio/mp4",
            "audio/mpeg",
            "audio/ogg",
            "audio/wav",
          ],
          maximumSizeInBytes: 350 * 1024 * 1024, // 350MB
        };
      },
      onUploadCompleted: async () => {
        // Called by Vercel servers after upload - no session available here
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error("Blob upload error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
