"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { timeAgo } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  replies?: Comment[];
}

interface CommentsModalProps {
  videoId: string;
  videoOwnerId: string;
  videoOwnerName: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  "Conteudo inapropriado",
  "Spam",
  "Assedio ou bullying",
  "Discurso de odio",
  "Informacao falsa",
];

export default function CommentsModal({
  videoId,
  videoOwnerId,
  videoOwnerName,
  isOpen,
  onClose,
}: CommentsModalProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: "comment" | "video"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isVideoOwner = session?.user?.id === videoOwnerId;

  useEffect(() => {
    if (!isOpen || !videoId) return;

    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/videos/${videoId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (err) {
        console.error("Erro ao carregar comentarios:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [isOpen, videoId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (reportTarget) {
          setReportTarget(null);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, reportTarget]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || sending || !session) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          parentId: replyingTo?.id || null,
        }),
      });

      if (res.ok) {
        const created: Comment = await res.json();
        if (replyingTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyingTo.id
                ? { ...c, replies: [...(c.replies || []), created] }
                : c
            )
          );
        } else {
          setComments((prev) => [...prev, { ...created, replies: [] }]);
        }
        setNewComment("");
        setReplyingTo(null);
        inputRef.current?.focus();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao enviar comentario.");
      }
    } catch (err) {
      console.error("Erro ao enviar comentario:", err);
      setError("Erro ao enviar comentario.");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => {
          // Check if it's a top-level comment being deleted (cascade removes its replies too)
          const isTopLevel = prev.some((c) => c.id === commentId);
          if (isTopLevel) {
            return prev.filter((c) => c.id !== commentId);
          }
          // Otherwise remove from replies
          return prev.map((c) => ({
            ...c,
            replies: c.replies?.filter((r) => r.id !== commentId) || [],
          }));
        });
      }
    } catch (err) {
      console.error("Erro ao deletar comentario:", err);
    }
    setMenuOpen(null);
  };

  const handleReport = async () => {
    if (!reportTarget || !reportReason) return;
    setReportSending(true);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          videoId: reportTarget.type === "video" ? reportTarget.id : null,
          commentId: reportTarget.type === "comment" ? reportTarget.id : null,
        }),
      });
      setReportTarget(null);
      setReportReason("");
    } catch (err) {
      console.error("Erro ao reportar:", err);
    } finally {
      setReportSending(false);
    }
  };

  const canDeleteComment = (comment: Comment) => {
    if (!session?.user?.id) return false;
    return (
      comment.user.id === session.user.id ||
      isVideoOwner ||
      session.user.role === "ADMIN"
    );
  };

  const totalComments = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length || 0),
    0
  );

  if (!isOpen) return null;

  // Report modal overlay
  if (reportTarget) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70" onClick={() => setReportTarget(null)} />
        <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Reportar</h3>
          <div className="space-y-2 mb-4">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setReportReason(reason)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition ${
                  reportReason === reason
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                    : "bg-gray-800 text-gray-300 border border-transparent hover:bg-gray-700"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setReportTarget(null); setReportReason(""); }}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleReport}
              disabled={!reportReason || reportSending}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
            >
              {reportSending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const showMenu = menuOpen === comment.id;
    const size = isReply ? "h-6 w-6" : "h-8 w-8";
    const textSize = isReply ? "text-[10px]" : "text-xs";
    const nameSize = isReply ? "text-xs" : "text-sm";
    const contentSize = isReply ? "text-xs" : "text-sm";

    return (
      <div key={comment.id} className="flex gap-2 group relative">
        {comment.user.avatar ? (
          <img src={comment.user.avatar} alt={comment.user.name} className={`${size} shrink-0 rounded-full object-cover`} />
        ) : (
          <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-500 ${textSize} font-semibold text-white select-none`}>
            {comment.user.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`${nameSize} font-semibold text-white truncate`}>{comment.user.name}</span>
            <span className={`${textSize} text-gray-400 shrink-0`}>{timeAgo(comment.createdAt)}</span>
          </div>
          <p className={`${contentSize} text-gray-300 leading-relaxed break-words mt-0.5`}>{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            {session && !isReply && (
              <button
                onClick={() => { setReplyingTo({ id: comment.id, name: comment.user.name }); inputRef.current?.focus(); }}
                className="text-xs text-gray-400 hover:text-purple-500 transition-colors"
              >
                Responder
              </button>
            )}
            {session && (
              <button
                onClick={() => setReportTarget({ type: "comment", id: comment.id })}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                Reportar
              </button>
            )}
          </div>
        </div>
        {/* Delete menu */}
        {canDeleteComment(comment) && (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(showMenu ? null : comment.id)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-gray-800 transition opacity-0 group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-7 z-20 w-36 rounded-xl bg-gray-800 border border-gray-700 shadow-xl overflow-hidden">
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-700 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setMenuOpen(null)}>
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-gray-900 border border-gray-800 shadow-xl flex flex-col max-h-[70vh] animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Comentarios</h2>
            <span className="text-sm text-gray-400">{totalComments}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Report video button */}
            {session && !isVideoOwner && (
              <button
                onClick={() => setReportTarget({ type: "video", id: videoId })}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
                aria-label="Reportar video"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <p className="text-sm">Nenhum comentario ainda</p>
              <p className="text-xs mt-0.5">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 mt-2 space-y-3 border-l-2 border-gray-700 pl-3">
                    {comment.replies.map((reply) => renderComment(reply, true))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        {session ? (
          <div className="border-t border-gray-800 px-5 py-3">
            {!isVideoOwner && (
              <div className="flex items-center gap-1 mb-2 px-1">
                <span className="text-xs text-purple-400 font-medium">10 moedas por comentario</span>
              </div>
            )}
            {error && <p className="text-xs text-red-500 mb-2 px-1">{error}</p>}
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-purple-500">Respondendo a {replyingTo.name}</span>
                <button onClick={() => setReplyingTo(null)} className="text-xs text-gray-400 hover:text-gray-300">Cancelar</button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? "Escreva sua resposta..." : "Adicione um comentario..."}
                className="flex-1 rounded-full bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white hover:bg-purple-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
                aria-label="Enviar"
              >
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="border-t border-gray-800 px-5 py-3 text-center">
            <p className="text-sm text-gray-400">Faca login para comentar</p>
          </div>
        )}
      </div>
    </div>
  );
}
