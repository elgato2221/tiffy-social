"use client";

import { useState, useRef } from "react";
import { CoinIcon } from "@/components/ui/CoinIcon";

interface ChatBubbleProps {
  content: string;
  type?: string;
  isMine: boolean;
  time: string;
  cost?: number;
  giftType?: string | null;
  giftEmoji?: string | null;
  giftValue?: number | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaPrice?: number | null;
  mediaUnlocked?: boolean;
  onUnlockMedia?: () => void;
  unlocking?: boolean;
}

export default function ChatBubble({
  content, type = "text", isMine, time, cost = 0,
  giftEmoji, giftValue,
  mediaUrl, mediaType, mediaPrice, mediaUnlocked, onUnlockMedia, unlocking,
}: ChatBubbleProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play(); }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Gift message
  if (type === "gift") {
    return (
      <div className="flex justify-center mb-3 w-full min-w-0">
        <div className="bg-gray-100 border border-gray-200 rounded-2xl px-6 py-3 text-center">
          <span className="text-4xl block mb-1">{giftEmoji || "\uD83C\uDF81"}</span>
          <p className="text-xs font-semibold text-gray-600">
            {isMine ? "Voce enviou um presente" : "Recebeu um presente"}
          </p>
          {giftValue && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <CoinIcon size="xs" />
              <span className="text-[11px] font-bold text-amber-400">{giftValue}</span>
            </div>
          )}
          <span className="text-[10px] text-gray-500 mt-1 block">{time}</span>
        </div>
      </div>
    );
  }

  // Locked media message
  if (type === "locked_media") {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3 w-full min-w-0`}>
        <div className={`max-w-[75%] min-w-0 rounded-2xl overflow-hidden ${isMine ? "rounded-br-md" : "rounded-bl-md"}`}>
          {mediaUnlocked && mediaUrl ? (
            <div className="relative">
              {mediaType === "video" ? (
                <video src={mediaUrl} controls className="w-full max-h-[300px] rounded-2xl" playsInline />
              ) : (
                <img src={mediaUrl} alt="Media" className="w-full max-h-[300px] object-cover rounded-2xl" />
              )}
              <div className={`px-3 py-1.5 ${isMine ? "bg-purple-500" : "bg-gray-100"}`}>
                <span className={`text-[10px] ${isMine ? "text-purple-100" : "text-gray-500"}`}>{time}</span>
              </div>
            </div>
          ) : (
            <div className={`${isMine ? "bg-purple-500/80" : "bg-gray-100"} p-4`}>
              <div className="w-full h-40 bg-black/30 rounded-xl flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="text-xs text-gray-600 font-medium">
                  {mediaType === "video" ? "Video bloqueado" : "Foto bloqueada"}
                </p>
                {!isMine && onUnlockMedia ? (
                  <button
                    onClick={onUnlockMedia}
                    disabled={unlocking}
                    className="mt-2 px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-full hover:bg-amber-600 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {unlocking ? "..." : (
                      <>
                        <CoinIcon size="xs" />
                        Desbloquear {mediaPrice}
                      </>
                    )}
                  </button>
                ) : isMine ? (
                  <div className="flex items-center gap-1 mt-2">
                    <CoinIcon size="xs" />
                    <span className="text-[11px] text-gray-500">{mediaPrice} moedas</span>
                  </div>
                ) : null}
              </div>
              <div className="mt-1.5">
                <span className={`text-[10px] ${isMine ? "text-purple-100" : "text-gray-500"}`}>{time}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Text / Audio message
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3 w-full min-w-0`}>
      <div
        className={`max-w-[75%] min-w-0 px-3 py-2 rounded-2xl ${
          isMine ? "bg-purple-500 text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md"
        }`}
      >
        {type === "audio" ? (
          <div className="flex items-center gap-2 min-w-[140px] max-w-full">
            <audio
              ref={audioRef} src={content} preload="metadata"
              onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
              onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1) * 100); }}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setProgress(0); }}
            />
            <button onClick={toggleAudio} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? "bg-white/20 hover:bg-white/30" : "bg-gray-200 hover:bg-gray-300"} transition`}>
              {playing ? (
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isMine ? "text-white" : "text-gray-600"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isMine ? "text-white" : "text-gray-600"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`h-1 rounded-full overflow-hidden ${isMine ? "bg-white/20" : "bg-gray-300"}`}>
                <div className={`h-full rounded-full transition-all ${isMine ? "bg-white" : "bg-purple-500"}`} style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className={`text-[10px] ${isMine ? "text-purple-100" : "text-gray-400"}`}>
                  {playing ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed break-words overflow-hidden" style={{ overflowWrap: "anywhere" }}>{content}</p>
        )}
        <div className={`flex items-center gap-1.5 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isMine ? "text-purple-100" : "text-gray-500"}`}>{time}</span>
          {cost > 0 && (
            <span className={`text-[10px] flex items-center gap-0.5 ${isMine ? "text-purple-100" : "text-gray-500"}`}>
              <CoinIcon size="xs" /> {cost}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
