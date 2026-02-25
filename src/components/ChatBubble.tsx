"use client";

import { useState, useRef } from "react";

interface ChatBubbleProps {
  content: string;
  type?: string;
  isMine: boolean;
  time: string;
  cost?: number;
}

export default function ChatBubble({ content, type = "text", isMine, time, cost = 0 }: ChatBubbleProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
          isMine
            ? "bg-purple-500 text-white rounded-br-md"
            : "bg-gray-800 text-gray-100 rounded-bl-md"
        }`}
      >
        {type === "audio" ? (
          <div className="flex items-center gap-3 min-w-[180px]">
            <audio
              ref={audioRef}
              src={content}
              preload="metadata"
              onLoadedMetadata={() => {
                if (audioRef.current) setDuration(audioRef.current.duration);
              }}
              onTimeUpdate={() => {
                if (audioRef.current) {
                  setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1) * 100);
                }
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setProgress(0); }}
            />
            <button
              onClick={toggleAudio}
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                isMine ? "bg-white/20 hover:bg-white/30" : "bg-gray-700 hover:bg-gray-600"
              } transition`}
            >
              {playing ? (
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isMine ? "text-white" : "text-gray-300"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isMine ? "text-white" : "text-gray-300"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`h-1 rounded-full overflow-hidden ${isMine ? "bg-white/20" : "bg-gray-600"}`}>
                <div
                  className={`h-full rounded-full transition-all ${isMine ? "bg-white" : "bg-purple-500"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className={`text-[10px] ${isMine ? "text-purple-100" : "text-gray-400"}`}>
                  {playing ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isMine ? "text-purple-100" : "text-gray-400"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.08 1.778.233 2.633.342 1.24 1.519 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed break-words">{content}</p>
        )}
        <div
          className={`flex items-center gap-1.5 mt-1 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] ${
              isMine ? "text-purple-100" : "text-gray-400"
            }`}
          >
            {time}
          </span>
          {cost > 0 && (
            <span
              className={`text-[10px] flex items-center gap-0.5 ${
                isMine ? "text-purple-100" : "text-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-2.5 w-2.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029C10.792 13.807 10.304 14 10 14c-.304 0-.792-.193-1.264-.979a5.67 5.67 0 01-.421-.821H10a1 1 0 100-2H7.958a7.3 7.3 0 010-1H10a1 1 0 100-2H8.315c.163-.29.346-.559.421-.821z" />
              </svg>
              {cost}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
