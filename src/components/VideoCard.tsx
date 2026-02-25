"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VideoPlayer from "./VideoPlayer";
import Avatar from "./ui/Avatar";
import CommentsModal from "./CommentsModal";

interface VideoUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  verified?: boolean;
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

interface VideoCardProps {
  video: Video;
  currentUserId?: string;
  index?: number;
  onDelete?: (videoId: string) => void;
}

const gradients = [
  "from-purple-400 to-purple-600",
  "from-purple-300 to-purple-500",
  "from-purple-500 to-purple-700",
];

export default function VideoCard({ video, currentUserId, index = 0, onDelete }: VideoCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(
    video.likes?.some((like) => like.userId === currentUserId) ?? false
  );
  const [likeCount, setLikeCount] = useState(video._count?.likes ?? 0);
  const [commentCount, setCommentCount] = useState(video._count?.comments ?? 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const gradient = gradients[index % gradients.length];
  const isOwner = currentUserId === video.user.id;

  const requireAuth = () => {
    if (!currentUserId) {
      router.push("/login");
      return true;
    }
    return false;
  };

  const handleLike = async () => {
    if (requireAuth()) return;
    try {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);

      const res = await fetch(`/api/videos/${video.id}/like`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount((prev) => (data.liked ? prev + 1 : prev - 1));
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.origin + "/feed";

    if (navigator.share) {
      navigator.share({ title: video.caption || "Tiffy Social", url }).catch(() => {});
    } else {
      // Fallback: copy via textarea for HTTP compatibility
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este video?")) return;
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleted(true);
        onDelete?.(video.id);
      }
    } catch (error) {
      console.error("Erro ao deletar video:", error);
    }
    setShowMenu(false);
  };

  if (deleted) return null;

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always bg-black">
      <div className="relative h-full w-full overflow-hidden">
        {video.url ? (
          <VideoPlayer src={video.url} />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <p className="max-w-xs px-6 text-center text-xl font-semibold text-white drop-shadow-lg">
              {video.caption}
            </p>
          </div>
        )}

        {/* Bottom Overlay */}
        <div className="absolute bottom-0 left-0 right-16 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 pb-6">
          <Link href={`/profile/${video.user.id}`} className="mb-3 flex items-center gap-3">
            <Avatar src={video.user.avatar} name={video.user.name} size="sm" online />
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-white drop-shadow">{video.user.name}</p>
                {video.user.verified && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-white/70">@{video.user.username}</p>
            </div>
          </Link>
          <p className="text-sm text-white drop-shadow">{video.caption}</p>
        </div>

        {/* Right Side Action Buttons */}
        <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-5">
          {/* Owner menu (3 dots) */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="6" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="18" r="2" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-14 bottom-0 w-44 rounded-xl bg-gray-900 border border-gray-700 shadow-xl overflow-hidden z-20">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Excluir video
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/30 transition-transform ${isAnimating ? "scale-125" : "scale-100"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-colors ${liked ? "text-purple-500" : "text-white"}`} fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={liked ? 0 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white drop-shadow">{likeCount}</span>
          </button>

          {/* Comment */}
          <button onClick={() => { if (!requireAuth()) setShowComments(true); }} className="flex flex-col items-center gap-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white drop-shadow">{commentCount}</span>
          </button>

          {/* Share */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white drop-shadow">
              {copied ? "Copiado!" : "Compartilhar"}
            </span>
          </button>
        </div>
      </div>

      <CommentsModal
        videoId={video.id}
        videoOwnerId={video.user.id}
        videoOwnerName={video.user.name}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
    </div>
  );
}
