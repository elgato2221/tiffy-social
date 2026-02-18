"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { GIFT_TYPES } from "@/lib/utils";
import GiftModal from "@/components/GiftModal";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  avatar: string | null;
  gender: string;
  role: string;
  coins: number;
  online: boolean;
  createdAt: string;
  _count: {
    videos: number;
    likes: number;
  };
}

interface GalleryItem {
  id: string;
  url: string | null;
  type: string;
  price: number;
  caption: string | null;
  unlocked: boolean;
}

export default function UserProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const myId = session?.user?.id;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (myId && userId && myId === userId) {
      router.replace("/profile");
      return;
    }

    if (!userId) return;

    async function fetchAll() {
      try {
        const [profileRes, followRes, galleryRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/follow?userId=${userId}`),
          fetch(`/api/gallery?userId=${userId}`),
        ]);

        if (profileRes.ok) {
          setProfile(await profileRes.json());
        }
        if (followRes.ok) {
          const followData = await followRes.json();
          setIsFollowing(followData.isFollowing);
          setFollowersCount(followData.followers);
          setFollowingCount(followData.following);
        }
        if (galleryRes.ok) {
          setGallery(await galleryRes.json());
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [userId, myId, status, router]);

  async function handleFollow() {
    setFollowLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.followed);
        setFollowersCount((prev) => data.followed ? prev + 1 : prev - 1);
      }
    } catch {
      alert("Erro ao seguir. Tente novamente.");
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleUnlock(itemId: string) {
    setUnlocking(itemId);
    try {
      const res = await fetch("/api/gallery/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        setGallery((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, unlocked: true } : item
          )
        );
        // Refetch gallery to get actual URLs
        const galleryRes = await fetch(`/api/gallery?userId=${userId}`);
        if (galleryRes.ok) {
          setGallery(await galleryRes.json());
        }
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao desbloquear.");
      }
    } catch {
      alert("Erro ao desbloquear. Tente novamente.");
    } finally {
      setUnlocking(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Perfil nao encontrado.</p>
      </div>
    );
  }

  const initial = profile.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-500 pt-12 pb-16 px-6 relative">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 text-white hover:text-pink-100 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white text-center">Perfil</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-12 relative z-10">
        {profile.avatar ? (
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg"
            />
            {profile.online && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">{initial}</span>
            </div>
            {profile.online && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center mt-4 px-6">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-bold text-gray-800">{profile.name}</h2>
          {profile.role === "CREATOR" && (
            <span className="bg-pink-100 text-pink-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Criadora
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
        {profile.online && (
          <p className="text-xs text-green-500 font-medium mt-1">Online agora</p>
        )}
        {profile.bio && (
          <p className="text-sm text-gray-600 mt-3 max-w-xs mx-auto leading-relaxed">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 mt-6 px-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{profile._count.videos}</p>
          <p className="text-xs text-gray-400 mt-0.5">Videos</p>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{followersCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Seguidores</p>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{followingCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Seguindo</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 mt-6 flex gap-3">
        <button
          onClick={handleFollow}
          disabled={followLoading}
          className={`flex-1 py-2.5 font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
            isFollowing
              ? "border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
              : "bg-pink-500 text-white hover:bg-pink-600"
          }`}
        >
          {followLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isFollowing ? (
            "Seguindo"
          ) : (
            "Seguir"
          )}
        </button>
        <button
          onClick={() => router.push(`/messages/${userId}`)}
          className="flex-1 py-2.5 border-2 border-pink-500 text-pink-500 font-semibold rounded-xl hover:bg-pink-50 transition flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          Mensagem
        </button>
        <button
          onClick={() => setShowGiftModal(true)}
          className="py-2.5 px-4 border-2 border-amber-400 text-amber-500 font-semibold rounded-xl hover:bg-amber-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </button>
      </div>

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <div className="px-4 mt-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 px-2">
            Galeria
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((item) => (
              <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                {item.unlocked || item.url ? (
                  item.type === "VIDEO" ? (
                    <video src={item.url!} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={item.url!} alt={item.caption || ""} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <button
                      onClick={() => handleUnlock(item.id)}
                      disabled={unlocking === item.id}
                      className="mt-2 px-3 py-1 bg-pink-500 text-white text-xs font-semibold rounded-full hover:bg-pink-600 transition disabled:opacity-50"
                    >
                      {unlocking === item.id ? "..." : `🪙 ${item.price}`}
                    </button>
                  </div>
                )}
                {item.unlocked && item.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                    <p className="text-[10px] text-white truncate">{item.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos Grid */}
      <div className="px-4 mt-8 pb-24">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 px-2">
          Videos
        </h3>
        {profile._count.videos === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Nenhum video ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: profile._count.videos }).map((_, i) => (
              <div
                key={i}
                className="aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gift Modal */}
      <GiftModal
        receiverId={userId}
        receiverName={profile.name}
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
      />
    </div>
  );
}
