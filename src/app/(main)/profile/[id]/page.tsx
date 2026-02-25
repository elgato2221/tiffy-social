"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
  verified: boolean;
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

interface ProfileVideo {
  id: string;
  url: string;
  caption: string | null;
  createdAt: string;
  _count: { likes: number; comments: number };
}

interface FollowUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  online: boolean;
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
  const [videos, setVideos] = useState<ProfileVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ProfileVideo | null>(null);

  // Followers/Following modal
  const [showFollowModal, setShowFollowModal] = useState<"followers" | "following" | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

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
        const [profileRes, followRes, galleryRes, videosRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/follow?userId=${userId}`),
          fetch(`/api/gallery?userId=${userId}`),
          fetch(`/api/videos/user/${userId}`),
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
        if (videosRes.ok) {
          setVideos(await videosRes.json());
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

  async function openFollowModal(type: "followers" | "following") {
    setShowFollowModal(type);
    setFollowListLoading(true);
    setFollowList([]);

    try {
      const res = await fetch(`/api/follow?userId=${userId}&type=${type}`);
      if (res.ok) {
        setFollowList(await res.json());
      }
    } catch {
      console.error("Erro ao carregar lista");
    } finally {
      setFollowListLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-gray-400">Perfil nao encontrado.</p>
      </div>
    );
  }

  const initial = profile.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="bg-black min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-400 to-purple-600 pt-12 pb-16 px-6 relative">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 text-white hover:text-purple-100 transition"
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
              className="w-24 h-24 rounded-full border-4 border-black object-cover shadow-lg"
            />
            {profile.online && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-purple-400 rounded-full border-2 border-black" />
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-black bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">{initial}</span>
            </div>
            {profile.online && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-purple-400 rounded-full border-2 border-black" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center mt-4 px-6">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-bold text-white">{profile.name}</h2>
          {profile.verified && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
          )}
          {profile.role === "CREATOR" && (
            <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Criadora
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
        {profile.online && (
          <p className="text-xs text-purple-400 font-medium mt-1">Online agora</p>
        )}
        {profile.bio && (
          <p className="text-sm text-gray-400 mt-3 max-w-xs mx-auto leading-relaxed">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 mt-6 px-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{profile._count.videos}</p>
          <p className="text-xs text-gray-500 mt-0.5">Videos</p>
        </div>
        <div className="w-px bg-gray-800" />
        <button onClick={() => openFollowModal("followers")} className="text-center">
          <p className="text-2xl font-bold text-white">{followersCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Seguidores</p>
        </button>
        <div className="w-px bg-gray-800" />
        <button onClick={() => openFollowModal("following")} className="text-center">
          <p className="text-2xl font-bold text-white">{followingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Seguindo</p>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="px-6 mt-6 flex gap-3">
        <button
          onClick={handleFollow}
          disabled={followLoading}
          className={`flex-1 py-2.5 font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
            isFollowing
              ? "border-2 border-gray-700 text-gray-300 hover:bg-gray-900"
              : "bg-purple-500 text-white hover:bg-purple-600"
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
          className="flex-1 py-2.5 border-2 border-purple-500 text-purple-500 font-semibold rounded-xl hover:bg-purple-500/10 transition flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          Mensagem
        </button>
        <button
          onClick={() => setShowGiftModal(true)}
          className="py-2.5 px-4 border-2 border-purple-500/50 text-purple-400 font-semibold rounded-xl hover:bg-purple-500/10 transition"
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
              <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                {item.unlocked && item.url ? (
                  item.type === "VIDEO" ? (
                    <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover" muted playsInline preload="auto" />
                  ) : (
                    <img src={item.url} alt={item.caption || ""} loading="lazy" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/80 to-purple-900/80 flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <p className="text-purple-200 text-[10px] font-medium mt-1">Conteudo exclusivo</p>
                    <button
                      onClick={() => handleUnlock(item.id)}
                      disabled={unlocking === item.id}
                      className="mt-2 px-3 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded-full hover:bg-purple-600 transition disabled:opacity-50 shadow-lg"
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
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-900 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Nenhum video ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className="relative aspect-[4/5] rounded-lg overflow-hidden bg-gray-900 group"
              >
                <video
                  src={`${video.url}#t=0.1`}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                <div className="absolute bottom-1 left-1 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                  <span className="text-[10px] text-white font-medium drop-shadow">{video._count.likes}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="rounded-2xl overflow-hidden bg-gray-900">
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              <div className="p-4">
                {selectedVideo.caption && (
                  <p className="text-sm text-gray-200 mb-2">{selectedVideo.caption}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                    {selectedVideo._count.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                    </svg>
                    {selectedVideo._count.comments}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      <GiftModal
        receiverId={userId}
        receiverName={profile.name}
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
      />

      {/* Followers/Following Modal */}
      {showFollowModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
          <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl max-h-[70vh] flex flex-col border border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                {showFollowModal === "followers" ? "Seguidores" : "Seguindo"}
              </h3>
              <button
                onClick={() => setShowFollowModal(null)}
                className="text-gray-500 hover:text-gray-300 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {followListLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : followList.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">
                    {showFollowModal === "followers" ? "Nenhum seguidor ainda" : "Nao esta seguindo ninguem"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {followList.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.id}`}
                      onClick={() => setShowFollowModal(null)}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800 transition"
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{user.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-400">@{user.username}</p>
                      </div>
                      {user.online && (
                        <div className="w-2 h-2 bg-purple-400 rounded-full" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
