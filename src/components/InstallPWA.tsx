"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 3 * 24 * 60 * 60 * 1000) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (ios) {
      // On iOS, show banner after a short delay (no beforeinstallprompt event)
      const isInStandalone = ("standalone" in navigator) && (navigator as unknown as { standalone: boolean }).standalone;
      if (!isInStandalone) {
        setTimeout(() => setShowBanner(true), 3000);
      }
      return;
    }

    // Android/Chrome - listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  async function handleInstall() {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-dismissed", Date.now().toString());
  }

  if (!showBanner) return null;

  // iOS guide modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}>
        <div className="w-full max-w-md bg-gray-900 border-t border-gray-700 rounded-t-3xl p-6 pb-10 animate-slide-up"
          onClick={(e) => e.stopPropagation()}>
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-5" />
          <h3 className="text-lg font-bold text-white text-center mb-4">
            Instalar Tiffy Social
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-400">1</span>
              </div>
              <p className="text-sm text-gray-300">
                Toque no botao <span className="inline-flex items-center mx-1">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
                  </svg>
                </span> Compartilhar
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-400">2</span>
              </div>
              <p className="text-sm text-gray-300">
                Role e toque em <span className="font-semibold text-white">&quot;Adicionar a Tela de Inicio&quot;</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-400">3</span>
              </div>
              <p className="text-sm text-gray-300">
                Toque em <span className="font-semibold text-white">&quot;Adicionar&quot;</span> para confirmar
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full mt-6 py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition"
          >
            Entendi
          </button>
        </div>
      </div>
    );
  }

  // Install banner
  return (
    <div className="fixed bottom-20 lg:bottom-4 left-3 right-3 z-50 mx-auto max-w-md animate-slide-up">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl shadow-purple-500/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">T</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Instalar Tiffy Social</p>
            <p className="text-xs text-gray-400">Acesse mais rapido pela tela inicial</p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-300 flex-shrink-0 p-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="w-full mt-3 py-2.5 bg-purple-500 text-white text-sm font-semibold rounded-xl hover:bg-purple-600 transition"
        >
          Instalar App
        </button>
      </div>
    </div>
  );
}
