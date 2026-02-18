"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { timeAgo } from "@/lib/utils";
import ChatBubble from "@/components/ChatBubble";

interface MessageUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  cost: number;
  read: boolean;
  createdAt: string;
  sender: MessageUser;
  receiver: MessageUser;
}

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  online: boolean;
  gender: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const otherUserId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myGender, setMyGender] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myId = session?.user?.id;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!otherUserId) return;
    try {
      const res = await fetch(`/api/messages/${otherUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  }, [otherUserId]);

  // Fetch other user's profile and my profile
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (!myId || !otherUserId) return;

    async function init() {
      try {
        // Fetch other user info
        const userRes = await fetch(`/api/users/${otherUserId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setOtherUser(userData);
        }

        // Fetch my profile for gender check
        const myRes = await fetch(`/api/users/${myId}`);
        if (myRes.ok) {
          const myData = await myRes.json();
          setMyGender(myData.gender || "");
        }

        // Fetch messages
        await fetchMessages();
      } catch (error) {
        console.error("Erro na inicializacao:", error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [myId, otherUserId, status, router, fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!otherUserId || status !== "authenticated") return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [otherUserId, status, fetchMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: otherUserId,
          content: trimmed,
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setContent("");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao enviar mensagem.");
      }
    } catch {
      alert("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  const messageCost = myGender === "MALE" ? 5 : 0;

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const otherInitial = otherUser?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/messages")}
          className="text-gray-600 hover:text-gray-800 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="relative flex-shrink-0">
          {otherUser?.avatar ? (
            <img
              src={otherUser.avatar}
              alt={otherUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{otherInitial}</span>
            </div>
          )}
          {otherUser?.online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-800 truncate">
            {otherUser?.name || "Usuario"}
          </h2>
          {otherUser?.online ? (
            <p className="text-xs text-green-500">Online</p>
          ) : (
            <p className="text-xs text-gray-400">Offline</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">
              Nenhuma mensagem ainda. Diga ola!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              isMine={msg.senderId === myId}
              time={timeAgo(msg.createdAt)}
              cost={msg.cost}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3">
        <div className="mx-auto max-w-lg">
          {messageCost > 0 && (
            <div className="flex items-center gap-1 mb-2 px-1">
              <span className="text-xs">🪙</span>
              <span className="text-xs text-amber-600 font-medium">
                {messageCost} moedas para enviar
              </span>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm text-gray-800 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!content.trim() || sending}
              className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white hover:bg-pink-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
