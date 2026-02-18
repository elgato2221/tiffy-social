"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface VideoItem {
  id: string;
  caption?: string | null;
  url?: string | null;
  _count: { likes: number };
  views: number;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

const trending = [
  { tag: "#TiffySocial", views: "2.5M", emoji: "\uD83D\uDD25" },
  { tag: "#Solteiros", views: "1.8M", emoji: "\uD83D\uDC96" },
  { tag: "#Viralizou", views: "1.2M", emoji: "\u2728" },
  { tag: "#ParaVoce", views: "950K", emoji: "\uD83C\uDFAC" },
];

export default function RightSidebar() {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<VideoItem[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch("/api/videos");
        if (res.ok) {
          const data = await res.json();
          setVideos(data.slice(0, 3));
        }
      } catch {}
    };
    fetchVideos();
  }, []);

  const userName = session?.user?.name || "Usuário";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className="hidden xl:flex flex-col w-72 h-screen sticky top-0 border-l border-gray-800 bg-black px-4 py-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* User Profile Card */}
      {session && (
        <Link
          href="/profile"
          className="mb-6 flex items-center gap-3 rounded-2xl bg-gray-900 p-4 transition-colors hover:bg-gray-800"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500">
            <span className="text-lg font-bold text-white">{userInitial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-gray-500">Ver perfil</p>
          </div>
        </Link>
      )}

      {/* Trending Videos */}
      {videos.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-semibold text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.51 6.51 0 009 11.25a3 3 0 105.178-2.036 6.5 6.5 0 001.184-4z" />
            </svg>
            Vídeos em Alta
          </h3>
          <div className="flex flex-col gap-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-white/5"
              >
                <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-pink-400 to-purple-600">
                  {video.url && (
                    <video
                      src={video.url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {video.caption || "Sem legenda"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                      {video._count.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {video.views}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      <div>
        <h3 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-semibold text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
          Trending
        </h3>
        <div className="flex flex-col gap-1">
          {trending.map((item) => (
            <div
              key={item.tag}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
            >
              <div>
                <p className="text-sm font-semibold text-white">{item.tag}</p>
                <p className="text-xs text-gray-500">{item.views} visualizações</p>
              </div>
              <span className="text-lg">{item.emoji}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
