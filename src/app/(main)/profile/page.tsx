"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resizeImage } from "@/lib/utils";

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

export default function MyProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Videos
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

    if (!myId) return;

    async function fetchProfile() {
      try {
        const [profileRes, followRes, videosRes] = await Promise.all([
          fetch(`/api/users/${myId}`),
          fetch(`/api/follow?userId=${myId}`),
          fetch(`/api/videos/user/${myId}`),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
          setEditName(data.name || "");
          setEditBio(data.bio || "");
        }
        if (followRes.ok) {
          const followData = await followRes.json();
          setFollowersCount(followData.followers);
          setFollowingCount(followData.following);
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

    fetchProfile();
  }, [myId, status, router]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !myId) return;

    if (!file.type.startsWith("image/")) {
      alert("Selecione uma imagem (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Imagem muito grande. Maximo 10MB.");
      return;
    }

    setUploadingAvatar(true);

    try {
      let fileToUpload: File = file;
      try {
        fileToUpload = await resizeImage(file, "1:1");
      } catch {
        // If resize fails, upload original
      }
      const formData = new FormData();
      formData.append("file", fileToUpload);
      const uploadRes = await fetch("/api/local-upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Erro ao enviar arquivo");
      const { url } = await uploadRes.json();

      const res = await fetch(`/api/users/${myId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });

      if (res.ok) {
        setProfile((prev) => (prev ? { ...prev, avatar: url } : prev));
      }
    } catch {
      alert("Erro ao atualizar foto. Tente novamente.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleSaveProfile() {
    if (!myId) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/users/${myId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, bio: editBio }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile((prev) => (prev ? { ...prev, name: updated.name ?? editName, bio: updated.bio ?? editBio } : prev));
        setShowEdit(false);
      } else {
        alert("Erro ao salvar perfil. Tente novamente.");
      }
    } catch {
      alert("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function openFollowModal(type: "followers" | "following") {
    if (!myId) return;
    setShowFollowModal(type);
    setFollowListLoading(true);
    setFollowList([]);

    try {
      const res = await fetch(`/api/follow?userId=${myId}&type=${type}`);
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
      <div className="bg-gradient-to-br from-purple-400 to-purple-600 pt-12 pb-16 px-6 text-center relative">
        <h1 className="text-lg font-bold text-white">Meu Perfil</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-12 relative z-10">
        <button
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative group"
        >
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-24 h-24 rounded-full border-4 border-black object-cover shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-black bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">{initial}</span>
            </div>
          )}
          {/* Camera overlay */}
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition">
            {uploadingAvatar ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            )}
          </div>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarUpload}
          className="hidden"
        />
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
        {profile.bio && (
          <p className="text-sm text-gray-400 mt-3 max-w-xs mx-auto leading-relaxed">
            {profile.bio}
          </p>
        )}
        {!profile.verified && (
          <Link href="/verify" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-blue-400 hover:text-blue-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verificar perfil
          </Link>
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
        <div className="w-px bg-gray-800" />
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-500">{profile.coins.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-gray-500 mt-0.5">Moedas</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 mt-6 flex gap-3">
        <button
          onClick={() => setShowEdit(true)}
          className="flex-1 py-2.5 border-2 border-purple-500 text-purple-500 font-semibold rounded-xl hover:bg-purple-500/10 transition"
        >
          Editar Perfil
        </button>
        <Link
          href="/gallery"
          className="flex-1 py-2.5 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition text-center"
        >
          Minha Galeria
        </Link>
      </div>

      {/* Admin Link */}
      {profile.role === "ADMIN" && (
        <div className="px-6 mt-3">
          <Link
            href="/admin"
            className="block w-full py-2.5 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-700 transition text-center text-sm"
          >
            Painel Admin
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="px-6 mt-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="block w-full py-2.5 border-2 border-red-500/50 text-red-400 font-semibold rounded-xl hover:bg-red-500/10 transition text-center text-sm"
        >
          Sair da conta
        </button>
      </div>

      {/* Videos Grid */}
      <div className="px-4 mt-8 pb-24">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 px-2">
          Meus Videos
        </h3>
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-900 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Nenhum video ainda</p>
            <p className="text-gray-500 text-xs mt-1">Seus videos aparecerao aqui</p>
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

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Editar Perfil</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="text-gray-500 hover:text-gray-300 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-700 bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-white placeholder-gray-500"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-700 bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-white placeholder-gray-500 resize-none"
                  placeholder="Conte um pouco sobre voce..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 py-2.5 border border-gray-700 text-gray-300 font-semibold rounded-xl hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 py-2.5 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
