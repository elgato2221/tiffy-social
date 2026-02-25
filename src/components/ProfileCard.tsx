"use client";

import Link from "next/link";

interface ProfileUser {
  id: string;
  name: string;
  username?: string;
  bio?: string | null;
  avatar?: string | null;
  gender?: string | null;
  online?: boolean;
}

interface ProfileCardProps {
  user: ProfileUser;
  index?: number;
}

const gradients = [
  "from-purple-400 to-purple-600",
  "from-purple-300 to-purple-500",
  "from-purple-500 to-purple-700",
];

export default function ProfileCard({ user, index = 0 }: ProfileCardProps) {
  const gradient = gradients[index % gradients.length];

  return (
    <Link href={`/profile/${user.id}`}>
      <div className="group relative aspect-square overflow-hidden rounded-2xl shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]">
        {/* Background: Avatar or Gradient */}
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <span className="text-4xl font-bold text-white/80 select-none">
              {user.name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        )}

        {/* Online Indicator */}
        {user.online && (
          <div className="absolute right-2.5 top-2.5 z-10">
            <span className="relative flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-purple-500" />
            </span>
          </div>
        )}

        {/* Bottom Overlay - Name & Bio */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-10">
          <p className="text-sm font-semibold text-white drop-shadow">
            {user.name}
          </p>
          {user.bio && (
            <p className="mt-0.5 line-clamp-2 text-xs text-white/70">
              {user.bio}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
