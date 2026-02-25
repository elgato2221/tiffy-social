"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";

type Tab = "dashboard" | "users" | "feed" | "reports" | "withdrawals" | "deposits" | "verifications" | "content";

interface Stats {
  totalUsers: number;
  totalVideos: number;
  totalReports: number;
  pendingReports: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  pendingVerifications: number;
  totalMessages: number;
  bannedUsers: number;
  recentUsers: number;
  pendingFeedVideos: number;
  totalDeposits: number;
  totalDepositCoins: number;
}

interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  role: string;
  status: string;
  verified: boolean;
  coins: number;
  isAnonymous: boolean;
  createdAt: string;
  bannedAt: string | null;
  banReason: string | null;
  _count: { videos: number; followers: number; reports: number };
}

interface ReportItem {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; username: string; avatar: string | null };
  video: { id: string; url: string; caption: string | null; user: { id: string; name: string; username: string } } | null;
  comment: { id: string; content: string; user: { id: string; name: string; username: string } } | null;
}

interface WithdrawalItem {
  id: string;
  amount: number;
  pixKey: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; username: string; avatar: string | null; email: string; coins: number };
}

interface VerificationItem {
  id: string;
  selfieUrl: string;
  status: string;
  reason: string | null;
  createdAt: string;
  user: { id: string; name: string; username: string; avatar: string | null; verified: boolean };
}

interface FeedVideoItem {
  id: string;
  url: string;
  caption: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  user: { id: string; name: string; username: string; avatar: string | null; verified: boolean };
  _count: { likes: number; comments: number };
}

interface DepositItem {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  user: { id: string; name: string; username: string; avatar: string | null; email: string };
}

