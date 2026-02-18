"use client";

import { useState } from "react";
import Link from "next/link";
import VideoPlayer from "./VideoPlayer";
import Avatar from "./ui/Avatar";
import CommentsModal from "./CommentsModal";
import GiftModal from "./GiftModal";

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

interface VideoCardProps {
  video: Video;
  currentUserId?: string;
  index?: number;
}

const gradients = [
  "from-pink-400 to-purple-600",
  "from-rose-400 to-orange-500",
  "from-violet-500 to-fuchsia-500",
];

export default function VideoCard({ video, currentUserId, index = 0 }: VideoCardProps) {
  const [liked, setLiked] = useState(
    video.likes?.some((like) => like.userId === currentUserId) ?? false
  );
  const [likeCount, setLikeCount] = useState(video._count?.likes ?? 0);
  const [commentCount, setCommentCount] = useState(video._count?.comments ?? 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showGift, setShowGift] = useState(false);

  const gradient = gradients[index % gradients.length];

  const handleLike = async () => {
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

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always">
      {/* Video or Gradient Placeholder */}
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

      {/* Bottom Overlay - User Info & Caption */}
      <div className="absolute bottom-0 left-0 right-16 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 pb-24">
        <Link
          href={`/profile/${video.user.id}`}
          className="mb-3 flex items-center gap-3"
        >
          <Avatar
            src={video.user.avatar}
            name={video.user.name}
            size="sm"
            online
          />
          <div>
            <p className="text-sm font-semibold text-white drop-shadow">
              {video.user.name}
            </p>
            <p className="text-xs text-white/70">@{video.user.username}</p>
          </div>
        </Link>
        <p className="text-sm text-white drop-shadow">{video.caption}</p>
      </div>

      {/* Right Side Action Buttons */}
      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-transform ${
              isAnimating ? "scale-125" : "scale-100"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-7 w-7 transition-colors ${
                liked ? "text-pink-500" : "text-white"
              }`}
              fill={liked ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={liked ? 0 : 1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">
            {likeCount}
          </span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">
            {commentCount}
          </span>
        </button>

        {/* Message Button */}
        <Link
          href={`/messages/${video.user.id}`}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">
            Chat
          </span>
        </Link>

        {/* Gift Button */}
        <button
          onClick={() => setShowGift(true)}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">
            Presente
          </span>
        </button>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        videoId={video.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />

      {/* Gift Modal */}
      <GiftModal
        receiverId={video.user.id}
        receiverName={video.user.name}
        isOpen={showGift}
        onClose={() => setShowGift(false)}
      />
    </div>
  );
}
