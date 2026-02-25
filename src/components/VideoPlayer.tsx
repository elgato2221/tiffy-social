"use client";

import { useRef, useState } from "react";

interface VideoPlayerProps {
  src?: string | null;
  poster?: string | null;
}

const gradients = [
  "from-purple-400 to-purple-600",
  "from-purple-300 to-purple-500",
  "from-purple-500 to-purple-700",
];

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  if (!src) {
    const gradient = gradients[Math.floor(Math.random() * gradients.length)];
    return (
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {!isPlaying && (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-[2]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Mute/Unmute Button */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 z-[3] flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition hover:bg-black/60"
        aria-label={isMuted ? "Ativar som" : "Desativar som"}
      >
        {isMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>
    </div>
  );
}
