"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import VideoCard from "@/components/VideoCard";

interface VideoUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
}

interface Video {
  id: string;
  url?: string | null;
  caption: string;
  user: VideoUser;
  _count: {
    likes: number;
    comments: number;
  };
  likes: { userId: string }[];
}

export default function FeedPage() {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchVideos = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`/api/videos?page=${pageNum}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 1) {
          setVideos(data.videos);
        } else {
          setVideos((prev) => [...prev, ...data.videos]);
        }
        setHasMore(data.pagination.hasMore);
      }
    } catch (error) {
      console.error("Erro ao carregar videos:", error);
    }
  }, []);

  useEffect(() => {
    fetchVideos(1).finally(() => setLoading(false));
  }, [fetchVideos]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          setLoadingMore(true);
          const nextPage = page + 1;
          setPage(nextPage);
          fetchVideos(nextPage).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, fetchVideos]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
          <p className="text-sm text-white/60">Carregando...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-pink-400 to-purple-600 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <p className="mt-4 text-lg font-semibold text-white">
          Nenhum video ainda
        </p>
        <p className="mt-1 text-center text-sm text-white/70">
          Seja o primeiro a compartilhar um momento especial!
        </p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          currentUserId={session?.user?.id}
          index={index}
        />
      ))}
      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerRef} className="flex h-20 items-center justify-center">
          {loadingMore && (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          )}
        </div>
      )}
    </div>
  );
}
