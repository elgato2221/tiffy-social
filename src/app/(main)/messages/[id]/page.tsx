"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { timeAgo, MESSAGE_COST, AUDIO_COST } from "@/lib/utils";
import ChatBubble from "@/components/ChatBubble";
import { CoinIcon } from "@/components/ui/CoinIcon";

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
  giftType?: string | null;
  giftEmoji?: string | null;
  giftValue?: number | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaPrice?: number | null;
  mediaUnlocked?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  online: boolean;
  gender: string;
  messageCost?: number;
  verified?: boolean;
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

  // Locked media state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaPrice, setMediaPrice] = useState("50");
  const [sendingMedia, setSendingMedia] = useState(false);
  const [unlockingMessageId, setUnlockingMessageId] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const myId = session?.user?.id;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Re-evaluate who is the initiator whenever messages change
  const updateInitiatorStatus = useCallback((msgs: Message[], userMsgCost: number) => {
    if (msgs.length === 0) {
      setMessageCost(userMsgCost);
      setIsInitiator(true);
    } else {
      const firstMsg = msgs.find((m) => m.type !== "gift");
      if (!firstMsg || firstMsg.senderId === myId) {
        setMessageCost(userMsgCost);
        setIsInitiator(true);
      } else {
        setMessageCost(0);
        setIsInitiator(false);
      }
    }
  }, [myId]);

  const fetchMessages = useCallback(async () => {
    if (!otherUserId) return;
    try {
      const res = await fetch(`/api/messages/${otherUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          const changed = data.length !== prev.length || data[data.length - 1]?.id !== prev[prev.length - 1]?.id;
          return changed ? data : prev;
        });
        // Always re-evaluate initiator status to keep it in sync
        const cost = otherUser?.messageCost || MESSAGE_COST;
        updateInitiatorStatus(data, cost);
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  }, [otherUserId, otherUser, updateInitiatorStatus]);

  // Fetch other user's profile and messages
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (!myId || !otherUserId) return;

    async function init() {
      try {
        let userData: UserProfile | null = null;
        const userRes = await fetch(`/api/users/${otherUserId}`);
        if (userRes.ok) {
          userData = await userRes.json();
          setOtherUser(userData);
        }

        const msgRes = await fetch(`/api/messages/${otherUserId}`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData);

          const userMsgCost = userData?.messageCost || MESSAGE_COST;
          updateInitiatorStatus(msgData, userMsgCost);
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

  // Compress image to JPEG under 4MB for Vercel upload limit
  async function compressImage(file: File): Promise<File> {
    if (file.type.startsWith("video/")) return file;
    if (file.size <= 3 * 1024 * 1024) return file; // Under 3MB, no compression needed

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down if too large
        const MAX_DIM = 2048;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert("Selecione uma imagem ou video.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert("Arquivo muito grande. Maximo 100MB.");
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setShowMediaPicker(true);
    setShowEmojis(false);
  }

  function cancelMedia() {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setShowMediaPicker(false);
    setMediaPrice("50");
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  }

  async function handleSendLockedMedia() {
    if (!mediaFile || sendingMedia) return;
    setSendingMedia(true);
    try {
      // Compress image if needed (Vercel has 4.5MB limit)
      const fileToUpload = await compressImage(mediaFile);

      const formData = new FormData();
      formData.append("file", fileToUpload);
      const uploadRes = await fetch("/api/local-upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao enviar arquivo");
      }
      const { url } = await uploadRes.json();

      const isVideo = mediaFile.type.startsWith("video/");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: otherUserId,
          content: "Midia bloqueada",
          type: "locked_media",
          mediaUrl: url,
          mediaType: isVideo ? "video" : "photo",
          mediaPrice: parseInt(mediaPrice) || 50,
        }),
      });
      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        cancelMedia();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao enviar midia.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar midia. Tente novamente.");
    } finally {
      setSendingMedia(false);
    }
  }

  async function handleUnlockMedia(messageId: string) {
    setUnlockingMessageId(messageId);
    try {
      const res = await fetch("/api/messages/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, mediaUnlocked: true, mediaUrl: data.mediaUrl } : m
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao desbloquear.");
      }
    } catch {
      alert("Erro ao desbloquear. Tente novamente.");
    } finally {
      setUnlockingMessageId(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const otherInitial = otherUser?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="fixed inset-0 bg-black flex flex-col w-full z-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-black border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 safe-top">
        <button
          onClick={() => router.push("/messages")}
          className="text-gray-400 hover:text-white transition p-1"
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
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{otherInitial}</span>
            </div>
          )}
          {otherUser?.online && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-purple-400 rounded-full border-2 border-black" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">
            {otherUser?.name || "Usuario"}
          </h2>
          {otherUser?.online ? (
            <p className="text-[11px] text-purple-500">Online</p>
          ) : (
            <p className="text-[11px] text-gray-500">Offline</p>
          )}
        </div>
      </div>

      {/* Messages - flex-end so messages stick to bottom */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 w-full min-w-0 flex flex-col justify-end">
        <div>
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
                giftEmoji={msg.giftEmoji}
                giftValue={msg.giftValue}
                mediaUrl={msg.mediaUrl}
                mediaType={msg.mediaType}
                mediaPrice={msg.mediaPrice}
                mediaUnlocked={msg.mediaUnlocked}
                onUnlockMedia={msg.type === "locked_media" && !msg.mediaUnlocked && msg.senderId !== myId ? () => handleUnlockMedia(msg.id) : undefined}
                unlocking={unlockingMessageId === msg.id}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojis && (
        <div className="flex-shrink-0 px-3 pb-2 w-full min-w-0">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-lg p-3">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-800 rounded-lg transition"
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
        <div className="flex-shrink-0 px-3 pb-2 w-full min-w-0">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-lg p-3">
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
      <div className="flex-shrink-0 bg-black border-t border-gray-800 px-3 pt-2 pb-3 w-full min-w-0 safe-bottom">
        <div className="w-full max-w-lg mx-auto min-w-0">
          {/* Cost indicator */}
          {messageCost > 0 && !recording && !audioBlob && !showMediaPicker && (
            <div className="flex items-center gap-1 mb-2 px-1">
              <CoinIcon size="xs" />
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

          {/* Media Preview */}
          {showMediaPicker && mediaFile && (
            <div className="mb-3 bg-gray-900 border border-gray-700 rounded-2xl p-3 w-full min-w-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                  {mediaFile.type.startsWith("video/") ? (
                    <video src={mediaPreview!} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={mediaPreview!} alt="Preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-2">Preco para desbloquear:</p>
                  <div className="flex items-center gap-2">
                    <CoinIcon size="sm" />
                    <input
                      type="number"
                      value={mediaPrice}
                      onChange={(e) => setMediaPrice(e.target.value)}
                      min="1"
                      max="10000"
                      className="w-24 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-500">moedas</span>
                  </div>
                </div>
                <button onClick={cancelMedia} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleSendLockedMedia}
                disabled={sendingMedia}
                className="w-full mt-3 py-2 bg-purple-500 text-white text-sm font-semibold rounded-xl hover:bg-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingMedia ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Enviar midia bloqueada
                  </>
                )}
              </button>
            </div>
          )}

          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            onChange={handleMediaSelect}
            className="hidden"
          />

          {/* Recording UI */}
          {recording ? (
            <div className="flex items-center gap-2 w-full min-w-0">
              <button
                onClick={cancelRecording}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300 flex-shrink-0">
                  {formatRecordingTime(recordingTime)}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-0.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-purple-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 16 + 4}px`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={stopRecording}
                className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-center gap-1.5 w-full min-w-0">
              {/* Emoji button */}
              <button
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition flex-shrink-0 ${
                  showEmojis ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </button>

              {/* Camera/media button */}
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-200 transition flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </button>

              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mensagem..."
                className="flex-1 min-w-0 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:border-gray-600 text-sm text-white placeholder-gray-500"
                onFocus={() => setShowEmojis(false)}
              />

              {content.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-9 h-9 flex items-center justify-center text-purple-400 font-semibold hover:text-purple-300 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-200 transition flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
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
