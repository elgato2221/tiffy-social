"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [destination, setDestination] = useState<"FEED" | "PROFILE">("FEED");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated" || !session?.user?.id) return;
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then((d) => setVerified(d.verified || false))
      .catch(() => setVerified(false));
  }, [status, session, router]);

  const MAX_SIZE = 350 * 1024 * 1024; // 350MB
  const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

  const handleFile = useCallback((selectedFile: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Formato nao suportado. Use MP4, WebM ou MOV.");
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setError("Arquivo muito grande. Maximo 350MB.");
      return;
    }

    // Validate aspect ratio - only vertical videos (9:16 Reels format)
    const url = URL.createObjectURL(selectedFile);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const { videoWidth, videoHeight } = video;
      if (videoWidth >= videoHeight) {
        setError("Apenas videos verticais (formato Reels 9:16). Grave seu video em pe!");
        URL.revokeObjectURL(url);
        return;
      }
      setFile(selectedFile);
      setPreview(url);
    };
    video.onerror = () => {
      setError("Nao foi possivel ler o video. Tente outro arquivo.");
      URL.revokeObjectURL(url);
    };
    video.src = url;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file || !session) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Upload file locally
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/local-upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Erro ao enviar arquivo");
      const { url } = await uploadRes.json();

      setProgress(80);

      // Step 2: Create video record with the local URL
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, caption, destination }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao publicar video");
      }

      setProgress(100);

      if (destination === "FEED") {
        setUploadSuccess(true);
      } else {
        setTimeout(() => {
          router.push("/profile");
        }, 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
      setUploading(false);
      setProgress(0);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Upload success for feed posts (pending review)
  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-black pb-24">
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800">
          <div className="mx-auto max-w-lg px-4 py-4">
            <h1 className="text-center text-lg font-bold text-white">Novo Video</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Video enviado!</h2>
          <p className="text-gray-400 text-sm mt-2 text-center max-w-xs">
            Seu video foi enviado para analise. Ele aparecera no feed apos aprovacao.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setUploadSuccess(false);
                setFile(null);
                setPreview(null);
                setCaption("");
                setProgress(0);
                setUploading(false);
              }}
              className="px-6 py-2.5 bg-gray-800 text-white font-semibold rounded-xl transition hover:bg-gray-700"
            >
              Postar outro
            </button>
            <Link
              href="/profile"
              className="px-6 py-2.5 bg-gradient-to-r from-purple-400 to-purple-600 text-white font-semibold rounded-xl shadow-md transition hover:scale-105"
            >
              Meu perfil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not verified - show block
  if (verified === false) {
    return (
      <div className="min-h-screen bg-black pb-24">
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800">
          <div className="mx-auto max-w-lg px-4 py-4">
            <h1 className="text-center text-lg font-bold text-white">Novo Video</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Perfil nao verificado</h2>
          <p className="text-gray-400 text-sm mt-2 text-center max-w-xs">
            Verifique seu perfil para publicar videos na plataforma.
          </p>
          <Link
            href="/verify"
            className="mt-6 px-6 py-2.5 bg-gradient-to-r from-purple-400 to-purple-600 text-white font-semibold rounded-xl shadow-md transition hover:scale-105"
          >
            Verificar agora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="mx-auto max-w-lg px-4 py-4">
          <h1 className="text-center text-lg font-bold text-white">
            Novo Video
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Upload area */}
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all ${
              dragActive
                ? "border-purple-500 bg-purple-500/10"
                : "border-gray-700 bg-gray-900 hover:border-purple-500 hover:bg-gray-800/50"
            }`}
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="mb-1 text-base font-semibold text-gray-300">
              {dragActive ? "Solte o video aqui" : "Selecione um video"}
            </p>
            <p className="text-sm text-gray-500">
              MP4, WebM ou MOV - Formato vertical (9:16) - Max 350MB
            </p>
            <button
              type="button"
              className="mt-4 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 px-6 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/25 transition-transform hover:scale-105 active:scale-95"
            >
              Escolher arquivo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video preview - Reels format */}
            <div className="relative overflow-hidden rounded-2xl bg-black mx-auto max-w-[280px] aspect-[9/16]">
              <video
                src={preview!}
                controls
                className="w-full h-full object-cover"
                playsInline
              />
              {!uploading && (
                <button
                  onClick={removeFile}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* File info */}
            <div className="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-gray-300">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Legenda
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva uma legenda..."
                maxLength={300}
                rows={3}
                disabled={uploading}
                className="w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
              />
              <p className="mt-1 text-right text-xs text-gray-500">
                {caption.length}/300
              </p>
            </div>

            {/* Destination selector */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Onde publicar
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDestination("FEED")}
                  disabled={uploading}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition border ${
                    destination === "FEED"
                      ? "bg-purple-500/20 border-purple-500 text-purple-400"
                      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
                  } disabled:opacity-50`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>Feed</span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      Precisa aprovacao
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDestination("PROFILE")}
                  disabled={uploading}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition border ${
                    destination === "PROFILE"
                      ? "bg-purple-500/20 border-purple-500 text-purple-400"
                      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
                  } disabled:opacity-50`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>Meu Perfil</span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      Visivel imediatamente
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {progress < 80 ? "Enviando video..." : progress < 100 ? "Finalizando..." : "Concluido!"}
                  </span>
                  <span className="font-medium text-purple-500">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Publish button */}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full rounded-xl bg-gradient-to-r from-purple-400 to-purple-600 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/40 active:scale-[0.98] disabled:opacity-60 disabled:shadow-none"
            >
              {uploading ? "Publicando..." : "Publicar"}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
