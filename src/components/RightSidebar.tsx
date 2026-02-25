"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  online?: boolean;
  verified?: boolean;
  gender?: string;
  _count?: {
    followers?: number;
    videos?: number;
  };
}

export default function RightSidebar() {
  const { data: session } = useSession();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [allUsers, setAllUsers] = useState<Creator[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter((u: Creator) => u.id !== session?.user?.id);
          setAllUsers(filtered);
          setCreators(filtered.filter((u: Creator) => u.gender === "FEMALE" || u.avatar));
        }
      } catch {}
    };
    fetchUsers();
  }, [session?.user?.id]);

  const onlineUsers = allUsers.filter((u) => u.online);
  const featuredCreators = creators.slice(0, 4);
  const moreCreators = allUsers.filter((u) => !featuredCreators.find((f) => f.id === u.id)).slice(0, 4);

  return (
    <aside className="hidden xl:flex flex-col w-80 h-screen sticky top-0 border-l border-gray-800/50 bg-black px-5 py-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

      {/* Discover Header */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06L12 15.19l3.47-3.47a.75.75 0 111.06 1.06h-.25z" />
          </svg>
          Descobrir
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Criadores em destaque</p>
      </div>

      {/* Featured Creators - Grid with photos */}
      {featuredCreators.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-2.5">
            {featuredCreators.map((creator) => {
              const initial = creator.name?.charAt(0)?.toUpperCase() || "?";
              return (
                <Link
                  key={creator.id}
                  href={`/profile/${creator.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-gray-900 transition hover:ring-2 hover:ring-purple-500/50"
                >
                  {/* Avatar / Photo */}
                  <div className="aspect-[3/4] w-full overflow-hidden">
                    {creator.avatar ? (
                      <img
                        src={creator.avatar}
                        alt={creator.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">{initial}</span>
                      </div>
                    )}
                  </div>

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Online badge */}
                  {creator.online && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-purple-500/90 px-2 py-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] font-semibold text-white">Online</span>
                    </div>
                  )}

                  {/* Verified badge */}
                  {creator.verified && (
                    <div className="absolute top-2 left-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Name */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-sm font-semibold text-white truncate">{creator.name}</p>
                    <p className="text-[11px] text-white/60">@{creator.username}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Online Now */}
      {onlineUsers.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            Online Agora
            <span className="text-xs font-normal text-gray-500">({onlineUsers.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.slice(0, 8).map((user) => {
              const initial = user.name?.charAt(0)?.toUpperCase() || "?";
              return (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`}
                  className="group relative"
                  title={user.name}
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-purple-400/60 transition group-hover:ring-purple-500">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{initial}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-purple-400 border-2 border-black" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* More Creators - List */}
      {moreCreators.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.51 6.51 0 009 11.25a3 3 0 105.178-2.036 6.5 6.5 0 001.184-4z" />
            </svg>
            Populares
          </h3>
          <div className="flex flex-col gap-1">
            {moreCreators.map((user) => {
              const initial = user.name?.charAt(0)?.toUpperCase() || "?";
              return (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{initial}</span>
                        </div>
                      )}
                    </div>
                    {user.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-purple-400 border-2 border-black" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      {user.verified && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex-shrink-0 rounded-lg bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-500 transition hover:bg-purple-500/20"
                  >
                    Seguir
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Explore CTA */}
      <Link
        href="/explore"
        className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-500/10 border border-purple-500/20 px-4 py-3 text-sm font-semibold text-purple-400 transition hover:from-purple-500/20 hover:to-purple-500/20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        Explorar Todos
      </Link>
    </aside>
  );
}
