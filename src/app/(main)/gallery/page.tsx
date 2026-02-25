"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resizeImage } from "@/lib/utils";

interface GalleryItem {
  id: string;
  url: string;
  type: string;
  price: number;
  caption: string | null;
  createdAt: string;
  unlocked: boolean;
  userId: string;
}

export default function MyGalleryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [verified, setVerified] = useState<boolean | null>(null);

  // Form state
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const [formType, setFormType] = useState("PHOTO");
  const [formPrice, setFormPrice] = useState("10");
  const [formCaption, setFormCaption] = useState("");
  const [formRatio, setFormRatio] = useState<"4:5" | "1:1">("4:5");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated") return;

    async function fetchGallery() {
      try {
        const res = await fetch("/api/gallery");
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
        // Check verification status
        const vRes = await fetch("/api/verification");
        if (vRes.ok) {
          const vData = await vRes.json();
          setVerified(vData.verified);
        }
      } catch (error) {
        console.error("Erro ao carregar galeria:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchGallery();
  }, [status, router]);

  function resetForm() {
    setFormFile(null);
    if (formPreview) URL.revokeObjectURL(formPreview);
    setFormPreview(null);
    setFormType("PHOTO");
    setFormPrice("10");
    setFormCaption("");
    setFormRatio("4:5");
    setFormError(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError(null);

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      setFormError("Use imagem (JPG, PNG, WebP) ou video (MP4, WebM, MOV).");
      return;
    }

    if (file.size > 350 * 1024 * 1024) {
      setFormError("Arquivo muito grande. Maximo 350MB.");
      return;
    }

    setFormFile(file);
    setFormType(isVideo ? "VIDEO" : "PHOTO");
    setFormPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formFile) {
      setFormError("Selecione um arquivo.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setUploadProgress(0);

    try {
      // Step 1: Resize image if photo, then upload locally
      let fileToUpload = formFile;
      if (formType === "PHOTO") {
        try {
          fileToUpload = await resizeImage(formFile, formRatio);
        } catch {
          // If resize fails, upload original
        }
      }
      const formDataUpload = new FormData();
      formDataUpload.append("file", fileToUpload);
      const uploadRes = await fetch("/api/local-upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!uploadRes.ok) throw new Error("Erro ao enviar arquivo");
      const { url } = await uploadRes.json();

      setUploadProgress(80);

      // Step 2: Create gallery item with local URL
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          type: formType,
          price: parseInt(formPrice) || 10,
          caption: formCaption.trim() || null,
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setUploadProgress(100);
        setItems((prev) => [
          {
            id: newItem.id,
            url: newItem.url,
            type: newItem.type,
            price: newItem.price,
            caption: newItem.caption,
            createdAt: newItem.createdAt,
            unlocked: true,
            userId: newItem.userId,
          },
          ...prev,
        ]);
        resetForm();
        setShowModal(false);
      } else {
        const data = await res.json();
        setFormError(data.error || "Erro ao adicionar item.");
      }
    } catch {
      setFormError("Erro ao fazer upload. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Minha Galeria</h1>
        {verified && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-400 to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md shadow-purple-500/25 transition-transform hover:scale-105 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Adicionar
          </button>
        )}
      </div>

      {/* Verification Banner */}
      {verified === false && (
        <div className="mx-4 mt-4 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
          <p className="text-sm font-semibold text-purple-400">Perfil nao verificado</p>
          <p className="text-xs text-purple-500/70 mt-1">Verifique seu perfil para publicar conteudo na galeria.</p>
          <Link href="/verify" className="inline-block mt-2 text-xs font-semibold text-purple-500 hover:text-purple-400">
            Verificar agora →
          </Link>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="px-4 py-6 pb-24">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">
              Sua galeria esta vazia
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Adicione fotos e videos para seus fas
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 bg-gradient-to-r from-purple-400 to-purple-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-md shadow-purple-500/25 transition-transform hover:scale-105 active:scale-95"
            >
              Adicionar primeiro item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-800">
                  {item.url ? (
                    item.type === "VIDEO" ? (
                      <video
                        src={`${item.url}#t=0.1`}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="auto"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.caption || "Galeria"}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Price Badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full">
                    <span className="text-purple-400 text-[10px]">🪙</span>
                    {item.price}
                  </div>

                  {/* Video indicator */}
                  {item.type === "VIDEO" && (
                    <div className="absolute bottom-2 left-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white drop-shadow-lg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {item.caption && (
                  <p className="text-xs text-gray-400 mt-1.5 px-0.5 truncate">
                    {item.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">
                Novo Item da Galeria
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-300 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Arquivo
                </label>
                {!formFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-purple-500 hover:bg-gray-800/50 transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-gray-500 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <p className="text-sm font-medium text-gray-400">
                      Selecionar foto ou video
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, WebP, MP4, WebM, MOV
                    </p>
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-gray-800">
                    {formType === "VIDEO" ? (
                      <video
                        src={formPreview!}
                        className="w-full max-h-48 object-contain bg-black"
                        controls
                        playsInline
                      />
                    ) : (
                      <img
                        src={formPreview!}
                        alt="Preview"
                        className="w-full max-h-48 object-contain"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFormFile(null);
                        if (formPreview) URL.revokeObjectURL(formPreview);
                        setFormPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {formType === "VIDEO" ? "Video" : "Foto"}
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Aspect Ratio (only for photos) */}
              {formType === "PHOTO" && formFile && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Proporcao
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormRatio("4:5")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                        formRatio === "4:5"
                          ? "bg-purple-500 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      4:5 Retrato
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormRatio("1:1")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                        formRatio === "1:1"
                          ? "bg-purple-500 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      1:1 Quadrado
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formRatio === "4:5" ? "1080 x 1350 px" : "1080 x 1080 px"}
                  </p>
                </div>
              )}

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Preco (moedas)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-purple-500 text-sm">🪙</span>
                  </div>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    min="1"
                    required
                    placeholder="10"
                    className="w-full pl-12 pr-4 py-3 border border-gray-700 bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Legenda
                  <span className="text-gray-500 font-normal"> (opcional)</span>
                </label>
                <textarea
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  rows={3}
                  maxLength={200}
                  placeholder="Descreva seu conteudo..."
                  className="w-full px-4 py-3 border border-gray-700 bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-white placeholder-gray-500 resize-none"
                />
                <p className="text-right text-xs text-gray-500 mt-1">
                  {formCaption.length}/200
                </p>
              </div>

              {/* Error */}
              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}

              {/* Upload Progress */}
              {submitting && uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Enviando...</span>
                    <span className="text-purple-500 font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="flex-1 py-2.5 border border-gray-700 text-gray-300 font-semibold rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formFile}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-400 to-purple-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-purple-700 transition disabled:opacity-50 shadow-md shadow-purple-500/25"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    "Publicar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
