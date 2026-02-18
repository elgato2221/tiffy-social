"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function MyProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const myId = session?.user?.id;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (!myId) return;

    async function fetchProfile() {
      try {
        const [profileRes, followRes] = await Promise.all([
          fetch(`/api/users/${myId}`),
          fetch(`/api/follow?userId=${myId}`),
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
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [myId, status, router]);

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
      <div className="bg-gradient-to-br from-pink-500 to-rose-500 pt-12 pb-16 px-6 text-center relative">
        <h1 className="text-lg font-bold text-white">Meu Perfil</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-12 relative z-10">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">{initial}</span>
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
        <div className="w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{profile.coins.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-gray-400 mt-0.5">Moedas</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 mt-6 flex gap-3">
        <button
          onClick={() => setShowEdit(true)}
          className="flex-1 py-2.5 border-2 border-pink-500 text-pink-500 font-semibold rounded-xl hover:bg-pink-50 transition"
        >
          Editar Perfil
        </button>
        <Link
          href="/gallery"
          className="flex-1 py-2.5 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 transition text-center"
        >
          Minha Galeria
        </Link>
      </div>

      {/* Videos Grid */}
      <div className="px-4 mt-8 pb-24">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 px-2">
          Meus Videos
        </h3>
        {profile._count.videos === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Nenhum video ainda</p>
            <p className="text-gray-300 text-xs mt-1">Seus videos aparecerao aqui</p>
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

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Editar Perfil</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-gray-900 placeholder-gray-400"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-gray-900 placeholder-gray-400 resize-none"
                  placeholder="Conte um pouco sobre voce..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 py-2.5 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
