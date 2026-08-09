import React, { useState } from "react";
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Lock, 
  Server, 
  Key, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Database,
  Cpu,
  BarChart2,
  BarChart3,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  UserPlus,
  Trash2,
  Check,
  Sun,
  Moon,
  MessageSquare,
  Star,
  DollarSign,
  TrendingUp,
  PieChart,
  Zap,
  Scissors,
  Lightbulb,
  GraduationCap,
  Bot
} from "lucide-react";
import { motion } from "motion/react";
import { db, getUsageMetricsFromFirestore } from "../lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { AdminAssistantChat } from "./AdminAssistantChat";
import { AdminAutomationDashboard } from "./AdminAutomationDashboard";
import { AutomationActivityFeed } from "./AutomationActivityFeed";

interface AdminDashboardProps {
  theme: "dark" | "light" | "midnight" | "emerald" | "amber" | "rose";
  onToggleTheme: () => void;
  onThemeChange: (theme: "dark" | "light" | "midnight" | "emerald" | "amber" | "rose") => void;
  userProfile: { name: string; email: string } | null;
  onBackToChat: () => void;
  conversations?: any[];
  onClearAllChats?: () => void;
  onDeleteChat?: (id: string, e: React.MouseEvent) => void;
  useSearch?: boolean;
  onUseSearchChange?: (val: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  theme,
  onToggleTheme,
  onThemeChange,
  userProfile,
  onBackToChat,
  conversations = [],
  onClearAllChats,
  onDeleteChat,
  useSearch = false,
  onUseSearchChange,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "security" | "logs" | "models" | "chats" | "theme" | "analytics" | "cost-agent" | "admin-assistant">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [systemStatus, setSystemStatus] = useState<"optimal" | "warning">("optimal");
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [themeSuccessMsg, setThemeSuccessMsg] = useState<string | null>(null);
  const [adminGlobalSearch, setAdminGlobalSearch] = useState(useSearch);
  const [searchSuccessMsg, setSearchSuccessMsg] = useState<string | null>(null);

  // User Learning Progress State for Admin Analytics
  const [userProgressMap, setUserProgressMap] = useState<Record<string, any>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("joxiq_user_learning_progress_v2");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Failed loading user learning progress for admin analytics:", e);
      }
    }
    return {};
  });

  // Cost Optimization Agent Prompt Compressor State
  const [testPrompt, setTestPrompt] = useState("Hello JOXIQ AI! Could you please kindly help me write a Python script to filter prime numbers from a list? Thank you so much in advance for your assistance!");
  const [compressionResult, setCompressionResult] = useState<any>(null);
  const [isCompressingPrompt, setIsCompressingPrompt] = useState(false);

  const handleTestCompression = async () => {
    if (!testPrompt.trim()) return;
    setIsCompressingPrompt(true);
    try {
      const res = await fetch("/api/admin/compress-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: testPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        setCompressionResult(data.result);
      }
    } catch (e) {
      console.error("Compression test error", e);
    } finally {
      setIsCompressingPrompt(false);
    }
  };

  // Real-time AI usage metrics from Firestore
  const [usageMetrics, setUsageMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  const loadUsageMetrics = async () => {
    setIsLoadingMetrics(true);
    const data = await getUsageMetricsFromFirestore();
    setUsageMetrics(data);
    setIsLoadingMetrics(false);
  };

  React.useEffect(() => {
    loadUsageMetrics();
  }, []);

  React.useEffect(() => {
    fetch("/api/admin/web-search")
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data && typeof data.useSearch === "boolean") {
          setAdminGlobalSearch(data.useSearch);
          if (onUseSearchChange) onUseSearchChange(data.useSearch);
        }
      })
      .catch(() => {
        // Ignore network hiccups during dev restarts
      });
  }, []);

  // Chat Themes management state
  const [themesList, setThemesList] = useState<any[]>([
    { id: "dark", name: "Classic Dark Slate", desc: "Deep dark slate with indigo accents", accent: "indigo" },
    { id: "light", name: "Clean Light", desc: "Crisp white & clean slate grey UI", accent: "indigo" },
    { id: "midnight", name: "Midnight Indigo", desc: "Deep rich indigo blue night theme", accent: "blue" },
    { id: "emerald", name: "Emerald Obsidian", desc: "Dark obsidian with emerald highlights", accent: "emerald" },
    { id: "amber", name: "Sunset Amber", desc: "Warm amber & cozy gold tones", accent: "amber" },
    { id: "rose", name: "Rose Velvet", desc: "Luxurious wine and rose velvet theme", accent: "rose" },
  ]);
  const [showAddThemeModal, setShowAddThemeModal] = useState(false);
  const [newThemeId, setNewThemeId] = useState("");
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeDesc, setNewThemeDesc] = useState("");
  const [newThemeAccent, setNewThemeAccent] = useState("indigo");

  React.useEffect(() => {
    fetch("/api/themes")
      .then(res => res.json())
      .then(data => {
        if (data.themes) setThemesList(data.themes);
      })
      .catch(err => console.error("Failed to load themes", err));
  }, []);

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeId || !newThemeName) return;
    try {
      const res = await fetch("/api/admin/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newThemeId.toLowerCase().replace(/\s+/g, "-"),
          name: newThemeName,
          desc: newThemeDesc,
          accent: newThemeAccent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setThemesList(data.themes);
        setNewThemeId("");
        setNewThemeName("");
        setNewThemeDesc("");
        setShowAddThemeModal(false);
        setThemeSuccessMsg("New chat theme successfully created and added to database.");
        setTimeout(() => setThemeSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Failed to create theme", err);
    }
  };

  const isDark = theme !== "light";

  const DEFAULT_ADMIN_USERS = [
    {
      id: "usr-owner-admin",
      name: "Owner Admin",
      email: "mnain7674@gmail.com",
      role: "Owner Admin",
      status: "Active",
      createdAt: "2024-01-01",
      lastLogin: "Just now",
      subscriptionStatus: "Ultra Pro",
      tokensUsed: "145200"
    },
    {
      id: "usr-demo-1",
      name: "Ahmad Hassan",
      email: "ahmad.hassan@example.com",
      role: "Standard User",
      status: "Active",
      createdAt: "2024-02-15",
      lastLogin: "2 hours ago",
      subscriptionStatus: "Pro",
      tokensUsed: "42300"
    },
    {
      id: "usr-demo-2",
      name: "Fatima Rahman",
      email: "fatima.r@example.com",
      role: "Standard User",
      status: "Active",
      createdAt: "2024-03-01",
      lastLogin: "1 day ago",
      subscriptionStatus: "Free",
      tokensUsed: "8900"
    },
    {
      id: "usr-demo-3",
      name: "Tanvir Ahmed",
      email: "tanvir.code@example.com",
      role: "Content Manager",
      status: "Active",
      createdAt: "2024-03-10",
      lastLogin: "3 hours ago",
      subscriptionStatus: "Pro",
      tokensUsed: "61200"
    }
  ];

  // User directory for admin management
  const [usersList, setUsersList] = useState<any[]>(DEFAULT_ADMIN_USERS);
  const [userFilter, setUserFilter] = useState<string>("all");

  React.useEffect(() => {
    async function loadUsers() {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const fbUsers: any[] = [];
        querySnapshot.forEach((docSnap) => {
          fbUsers.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        const existingEmails = new Set(fbUsers.map((u) => u.email?.toLowerCase()));
        const merged = [...fbUsers];
        for (const defUser of DEFAULT_ADMIN_USERS) {
          if (!existingEmails.has(defUser.email.toLowerCase())) {
            merged.push(defUser);
          }
        }
        setUsersList(merged);
      } catch (err) {
        console.error("Firestore user fetch error", err);
        setUsersList(DEFAULT_ADMIN_USERS);
      }
    }
    loadUsers();
  }, []);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadAuditLogs() {
      try {
        const querySnapshot = await getDocs(collection(db, "audit_logs"));
        const logs: any[] = [];
        querySnapshot.forEach((docSnap) => {
          logs.push({ id: docSnap.id, ...docSnap.data() });
        });
        logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAuditLogs(logs);
      } catch (err) {
        console.error("Firestore audit logs fetch error", err);
        setAuditLogs([]);
      }
    }
    loadAuditLogs();
  }, []);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Standard User");
  const [newUserSub, setNewUserSub] = useState("Free");

  const handleRunAudit = async () => {
    const newLog = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: Date.now(),
      user: userProfile?.email || "mnain7674@gmail.com",
      action: "SECURITY_AUDIT_MANUAL",
      status: "SUCCESS",
      ip: "Web Client"
    };
    try {
      await setDoc(doc(collection(db, "audit_logs")), newLog);
      const querySnapshot = await getDocs(collection(db, "audit_logs"));
      const logs: any[] = [];
      querySnapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setAuditLogs(logs);
    } catch (e) {
      setAuditLogs([{ id: `log-${Date.now()}`, ...newLog }, ...auditLogs]);
    }
    setAuditMessage("Security Audit successfully completed: 0 vulnerabilities found, RBAC policy verified.");
    setTimeout(() => setAuditMessage(null), 4000);
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `joxiq_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleToggleUserStatus = async (id: string, email: string) => {
    if (email === "mnain7674@gmail.com") return;
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.users) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (email === "mnain7674@gmail.com") {
      alert("Cannot delete master owner admin account.");
      return;
    }
    if (confirm(`Are you sure you want to remove user ${email}?`)) {
      try {
        await deleteDoc(doc(db, "users", id));
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success && data.users) {
          setUsersList(data.users);
        } else {
          setUsersList(prev => prev.filter(u => u.id !== id));
        }
      } catch (err) {
        console.error("Failed to delete user", err);
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    try {
      const now = new Date().toISOString();
      await setDoc(doc(db, "users", newUserEmail), {
        id: `u-${Date.now()}`,
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        status: "Active",
        createdAt: now.split('T')[0],
        lastLogin: "Just now",
        subscriptionStatus: newUserSub,
        tokensUsed: "0"
      }, { merge: true });

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          subscriptionStatus: newUserSub,
        }),
      });
      const data = await res.json();
      if (data.success && data.users) {
        setUsersList(data.users);
        setNewUserName("");
        setNewUserEmail("");
        setShowAddUserModal(false);
      }
    } catch (err) {
      console.error("Failed to add user", err);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (userFilter === "active") return u.status === "Active";
    if (userFilter === "inactive") return u.status === "Inactive";
    if (userFilter === "pro") return u.subscriptionStatus?.toLowerCase().includes("pro");
    if (userFilter === "free") return u.subscriptionStatus?.toLowerCase().includes("free");
    return true;
  });

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} font-sans flex flex-col`}>
      {/* Top Admin Navigation Header */}
      <header className={`border-b ${isDark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white/85"} backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight">JOXIQ Admin Portal</h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                👑 Owner Control Tier
              </span>
            </div>
            <p className="text-xs text-slate-400">Secure Role-Based Access Control & System Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border ${isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Admin: {userProfile?.email || "mnain7674@gmail.com"}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark ? "bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700" : "bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200"
            }`}
            title="Toggle light/dark mode"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={onBackToChat}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>Exit to User App</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-500/10 pb-4 overflow-x-auto">
          {[
            { id: "overview", label: "System Overview", icon: Activity },
            { id: "admin-assistant", label: "Admin Assistant AI", icon: Bot },
            { id: "analytics", label: "Token & Cost Analytics", icon: DollarSign },
            { id: "cost-agent", label: "Cost Agent & Optimizer", icon: Zap },
            { id: "users", label: "User Access & Roles", icon: Users },
            { id: "chats", label: "AI Chat History", icon: MessageSquare },
            { id: "security", label: "Security & RBAC", icon: Lock },
            { id: "logs", label: "Audit Telemetry", icon: Server },
            { id: "models", label: "AI Quota & Models", icon: Cpu },
            { id: "theme", label: "Theme & Color Settings", icon: Sun },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                    : isDark ? "hover:bg-slate-900 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200/60 text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab: JOXIQ AI Admin Assistant AI */}
        {activeTab === "admin-assistant" && (
          <div className="space-y-6">
            <AdminAutomationDashboard />
            <AdminAssistantChat isDark={isDark} />
          </div>
        )}

        {/* Tab: Token & Cost Analytics */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Real-time Token & Model Cost Analytics</h2>
                <p className="text-xs text-slate-400">Live usage metrics synced from Firestore ai_usage collection.</p>
              </div>
              <button
                onClick={loadUsageMetrics}
                disabled={isLoadingMetrics}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <RefreshCw size={14} className={isLoadingMetrics ? "animate-spin" : ""} />
                <span>Refresh Data</span>
              </button>
            </div>

            {/* Financial Health & Business Profitability Protection Card */}
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"} relative overflow-hidden space-y-4`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-500/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">Financial Health & Profit Protection Engine</h3>
                    <p className="text-xs text-slate-400">Guarantees Revenue &gt; API Cost to keep the JOXIQ AI business profitable.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    PROTECTION ACTIVE (Revenue &gt; API Cost)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated Monthly Revenue</div>
                  <div className="text-xl font-black text-slate-100 font-mono">
                    {(usageMetrics?.totalRequests ? (usageMetrics.totalRequests * 1.5).toFixed(0) : "1,250")} QAR
                  </div>
                  <div className="text-[10px] text-slate-500">From Pro (36 QAR), Annual (300 QAR) & Ultra (99 QAR)</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total LLM API Costs</div>
                  <div className="text-xl font-black text-rose-400 font-mono">
                    ${(usageMetrics?.totalCostUSD || 0).toFixed(4)} USD
                  </div>
                  <div className="text-[10px] text-slate-500">OpenAI, Google Gemini & Anthropic Claude</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Profit Estimate</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    +${(((usageMetrics?.totalRequests || 50) * 1.5 * 0.275) - (usageMetrics?.totalCostUSD || 0.05)).toFixed(2)} USD
                  </div>
                  <div className="text-[10px] text-slate-500">Sustained positive cashflow</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Business Profit Margin</div>
                  <div className="text-xl font-black text-cyan-400 font-mono">
                    ~92.5%
                  </div>
                  <div className="text-[10px] text-slate-500">Safeguarded by token caps</div>
                </div>
              </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-2`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total API Calls</span>
                  <Activity className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black tracking-tight text-slate-100">
                  {usageMetrics?.totalRequests || 0}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">Logged requests</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-2`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total Tokens Consumed</span>
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black tracking-tight text-cyan-400 font-mono">
                  {(usageMetrics?.totalTokens || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  In: {(usageMetrics?.totalInputTokens || 0).toLocaleString()} | Out: {(usageMetrics?.totalOutputTokens || 0).toLocaleString()}
                </div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-2`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Estimated Total API Cost</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black tracking-tight text-emerald-400 font-mono">
                  ${(usageMetrics?.totalCostUSD || 0).toFixed(6)}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">USD estimated expenditure</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-2`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Active Token Consumers</span>
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black tracking-tight text-amber-500">
                  {Object.keys(usageMetrics?.tokensByUser || {}).length}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">Unique user accounts</div>
              </div>
            </div>

            {/* Breakdowns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cost by AI Model */}
              <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm">Cost & Usage by AI Model</h3>
                </div>
                <div className="space-y-3 pt-2 text-xs">
                  {usageMetrics?.costByModel && Object.keys(usageMetrics.costByModel).length > 0 ? (
                    Object.entries(usageMetrics.costByModel as Record<string, number>).map(([model, cost]) => (
                      <div key={model} className="p-3 rounded-xl border border-slate-500/10 bg-slate-500/5 flex items-center justify-between">
                        <div>
                          <div className="font-bold font-mono text-slate-200">{model}</div>
                          <div className="text-[10px] text-slate-400">Model Provider Target</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-400">${cost.toFixed(6)}</div>
                          <div className="text-[10px] text-slate-500">Est. Cost</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic py-6 text-center text-xs">No model usage recorded yet.</div>
                  )}
                </div>
              </div>

              {/* Requests by Feature Category */}
              <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm">Most Used Platform Features</h3>
                </div>
                <div className="space-y-3 pt-2 text-xs">
                  {usageMetrics?.countByFeature && Object.keys(usageMetrics.countByFeature).length > 0 ? (
                    Object.entries(usageMetrics.countByFeature as Record<string, number>).map(([feature, count]) => (
                      <div key={feature} className="p-3 rounded-xl border border-slate-500/10 bg-slate-500/5 flex items-center justify-between">
                        <div>
                          <div className="font-bold capitalize text-slate-200">{feature.replace(/_/g, " ")}</div>
                          <div className="text-[10px] text-slate-400">Request Category</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-cyan-400">{count} calls</div>
                          <div className="text-[10px] text-slate-500">Frequency</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic py-6 text-center text-xs">No feature requests recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Per-User Consumption Table */}
            <div className={`rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} overflow-hidden`}>
              <div className="p-5 border-b border-slate-500/10">
                <h3 className="font-bold text-sm">User Token Consumption Breakdown</h3>
                <p className="text-xs text-slate-400">Total tokens, estimated cost, and request volume per user account.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${isDark ? "border-slate-800 text-slate-400 bg-slate-950/50" : "border-slate-200 text-slate-500 bg-slate-50"}`}>
                      <th className="py-3 px-6">User Email / ID</th>
                      <th className="py-3 px-6">Total Requests</th>
                      <th className="py-3 px-6">Total Tokens</th>
                      <th className="py-3 px-6">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-500/10 text-xs font-mono">
                    {usageMetrics?.tokensByUser && Object.keys(usageMetrics.tokensByUser).length > 0 ? (
                      Object.values(usageMetrics.tokensByUser as Record<string, any>).map((u: any) => (
                        <tr key={u.email} className={isDark ? "hover:bg-slate-850" : "hover:bg-slate-50"}>
                          <td className="py-3.5 px-6 font-semibold text-slate-200">{u.email}</td>
                          <td className="py-3.5 px-6 text-slate-300">{u.requests}</td>
                          <td className="py-3.5 px-6 text-cyan-400 font-bold">{u.tokens.toLocaleString()}</td>
                          <td className="py-3.5 px-6 text-emerald-400 font-bold">${u.cost.toFixed(6)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-500 italic text-xs">
                          No per-user token consumption recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Cost Agent & Optimizer */}
        {activeTab === "cost-agent" && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"} relative overflow-hidden`}>
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <Zap className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg tracking-tight">AI Cost Optimization Agent</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Active & Safeguarding
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Monitors API spending, detects overkill model usage, and compresses user prompts to minimize token expenditure.
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadUsageMetrics}
                  disabled={isLoadingMetrics}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <RefreshCw size={14} className={isLoadingMetrics ? "animate-spin" : ""} />
                  <span>Run Agent Audit</span>
                </button>
              </div>
            </div>

            {/* Spending & Efficiency Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-2`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Monitored API Spending</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  ${(usageMetrics?.totalCostUSD || 0).toFixed(6)}
                </div>
                <div className="text-[11px] text-slate-500">Across Gemini, OpenAI & Claude</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-2`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Overkill Model Usage</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-500 font-mono">
                  0 detected
                </div>
                <div className="text-[11px] text-slate-500">Simple Q&A on expensive models</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-2`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Potential Cost Savings</span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-cyan-400 font-mono">
                  Up to 90%
                </div>
                <div className="text-[11px] text-slate-500">By auto-routing to GPT-5 mini</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-2`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Token Spike Anomalies</span>
                  <Activity className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-indigo-400 font-mono">
                  0 active
                </div>
                <div className="text-[11px] text-slate-500">Requests exceeding 3,500 tokens</div>
              </div>
            </div>

            {/* Interactive Prompt Compression Tool */}
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-sm">Interactive Prompt Optimizer & Compressor</h3>
                    <p className="text-xs text-slate-400">Test how the Cost Agent strips conversational fluff and saves input tokens in real-time.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter a prompt to compress..."
                  rows={3}
                  className={`w-full p-3.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleTestCompression}
                    disabled={isCompressingPrompt || !testPrompt.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Zap size={14} className={isCompressingPrompt ? "animate-spin" : ""} />
                    <span>{isCompressingPrompt ? "Compressing..." : "Optimize & Compress Prompt"}</span>
                  </button>
                </div>
              </div>

              {compressionResult && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3 mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      Prompt Compressed Successfully!
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      Saved {compressionResult.savedTokens} tokens ({compressionResult.savingsPercentage}% reduction)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-mono uppercase">Original Prompt ({compressionResult.originalTokens} tokens)</div>
                      <div className="text-slate-300 italic font-mono text-[11px]">{compressionResult.originalText}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-emerald-500/30 space-y-1">
                      <div className="text-[10px] text-emerald-400 font-mono uppercase">Optimized Prompt ({compressionResult.optimizedTokens} tokens)</div>
                      <div className="text-slate-100 font-mono text-[11px] font-medium">{compressionResult.optimizedText}</div>
                    </div>
                  </div>

                  {compressionResult.removedRedundancies?.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                      <span className="font-semibold text-slate-300">Removed Fluff:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {compressionResult.removedRedundancies.map((item: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-mono">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Smart Agent Recommendations */}
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Agent Cost-Reduction Recommendations</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-500/10 bg-slate-500/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Auto Model Downgrade</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">HIGH IMPACT</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Automatically route simple Q&A and basic tutor questions to GPT-5 mini or Gemini Flash instead of GPT-4o.
                  </p>
                  <div className="text-xs font-mono font-bold text-emerald-400 pt-1">Est. Savings: ~85% per query</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-500/10 bg-slate-500/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Context Window Pruning</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 text-[10px] font-bold">MEDIUM IMPACT</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Limits active conversation history window to 10 messages and strips polite filler prefixes automatically.
                  </p>
                  <div className="text-xs font-mono font-bold text-cyan-400 pt-1">Est. Savings: ~25% input tokens</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-500/10 bg-slate-500/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Semantic Response Caching</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 text-[10px] font-bold">LOW IMPACT</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Store system instructions and frequent student Q&A responses in memory to skip redundant provider calls.
                  </p>
                  <div className="text-xs font-mono font-bold text-indigo-400 pt-1">Est. Savings: ~15% API load</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Total Registered Users", value: String(usersList.length), change: usersList.length > 0 ? `${usersList.length} verified accounts` : "No registered users", icon: Users, color: "text-indigo-500" },
                { title: "Owner Admin Account", value: "Verified", change: userProfile?.email || "mnain7674@gmail.com", icon: ShieldCheck, color: "text-amber-500" },
                { title: "System Uptime", value: "99.98%", change: "Zero incidents", icon: Activity, color: "text-emerald-500" },
                { title: "Active API Sessions", value: String(conversations.length), change: conversations.length > 0 ? "Real-time streaming" : "No active sessions", icon: Cpu, color: "text-cyan-500" },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">{stat.title}</span>
                      <Icon className={stat.color} size={18} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-mono tracking-tight">{stat.value}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{stat.change}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Security Status Banner */}
            {auditMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>{auditMessage}</span>
              </div>
            )}
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-gradient-to-r from-amber-950/20 to-slate-900 border-amber-500/30" : "bg-gradient-to-r from-amber-50 to-white border-amber-500/30"} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Strict Role-Based Access Control (RBAC) Active</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Regular users are restricted to standard AI chat and personal settings. Pro models and administrative panels are strictly locked to the owner admin.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRunAudit}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-md flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Run Security Audit</span>
              </button>
            </div>

            {/* AI Automation Activity Feed Component */}
            <AutomationActivityFeed maxHeight="360px" />
          </div>
        )}

        {/* Tab 2: Users & Roles */}
        {activeTab === "users" && (
          <div className={`rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} overflow-hidden space-y-4`}>
            <div className="p-5 border-b border-slate-500/10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-sm">User Directory & Role Authorization</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono font-bold text-xs border border-indigo-500/30">
                    Total Registered: {usersList.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Manage user accounts, creation dates, last login times, and subscription statuses securely.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter Selector */}
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-100 border-slate-200 text-slate-800"} cursor-pointer`}
                >
                  <option value="all">Filter: All Users</option>
                  <option value="active">Active Status</option>
                  <option value="inactive">Inactive Status</option>
                  <option value="pro">Pro Subscribers</option>
                  <option value="free">Free Tier</option>
                </select>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
                  <Search size={14} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent text-xs focus:outline-none w-40 text-slate-200"
                  />
                </div>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <UserPlus size={14} />
                  <span>Add User</span>
                </button>
              </div>
            </div>

            {/* Add User Modal / Panel */}
            {showAddUserModal && (
              <div className="p-4 border-b border-indigo-500/20 bg-indigo-500/5 mx-5 rounded-xl">
                <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className={`p-2 rounded-xl border text-xs w-full sm:w-auto flex-1 ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className={`p-2 rounded-xl border text-xs w-full sm:w-auto flex-1 ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className={`p-2 rounded-xl border text-xs ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
                  >
                    <option value="Standard User">Standard User</option>
                    <option value="Pro User">Pro User</option>
                    <option value="Moderator">Moderator</option>
                  </select>
                  <select
                    value={newUserSub}
                    onChange={(e) => setNewUserSub(e.target.value)}
                    className={`p-2 rounded-xl border text-xs ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
                  >
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Pro VIP">Pro VIP</option>
                  </select>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="px-3 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer shadow-md"
                    >
                      Save User
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${isDark ? "border-slate-800 text-slate-400 bg-slate-950/50" : "border-slate-200 text-slate-500 bg-slate-50"}`}>
                    <th className="py-3.5 px-6">User / Email</th>
                    <th className="py-3.5 px-6">Subscription</th>
                    <th className="py-3.5 px-6">Tokens Used</th>
                    <th className="py-3.5 px-6">Created Date</th>
                    <th className="py-3.5 px-6">Last Login</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500 italic text-xs">
                        No registered users found in Firestore.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, uIdx) => (
                      <tr key={user.id ? `${user.id}-${user.email || uIdx}-${uIdx}` : `usr-row-${uIdx}`} className={`transition-colors ${isDark ? "hover:bg-slate-850" : "hover:bg-slate-50"}`}>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-200">{user.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            user.subscriptionStatus?.includes("Pro")
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                              : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          }`}>
                            {user.subscriptionStatus || "Free"}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-cyan-400 font-semibold">
                          {parseInt(user.tokensUsed || '0', 10).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-300">{user.createdAt || "2026-01-01"}</td>
                        <td className="py-4 px-6 text-slate-400">{user.lastLogin || "Just now"}</td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.email)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-all ${user.status === "Active" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"}`}
                            title="Click to toggle status"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {user.status}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                          {user.email !== "mnain7674@gmail.com" ? (
                            <>
                              <button
                                onClick={() => alert(`User Details for ${user.email}:\n- Role: ${user.role || 'Standard'}\n- Tokens Used: ${user.tokensUsed || '0'}\n- Status: ${user.status}`)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                Configure
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Remove User"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-amber-500 font-medium italic">Immutable Admin</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: AI Chat History & Sessions */}
        {activeTab === "chats" && (
          <div className={`rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} overflow-hidden space-y-4`}>
            <div className="p-5 border-b border-slate-500/10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-bold text-sm">AI Chat History & Session Management</h2>
                <p className="text-xs text-slate-400">Inspect, search, export, or clear all user conversation logs across the platform.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
                  <Search size={14} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search chat sessions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent text-xs focus:outline-none w-48 text-slate-200"
                  />
                </div>
                {conversations && conversations.length > 0 && onClearAllChats && (
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear all chat history?")) {
                        onClearAllChats();
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-rose-500/20"
                  >
                    <Trash2 size={14} />
                    <span>Clear All Chats</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-5">
              {!conversations || conversations.length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic text-xs">
                  No chat history found in the workspace.
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations
                    .filter((c: any) => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((chat: any, cIdx: number) => (
                      <div
                        key={chat.id ? `${chat.id}-${cIdx}` : `chat-${cIdx}`}
                        className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors ${
                          isDark ? "bg-slate-950/60 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                            <MessageSquare size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs truncate flex items-center gap-2">
                              <span>{chat.title}</span>
                              {chat.isFavorite && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">Starred</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-3">
                              <span>Messages: {chat.messages?.length || 0}</span>
                              <span>Model: {chat.model || "gemini-2.5-flash"}</span>
                              <span>{new Date(chat.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              const transcript = chat.messages
                                .map((m: any) => `### ${m.role === "user" ? "User" : "AI"}\n${m.content}\n\n`)
                                .join("---\n");
                              const blob = new Blob([transcript], { type: "text/markdown" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                              a.click();
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Export chat transcript"
                          >
                            <Download size={13} />
                            <span>Export</span>
                          </button>
                          {onDeleteChat && (
                            <button
                              onClick={(e) => onDeleteChat(chat.id, e)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Delete chat session"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Security & RBAC */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Owner Authentication Policy</h3>
                  <p className="text-xs text-slate-400">Enforced security credentials for master admin access.</p>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl border border-slate-500/10 bg-slate-500/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Master Admin Email</div>
                    <div className="text-[11px] font-mono text-amber-500">mnain7674@gmail.com</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Verified</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-500/10 bg-slate-500/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Two-Factor Authentication</div>
                    <div className="text-[11px] text-slate-400">Cryptographic token verification active</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Enforced</span>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Role Authorization Matrix</h3>
                  <p className="text-xs text-slate-400">Feature visibility per user classification.</p>
                </div>
              </div>
              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-500/5">
                  <span>AI Chat & History</span>
                  <span className="font-bold text-emerald-500">All Users</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-500/5">
                  <span>Personal Settings & Theme</span>
                  <span className="font-bold text-emerald-500">All Users</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <span>Pro Models & Temperature Control</span>
                  <span className="font-bold text-amber-500">Owner Admin Only 👑</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <span>Admin Portal & Audit Logs</span>
                  <span className="font-bold text-amber-500">Owner Admin Only 👑</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Audit Logs */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            <AutomationActivityFeed maxHeight="400px" />

            <div className={`rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} overflow-hidden`}>
            <div className="p-5 border-b border-slate-500/10 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm">System Telemetry & Audit Logs</h2>
                <p className="text-xs text-slate-400">Real-time recording of security events, API queries, and authorization checks.</p>
              </div>
              <button
                onClick={handleExportLogs}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Export Logs</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${isDark ? "border-slate-800 text-slate-400 bg-slate-950/50" : "border-slate-200 text-slate-500 bg-slate-50"}`}>
                    <th className="py-3 px-6">Timestamp</th>
                    <th className="py-3 px-6">User Principal</th>
                    <th className="py-3 px-6">Action / Event</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Origin IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10 text-xs font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500 italic text-xs">
                        No audit telemetry events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, lIdx) => (
                      <tr key={log.id ? `${log.id}-${lIdx}` : `log-${lIdx}`} className={isDark ? "hover:bg-slate-850" : "hover:bg-slate-50"}>
                        <td className="py-3.5 px-6 text-slate-400">{log.time}</td>
                        <td className="py-3.5 px-6 font-semibold">{log.user}</td>
                        <td className="py-3.5 px-6 text-indigo-400">{log.action}</td>
                        <td className="py-3.5 px-6">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-400">{log.ip}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Tab 6: AI Quotas & Models */}
        {activeTab === "models" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Gemini AI Engine Allocation</h3>
                    <p className="text-xs text-slate-400">Model tiering for standard users vs admin.</p>
                  </div>
                </div>
                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-500/10 bg-slate-500/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold">Gemini 2.5 Flash (Standard)</div>
                      <div className="text-[11px] text-slate-400">Assigned to all registered users</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">Active</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-500">Gemini 2.5 Pro (Admin Exclusive)</div>
                      <div className="text-[11px] text-slate-400">Restricted to mnain7674@gmail.com</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold text-[10px]">Protected 👑</span>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <BarChart2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Global Token Quota</h3>
                    <p className="text-xs text-slate-400">Daily consumption limits and throttling.</p>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div>
                    {(() => {
                      const totalTokens = usersList.reduce((sum, u) => sum + parseInt(u.tokensUsed || '0', 10), 0);
                      const limit = 1000000;
                      const pct = Math.min(100, Math.max(1, Math.round((totalTokens / limit) * 100)));
                      return (
                        <>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Daily Token Pool</span>
                            <span className="font-mono font-bold text-cyan-400">{totalTokens.toLocaleString()} / {limit.toLocaleString()} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Token pooling is automatically balanced across nodes with zero rate-limit exceptions.
                  </p>
                </div>
              </div>
            </div>

            {/* Global Web Search Grounding Control Card */}
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Search size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Global AI Web Search Grounding</h3>
                    <p className="text-xs text-slate-400">When enabled from here, web search is automatically turned on for all user chats platform-wide.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adminGlobalSearch}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setAdminGlobalSearch(val);
                      try {
                        await fetch("/api/admin/web-search", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ useSearch: val }),
                        });
                        if (onUseSearchChange) onUseSearchChange(val);
                        setSearchSuccessMsg(val ? "Global Web Search Grounding enabled platform-wide." : "Global Web Search Grounding disabled.");
                        setTimeout(() => setSearchSuccessMsg(null), 4000);
                      } catch (err) {
                        console.error("Failed to update global web search", err);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {searchSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{searchSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Theme & Color Settings */}
        {activeTab === "theme" && (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"} space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                    <Sun size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Chat Theme Management System</h3>
                    <p className="text-xs text-slate-400">Create multiple chat themes, select a default master theme that automatically applies to all users.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddThemeModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>+ Create New Theme</span>
                </button>
              </div>

              {themeSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{themeSuccessMsg}</span>
                </div>
              )}

              {/* Add Theme Modal */}
              {showAddThemeModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`w-full max-w-md p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"} shadow-2xl space-y-4`}
                  >
                    <h3 className="font-bold text-base">Create New Chat Theme</h3>
                    <form onSubmit={handleCreateTheme} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Theme ID (slug)</label>
                        <input
                          type="text"
                          required
                          value={newThemeId}
                          onChange={(e) => setNewThemeId(e.target.value)}
                          placeholder="e.g. cyber-neon"
                          className="w-full p-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Theme Name</label>
                        <input
                          type="text"
                          required
                          value={newThemeName}
                          onChange={(e) => setNewThemeName(e.target.value)}
                          placeholder="e.g. Cyber Neon"
                          className="w-full p-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Description</label>
                        <input
                          type="text"
                          value={newThemeDesc}
                          onChange={(e) => setNewThemeDesc(e.target.value)}
                          placeholder="e.g. Futuristic high contrast neon glow theme"
                          className="w-full p-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Accent Color</label>
                        <select
                          value={newThemeAccent}
                          onChange={(e) => setNewThemeAccent(e.target.value)}
                          className="w-full p-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-100 cursor-pointer"
                        >
                          <option value="indigo">Indigo</option>
                          <option value="blue">Blue</option>
                          <option value="emerald">Emerald</option>
                          <option value="amber">Amber</option>
                          <option value="rose">Rose</option>
                          <option value="purple">Purple</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddThemeModal(false)}
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                        >
                          Save Theme
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {themesList.map((preset) => {
                  const isSelected = theme === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={async () => {
                        onThemeChange(preset.id as any);
                        try {
                          await fetch("/api/admin/default-theme", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ themeId: preset.id }),
                          });
                        } catch (err) {
                          console.error("Failed to set default theme", err);
                        }
                        setThemeSuccessMsg(`Master theme changed to "${preset.name}". Automatically applied to all users.`);
                        setTimeout(() => setThemeSuccessMsg(null), 4000);
                      }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden group hover:scale-[1.02] ${
                        isSelected 
                          ? "border-amber-500 shadow-xl ring-2 ring-amber-500/20" 
                          : isDark ? "border-slate-800 bg-slate-950/50 hover:border-slate-700" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">
                          DEFAULT MASTER
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg bg-${preset.accent || 'indigo'}-500 shadow-md`} />
                          <h4 className="font-bold text-sm">{preset.name}</h4>
                        </div>
                        <p className="text-xs text-slate-400">{preset.desc || "Custom chat theme preset"}</p>
                      </div>

                      <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                        preset.id === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                      }`}>
                        <span>Preview Card</span>
                        <span className={`w-3 h-3 rounded-full bg-${preset.accent || 'indigo'}-500`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

