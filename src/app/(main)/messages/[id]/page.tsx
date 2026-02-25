"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { timeAgo, MESSAGE_COST, AUDIO_COST } from "@/lib/utils";
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
  type: string;
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

const EMOJIS = [
  "😀", "😂", "🥰", "😍", "😘", "😜", "😎", "🤩",
  "😢", "😭", "😡", "🥺", "😳", "🤔", "😏", "🙄",
  "❤️", "🔥", "💕", "✨", "🎉", "👏", "🙌", "💪",
  "👍", "👎", "🤝", "💋", "🌹", "🦋", "🌸", "⭐",
];

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
  const [messageCost, setMessageCost] = useState<number>(5);
  const [isInitiator, setIsInitiator] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio recording state
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sendingAudio, setSendingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Emoji picker state
  const [showEmojis, setShowEmojis] = useState(false);

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
        setMessages((prev) => {
          if (data.length !== prev.length) return data;
          const lastNew = data[data.length - 1]?.id;
          const lastOld = prev[prev.length - 1]?.id;
          return lastNew !== lastOld ? data : prev;
        });
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  }, [otherUserId]);

  // Fetch other user's profile and messages
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (!myId || !otherUserId) return;

    async function init() {
      try {
        const userRes = await fetch(`/api/users/${otherUserId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setOtherUser(userData);
        }

        const msgRes = await fetch(`/api/messages/${otherUserId}`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData);

          if (msgData.length === 0) {
            setMessageCost(MESSAGE_COST);
            setIsInitiator(true);
          } else {
            const firstMsg = msgData[0];
            if (firstMsg.senderId === myId) {
              setMessageCost(MESSAGE_COST);
              setIsInitiator(true);
            } else {
              setMessageCost(0);
              setIsInitiator(false);
            }
          }
        }
      } catch (error) {
        console.error("Erro na inicializacao:", error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [myId, otherUserId, status, router, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!otherUserId || status !== "authenticated") return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 2000);

    return () => clearInterval(interval);
  }, [otherUserId, status, fetchMessages]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

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
          type: "text",
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setContent("");
        setShowEmojis(false);
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

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert("Nao foi possivel acessar o microfone.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
  }

  async function sendAudio() {
    if (!audioBlob || sendingAudio) return;
    setSendingAudio(true);

    try {
      const ext = audioBlob.type.includes("webm") ? "webm" : "mp4";
      const file = new File([audioBlob], `audio-${Date.now()}.${ext}`, { type: audioBlob.type });

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/local-upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Erro ao enviar arquivo");
      const { url } = await uploadRes.json();

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: otherUserId,
          content: url,
          type: "audio",
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setAudioBlob(null);
        setRecordingTime(0);
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao enviar audio.");
      }
    } catch {
      alert("Erro ao enviar audio. Tente novamente.");
    } finally {
      setSendingAudio(false);
    }
  }

  function insertEmoji(emoji: string) {
    setContent((prev) => prev + emoji);
  }

  const formatRecordingTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const audioCost = isInitiator ? AUDIO_COST : 0;

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const otherInitial = otherUser?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="bg-black h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/messages")}
          className="text-gray-400 hover:text-white transition"
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{otherInitial}</span>
            </div>
          )}
          {otherUser?.online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-purple-400 rounded-full border-2 border-black" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">
            {otherUser?.name || "Usuario"}
          </h2>
          {otherUser?.online ? (
            <p className="text-xs text-purple-500">Online</p>
          ) : (
            <p className="text-xs text-gray-400">Offline</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              Nenhuma mensagem ainda. Diga ola!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              type={msg.type}
              isMine={msg.senderId === myId}
              time={timeAgo(msg.createdAt)}
              cost={msg.cost}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojis && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="mx-auto max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-lg p-3">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-800 rounded-lg transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audio Preview (after recording) */}
      {audioBlob && !recording && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="mx-auto max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-lg p-3">
            <div className="flex items-center gap-3">
              <audio
                src={URL.createObjectURL(audioBlob)}
                controls
                className="flex-1 h-10"
              />
              <button
                onClick={cancelRecording}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={sendAudio}
                disabled={sendingAudio}
                className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white hover:bg-purple-600 transition disabled:opacity-40"
              >
                {sendingAudio ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </div>
            {audioCost > 0 && (
              <p className="text-xs text-purple-600 mt-2 text-center">
                Enviar audio custa {audioCost} moedas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex-shrink-0 bg-black border-t border-gray-800 px-4 py-3 pb-20 lg:pb-3">
        <div className="mx-auto max-w-lg">
          {/* Cost indicator */}
          {messageCost > 0 && !recording && !audioBlob && (
            <div className="flex items-center gap-1 mb-2 px-1">
              <span className="text-xs">🪙</span>
              <span className="text-xs text-purple-600 font-medium">
                Texto: {messageCost} moedas | Audio: {audioCost} moedas
              </span>
            </div>
          )}
          {messageCost === 0 && !recording && !audioBlob && (
            <div className="flex items-center gap-1 mb-2 px-1">
              <span className="text-xs text-purple-400 font-medium">
                Respostas gratuitas
              </span>
            </div>
          )}

          {/* Recording UI */}
          {recording ? (
            <div className="flex items-center gap-3">
              <button
                onClick={cancelRecording}
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-300">
                  Gravando {formatRecordingTime(recordingTime)}
                </span>
                <div className="flex-1 flex items-center gap-0.5">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-purple-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 20 + 4}px`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={stopRecording}
                className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white hover:bg-purple-600 transition flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              {/* Emoji button */}
              <button
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition flex-shrink-0 ${
                  showEmojis ? "bg-purple-500/20 text-purple-400" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </button>

              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2.5 bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-white placeholder-gray-500"
                onFocus={() => setShowEmojis(false)}
              />

              {content.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white hover:bg-purple-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white hover:bg-purple-600 transition flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
