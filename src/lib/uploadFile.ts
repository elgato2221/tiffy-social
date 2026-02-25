/**
 * Upload a file using Vercel Blob client-side upload (production)
 * with fallback to /api/local-upload (development).
 *
 * Client-side upload bypasses the 4.5MB Vercel serverless body limit.
 */
export async function uploadFile(file: File): Promise<string> {
  // Try Vercel Blob client-side upload first
  try {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/blob-upload",
    });
    return blob.url;
  } catch {
    // Fallback: local upload (dev or if Blob is not configured)
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/local-upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Erro ao enviar arquivo");
    }
    const data = await res.json();
    return data.url;
  }
}
