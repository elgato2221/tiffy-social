"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConversationUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

interface Conversation {
  user: ConversationUser;
  lastMessage: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    senderId: string;
    receiverId: string;
    sender: ConversationUser;
    receiver: ConversationUser;
  };
  unreadCount: number;
}

interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

export default function MessagesPage() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated") return;

    async function fetchConversations() {
      try {
        const res = await fetch("/api/messages");
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch (error) {
        console.error("Erro ao carregar conversas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();

    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [status, router]);

  // Fetch suggested users
  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter((u: SuggestedUser) => u.id !== session?.user?.id);
          setSuggestedUsers(filtered);
        }
      } catch (error) {
        console.error("Erro ao carregar sugestoes:", error);
      }
    }

    fetchUsers();
  }, [status, session?.user?.id]);

  // Filter conversations by search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter((conv) =>
        conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">{t("messages.title")}</h1>
      </div>

      {/* Suggestions Carousel */}
      {suggestedUsers.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="px-6 pt-4 pb-1">
            <p className="text-sm font-semibold text-gray-900">{t("messages.suggestions")}</p>
          </div>
          <div className="overflow-x-auto flex gap-3 px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {suggestedUsers.map((user) => {
              const initial = user.name?.charAt(0)?.toUpperCase() || "?";
              return (
                <button
                  key={user.id}
                  onClick={() => router.push(`/messages/${user.id}`)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div className="ring-2 ring-purple-400 rounded-full p-0.5">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{initial}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 max-w-[64px] truncate">
                    {user.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="px-6 mb-4 pt-4">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("messages.search")}
            className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">{t("messages.noConversations")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("messages.conversationsHere")}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredConversations.map((conv) => {
            const initial = conv.user.name?.charAt(0)?.toUpperCase() || "?";
            const msgType = conv.lastMessage.type;
            const preview = msgType === "audio"
              ? `🎤 ${t("messages.audio")}`
              : msgType === "gift"
                ? `🎁 ${t("messages.gift")}`
                : msgType === "locked_media"
                  ? `🔒 ${t("messages.lockedMedia")}`
                  : conv.lastMessage.content.length > 45
                    ? conv.lastMessage.content.slice(0, 45) + "..."
                    : conv.lastMessage.content;

            return (
              <button
                key={conv.user.id}
                onClick={() => router.push(`/messages/${conv.user.id}`)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition text-left"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conv.user.avatar ? (
                    <img
                      src={conv.user.avatar}
                      alt={conv.user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{initial}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-purple-400 rounded-full border-2 border-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {conv.user.name}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {timeAgo(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {preview}
                  </p>
                </div>

                {/* Unread badge */}
                {conv.unreadCount > 0 && (
                  <div className="flex-shrink-0 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
