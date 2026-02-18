"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ProfileCard from "@/components/ProfileCard";

interface User {
  id: string;
  name: string;
  username?: string;
  bio?: string | null;
  avatar?: string | null;
  gender?: string | null;
  online?: boolean;
}

type FilterTab = "todos" | "mulheres" | "homens" | "online";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "mulheres", label: "Mulheres" },
  { key: "homens", label: "Homens" },
  { key: "online", label: "Online" },
];

export default function ExplorePage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Erro ao carregar usuarios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    // Exclude current user from explore
    if (user.id === session?.user?.id) return false;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const nameMatch = user.name?.toLowerCase().includes(searchLower);
      const usernameMatch = user.username?.toLowerCase().includes(searchLower);
      if (!nameMatch && !usernameMatch) return false;
    }

    // Tab filters
    switch (activeTab) {
      case "mulheres":
        return user.gender?.toLowerCase() === "feminino" || user.gender?.toLowerCase() === "female";
      case "homens":
        return user.gender?.toLowerCase() === "masculino" || user.gender?.toLowerCase() === "male";
      case "online":
        return user.online === true;
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 px-4 pb-3 pt-4 backdrop-blur-lg">
        <h1 className="mb-3 text-xl font-bold text-gray-900">Descobrir</h1>

        {/* Search Bar */}
        <div className="relative mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar pessoas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
              <p className="text-sm text-gray-400">Carregando...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-500">
              Nenhuma pessoa encontrada
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Tente ajustar os filtros ou a busca
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredUsers.map((user, index) => (
              <ProfileCard key={user.id} user={user} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
