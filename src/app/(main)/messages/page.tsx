"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";

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
    createdAt: string;
    senderId: string;
    receiverId: string;
    sender: ConversationUser;
    receiver: ConversationUser;
  };
  unreadCount: number;
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">Mensagens</h1>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">Nenhuma conversa ainda</p>
          <p className="text-gray-300 text-sm mt-1">Suas conversas aparecerao aqui</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {conversations.map((conv) => {
            const initial = conv.user.name?.charAt(0)?.toUpperCase() || "?";
            const preview =
              conv.lastMessage.content.length > 45
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
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{initial}</span>
                    </div>
                  )}
                  {/* Online indicator - shown as green dot */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">
                      {conv.user.name}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {timeAgo(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate mt-0.5">
                    {preview}
                  </p>
                </div>

                {/* Unread badge */}
                {conv.unreadCount > 0 && (
                  <div className="flex-shrink-0 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
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
