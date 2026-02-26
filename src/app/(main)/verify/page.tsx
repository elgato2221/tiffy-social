"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/uploadFile";

interface VerificationData {
  verified: boolean;
  cooldownUntil: string | null;
  request: {
    id: string;
    selfieUrl: string;
    status: string;
    reason: string | null;
    createdAt: string;
  } | null;
}

export default function VerifyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const username = session?.user?.username;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/verification");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        console.error("Erro ao buscar verificacao");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [status, router]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setCameraError(
        "Nao foi possivel acessar a camera. Verifique as permissoes do navegador."
      );
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the image (front camera is mirrored)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedPhoto(blob);
          setPreview(URL.createObjectURL(blob));
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    startCamera();
  };

  async function handleSubmit() {
    if (!capturedPhoto) return;

    setSubmitting(true);
    setError(null);

    try {
      const file = new File([capturedPhoto], `verify-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Upload selfie
      const url = await uploadFile(file);

      // Create verification request
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfieUrl: url }),
      });

      if (res.ok) {
        const request = await res.json();
        setData({
          verified: false,
          cooldownUntil: null,
          request: { ...request, reason: null },
        });
        setCapturedPhoto(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
      } else {
        const err = await res.json();
        setError(err.error || "Erro ao enviar verificacao.");
      }
    } catch {
      setError("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already verified
  if (data?.verified) {
    return (
      <div className="bg-white min-h-screen">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Verificacao</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Perfil Verificado</h2>
          <p className="text-gray-500 text-sm mt-2 text-center">
            Seu perfil foi verificado com sucesso. Voce pode publicar videos e conteudo na galeria.
          </p>
          <button
            onClick={() => router.push("/profile")}
            className="mt-6 px-6 py-2.5 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition"
          >
            Ver meu perfil
          </button>
        </div>
      </div>
    );
  }

  // Pending request
  if (data?.request?.status === "PENDING") {
    return (
      <div className="bg-white min-h-screen">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Verificacao</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Aguardando Analise</h2>
          <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">
            Sua selfie foi enviada e esta sendo analisada. Voce sera notificado quando for aprovada.
          </p>
          <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200 max-w-xs">
            <img src={data.request.selfieUrl} alt="Selfie enviada" className="w-full object-cover" />
          </div>
        </div>
      </div>
    );
  }

  // Cooldown active after rejection
  if (data?.cooldownUntil && new Date(data.cooldownUntil) > new Date()) {
    const remaining = Math.ceil(
      (new Date(data.cooldownUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return (
      <div className="bg-white min-h-screen">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Verificacao</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Aguarde para tentar novamente</h2>
          <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">
            Sua verificacao foi recusada. Voce podera enviar uma nova em <span className="text-red-400 font-bold">{remaining} dias</span>.
          </p>
          {data?.request?.reason && (
            <p className="text-xs text-red-400/70 mt-3 text-center">
              Motivo: {data.request.reason}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Rejected - can retry
  const isRejected = data?.request?.status === "REJECTED";

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Verificar Perfil</h1>
      </div>

      <div className="px-6 py-6 max-w-lg mx-auto">
        {/* Rejected notice */}
        {isRejected && (
          <div className="mb-6 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
            <p className="text-sm font-semibold text-red-400">Verificacao recusada</p>
            <p className="text-xs text-red-400/70 mt-1">
              {data?.request?.reason || "Selfie nao atende aos requisitos."}
            </p>
            <p className="text-xs text-red-500/50 mt-2">Tire uma nova selfie seguindo as instrucoes abaixo.</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
          <h3 className="text-sm font-bold text-blue-400 mb-2">Como verificar</h3>
          <ol className="text-xs text-blue-300/80 space-y-2">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Pegue um papel e escreva seu @{username || "username"} e a data de hoje</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Segure o papel ao lado do rosto</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Clique no botao abaixo para abrir a camera e tirar a selfie na hora</span>
            </li>
          </ol>
        </div>

        {/* Camera area */}
        {!cameraActive && !capturedPhoto && (
          <button
            onClick={startCamera}
            className="w-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-2xl hover:border-purple-500 hover:bg-gray-50 transition"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600">Abrir camera</p>
            <p className="text-xs text-gray-500 mt-1">A selfie deve ser tirada na hora</p>
          </button>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="mb-4 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
            <p className="text-sm text-red-400">{cameraError}</p>
          </div>
        )}

        {/* Live camera view */}
        {cameraActive && (
          <div>
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100" style={{ height: "calc(100dvh - 320px)" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Camera overlay guides */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/30 rounded-full" />
              </div>
              {/* Capture button overlay - always visible on top of camera */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-3.5 bg-black/50 backdrop-blur-md text-white font-semibold rounded-xl transition active:scale-[0.98]"
                >
                  Cancelar
                </button>
                <button
                  onClick={takePhoto}
                  className="flex-1 py-3.5 bg-gradient-to-r from-purple-400 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition active:scale-[0.98]"
                >
                  📸 Tirar foto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Captured photo preview */}
        {capturedPhoto && preview && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200">
              <img src={preview} alt="Selfie capturada" className="w-full object-cover" />
            </div>

            <div className="flex gap-3">
              <button
                onClick={retakePhoto}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Tirar outra
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-purple-400 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  "Enviar"
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 mt-4">{error}</p>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
