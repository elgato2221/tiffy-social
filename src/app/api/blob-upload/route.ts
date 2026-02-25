import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
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
        // Not reliably called in all environments
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