interface ContentItem {
  id: string;
  content: string;
  type: string;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaPrice: number | null;
  mediaUnlocked: boolean;
  createdAt: string;
  sender: { id: string; name: string; username: string; avatar: string | null };
  receiver: { id: string; name: string; username: string; avatar: string | null };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);

  // Dashboard
  const [stats, setStats] = useState<Stats | null>(null);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  // Reports
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsFilter, setReportsFilter] = useState("PENDING");
  const [processingReport, setProcessingReport] = useState<string | null>(null);

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);

  // Verifications
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [processingVerification, setProcessingVerification] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);

  // Feed moderation
  const [feedVideos, setFeedVideos] = useState<FeedVideoItem[]>([]);
  const [feedFilter, setFeedFilter] = useState("PENDING");
  const [processingFeedVideo, setProcessingFeedVideo] = useState<string | null>(null);
  const [feedRejectId, setFeedRejectId] = useState<string | null>(null);
  const [feedRejectReason, setFeedRejectReason] = useState("");
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Deposits
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [depositsStats, setDepositsStats] = useState<{ totalDeposits: number; totalCoins: number } | null>(null);

  // Content
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [contentFilter, setContentFilter] = useState("all");
  const [contentPage, setContentPage] = useState(1);
  const [contentTotalPages, setContentTotalPages] = useState(1);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentPreview, setContentPreview] = useState<string | null>(null);
  const [contentPreviewType, setContentPreviewType] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;
    if (session?.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchStats();
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;
    if (tab === "users") fetchUsers();
    else if (tab === "reports") fetchReports();
    else if (tab === "withdrawals") fetchWithdrawals();
    else if (tab === "verifications") fetchVerifications();
    else if (tab === "feed") fetchFeedVideos();
    else if (tab === "deposits") fetchDeposits();
    else if (tab === "content") fetchContent();
  }, [tab, status, session]);

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      console.error("Erro ao carregar stats");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: usersPage.toString() });
      if (usersSearch) params.set("search", usersSearch);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setUsersTotalPages(data.pages);
      }
    } catch {
      console.error("Erro ao carregar usuarios");
    } finally {
      setUsersLoading(false);
    }
  }

  async function fetchReports() {
    try {
      const res = await fetch(`/api/admin/reports?status=${reportsFilter}`);
      if (res.ok) setReports(await res.json());
    } catch {
      console.error("Erro ao carregar denuncias");
    }
  }

  async function fetchWithdrawals() {
    try {
      const res = await fetch("/api/admin/withdrawals");
      if (res.ok) setWithdrawals(await res.json());
    } catch {
      console.error("Erro ao carregar saques");
    }
  }

  async function fetchVerifications() {
    try {
      const res = await fetch("/api/admin/verifications");
      if (res.ok) setVerifications(await res.json());
    } catch {
      console.error("Erro ao carregar verificacoes");
    }
  }

  async function fetchFeedVideos() {
    try {
      const res = await fetch(`/api/admin/feed?status=${feedFilter}`);
      if (res.ok) setFeedVideos(await res.json());
    } catch {
      console.error("Erro ao carregar videos do feed");
    }
  }

  async function fetchDeposits() {
    try {
      const res = await fetch("/api/admin/deposits");
      if (res.ok) {
        const data = await res.json();
        setDeposits(data.deposits);
        setDepositsStats(data.stats);
      }
    } catch {
      console.error("Erro ao carregar depositos");
    }
  }

  async function fetchContent() {
    setContentLoading(true);
    try {
      const params = new URLSearchParams({ type: contentFilter, page: contentPage.toString() });
      const res = await fetch(`/api/admin/content?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContentItems(data.messages);
        setContentTotalPages(data.pages);
      }
    } catch {
      console.error("Erro ao carregar conteudo");
    } finally {
      setContentLoading(false);
    }
  }

  async function handleFeedVideoAction(videoId: string, action: "APPROVE" | "REJECT", reason?: string) {
    setProcessingFeedVideo(videoId);
    try {
      const res = await fetch("/api/admin/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, action, reason }),
      });
      if (res.ok) {
        setFeedVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? { ...v, status: action === "APPROVE" ? "APPROVED" : "REJECTED", rejectReason: reason || null }
              : v
          )
        );
        setFeedRejectId(null);
        setFeedRejectReason("");
        fetchStats();
      }
    } catch {
      alert("Erro ao processar video.");
    } finally {
      setProcessingFeedVideo(null);
    }
  }

  // User actions
  async function handleUserAction(userId: string, action: string, reason?: string, role?: string) {
    setProcessingUser(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason, role }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== userId) return u;
            if (action === "BAN") return { ...u, status: "BANNED", bannedAt: new Date().toISOString(), banReason: reason || null };
            if (action === "SUSPEND") return { ...u, status: "SUSPENDED", bannedAt: new Date().toISOString(), banReason: reason || null };
            if (action === "ACTIVATE") return { ...u, status: "ACTIVE", bannedAt: null, banReason: null };
            if (action === "CHANGE_ROLE" && role) return { ...u, role };
            return u;
          })
        );
        setActionUserId(null);
        setActionReason("");
        if (action === "BAN" || action === "ACTIVATE") fetchStats();
      }
    } catch {
      alert("Erro ao processar acao.");
    } finally {
      setProcessingUser(null);
    }
  }

  // Report actions
  async function handleReportAction(reportId: string, action: "APPROVE" | "REJECT") {
    setProcessingReport(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => r.id === reportId ? { ...r, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : r)
        );
        fetchStats();
      }
    } catch {
      alert("Erro ao processar denuncia.");
    } finally {
      setProcessingReport(null);
    }
  }

  // Withdrawal actions
  async function handleWithdrawalAction(withdrawalId: string, action: "APPROVE" | "REJECT") {
    setProcessingWithdrawal(withdrawalId);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action }),
      });
      if (res.ok) {
        setWithdrawals((prev) =>
          prev.map((w) => w.id === withdrawalId ? { ...w, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : w)
        );
        fetchStats();
      }
    } catch {
      alert("Erro ao processar saque.");
    } finally {
      setProcessingWithdrawal(null);
    }
  }

  // Verification actions
  async function handleVerificationAction(requestId: string, action: "APPROVE" | "REJECT", reason?: string) {
    setProcessingVerification(requestId);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, reason }),
      });
      if (res.ok) {
        setVerifications((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: action === "APPROVE" ? "APPROVED" : "REJECTED", reason: reason || null, user: { ...r.user, verified: action === "APPROVE" } }
              : r
          )
        );
        setRejectId(null);
        setRejectReason("");
        fetchStats();
      }
    } catch {
      alert("Erro ao processar.");
    } finally {
      setProcessingVerification(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "users", label: "Usuarios" },
    { key: "feed", label: "Feed", badge: stats?.pendingFeedVideos },
    { key: "reports", label: "Denuncias", badge: stats?.pendingReports },
    { key: "withdrawals", label: "Saques", badge: stats?.pendingWithdrawals },
    { key: "deposits", label: "Depositos" },
    { key: "verifications", label: "Verificacoes", badge: stats?.pendingVerifications },
    { key: "content", label: "Conteudo" },
  ];

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Painel Admin</h1>
        <p className="text-xs text-gray-500 mt-1">Gerenciamento da plataforma</p>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-4 gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-xl transition ${
              tab === t.key ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {t.label}
            {t.badge && t.badge > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {tab === "dashboard" && <DashboardTab stats={stats} />}
        {tab === "users" && (
          <UsersTab
            users={users}
            loading={usersLoading}
            search={usersSearch}
            setSearch={setUsersSearch}
            page={usersPage}
            totalPages={usersTotalPages}
            setPage={setUsersPage}
            onSearch={fetchUsers}
            actionUserId={actionUserId}
            setActionUserId={setActionUserId}
            actionReason={actionReason}
            setActionReason={setActionReason}
            processing={processingUser}
            onAction={handleUserAction}
          />
        )}
        {tab === "reports" && (
          <ReportsTab
            reports={reports}
            filter={reportsFilter}
            setFilter={(f: string) => { setReportsFilter(f); }}
            onRefresh={fetchReports}
            processing={processingReport}
            onAction={handleReportAction}
          />
        )}
        {tab === "withdrawals" && (
          <WithdrawalsTab
            withdrawals={withdrawals}
            processing={processingWithdrawal}
            onAction={handleWithdrawalAction}
          />
        )}
        {tab === "feed" && (
          <FeedTab
            videos={feedVideos}
            filter={feedFilter}
            setFilter={(f: string) => setFeedFilter(f)}
            onRefresh={fetchFeedVideos}
            processing={processingFeedVideo}
            rejectId={feedRejectId}
            setRejectId={setFeedRejectId}
            rejectReason={feedRejectReason}
            setRejectReason={setFeedRejectReason}
            onAction={handleFeedVideoAction}
            setPreviewVideoUrl={setPreviewVideoUrl}
          />
        )}
        {tab === "deposits" && (
          <DepositsTab
            deposits={deposits}
            stats={depositsStats}
          />
        )}
        {tab === "content" && (
          <ContentTab
            items={contentItems}
            loading={contentLoading}
            filter={contentFilter}
            setFilter={(f: string) => { setContentFilter(f); setContentPage(1); }}
            onRefresh={fetchContent}
            page={contentPage}
            totalPages={contentTotalPages}
            setPage={setContentPage}
            setPreviewUrl={(url: string, type: string) => { setContentPreview(url); setContentPreviewType(type); }}
          />
        )}
        {tab === "verifications" && (
          <VerificationsTab
            verifications={verifications}
            processing={processingVerification}
            rejectId={rejectId}
            setRejectId={setRejectId}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            onAction={handleVerificationAction}
            setFullscreenImg={setFullscreenImg}
          />
        )}
      </div>

      {/* Fullscreen Image */}
      {fullscreenImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullscreenImg(null)}>
          <button onClick={() => setFullscreenImg(null)} className="absolute top-4 right-4 text-white z-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={fullscreenImg} alt="Preview" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Content Preview Modal */}
      {contentPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => { setContentPreview(null); setContentPreviewType(null); }}>
          <button onClick={() => { setContentPreview(null); setContentPreviewType(null); }} className="absolute top-4 right-4 text-white z-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {contentPreviewType === "video" ? (
            <video src={contentPreview} controls autoPlay className="max-w-sm max-h-[80vh] rounded-2xl" onClick={(e) => e.stopPropagation()} />
          ) : contentPreviewType === "audio" ? (
            <div className="bg-white p-6 rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <audio src={contentPreview} controls autoPlay />
            </div>
          ) : (
            <img src={contentPreview} alt="Preview" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setPreviewVideoUrl(null)}>
          <button onClick={() => setPreviewVideoUrl(null)} className="absolute top-4 right-4 text-white z-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <video
            src={previewVideoUrl}
            controls
            autoPlay
            className="max-w-sm max-h-[80vh] rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Tab ───────────────────────────────────────────

function DashboardTab({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const cards = [
    { label: "Total Usuarios", value: stats.totalUsers, color: "text-blue-400", bg: "bg-blue-500/10", icon: "👥" },
    { label: "Novos (7 dias)", value: stats.recentUsers, color: "text-purple-400", bg: "bg-purple-500/10", icon: "✨" },
    { label: "Banidos", value: stats.bannedUsers, color: "text-red-400", bg: "bg-red-500/10", icon: "🚫" },
    { label: "Total Videos", value: stats.totalVideos, color: "text-purple-400", bg: "bg-purple-500/10", icon: "🎬" },
    { label: "Feed Pendentes", value: stats.pendingFeedVideos, color: "text-yellow-400", bg: "bg-yellow-500/10", icon: "🕐" },
    { label: "Total Mensagens", value: stats.totalMessages, color: "text-purple-400", bg: "bg-purple-500/10", icon: "💬" },
    { label: "Denuncias Pendentes", value: stats.pendingReports, color: "text-purple-400", bg: "bg-purple-500/10", icon: "⚠️" },
    { label: "Saques Pendentes", value: stats.pendingWithdrawals, color: "text-purple-400", bg: "bg-purple-500/10", icon: "💸" },
    { label: "Verificacoes Pendentes", value: stats.pendingVerifications, color: "text-purple-400", bg: "bg-purple-500/10", icon: "📋" },
    { label: "Total Depositos", value: stats.totalDeposits, color: "text-green-400", bg: "bg-green-500/10", icon: "💰" },
    { label: "Receita (moedas)", value: stats.totalDepositCoins, color: "text-green-400", bg: "bg-green-500/10", icon: "🪙" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} rounded-2xl p-4 border border-gray-200/50`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{card.icon}</span>
            <span className="text-[11px] text-gray-500 font-medium">{card.label}</span>
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>
            {card.value.toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────

function UsersTab({
  users, loading, search, setSearch, page, totalPages, setPage, onSearch,
  actionUserId, setActionUserId, actionReason, setActionReason, processing, onAction,
}: {
  users: AdminUser[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  onSearch: () => void;
  actionUserId: string | null;
  setActionUserId: (id: string | null) => void;
  actionReason: string;
  setActionReason: (r: string) => void;
  processing: string | null;
  onAction: (userId: string, action: string, reason?: string, role?: string) => void;
}) {
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    onSearch();
  }

  useEffect(() => { onSearch(); }, [page]);

  function getStatusBadge(status: string) {
    switch (status) {
      case "ACTIVE": return "bg-purple-500/20 text-purple-400";
      case "SUSPENDED": return "bg-purple-500/20 text-purple-400";
      case "BANNED": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-500";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "ACTIVE": return "Ativo";
      case "SUSPENDED": return "Suspenso";
      case "BANNED": return "Banido";
      default: return status;
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, username ou email..."
          className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        />
        <button type="submit" className="px-4 py-2.5 bg-purple-500 text-white text-sm font-semibold rounded-xl hover:bg-purple-600 transition">
          Buscar
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">Nenhum usuario encontrado</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{user.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    {user.verified && <span className="text-blue-400 text-xs">✓</span>}
                    {user.role === "ADMIN" && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-bold">ADMIN</span>}
                  </div>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(user.status)}`}>
                    {getStatusLabel(user.status)}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">{user.coins.toLocaleString("pt-BR")} moedas</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-4 px-4 py-2 text-[11px] text-gray-500 bg-gray-50">
                <span>{user._count.videos} videos</span>
                <span>{user._count.followers} seguidores</span>
                <span>{user._count.reports} denuncias</span>
                <span>{timeAgo(user.createdAt)}</span>
              </div>

              {/* Ban reason */}
              {user.banReason && user.status !== "ACTIVE" && (
                <div className="px-4 py-2 bg-red-500/10 text-xs text-red-400">
                  Motivo: {user.banReason}
                </div>
              )}

              {/* Actions */}
              {user.role !== "ADMIN" && (
                <div className="px-4 py-3 bg-gray-50">
                  {actionUserId === user.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        placeholder="Motivo..."
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => { setActionUserId(null); setActionReason(""); }} className="flex-1 py-2 text-xs text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-100">
                          Cancelar
                        </button>
                        <button
                          onClick={() => onAction(user.id, "BAN", actionReason)}
                          disabled={processing === user.id}
                          className="flex-1 py-2 text-xs text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                        >
                          Confirmar Ban
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {user.status === "ACTIVE" && (
                        <>
                          <button onClick={() => setActionUserId(user.id)} disabled={processing === user.id} className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50">
                            Banir
                          </button>
                          <button onClick={() => onAction(user.id, "SUSPEND")} disabled={processing === user.id} className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50">
                            Suspender
                          </button>
                        </>
                      )}
                      {(user.status === "BANNED" || user.status === "SUSPENDED") && (
                        <button onClick={() => onAction(user.id, "ACTIVATE")} disabled={processing === user.id} className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50">
                          Reativar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-30"
          >
            Proximo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────────

function ReportsTab({
  reports, filter, setFilter, onRefresh, processing, onAction,
}: {
  reports: ReportItem[];
  filter: string;
  setFilter: (f: string) => void;
  onRefresh: () => void;
  processing: string | null;
  onAction: (reportId: string, action: "APPROVE" | "REJECT") => void;
}) {
  useEffect(() => { onRefresh(); }, [filter]);

  const filters = [
    { key: "PENDING", label: "Pendentes" },
    { key: "all", label: "Todas" },
    { key: "APPROVED", label: "Aprovadas" },
    { key: "REJECTED", label: "Rejeitadas" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              filter === f.key ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">Nenhuma denuncia</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              {/* Reporter info */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                {report.user.avatar ? (
                  <img src={report.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{report.user.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">Denuncia de @{report.user.username}</p>
                  <p className="text-[10px] text-gray-500">{timeAgo(report.createdAt)}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  report.status === "PENDING" ? "bg-purple-500/20 text-purple-400" :
                  report.status === "APPROVED" ? "bg-purple-500/20 text-purple-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {report.status === "PENDING" ? "Pendente" : report.status === "APPROVED" ? "Aprovada" : "Rejeitada"}
                </span>
              </div>

              {/* Reason */}
              <div className="px-4 py-2 bg-gray-50">
                <p className="text-xs text-gray-600">{report.reason}</p>
              </div>

              {/* Target */}
              <div className="px-4 py-2 bg-gray-50">
                {report.video && (
                  <div className="text-xs text-gray-500">
                    <span className="text-purple-400 font-semibold">Video</span> de @{report.video.user.username}
                    {report.video.caption && <span className="text-gray-500"> - {report.video.caption.slice(0, 50)}</span>}
                  </div>
                )}
                {report.comment && (
                  <div className="text-xs text-gray-500">
                    <span className="text-purple-400 font-semibold">Comentario</span> de @{report.comment.user.username}
                    <p className="text-gray-500 mt-0.5 truncate">&quot;{report.comment.content.slice(0, 80)}&quot;</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {report.status === "PENDING" && (
                <div className="flex gap-2 px-4 py-3 bg-gray-50">
                  <button
                    onClick={() => onAction(report.id, "APPROVE")}
                    disabled={processing === report.id}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50"
                  >
                    {processing === report.id ? "..." : "Aprovar"}
                  </button>
                  <button
                    onClick={() => onAction(report.id, "REJECT")}
                    disabled={processing === report.id}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Withdrawals Tab ─────────────────────────────────────────

function WithdrawalsTab({
  withdrawals, processing, onAction,
}: {
  withdrawals: WithdrawalItem[];
  processing: string | null;
  onAction: (withdrawalId: string, action: "APPROVE" | "REJECT") => void;
}) {
  const pending = withdrawals.filter((w) => w.status === "PENDING");
  const processed = withdrawals.filter((w) => w.status !== "PENDING");
  const [showProcessed, setShowProcessed] = useState(false);

  const displayList = showProcessed ? processed : pending;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setShowProcessed(false)}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
            !showProcessed ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          Pendentes ({pending.length})
        </button>
        <button
          onClick={() => setShowProcessed(true)}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
            showProcessed ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          Historico ({processed.length})
        </button>
      </div>

      {displayList.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">
          {showProcessed ? "Nenhum historico" : "Nenhum saque pendente"}
        </p>
      ) : (
        <div className="space-y-3">
          {displayList.map((w) => (
            <div key={w.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                {w.user.avatar ? (
                  <img src={w.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{w.user.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{w.user.name}</p>
                  <p className="text-xs text-gray-500">@{w.user.username}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    w.status === "PENDING" ? "bg-purple-500/20 text-purple-400" :
                    w.status === "APPROVED" ? "bg-purple-500/20 text-purple-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {w.status === "PENDING" ? "Pendente" : w.status === "APPROVED" ? "Aprovado" : "Recusado"}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">{timeAgo(w.createdAt)}</p>
                </div>
              </div>

              {/* Details */}
              <div className="px-4 py-3 bg-gray-50 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Valor</span>
                  <span className="text-purple-400 font-bold">{w.amount.toLocaleString("pt-BR")} moedas</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Chave PIX</span>
                  <span className="text-gray-300 font-mono text-[11px]">{w.pixKey}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-500">{w.user.email}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Saldo atual</span>
                  <span className="text-gray-500">{w.user.coins.toLocaleString("pt-BR")} moedas</span>
                </div>
              </div>

              {/* Actions */}
              {w.status === "PENDING" && (
                <div className="flex gap-2 px-4 py-3 bg-gray-50">
                  <button
                    onClick={() => onAction(w.id, "APPROVE")}
                    disabled={processing === w.id}
                    className="flex-1 py-2.5 text-xs font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50"
                  >
                    {processing === w.id ? "..." : "Aprovar Saque"}
                  </button>
                  <button
                    onClick={() => onAction(w.id, "REJECT")}
                    disabled={processing === w.id}
                    className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Verifications Tab ───────────────────────────────────────

function VerificationsTab({
  verifications, processing, rejectId, setRejectId, rejectReason, setRejectReason, onAction, setFullscreenImg,
}: {
  verifications: VerificationItem[];
  processing: string | null;
  rejectId: string | null;
  setRejectId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (r: string) => void;
  onAction: (requestId: string, action: "APPROVE" | "REJECT", reason?: string) => void;
  setFullscreenImg: (url: string | null) => void;
}) {
  const pending = verifications.filter((r) => r.status === "PENDING");
  const processed = verifications.filter((r) => r.status !== "PENDING");
  const [showProcessed, setShowProcessed] = useState(false);

  const displayList = showProcessed ? processed : pending;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setShowProcessed(false)}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
            !showProcessed ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          Pendentes ({pending.length})
        </button>
        <button
          onClick={() => setShowProcessed(true)}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
            showProcessed ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          Historico ({processed.length})
        </button>
      </div>

      {displayList.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">
          {showProcessed ? "Nenhum historico" : "Nenhum pedido pendente"}
        </p>
      ) : (
        <div className="space-y-3">
          {displayList.map((req) => (
            <div key={req.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                {req.user.avatar ? (
                  <img src={req.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{req.user.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{req.user.name}</p>
                  <p className="text-xs text-gray-500">@{req.user.username}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    req.status === "PENDING" ? "bg-purple-500/20 text-purple-400" :
                    req.status === "APPROVED" ? "bg-purple-500/20 text-purple-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {req.status === "PENDING" ? "Pendente" : req.status === "APPROVED" ? "Aprovado" : "Recusado"}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">{timeAgo(req.createdAt)}</p>
                </div>
              </div>

              <button onClick={() => setFullscreenImg(req.selfieUrl)} className="w-full">
                <img src={req.selfieUrl} alt="Selfie" className="w-full max-h-80 object-contain bg-gray-100" />
              </button>

              {req.status === "PENDING" && (
                <div className="px-4 py-3 space-y-2 bg-gray-50">
                  {rejectId === req.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Motivo da rejeicao..."
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => { setRejectId(null); setRejectReason(""); }} className="flex-1 py-2 text-xs text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-100">
                          Cancelar
                        </button>
                        <button
                          onClick={() => onAction(req.id, "REJECT", rejectReason)}
                          disabled={processing === req.id}
                          className="flex-1 py-2 text-xs text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAction(req.id, "APPROVE")}
                        disabled={processing === req.id}
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50"
                      >
                        {processing === req.id ? "..." : "Aprovar"}
                      </button>
                      <button
                        onClick={() => setRejectId(req.id)}
                        disabled={processing === req.id}
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {req.status === "REJECTED" && req.reason && (
                <div className="px-4 py-2 bg-red-500/10 text-xs text-red-400">
                  Motivo: {req.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Feed Tab ─────────────────────────────────────────────────

function FeedTab({
  videos, filter, setFilter, onRefresh, processing, rejectId, setRejectId,
  rejectReason, setRejectReason, onAction, setPreviewVideoUrl,
}: {
  videos: FeedVideoItem[];
  filter: string;
  setFilter: (f: string) => void;
  onRefresh: () => void;
  processing: string | null;
  rejectId: string | null;
  setRejectId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (r: string) => void;
  onAction: (videoId: string, action: "APPROVE" | "REJECT", reason?: string) => void;
  setPreviewVideoUrl: (url: string | null) => void;
}) {
  useEffect(() => { onRefresh(); }, [filter]);

  const filters = [
    { key: "PENDING", label: "Pendentes" },
    { key: "all", label: "Todos" },
    { key: "APPROVED", label: "Aprovados" },
    { key: "REJECTED", label: "Rejeitados" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              filter === f.key ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {videos.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">Nenhum video</p>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div key={video.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              {/* User info header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                {video.user.avatar ? (
                  <img src={video.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{video.user.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-gray-900">@{video.user.username}</p>
                    {video.user.verified && <span className="text-blue-400 text-xs">✓</span>}
                  </div>
                  <p className="text-[10px] text-gray-500">{timeAgo(video.createdAt)}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  video.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400" :
                  video.status === "APPROVED" ? "bg-green-500/20 text-green-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {video.status === "PENDING" ? "Pendente" : video.status === "APPROVED" ? "Aprovado" : "Rejeitado"}
                </span>
              </div>

              {/* Video preview thumbnail */}
              <button
                onClick={() => setPreviewVideoUrl(video.url)}
                className="w-full relative bg-gray-100 aspect-[9/16] max-h-80 overflow-hidden"
              >
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Caption */}
              {video.caption && (
                <div className="px-4 py-2 bg-gray-50">
                  <p className="text-xs text-gray-600">{video.caption}</p>
                </div>
              )}

              {/* Rejection reason */}
              {video.status === "REJECTED" && video.rejectReason && (
                <div className="px-4 py-2 bg-red-500/10 text-xs text-red-400">
                  Motivo: {video.rejectReason}
                </div>
              )}

              {/* Actions for pending videos */}
              {video.status === "PENDING" && (
                <div className="px-4 py-3 space-y-2 bg-gray-50">
                  {rejectId === video.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Motivo da rejeicao (opcional)..."
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => { setRejectId(null); setRejectReason(""); }} className="flex-1 py-2 text-xs text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-100">
                          Cancelar
                        </button>
                        <button
                          onClick={() => onAction(video.id, "REJECT", rejectReason)}
                          disabled={processing === video.id}
                          className="flex-1 py-2 text-xs text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAction(video.id, "APPROVE")}
                        disabled={processing === video.id}
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50"
                      >
                        {processing === video.id ? "..." : "Aprovar"}
                      </button>
                      <button
                        onClick={() => setRejectId(video.id)}
                        disabled={processing === video.id}
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Content Tab ─────────────────────────────────────────────

function ContentTab({
  items, loading, filter, setFilter, onRefresh, page, totalPages, setPage, setPreviewUrl,
}: {
  items: ContentItem[];
  loading: boolean;
  filter: string;
  setFilter: (f: string) => void;
  onRefresh: () => void;
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  setPreviewUrl: (url: string, type: string) => void;
}) {
  useEffect(() => { onRefresh(); }, [filter, page]);

  const filters = [
    { key: "all", label: "Todos" },
    { key: "locked_media", label: "Midia Bloqueada" },
    { key: "audio", label: "Audios" },
  ];

  function handlePreview(item: ContentItem) {
    if (item.type === "audio") {
      setPreviewUrl(item.content, "audio");
    } else if (item.mediaUrl) {
      setPreviewUrl(item.mediaUrl, item.mediaType || "photo");
    }
  }

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3">
        <p className="text-xs text-purple-300 font-medium">Acesso restrito ao admin. Conteudo protegido e confidencial.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              filter === f.key ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">Nenhum conteudo</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              {/* Sender -> Receiver */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.sender.avatar ? (
                    <img src={item.sender.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{item.sender.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  <p className="text-xs font-semibold text-gray-900 truncate">@{item.sender.username}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <p className="text-xs font-semibold text-gray-900 truncate">@{item.receiver.username}</p>
                  {item.receiver.avatar ? (
                    <img src={item.receiver.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{item.receiver.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Media preview */}
              <button onClick={() => handlePreview(item)} className="w-full relative bg-gray-100">
                {item.type === "audio" ? (
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                        <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 text-left">Audio</p>
                      <p className="text-[10px] text-gray-500 text-left">Toque para ouvir</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : item.mediaUrl && item.mediaType === "video" ? (
                  <div className="relative aspect-video max-h-60 overflow-hidden">
                    <video src={item.mediaUrl} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : item.mediaUrl ? (
                  <img src={item.mediaUrl} alt="Media" className="w-full max-h-60 object-contain" />
                ) : null}
              </button>

              {/* Info row */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.type === "locked_media"
                      ? item.mediaUnlocked ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {item.type === "locked_media"
                      ? item.mediaUnlocked ? "Desbloqueada" : "Bloqueada"
                      : "Audio"
                    }
                  </span>
                  {item.mediaPrice && (
                    <span className="text-[10px] text-gray-500">{item.mediaPrice} moedas</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500">{timeAgo(item.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-30"
          >
            Proximo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Deposits Tab ─────────────────────────────────────────────

function DepositsTab({
  deposits,
  stats,
}: {
  deposits: DepositItem[];
  stats: { totalDeposits: number; totalCoins: number } | null;
}) {
  return (
    <div className="space-y-4">
      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 rounded-2xl p-4 border border-gray-200/50">
            <p className="text-[11px] text-gray-500 font-medium">Total Depositos</p>
            <p className="text-2xl font-bold text-green-400">{stats.totalDeposits.toLocaleString("pt-BR")}</p>
          </div>
          <div className="bg-green-500/10 rounded-2xl p-4 border border-gray-200/50">
            <p className="text-[11px] text-gray-500 font-medium">Total Moedas</p>
            <p className="text-2xl font-bold text-green-400">{stats.totalCoins.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      )}

      {deposits.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">Nenhum deposito</p>
      ) : (
        <div className="space-y-3">
          {deposits.map((d) => (
            <div key={d.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                {d.user.avatar ? (
                  <img src={d.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{d.user.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{d.user.name}</p>
                  <p className="text-xs text-gray-500">@{d.user.username}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">+{d.amount.toLocaleString("pt-BR")}</p>
                  <p className="text-[10px] text-gray-500">{timeAgo(d.createdAt)}</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-gray-50">
                <p className="text-xs text-gray-500 truncate">{d.description}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{d.user.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
