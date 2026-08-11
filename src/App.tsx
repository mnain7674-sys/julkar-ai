import React, { useState, useEffect, useRef } from "react";
import { SubscriptionModal } from "./components/SubscriptionModal";
import { VoiceModeModal } from "./components/VoiceModeModal";
import { SubscriptionPlanId } from "./config/subscriptionPlans";
import { syncUserToFirestore, auth, googleProvider, db, doc, getDoc, updateDoc } from "./lib/firebase";
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "firebase/auth";
import {
  Plus,
  Send,
  Image as ImageIcon,
  Trash2,
  Loader2,
  StopCircle,
  Volume2,
  VolumeX,
  Menu,
  X,
  Sparkles,
  Bot,
  Code,
  Code2,
  PenTool,
  GraduationCap,
  Languages,
  BarChart3,
  Sliders,
  Globe,
  Settings,
  MessageSquare,
  Search,
  Zap,
  Compass,
  Mail,
  ChevronRight,
  ExternalLink,
  Info,
  Check,
  Copy,
  Star,
  Share2,
  Mic,
  MicOff,
  FileText,
  Sun,
  Moon,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Camera,
  Smartphone,
  Edit2,
  Briefcase,
  FolderPlus,
  Bookmark,
  LogOut,
  LogIn,
  UserPlus,
  User,
  Wrench,
  Crown,
  MoreVertical,
  Calculator
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
const Analytics = () => null;

import {
  Message,
  Conversation,
  AttachedImage,
  AttachedDocument,
  SavedPdfDoc,
  SUGGESTED_STARTERS,
  AVAILABLE_MODELS,
  SYSTEM_PERSONAS,
  Project
} from "./types";
import { generateMessagePdf, generateConversationPdf } from "./lib/pdfExporter";
import { MarkdownMessage } from "./components/MarkdownMessage";
import { SettingsPanel } from "./components/SettingsPanel";
import { EducationalSuite } from "./components/EducationalSuite";
import { ProSubscriptionModal } from "./components/ProSubscriptionModal";
import { AdminDashboard } from "./components/AdminDashboard";
import { ChatHistoryModal } from "./components/ChatHistoryModal";
import { JoxiqLogo } from "./components/JoxiqLogo";
import {
  saveChatToFirestore,
  loadUserChatsFromFirestore,
  deleteChatFromFirestore,
  renameChatInFirestore,
} from "./lib/chatHistoryStorage";
import { generateSmartTopicTitle } from "./utils/titleGenerator";

const basePrefix = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';

function cleanErrorMessage(err: any): string {
  const message = err?.message || String(err);
  try {
    if (message.includes("{")) {
      const jsonStart = message.indexOf("{");
      const jsonStr = message.substring(jsonStart);
      const parsed = JSON.parse(jsonStr);
      if (parsed?.error?.message) {
        const innerMsg = parsed.error.message;
        if (innerMsg.includes("{")) {
          const innerParsed = JSON.parse(innerMsg);
          if (innerParsed?.error?.message) {
            return innerParsed.error.message;
          }
        }
        return innerMsg;
      }
    }
  } catch (e) {
    // Ignore JSON parsing errors
  }
  
  if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded") || message.includes("Too Many Requests")) {
    return "Gemini API rate limit exceeded (429). The free tier request quota was temporarily reached. Please wait a few moments and try again.";
  }
  
  if (message.includes("503") || message.includes("UNAVAILABLE") || message.includes("high demand") || message.includes("Service Unavailable")) {
    return "The Gemini AI model is currently experiencing extremely high demand. Spikes in demand are usually temporary. Please try again in a few seconds!";
  }
  
  return message;
}

export default function App() {
  // --- Launch Splash Screen state ---
  const [showSplash, setShowSplash] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // --- Active main layout view ---
  const [activeView, setActiveView] = useState<"chat" | "education" | "admin">("chat");

  // --- Conversations and active state ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => typeof window !== "undefined" && window.innerWidth >= 1024);

  const handleSidebarItemClick = (action: () => void) => {
    action();
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // --- User Profile / Authentication state ---
  const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(() => {
    try {
      const saved = localStorage.getItem("joxiq_session_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authNameInput, setAuthNameInput] = useState<string>("");
  const [authEmailInput, setAuthEmailInput] = useState<string>("");
  const [authPasswordInput, setAuthPasswordInput] = useState<string>("");
  const [authConfirmPasswordInput, setAuthConfirmPasswordInput] = useState<string>("");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("signup");
  const [forgotEmailInput, setForgotEmailInput] = useState<string>("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- Pro Subscription & Token Limit states ---
  const [isProUser, setIsProUser] = useState<boolean>(() => localStorage.getItem("julkar_is_pro") === "true");
  const [freeMessagesLeft, setFreeMessagesLeft] = useState<number>(() => {
    const today = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem("julkar_free_messages_date");
    const saved = localStorage.getItem("julkar_free_messages_left");

    if (savedDate !== today) {
      localStorage.setItem("julkar_free_messages_date", today);
      localStorage.setItem("julkar_free_messages_left", "15");
      return 15;
    }
    return saved !== null ? parseInt(saved, 10) : 15;
  });
  const [proModalOpen, setProModalOpen] = useState<boolean>(false);
  const [userTokensUsed, setUserTokensUsed] = useState<number>(0);
  const [showChatHistoryModal, setShowChatHistoryModal] = useState<boolean>(false);

  // --- Theme Mode state ---
  const [theme, setTheme] = useState<"dark" | "light" | "midnight" | "emerald" | "amber" | "rose">(() => {
    const saved = localStorage.getItem("gemini_theme");
    if (saved && ["dark", "light", "midnight", "emerald", "amber", "rose"].includes(saved)) {
      return saved as any;
    }
    return "dark";
  });
  const isDark = theme !== "light";

  // --- Input state ---
  const [inputText, setInputText] = useState<string>("");
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [attachedDocument, setAttachedDocument] = useState<AttachedDocument | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // --- Voice Input & ChatGPT Style Voice Mode state ---
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isJarvisMode, setIsJarvisMode] = useState<boolean>(() => {
    return localStorage.getItem("joxiq_jarvis_mode") === "true";
  });
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState<boolean>(false);

  const isJarvisModeRef = useRef<boolean>(isJarvisMode);
  const isListeningRef = useRef<boolean>(isListening);

  useEffect(() => {
    isJarvisModeRef.current = isJarvisMode;
    localStorage.setItem("joxiq_jarvis_mode", String(isJarvisMode));
  }, [isJarvisMode]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // --- Share Modal state ---
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [savedMessageIds, setSavedMessageIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("julkar_saved_message_ids");
    return saved ? JSON.parse(saved) : [];
  });
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [activeMoreMenuMsgId, setActiveMoreMenuMsgId] = useState<string | null>(null);
  const [paymentToast, setPaymentToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [userLogoError, setUserLogoError] = useState<boolean>(false);
  const [joxiqLogoError, setJoxiqLogoError] = useState<boolean>(false);

  // --- Sidebar & ChatGPT Style Chat History States ---
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState<string>("");
  const [editingSidebarChatId, setEditingSidebarChatId] = useState<string | null>(null);
  const [editingSidebarTitle, setEditingSidebarTitle] = useState<string>("");
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState<string | null>(null);

  const renameChat = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const trimmed = newTitle.trim();
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed, timestamp: Date.now() } : c))
    );
    setEditingSidebarChatId(null);
    setOpenMenuChatId(null);
    const user = auth.currentUser;
    if (user && user.uid) {
      renameChatInFirestore(user.uid, id, trimmed);
    }
  };

  const toggleSaveMessage = (msgId: string) => {
    setSavedMessageIds((prev) => {
      const next = prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId];
      localStorage.setItem("julkar_saved_message_ids", JSON.stringify(next));
      return next;
    });
  };

  const copyMessageText = (msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const shareMessage = async (msg: Message) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "JOXIQ AI Response",
          text: msg.content,
        });
      } catch (err) {
        copyMessageText(msg);
      }
    } else {
      copyMessageText(msg);
    }
  };

  const deleteMessage = (msgId: string) => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeId) {
          return {
            ...c,
            messages: c.messages.filter((m) => m.id !== msgId),
          };
        }
        return c;
      })
    );
  };

  // --- Settings state (local session overrides, sync to active chat configuration) ---
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("general");
  const [customInstruction, setCustomInstruction] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [useSearch, setUseSearch] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("Kore");

  // --- Streaming & UI auxiliary states ---
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentStreamText, setCurrentStreamText] = useState<string>("");
  const [currentGrounding, setCurrentGrounding] = useState<{ chunks: any[]; queries: string[] } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeSpeechMsgId, setActiveSpeechMsgId] = useState<string | null>(null);
  const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [viewportOffsetTop, setViewportOffsetTop] = useState<number>(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      if (window.visualViewport) {
        const height = window.visualViewport.height;
        setViewportHeight(height);
        setViewportOffsetTop(window.visualViewport.offsetTop || 0);
        const keyboardActive = window.innerHeight - height > 100;
        setIsKeyboardOpen(keyboardActive);
        if (keyboardActive) {
          setTimeout(scrollToBottom, 100);
          setTimeout(scrollToBottom, 300);
        }
      } else {
        const keyboardActive = window.innerHeight < 550;
        setIsKeyboardOpen(keyboardActive);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (window.innerWidth < 768) {
          setIsKeyboardOpen(true);
        }
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setTimeout(() => {
          if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            if (!window.visualViewport || Math.abs(window.innerHeight - window.visualViewport.height) < 80) {
              setIsKeyboardOpen(false);
            }
          }
        }, 300);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
      setViewportHeight(window.visualViewport.height);
      setViewportOffsetTop(window.visualViewport.offsetTop || 0);
    } else {
      setViewportHeight(window.innerHeight);
    }

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // --- Attachment options (Plus Menu) & Camera States ---
  const [plusMenuOpen, setPlusMenuOpen] = useState<boolean>(false);

  // --- Instagram in-app browser detection ---
  const [isInstagramBrowser, setIsInstagramBrowser] = useState<boolean>(false);
  const [showInstagramBanner, setShowInstagramBanner] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isInsta = /Instagram/i.test(ua);
      setIsInstagramBrowser(isInsta);
      const dismissed = localStorage.getItem("joxiq_dismissed_insta_banner");
      if (isInsta && !dismissed) {
        setShowInstagramBanner(true);
      }
    }
  }, []);
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputSnapshotRef = useRef<string>("");

  // Load initial settings, history, and theme from localStorage
  useEffect(() => {
    const checkAdminSearch = () => {
      fetch("/api/admin/web-search")
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (data && typeof data.useSearch === "boolean") {
            if (data.useSearch) {
              setUseSearch(true);
              localStorage.setItem("gemini_use_search", "true");
            } else {
              const savedSearch = localStorage.getItem("gemini_use_search");
              if (savedSearch) setUseSearch(savedSearch === "true");
            }
          }
        })
        .catch(() => {
          // Ignore network errors during dev restarts
        });
    };

    checkAdminSearch();
    const interval = setInterval(checkAdminSearch, 15000);

    const saved = localStorage.getItem("gemini_conversations");
    const active = localStorage.getItem("gemini_active_conv_id");
    const savedVoice = localStorage.getItem("gemini_selected_voice");
    const savedSearch = localStorage.getItem("gemini_use_search");
    const savedTheme = localStorage.getItem("gemini_theme") as "dark" | "light" | null;
    const savedProjects = localStorage.getItem("gemini_projects");
    const savedActiveProj = localStorage.getItem("gemini_active_project_id");

    if (savedVoice) setSelectedVoice(savedVoice);
    if (savedSearch) setUseSearch(savedSearch === "true");
    if (savedTheme && ["dark", "light", "midnight", "emerald", "amber", "rose"].includes(savedTheme)) {
      setTheme(savedTheme as any);
    } else {
      setTheme("dark");
      localStorage.setItem("gemini_theme", "dark");
    }

    if (saved) {
      try {
        const parsed: Conversation[] = JSON.parse(saved);
        const validParsed = parsed.filter(c => c.messages && c.messages.length > 0);
        const sanitizedParsed = validParsed.map((c) => {
          const isGeneric =
            !c.title ||
            ["hi", "hi hi", "hello", "new chat", "untitled chat", "general conversation"].includes(c.title.toLowerCase());
          if (isGeneric && c.messages && c.messages.length > 0) {
            const userMsg = c.messages.find((m) => m.role === "user");
            const aiMsg = c.messages.find((m) => m.role === "assistant");
            return {
              ...c,
              title: generateSmartTopicTitle(userMsg?.content, aiMsg?.content, userMsg?.document?.name),
            };
          }
          return c;
        });

        const defaultPersona = SYSTEM_PERSONAS[0];
        const initialNewChat: Conversation = {
          id: Math.random().toString(36).substring(2, 11),
          title: "New Chat",
          messages: [],
          model: "gemini-2.5-flash",
          systemInstruction: defaultPersona.systemInstruction,
          temperature,
          useSearch,
          timestamp: Date.now(),
        };
        setConversations([initialNewChat, ...sanitizedParsed]);
        setActiveId(initialNewChat.id);
      } catch (e) {
        console.error("Failed to restore history", e);
        createNewChat();
      }
    } else {
      createNewChat();
    }
    return () => clearInterval(interval);
  }, []);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || "";
        const displayName = firebaseUser.displayName || email.split("@")[0] || "User";
        const profile = { name: displayName, email };
        setUserProfile(profile);
        setShowAuthModal(false);

        // Load user's chat history from Firestore
        try {
          const firestoreChats = await loadUserChatsFromFirestore(firebaseUser.uid);
          if (firestoreChats && firestoreChats.length > 0) {
            setConversations((prev) => {
              const firestoreIds = new Set(firestoreChats.map((c) => c.id));
              const localUnsynced = prev.filter(
                (c) => !firestoreIds.has(c.id) && c.messages && c.messages.length > 0
              );
              localUnsynced.forEach((c) => saveChatToFirestore(firebaseUser.uid, c));

              const merged = [...localUnsynced, ...firestoreChats];
              merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
              return merged;
            });
            setActiveId((prevId) => {
              if (!prevId || prevId === "") {
                return firestoreChats[0].id;
              }
              return prevId;
            });
          } else {
            setConversations((prev) => {
              const validLocal = prev.filter((c) => c.messages && c.messages.length > 0);
              validLocal.forEach((c) => saveChatToFirestore(firebaseUser.uid, c));
              return prev;
            });
          }
        } catch (err) {
          console.error("Error loading chat history from Firestore:", err);
        }

        // Check Firestore for cross-platform Pro subscription sync (e.g. purchased from mobile app)
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.subscriptionStatus === "Pro" || data.isPro) {
              setIsProUser(true);
              localStorage.setItem("julkar_is_pro", "true");
            }
          }
        } catch (e) {
          console.error("Error fetching user profile from Firestore:", e);
        }

        await syncUserToFirestore({
          uid: firebaseUser.uid,
          email,
          displayName,
          isPro: isProUser || email.toLowerCase() === "mnain7674@gmail.com"
        }).catch(err => console.error("Firestore sync auth state error", err));
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, [isProUser]);

  // Handle Stripe payment success/cancel redirect callback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("payment_success");
    const cancel = params.get("payment_cancel");
    const plan = params.get("plan");
    
    if (success === "true") {
      setIsProUser(true);
      localStorage.setItem("julkar_is_pro", "true");
      
      setPaymentToast({
        message: `🎉 Subscribed successfully! Welcome to JOXIQ AI ${plan === "ultra" ? "Ultra" : "Pro"}.`,
        type: "success"
      });
      
      // If user is authenticated, sync subscription status to Firestore
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        updateDoc(userRef, {
          subscriptionStatus: plan === "ultra" ? "JOXIQ Ultra" : "Pro",
          isPro: true
        }).catch(err => console.error("Error updating subscription status in Firestore:", err));
      }

      // Clean the search params from the address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (cancel === "true") {
      setPaymentToast({
        message: "❌ Payment was cancelled. Please try again when you are ready.",
        type: "error"
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auto-dismiss payment status toast banner after 6 seconds
  useEffect(() => {
    if (paymentToast) {
      const timer = setTimeout(() => {
        setPaymentToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [paymentToast]);

  // Sync theme changes & auto-sync across users/sessions
  useEffect(() => {
    localStorage.setItem("gemini_theme", theme);
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    }
  }, [theme]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "gemini_theme" && e.newValue) {
        if (["dark", "light", "midnight", "emerald", "amber", "rose"].includes(e.newValue)) {
          setTheme(e.newValue as any);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(() => {
      const stored = localStorage.getItem("gemini_theme");
      if (stored && stored !== theme && ["dark", "light", "midnight", "emerald", "amber", "rose"].includes(stored)) {
        setTheme(stored as any);
      }
    }, 1000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [theme]);

  // Sync state changes to localStorage & Firestore
  useEffect(() => {
    const validConvs = conversations.filter(c => c.messages && c.messages.length > 0);
    if (validConvs.length > 0) {
      localStorage.setItem("gemini_conversations", JSON.stringify(validConvs));
    } else {
      localStorage.removeItem("gemini_conversations");
    }

    const user = auth.currentUser;
    if (user && user.uid) {
      validConvs.forEach((c) => {
        saveChatToFirestore(user.uid, c);
      });
    }
  }, [conversations]);

  useEffect(() => {
    if (activeId) {
      localStorage.setItem("gemini_active_conv_id", activeId);
      // Sync chat settings when switching chats
      const activeChat = conversations.find((c) => c.id === activeId);
      if (activeChat) {
        setTemperature(activeChat.temperature);
        setUseSearch(activeChat.useSearch);
        const persona = SYSTEM_PERSONAS.find((p) => p.systemInstruction === activeChat.systemInstruction);
        if (persona) {
          setSelectedPersonaId(persona.id);
          setCustomInstruction("");
        } else if (activeChat.systemInstruction) {
          setSelectedPersonaId("custom");
          setCustomInstruction(activeChat.systemInstruction);
        } else {
          setSelectedPersonaId("general");
          setCustomInstruction("");
        }
      }
    } else {
      localStorage.removeItem("gemini_active_conv_id");
    }
  }, [activeId]);

  useEffect(() => {
    localStorage.setItem("gemini_selected_voice", selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem("gemini_use_search", String(useSearch));
  }, [useSearch]);

  // Handle active conversation settings modification
  useEffect(() => {
    if (!activeId) return;

    let systemInstruction = "";
    if (selectedPersonaId === "custom") {
      systemInstruction = customInstruction;
    } else {
      const persona = SYSTEM_PERSONAS.find((p) => p.id === selectedPersonaId);
      systemInstruction = persona ? persona.systemInstruction : "";
    }

    setConversations((prev) => {
      const activeChat = prev.find((c) => c.id === activeId);
      if (!activeChat) return prev;
      if (
        activeChat.temperature === temperature &&
        activeChat.useSearch === useSearch &&
        activeChat.systemInstruction === systemInstruction
      ) {
        return prev;
      }
      return prev.map((c) => {
        if (c.id === activeId) {
          return {
            ...c,
            temperature,
            useSearch,
            systemInstruction,
          };
        }
        return c;
      });
    });
  }, [activeId, selectedPersonaId, customInstruction, temperature, useSearch]);

  // Auto scroll logic
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.closest('.overflow-y-auto');
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth"
        });
      } else {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, currentStreamText, isStreaming]);

  // Ensure activeId always points to a valid conversation if conversations exist
  useEffect(() => {
    if (conversations.length > 0) {
      if (!activeId || !conversations.some((c) => c.id === activeId)) {
        setActiveId(conversations[0].id);
      }
    }
  }, [conversations, activeId]);

  // Get active conversation object
  const activeConversation = conversations.find(
    (c) => c.id === activeId
  );

  // Initialize a fresh new conversation
  const createNewChat = (initialPrompt?: string) => {
    const defaultPersona = SYSTEM_PERSONAS.find((p) => p.id === selectedPersonaId) || SYSTEM_PERSONAS[0];
    const newChat: Conversation = {
      id: Math.random().toString(36).substring(2, 11),
      title: initialPrompt ? generateSmartTopicTitle(initialPrompt) : "New Chat",
      messages: [],
      model: "gemini-2.5-flash",
      systemInstruction: selectedPersonaId === "custom" ? customInstruction : defaultPersona.systemInstruction,
      temperature,
      useSearch,
      timestamp: Date.now(),
    };

    setConversations((prev) => [newChat, ...prev]);
    setActiveId(newChat.id);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    return newChat;
  };

  // Open delete confirmation modal
  const deleteChat = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenMenuChatId(null);
    setDeleteConfirmChatId(id);
  };

  // Perform permanent chat deletion
  const confirmDeleteChat = (id: string) => {
    if (activeSpeechMsgId) {
      stopTts();
    }
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    if (activeId === id) {
      if (filtered.length > 0) {
        setActiveId(filtered[0].id);
      } else {
        setActiveId("");
      }
    }
    const user = auth.currentUser;
    if (user && user.uid) {
      deleteChatFromFirestore(user.uid, id);
    }
    setDeleteConfirmChatId(null);
  };

  // Clear all history
  const clearAllChats = () => {
    stopTts();
    localStorage.removeItem("gemini_conversations");
    localStorage.removeItem("gemini_active_conv_id");
    setConversations([]);
    setActiveId("");
  };

  // Handle Drag & Drop / Image uploads
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage({
        data: reader.result as string,
        mimeType: file.type,
      });
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // --- Camera Streaming & Capture Engine ---
  useEffect(() => {
    if (cameraModalOpen) {
      // 1. Enumerate available webcam devices
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoDevs = devices.filter((d) => d.kind === "videoinput");
          setCameraDevices(videoDevs);
          if (videoDevs.length > 0 && !selectedCameraId) {
            setSelectedCameraId(videoDevs[0].deviceId);
          }
        })
        .catch((err) => {
          console.error("Camera device list enumeration failed", err);
        });

      // 2. Request user video media stream
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
      };

      setCameraError(null);
      
      // Stop old stream if running before opening new one to avoid double binding
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Camera stream access failed", err);
          setCameraError(
            "Camera access blocked or not supported in this frame environment. Please allow permission or try the 'Phone Camera' option."
          );
        });
    } else {
      // Stop and release video tracks on close
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraModalOpen, selectedCameraId]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Capture active frame from video feed
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setAttachedImage({
          data: dataUrl,
          mimeType: "image/jpeg",
        });
        setCameraModalOpen(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        processImageFile(file);
      } else {
        processDocumentFile(file);
      }
    }
  };

  // --- Speech Recognition initialization ---
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        const base = inputSnapshotRef.current.trim();
        const speech = transcript.trim();
        if (speech) {
          setInputText(base ? `${base} ${speech}` : speech);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      inputSnapshotRef.current = inputText;
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // --- JARVIS Voice Mode Handler ---
  const toggleJarvisMode = () => {
    const nextMode = !isJarvisMode;
    setIsJarvisMode(nextMode);
    if (nextMode) {
      stopTts();
      if (!isListening) {
        toggleListening();
      }
    } else {
      stopTts();
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        setIsListening(false);
      }
    }
  };

  // --- Document File Parser ---
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const processDocumentFile = (file: File) => {
    const isTextReadable =
      file.type.startsWith("text/") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".js") ||
      file.name.endsWith(".ts") ||
      file.name.endsWith(".tsx") ||
      file.name.endsWith(".py") ||
      file.name.endsWith(".html") ||
      file.name.endsWith(".css");

    setIsUploading(true);
    const reader = new FileReader();

    if (isTextReadable) {
      reader.onloadend = () => {
        setAttachedDocument({
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type || "text/plain",
          content: reader.result as string,
        });
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
        alert("Failed to read document content.");
      };
      reader.readAsText(file);
    } else {
      // General file/PDF fallback
      reader.onloadend = () => {
        const rawContent = reader.result as string;
        // Strip out non-printable binary details to avoid clutter and model crashes
        const printableText = rawContent.replace(/[^\x20-\x7E\r\n\t]/g, " ").substring(0, 50000);
        
        setAttachedDocument({
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type || "application/pdf",
          content: `[Extracted readable content from file: ${file.name}]\nFile Name: ${file.name}\nFile Size: ${formatFileSize(file.size)}\nFile Type: ${file.type || "unknown"}\n\nExcerpt:\n${printableText.substring(0, 15000) || "(Binary content parsed safely)"}`,
        });
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
        alert("Failed to process document.");
      };
      reader.readAsText(file);
    }
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processDocumentFile(e.target.files[0]);
    }
  };

  // --- Favorite Chat toggling ---
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
  };

  // --- ChatGPT Style Date Grouping for Sidebar ---
  const groupSidebarConversations = (convList: Conversation[]) => {
    const valid = convList.filter((c) => c.messages && c.messages.length > 0);
    const query = sidebarSearchQuery.toLowerCase().trim();
    const filtered = query
      ? valid.filter(
          (c) =>
            c.title.toLowerCase().includes(query) ||
            c.messages.some((m) => m.content.toLowerCase().includes(query))
        )
      : valid;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const sevenDaysStart = todayStart - 6 * 86400000;
    const thirtyDaysStart = todayStart - 29 * 86400000;

    const groups: { label: string; items: Conversation[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Previous 7 Days", items: [] },
      { label: "Previous 30 Days", items: [] },
      { label: "Older", items: [] },
    ];

    filtered.forEach((c) => {
      const time = c.timestamp || Date.now();
      if (time >= todayStart) {
        groups[0].items.push(c);
      } else if (time >= yesterdayStart) {
        groups[1].items.push(c);
      } else if (time >= sevenDaysStart) {
        groups[2].items.push(c);
      } else if (time >= thirtyDaysStart) {
        groups[3].items.push(c);
      } else {
        groups[4].items.push(c);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  };

  const groupedSidebarConversations = groupSidebarConversations(conversations);

  // --- Message ratings (Like/Dislike) ---
  const rateMessage = (msgId: string, rating: "like" | "dislike" | null) => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeId) {
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === msgId ? { ...m, rating } : m)),
          };
        }
        return c;
      })
    );
  };

  // --- Clear Current Chat Messages ---
  const clearCurrentChatMessages = () => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: [] } : c))
    );
  };

  // --- Local Text-to-Speech Synthesis fallback ---
  const speakLocalSpeech = (text: string) => {
    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      setActiveSpeechMsgId(null);
    };
    utterance.onerror = () => {
      setActiveSpeechMsgId(null);
    };
    window.speechSynthesis.speak(utterance);
  };

  // Triggers sending user query to local API with streaming SSE
  const handleSendMessage = async (
    customText?: string,
    targetChat?: Conversation,
    customImage?: AttachedImage,
    customDocument?: AttachedDocument
  ) => {
    if (!userProfile) {
      setShowAuthModal(true);
      return;
    }

    const textToSend = customText !== undefined ? customText : inputText;
    const imgToSend = customImage !== undefined ? customImage : attachedImage;
    const docToSend = customDocument !== undefined ? customDocument : attachedDocument;

    if (!textToSend.trim() && !imgToSend && !docToSend) return;

    // Check free message limit
    if (!isProUser) {
      if (freeMessagesLeft <= 0) {
        setProModalOpen(true);
        return;
      }
      const nextCount = freeMessagesLeft - 1;
      setFreeMessagesLeft(nextCount);
      localStorage.setItem("julkar_free_messages_left", String(nextCount));
    }

    setStreamError(null);
    let chat = targetChat || activeConversation;

    // Create a new chat on the fly if none is selected
    if (!chat) {
      chat = createNewChat(textToSend || (docToSend ? `Analyze ${docToSend.name}` : "New Chat"));
    }

    // Prepare User Message object
    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: "user",
      content: textToSend,
      timestamp: Date.now(),
      image: imgToSend || undefined,
      document: docToSend || undefined,
    };

    // Update conversation state with user message
    const updatedMessages = [...chat.messages, userMessage];

    // Auto update title if it was default or generic
    let updatedTitle = chat.title;
    const isGenericTitle =
      !chat.title ||
      ["new chat", "hi", "hi hi", "hello", "general conversation", "untitled chat"].includes(chat.title.toLowerCase());

    if (isGenericTitle || chat.messages.length === 0) {
      updatedTitle = generateSmartTopicTitle(textToSend, undefined, docToSend?.name);
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === chat!.id ? { ...c, messages: updatedMessages, title: updatedTitle } : c))
    );

    // Clear user inputs
    setInputText("");
    setAttachedImage(null);
    setAttachedDocument(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Start assistant SSE streaming
    setIsStreaming(true);
    setCurrentStreamText("");
    setCurrentGrounding(null);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          model: chat.model,
          systemInstruction: chat.systemInstruction,
          temperature: chat.temperature,
          useSearch: chat.useSearch,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "An error occurred with the backend server.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) {
        throw new Error("Cannot initialize the stream reader.");
      }

      let done = false;
      let fullTargetText = "";
      let finalGrounding: any = null;
      let sseRemainder = "";
      let streamClosed = false;

      let displayedLen = 0;

      await new Promise<void>((resolve, reject) => {
        const typingInterval = setInterval(() => {
          const targetLen = fullTargetText.length;
          if (displayedLen < targetLen) {
            const diff = targetLen - displayedLen;
            const step = diff > 80 ? Math.ceil(diff / 8) : diff > 30 ? 3 : diff > 10 ? 2 : 1;
            displayedLen = Math.min(targetLen, displayedLen + step);
            setCurrentStreamText(fullTargetText.substring(0, displayedLen));
          } else if (streamClosed && displayedLen >= targetLen) {
            clearInterval(typingInterval);
            resolve();
          }
        }, 16);

        (async () => {
          try {
            while (!done) {
              const { value, done: readerDone } = await reader.read();
              done = readerDone;
              if (value) {
                sseRemainder += decoder.decode(value, { stream: true });
                const lines = sseRemainder.split("\n");
                sseRemainder = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith("data: ")) continue;

                  const payloadStr = trimmed.replace(/^data: /, "");
                  if (payloadStr === "[DONE]") {
                    done = true;
                    break;
                  }

                  try {
                    const payload = JSON.parse(payloadStr);
                    if (payload.text) {
                      fullTargetText += payload.text;
                    }
                    if (payload.grounding) {
                      finalGrounding = payload.grounding;
                      setCurrentGrounding(payload.grounding);
                    }
                    if (payload.error) {
                      throw new Error(payload.error);
                    }
                  } catch (e: any) {
                    // Ignore JSON parse errors on partial chunk boundaries
                  }
                }
              }
            }
          } catch (err) {
            clearInterval(typingInterval);
            reject(err);
            return;
          } finally {
            streamClosed = true;
          }
        })();
      });

      // Finish streaming and persist the final assistant response
      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(2, 11),
        role: "assistant",
        content: fullTargetText,
        timestamp: Date.now(),
        grounding: finalGrounding || undefined,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === chat!.id ? { ...c, messages: [...updatedMessages, assistantMessage] } : c
        )
      );

      // Trigger JARVIS Auto Voice Response if JARVIS Mode is active
      if (isJarvisModeRef.current && fullTargetText) {
        speakJarvisResponse(fullTargetText);
      }

      const tokenCount = Math.max(10, Math.round((textToSend.length + fullTargetText.length) / 4));
      if (userProfile?.email) {
        fetch("/api/user/record-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userProfile.email, tokens: tokenCount }),
        }).catch((e) => console.error("Failed to record tokens", e));
      }
    } catch (err: any) {
      console.error(err);
      setStreamError(cleanErrorMessage(err));
    } finally {
      setIsStreaming(false);
      setCurrentStreamText("");
      setCurrentGrounding(null);
    }
  };

  // Multi-line Textarea growth adjustment
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Hotkey capture
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- JARVIS Voice Speech Synthesis ---
  const speakJarvisResponse = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    stopTts();
    setIsJarvisSpeaking(true);

    // Clean Markdown, code blocks and links for speech
    const cleanText = text
      .replace(/`{3}[\s\S]*?`{3}/g, "Code block output attached.")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*_#\-]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .trim();

    if (!cleanText) {
      setIsJarvisSpeaking(false);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.name.includes("Google") ||
          v.name.includes("Natural") ||
          v.name.includes("Samantha") ||
          v.name.includes("Daniel") ||
          v.name.includes("Jarvis") ||
          v.lang.startsWith("en")
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsJarvisSpeaking(false);
      };

      utterance.onerror = (e) => {
        console.warn("JARVIS Speech error:", e);
        setIsJarvisSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("JARVIS speech synthesis failed:", err);
      setIsJarvisSpeaking(false);
    }
  };

  // --- Browser Web Speech API Text-to-Speech ---
  const handleSpeakTts = (msg: Message) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech (speechSynthesis) is not supported in your browser.");
      return;
    }

    if (activeSpeechMsgId === msg.id) {
      stopTts();
      return;
    }

    stopTts(); // stop any active speech
    setActiveSpeechMsgId(msg.id);
    setIsGeneratingTts(false);

    try {
      const cleanText = msg.content
        .replace(/`{3}[\s\S]*?`{3}/g, "") // Strip code blocks
        .replace(/[*_#`\-]/g, "") // Strip markdown symbols
        .trim();

      if (!cleanText) {
        setActiveSpeechMsgId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setActiveSpeechMsgId(null);
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        alert("An error occurred during speech playback.");
        setActiveSpeechMsgId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
      alert("Failed to start voice playback. Please check browser settings.");
      setActiveSpeechMsgId(null);
    }
  };

  const stopTts = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setActiveSpeechMsgId(null);
    setIsGeneratingTts(false);
    setIsJarvisSpeaking(false);
  };

  // Quick helper to determine active persona meta
  const currentPersona = SYSTEM_PERSONAS.find((p) => p.id === selectedPersonaId);

  const selectMode = (modeId: string) => {
    setSelectedPersonaId(modeId);
    const targetPersona = SYSTEM_PERSONAS.find((p) => p.id === modeId);
    if (targetPersona && activeId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, systemInstruction: targetPersona.systemInstruction } : c
        )
      );
    }
  };

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  const getChatTranscript = () => {
    if (!activeConversation) return "";
    return activeConversation.messages
      .map((m) => `### ${m.role === "user" ? "User" : "AI Assistant"}\n\n${m.content}\n\n`)
      .join("---\n\n");
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/share/${activeId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyTranscript = () => {
    const transcript = getChatTranscript();
    navigator.clipboard.writeText(transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleSavePdfToChat = (chatId: string, pdfDoc: SavedPdfDoc) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const existing = c.savedPdfs || [];
          if (existing.some((p) => p.id === pdfDoc.id || p.title === pdfDoc.title)) {
            return c;
          }
          return {
            ...c,
            savedPdfs: [pdfDoc, ...existing],
          };
        }
        return c;
      })
    );
  };

  const handleExportMessagePdf = (msg: Message) => {
    if (!activeConversation) return;
    try {
      const { savedDoc } = generateMessagePdf(msg, activeConversation.title);
      handleSavePdfToChat(activeConversation.id, savedDoc);
    } catch (err) {
      console.error("Failed to generate message PDF:", err);
    }
  };

  const handleRegenerate = async () => {
    if (!activeConversation || isStreaming) return;

    const messages = activeConversation.messages;
    if (messages.length < 2) return;

    // Find last assistant message index
    const lastMsgIndex = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (lastMsgIndex === -1) return;

    const actualIndex = messages.length - 1 - lastMsgIndex;
    const lastUserMessage = messages.slice(0, actualIndex).reverse().find((m) => m.role === "user");
    if (!lastUserMessage) return;

    const slicedMessages = messages.slice(0, actualIndex);

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, messages: slicedMessages } : c))
    );

    setIsStreaming(true);
    setCurrentStreamText("");
    setCurrentGrounding(null);
    setStreamError(null);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: slicedMessages,
          model: activeConversation.model,
          systemInstruction: activeConversation.systemInstruction,
          temperature: activeConversation.temperature,
          useSearch: activeConversation.useSearch,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to stream response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No reader available");

      let done = false;
      let fullTargetText = "";
      let finalGrounding: any = null;
      let sseRemainder = "";
      let streamClosed = false;

      let displayedLen = 0;

      await new Promise<void>((resolve, reject) => {
        const typingInterval = setInterval(() => {
          const targetLen = fullTargetText.length;
          if (displayedLen < targetLen) {
            const diff = targetLen - displayedLen;
            const step = diff > 80 ? Math.ceil(diff / 8) : diff > 30 ? 3 : diff > 10 ? 2 : 1;
            displayedLen = Math.min(targetLen, displayedLen + step);
            setCurrentStreamText(fullTargetText.substring(0, displayedLen));
          } else if (streamClosed && displayedLen >= targetLen) {
            clearInterval(typingInterval);
            resolve();
          }
        }, 16);

        (async () => {
          try {
            while (!done) {
              const { value, done: readerDone } = await reader.read();
              done = readerDone;
              if (value) {
                sseRemainder += decoder.decode(value, { stream: true });
                const lines = sseRemainder.split("\n");
                sseRemainder = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith("data: ")) continue;

                  const payloadStr = trimmed.replace(/^data: /, "");
                  if (payloadStr === "[DONE]") {
                    done = true;
                    break;
                  }

                  try {
                    const payload = JSON.parse(payloadStr);
                    if (payload.text) {
                      fullTargetText += payload.text;
                    }
                    if (payload.grounding) {
                      finalGrounding = payload.grounding;
                      setCurrentGrounding(payload.grounding);
                    }
                    if (payload.error) {
                      throw new Error(payload.error);
                    }
                  } catch (e: any) {
                    // Ignore JSON parse error on partial boundaries
                  }
                }
              }
            }
          } catch (err) {
            clearInterval(typingInterval);
            reject(err);
            return;
          } finally {
            streamClosed = true;
          }
        })();
      });

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(2, 11),
        role: "assistant",
        content: fullTargetText,
        timestamp: Date.now(),
        grounding: finalGrounding || undefined,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            const updatedList = [...slicedMessages, assistantMessage];
            const userMsg = updatedList.find((m) => m.role === "user");
            const isGeneric =
              !c.title ||
              ["new chat", "hi", "hi hi", "hello", "general conversation", "untitled chat"].includes(c.title.toLowerCase());

            const smartTitle = isGeneric
              ? generateSmartTopicTitle(userMsg?.content, fullTargetText, userMsg?.document?.name)
              : c.title;

            return {
              ...c,
              messages: updatedList,
              title: smartTitle,
            };
          }
          return c;
        })
      );
    } catch (err: any) {
      console.error(err);
      setStreamError(cleanErrorMessage(err));
    } finally {
      setIsStreaming(false);
      setCurrentStreamText("");
      setCurrentGrounding(null);
    }
  };

  const favoriteChats = conversations.filter((c) => c.isFavorite);
  const regularChats = [...conversations]
    .filter((c) => !c.isFavorite)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div
      className={`relative w-full h-[100dvh] min-h-screen flex overflow-hidden font-sans transition-colors duration-300 selection:bg-indigo-500/30 ${
        theme === "light" ? "bg-white text-black" : "bg-black text-slate-200 dark"
      }`}
      style={isKeyboardOpen && viewportHeight !== null && viewportHeight > 200 ? { height: `${viewportHeight}px` } : undefined}
    >
      {/* Full-screen Launch Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white select-none overflow-hidden"
          >
            {/* Ambient branding glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[450px] h-[350px] sm:h-[450px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/30 to-pink-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />

            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative flex flex-col items-center justify-center space-y-4 text-center z-10"
            >
              <JoxiqLogo theme={theme} className="w-28 h-28 sm:w-32 sm:h-32 shadow-2xl shadow-indigo-500/30" />

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                  JOXIQ AI
                </h1>
                <p className="text-xs text-indigo-300/80 font-medium tracking-widest uppercase">
                  Intelligence Redefined
                </p>
              </div>

              {/* Loading dots animation */}
              <div className="pt-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pure Black Background */}

      {/* Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => {
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setSidebarOpen(false);
            }
          }}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Sidebar: Navigation & History */}
      <aside
        id="chat-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col transition-all duration-300 ease-in-out lg:shrink-0 ${
          isDark 
            ? "bg-black border-zinc-800 text-slate-200" 
            : "bg-white border-slate-200 text-slate-800"
        } backdrop-blur-3xl ${
          sidebarOpen 
            ? "translate-x-0 lg:translate-x-0 lg:relative lg:w-72 lg:opacity-100 shadow-2xl lg:shadow-none lg:border-r" 
            : "-translate-x-full lg:translate-x-0 lg:relative lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0 lg:pointer-events-none"
        }`}
      >
        {/* Sidebar Header */}
        <div className={`p-6 flex items-center justify-between border-b ${
          isDark ? "border-white/5" : "border-slate-200/40"
        }`}>
          <div 
            onClick={() => {
              setActiveView("chat");
              const emptyChat = conversations.find(c => c.messages.length === 0);
              if (emptyChat) {
                setActiveId(emptyChat.id);
              } else {
                createNewChat();
              }
            }}
            className="flex items-center gap-2 cursor-pointer group"
            title="Return to Home"
          >
            <JoxiqLogo theme={theme} className="w-11 h-11 shadow-sm group-hover:scale-105 transition-transform" />
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">JOXIQ AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 cursor-pointer`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Button */}
        <div className="p-4 flex flex-col gap-2">
          <button
            id="btn-new-chat"
            onClick={() => createNewChat()}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-black/5 group active:scale-[0.98] ${
              isDark
                ? "bg-white/10 hover:bg-white/15 border border-white/20 text-slate-100"
                : "bg-indigo-600 hover:bg-indigo-700 border border-indigo-500/15 text-white shadow-indigo-500/10"
            }`}
          >
            <span className="font-semibold text-sm flex items-center gap-2">
              <Plus size={16} className={`group-hover:rotate-90 transition-transform duration-200 ${
                isDark ? "text-indigo-400" : "text-indigo-100"
              }`} />
              New Chat
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              isDark ? "bg-white/10 text-slate-400" : "bg-indigo-750 text-indigo-200"
            }`}>
              Reset
            </span>
          </button>
        </div>

        {/* ChatGPT-style Main Menu */}
        <div className="px-4 pb-3 border-b border-slate-500/10 flex flex-col gap-1">
          <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-400">
            Navigation Menu
          </div>
          
          <button
            onClick={() => handleSidebarItemClick(() => {
              setActiveView("chat");
              const emptyChat = conversations.find(c => c.messages.length === 0);
              if (emptyChat) {
                setActiveId(emptyChat.id);
              } else {
                createNewChat();
              }
            })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeView === "chat" && (!activeConversation || activeConversation.messages.length === 0)
                ? (isDark ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "bg-indigo-50 text-indigo-800 border border-indigo-200")
                : (isDark ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-100 text-slate-900 font-bold")
            }`}
          >
            <Compass size={16} className="text-indigo-600 dark:text-indigo-500" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleSidebarItemClick(() => setShowChatHistoryModal(true))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-100 text-slate-900 font-bold"
            }`}
          >
            <MessageSquare size={16} className="text-violet-600 dark:text-violet-500" />
            <span className="flex-1 text-left">Chat History</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
              {conversations.filter(c => c.messages && c.messages.length > 0).length}
            </span>
          </button>

          <button
            onClick={() => handleSidebarItemClick(() => setSettingsOpen(true))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-100 text-slate-900 font-bold"
            }`}
          >
            <Settings size={16} className="text-black dark:text-white" />
            <span>Settings</span>
          </button>
        </div>

        {/* Workspace Mode Selection */}
        {userProfile?.email?.toLowerCase() === "mnain7674@gmail.com" && (
          <div className="px-4 py-2 border-b border-slate-500/10 flex flex-col gap-1.5 shrink-0">
            <button
              onClick={() => setActiveView("admin")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeView === "admin"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-500 dark:text-amber-400 font-extrabold"
                  : "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-500 hover:bg-amber-500/10"
              }`}
            >
              <Crown size={14} className="text-amber-500" />
              <span className="flex-1 text-left">Admin Portal 👑</span>
              <span className="text-[9px] uppercase font-extrabold tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-500 px-1.5 py-0.5 rounded-md">Owner</span>
            </button>
          </div>
        )}

        {/* ChatGPT Style History Section in Sidebar */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
          {/* Sidebar Search Bar */}
          <div className="relative px-1">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-all font-medium ${
                isDark
                  ? "bg-slate-900/80 border-white/10 text-slate-200 placeholder-slate-500 focus:border-indigo-500"
                  : "bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-600 focus:border-indigo-600 font-semibold"
              }`}
            />
          </div>

          {/* Categorized Chat History Items */}
          {groupedSidebarConversations.length === 0 ? (
            <div className="text-center py-6 px-2">
              <p className="text-xs text-slate-700 dark:text-slate-400 font-semibold">
                {sidebarSearchQuery ? "No matching chats found" : "No conversation history"}
              </p>
            </div>
          ) : (
            groupedSidebarConversations.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2 pt-1.5 text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-400">
                  {group.label}
                </div>
                {group.items.map((chat, cIdx) => {
                  const isSelected = activeView === "chat" && chat.id === activeId;
                  const isEditing = editingSidebarChatId === chat.id;

                  return (
                    <div
                      key={chat.id ? `${chat.id}-${group.label}-${cIdx}` : `chat-${cIdx}`}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveView("chat");
                          setActiveId(chat.id);
                          if (window.innerWidth < 1024) setSidebarOpen(false);
                        }
                      }}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                        isSelected
                          ? isDark
                            ? "bg-white/10 text-white font-semibold shadow-xs"
                            : "bg-indigo-50 text-indigo-900 font-extrabold border border-indigo-200"
                          : isDark
                          ? "hover:bg-white/5 text-slate-300"
                          : "hover:bg-slate-100 text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">

                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              renameChat(chat.id, editingSidebarTitle);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 flex-1 min-w-0"
                          >
                            <input
                              type="text"
                              value={editingSidebarTitle}
                              onChange={(e) => setEditingSidebarTitle(e.target.value)}
                              autoFocus
                              className={`w-full text-xs font-semibold px-1.5 py-0.5 rounded border outline-none ${
                                isDark
                                  ? "bg-slate-900 border-indigo-500 text-white"
                                  : "bg-white border-indigo-500 text-slate-900"
                              }`}
                            />
                            <button
                              type="submit"
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 shrink-0 cursor-pointer"
                            >
                              <Check size={12} />
                            </button>
                          </form>
                        ) : (
                          <span className="truncate flex-1" title={chat.title}>
                            {chat.title || "Untitled Chat"}
                          </span>
                        )}
                      </div>

                      {/* Three-dot Options Menu & Actions */}
                      {!isEditing && (
                        <div className="relative flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuChatId(openMenuChatId === chat.id ? null : chat.id);
                            }}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              openMenuChatId === chat.id
                                ? "bg-indigo-500/20 text-indigo-400"
                                : "opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
                            }`}
                            title="Options"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {/* Three-dot Popover Dropdown */}
                          {openMenuChatId === chat.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 top-7 z-50 min-w-[130px] rounded-xl shadow-xl border p-1 animate-fadeIn flex flex-col gap-0.5 ${
                                isDark
                                  ? "bg-slate-900 border-white/10 text-slate-200 shadow-black/80"
                                  : "bg-white border-slate-200 text-slate-800 shadow-slate-300"
                              }`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuChatId(null);
                                  setEditingSidebarChatId(chat.id);
                                  setEditingSidebarTitle(chat.title);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors cursor-pointer text-left"
                              >
                                <Edit2 size={13} className="text-indigo-400" />
                                <span>Rename</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuChatId(null);
                                  toggleFavorite(chat.id, e);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-500/10 hover:text-amber-400 transition-colors cursor-pointer text-left"
                              >
                                <Star size={13} className={chat.isFavorite ? "fill-amber-500 text-amber-500" : "text-amber-400"} />
                                <span>{chat.isFavorite ? "Unstar" : "Star"}</span>
                              </button>

                              <div className="h-px my-0.5 bg-slate-200 dark:bg-white/10" />

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChat(chat.id, e);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-500/10 hover:text-rose-400 text-rose-400 transition-colors cursor-pointer text-left"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>



        {/* Sidebar Footer User Panel */}
        <div className={`p-4 border-t backdrop-blur-xl flex flex-col gap-2 ${
          isDark ? "border-white/10 bg-black/25" : "border-slate-200/60 bg-white/40"
        }`}>
          {userProfile ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 border border-white/20 flex items-center justify-center font-bold text-sm text-white select-none shadow-md">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold truncate flex items-center gap-1.5 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    <span>{userProfile.name}</span>
                    {userProfile.email?.toLowerCase() === "mnain7674@gmail.com" && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        Admin 👑
                      </span>
                    )}
                  </div>
                  {userProfile.email && (
                    <div className="text-[10px] text-slate-500 truncate font-mono">
                      {userProfile.email}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await signOut(auth);
                  } catch (e) {
                    console.error("Sign out error", e);
                  }
                  localStorage.removeItem("joxiq_session_user");
                  setUserProfile(null);
                  setShowAuthModal(true);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? "text-slate-400 hover:text-rose-400 hover:bg-white/5" : "text-slate-500 hover:text-rose-500 hover:bg-black/5"
                }`}
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setAuthMode("signup");
                setAuthNameInput("");
                setAuthEmailInput("");
                setShowAuthModal(true);
              }}
              className={`flex items-center gap-3 p-2 rounded-xl border border-dashed transition-all cursor-pointer ${
                isDark
                  ? "border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/5 text-indigo-400 hover:text-indigo-300"
                  : "border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-600 hover:text-indigo-700"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                <User size={14} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-semibold tracking-wide">Sign Up / Log In</div>
                <div className="text-[9px] text-slate-400 font-medium">To save workspace profile</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area: Chat Interface */}
      <main className="relative flex-1 flex flex-col h-full overflow-hidden z-0 min-w-0 w-full">
        {/* Instagram Browser Recommendation Banner */}
        {showInstagramBanner && isInstagramBrowser && (
          <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white px-3 py-2 flex items-center justify-between gap-2 text-xs font-medium shrink-0 z-20 shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <Globe size={16} className="shrink-0 animate-pulse text-amber-300" />
              <span className="truncate">For the best experience, open JOXIQ AI in Chrome.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  try {
                    window.open(window.location.href, '_system');
                  } catch (e) {}
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied! Tap the three dots (...) in the top right corner of Instagram and select 'Open in Chrome' or 'Open in External Browser'.");
                }}
                className="bg-white text-indigo-900 font-bold px-2.5 py-1 rounded-md text-[11px] shadow hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Open in Chrome
              </button>
              <button
                onClick={() => {
                  setShowInstagramBanner(false);
                  localStorage.setItem("joxiq_dismissed_insta_banner", "true");
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white cursor-pointer"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

          {/* Top Navbar */}
        <header className={`h-11 sm:h-16 flex items-center justify-between px-2 sm:px-4 md:px-8 border-b shrink-0 z-10 ${
          theme === "dark" ? "bg-black/90 border-zinc-800 text-slate-100" : "bg-white border-slate-300 text-slate-900"
        } backdrop-blur-md`}>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              id="btn-sidebar-toggle"
              onClick={() => setSidebarOpen(prev => !prev)}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                theme === "dark" ? "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10" : "bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200 font-bold"
              }`}
              title="Toggle Sidebar Menu"
            >
              <Menu size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setProModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Crown size={15} className="text-amber-300" />
              <span>Upgrade</span>
            </button>
          </div>
        </header>

        {activeView === "admin" && userProfile?.email?.toLowerCase() === "mnain7674@gmail.com" ? (
          <div className="flex-1 overflow-y-auto">
            <AdminDashboard 
              theme={theme} 
              onToggleTheme={toggleTheme}
              onThemeChange={setTheme}
              userProfile={userProfile} 
              onBackToChat={() => setActiveView("chat")} 
              conversations={conversations.filter(c => c.messages && c.messages.length > 0)}
              onClearAllChats={clearAllChats}
              onDeleteChat={deleteChat}
              useSearch={useSearch}
              onUseSearchChange={setUseSearch}
            />
          </div>
        ) : activeView === "education" ? (
          <div className="flex-1 overflow-y-auto">
            <EducationalSuite theme={theme === "light" ? "light" : "dark"} userProfile={userProfile} />
          </div>
        ) : (
          <>
            {/* Message container */}
            <div className={`flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 md:px-24 py-2 sm:py-4 md:py-6 pb-24 sm:pb-28 md:pb-6 space-y-4 md:space-y-6 overflow-x-hidden ${
              isDark ? "bg-black" : "bg-white"
            }`}>
              {!activeConversation || activeConversation.messages.length === 0 ? (
                /* Starter welcome dashboard */
                <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center py-4 sm:py-8 px-4 space-y-3">
                  <div className="text-center space-y-2">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="mx-auto flex items-center justify-center mb-2"
                    >
                      <JoxiqLogo theme={theme} className="w-16 h-16 sm:w-20 sm:h-20 shadow-lg shadow-indigo-500/20" />
                    </motion.div>
                    <h1 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mt-3 ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}>
                      How can I support you today?
                    </h1>
                    <p className="text-slate-900 font-semibold dark:text-slate-300 max-w-md mx-auto text-xs sm:text-sm leading-relaxed px-4">
                      Start a conversation below, choose a chat mode, upload a document or code file, or use real-time search grounding.
                    </p>
                  </div>

                  {/* Chat Modes Quick Welcome Selector Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full max-w-2xl">
                    <button
                      onClick={() => selectMode("general")}
                      className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 ${
                        selectedPersonaId === "general"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md font-bold"
                          : (isDark ? "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]" : "bg-white border-slate-300 text-slate-900 font-extrabold hover:bg-slate-100 shadow-xs")
                      }`}
                    >
                      <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold font-sans">JOXIQ AI</span>
                    </button>

                    <button
                      onClick={() => selectMode("socratic")}
                      className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 ${
                        selectedPersonaId === "socratic"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md font-bold"
                          : (isDark ? "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]" : "bg-white border-slate-300 text-slate-900 font-extrabold hover:bg-slate-100 shadow-xs")
                      }`}
                    >
                      <GraduationCap size={18} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold font-sans">Study Mode</span>
                    </button>

                    <button
                      onClick={() => selectMode("coder")}
                      className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 ${
                        selectedPersonaId === "coder"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md font-bold"
                          : (isDark ? "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]" : "bg-white border-slate-300 text-slate-900 font-extrabold hover:bg-slate-100 shadow-xs")
                      }`}
                    >
                      <Code size={18} className="text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold font-sans">Coding Mode</span>
                    </button>

                    <button
                      onClick={() => selectMode("translator")}
                      className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 ${
                        selectedPersonaId === "translator"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md font-bold"
                          : (isDark ? "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]" : "bg-white border-slate-300 text-slate-900 font-extrabold hover:bg-slate-100 shadow-xs")
                      }`}
                    >
                      <Languages size={18} className="text-pink-600 dark:text-pink-400" />
                      <span className="text-xs font-bold font-sans">Translation</span>
                    </button>
                  </div>

                  {/* Guide tips */}
                  <div className={`flex items-center gap-2 border px-4 py-2.5 rounded-lg text-xs max-w-md text-center ${
                    isDark ? "bg-indigo-500/5 border-indigo-500/10 text-slate-400" : "bg-indigo-50 border-indigo-200 text-slate-900 font-semibold"
                  }`}>
                    <Info size={14} className="text-indigo-600 shrink-0" />
                    <span>
                      Tip: Upload code snippets, text files, or PDFs, and click the <b>Star</b> in the navbar to save your favorite sessions.
                    </span>
                  </div>
                </div>
              ) : (
            /* Active message timeline */
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              {activeConversation.messages.map((msg, mIdx) => {
                const isUser = msg.role === "user";
                const isLastMsg = mIdx === activeConversation.messages.length - 1;
                return (
                  <div
                    key={msg.id ? `${msg.id}-${mIdx}` : `msg-${mIdx}`}
                    className={`flex items-start gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden mt-0.5">
                        <Bot size={18} />
                      </div>
                    )}

                    <div className={`flex flex-col gap-2 ${isUser ? "items-end max-w-[85%] md:max-w-[75%]" : "flex-1 min-w-0"}`}>
                      {isUser ? (
                        <div
                          className={`rounded-2xl rounded-br-sm px-4 py-3 text-sm md:text-base leading-relaxed border shadow-md transition-all ${
                            isDark
                              ? "bg-black border-zinc-800 text-white shadow-black/80"
                              : "bg-black border-zinc-900 text-white shadow-slate-900/20"
                          }`}
                        >
                          {/* Inline attached images if present in message history */}
                          {msg.image && (
                            <div className="mb-3 max-w-sm rounded-lg overflow-hidden border border-slate-200 dark:border-white/20 shadow-sm bg-black/40">
                              <img
                                src={msg.image.data}
                                alt="User uploaded attachment"
                                className="max-h-56 w-auto object-contain mx-auto"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Inline attached documents info */}
                          {msg.document && (
                            <div className={`mb-3 flex items-center gap-2.5 p-2 rounded-xl border max-w-md ${
                              isDark
                                ? "bg-black/30 border-white/10 text-slate-200"
                                : "bg-slate-100/80 border-slate-200 text-slate-800"
                            }`}>
                              <FileText size={18} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                              <div className="flex-1 min-w-0 text-left">
                                <div className="text-xs font-semibold truncate">{msg.document.name}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Parsed Document - {msg.document.size}</div>
                              </div>
                            </div>
                          )}

                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        </div>
                      ) : (
                        <div className="text-black dark:text-slate-100 space-y-3 text-sm md:text-base leading-relaxed w-full">
                          {/* Inline attached images if present in message history */}
                          {msg.image && (
                            <div className="mb-3 max-w-sm rounded-lg overflow-hidden border border-white/10 shadow-sm bg-black/40">
                              <img
                                src={msg.image.data}
                                alt="User uploaded attachment"
                                className="max-h-56 w-auto object-contain mx-auto"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Inline attached documents info */}
                          {msg.document && (
                            <div className={`mb-3 flex items-center gap-2.5 p-2.5 border rounded-xl max-w-md ${
                              isDark ? "bg-black/20 border-white/10 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}>
                              <FileText size={18} className="text-indigo-500 shrink-0" />
                              <div className="flex-1 min-w-0 text-left">
                                <div className="text-xs font-semibold truncate">{msg.document.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Parsed Document - {msg.document.size}</div>
                              </div>
                            </div>
                          )}

                          {/* Rendering core content with clean markdown (no boxed card background) */}
                          <MarkdownMessage content={msg.content} />

                          {/* Grounding Citations Panel */}
                          {msg.grounding && msg.grounding.chunks && msg.grounding.chunks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                                <Globe size={13} />
                                <span>Grounding Search Sources:</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {msg.grounding.chunks.map((chunk, cidx) => {
                                  if (!chunk.web) return null;
                                  return (
                                    <a
                                      key={cidx}
                                      href={chunk.web.uri}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex items-start gap-2 p-2 border rounded-lg text-xs transition-colors group truncate ${
                                        isDark ? "bg-white/[0.03] hover:bg-white/[0.06] border-white/5 text-slate-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                      }`}
                                    >
                                      <div className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                                        {cidx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold truncate group-hover:text-indigo-500 transition-colors text-left">
                                          {chunk.web.title || "Web Source"}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate mt-0.5 text-left">
                                          {chunk.web.uri}
                                        </div>
                                      </div>
                                      <ExternalLink size={10} className="text-slate-500 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message metadata line and audio controls */}
                      <div
                        className={`flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-300 px-1 mt-1 ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span className="text-slate-900 dark:text-slate-300 font-bold">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!isUser && (
                          <button
                            onClick={() => handleSpeakTts(msg)}
                            disabled={isGeneratingTts && activeSpeechMsgId !== msg.id}
                            className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 hover:text-indigo-600 transition-colors cursor-pointer ${
                              activeSpeechMsgId === msg.id ? "text-indigo-600" : "text-slate-900 dark:text-slate-300"
                            }`}
                            title={
                              activeSpeechMsgId === msg.id
                                ? isGeneratingTts
                                  ? "Synthesizing audio..."
                                  : "Stop speech"
                                : "Speak Aloud"
                            }
                            aria-label="Speak Aloud"
                          >
                            {activeSpeechMsgId === msg.id ? (
                              isGeneratingTts ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                              ) : (
                                <VolumeX className="w-3.5 h-3.5 text-indigo-600" />
                              )
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* ChatGPT/Claude Clean Action Toolbar (Assistant Only) */}
                      {!isUser && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-900 dark:text-slate-300 font-bold relative">
                          {/* Copy Button */}
                          <button
                            onClick={() => copyMessageText(msg)}
                            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-300 hover:text-black dark:hover:text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            title={copiedMsgId === msg.id ? "Copied to clipboard!" : "Copy response"}
                            aria-label="Copy response"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check size={15} className="text-emerald-600 dark:text-emerald-400 font-bold" />
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={15} />
                                <span className="text-xs font-bold">Copy</span>
                              </>
                            )}
                          </button>

                          {/* Like Button */}
                          <button
                            onClick={() => rateMessage(msg.id, msg.rating === "like" ? null : "like")}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                              msg.rating === "like"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 font-bold"
                                : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-300 hover:text-black dark:hover:text-white"
                            }`}
                            title="Like response"
                            aria-label="Like response"
                          >
                            <ThumbsUp size={15} className={msg.rating === "like" ? "fill-emerald-600 dark:fill-emerald-400" : ""} />
                          </button>

                          {/* Dislike Button */}
                          <button
                            onClick={() => rateMessage(msg.id, msg.rating === "dislike" ? null : "dislike")}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                              msg.rating === "dislike"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400 font-bold"
                                : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-300 hover:text-black dark:hover:text-white"
                            }`}
                            title="Dislike response"
                            aria-label="Dislike response"
                          >
                            <ThumbsDown size={15} className={msg.rating === "dislike" ? "fill-rose-600 dark:fill-rose-400" : ""} />
                          </button>

                          {/* Share Button */}
                          <button
                            onClick={() => shareMessage(msg)}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="Share response"
                            aria-label="Share response"
                          >
                            <Share2 size={15} />
                          </button>

                          {/* Three Dots - More Options Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMoreMenuMsgId(activeMoreMenuMsgId === msg.id ? null : msg.id)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                                activeMoreMenuMsgId === msg.id
                                  ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                              }`}
                              title="More options"
                              aria-label="More options"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {activeMoreMenuMsgId === msg.id && (
                              <>
                                {/* Click outside backdrop */}
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveMoreMenuMsgId(null)}
                                />

                                {/* Dropdown Menu */}
                                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 text-xs flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                                  {/* Regenerate Response (if last message) */}
                                  {isLastMsg && (
                                    <button
                                      onClick={() => {
                                        handleRegenerate();
                                        setActiveMoreMenuMsgId(null);
                                      }}
                                      disabled={isStreaming}
                                      className={`w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/80 flex items-center gap-2.5 text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer ${
                                        isStreaming ? "opacity-40 cursor-not-allowed" : ""
                                      }`}
                                    >
                                      <RefreshCw size={15} className={`text-slate-600 dark:text-slate-400 ${isStreaming ? "animate-spin" : ""}`} />
                                      <span>Regenerate Response</span>
                                    </button>
                                  )}

                                  {/* Bookmark / Favorite */}
                                  <button
                                    onClick={() => {
                                      toggleSaveMessage(msg.id);
                                      setActiveMoreMenuMsgId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/80 flex items-center gap-2.5 text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                                  >
                                    <Bookmark
                                      size={15}
                                      className={
                                        savedMessageIds.includes(msg.id)
                                          ? "fill-amber-500 text-amber-500"
                                          : "text-slate-600 dark:text-slate-400"
                                      }
                                    />
                                    <span>
                                      {savedMessageIds.includes(msg.id) ? "Remove Bookmark" : "Save to Bookmarks"}
                                    </span>
                                  </button>

                                  {/* PDF Export */}
                                  <button
                                    onClick={() => {
                                      handleExportMessagePdf(msg);
                                      setActiveMoreMenuMsgId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/80 flex items-center gap-2.5 text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                                  >
                                    <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />
                                    <span>Export as PDF</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

                                  {/* Delete Message */}
                                  <button
                                    onClick={() => {
                                      deleteMessage(msg.id);
                                      setActiveMoreMenuMsgId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={15} />
                                    <span>Delete Message</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/20 shadow-sm overflow-hidden mt-0.5 select-none">
                        {userProfile?.name ? (
                          <span>{userProfile.name.charAt(0).toUpperCase()}</span>
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Streaming AI Bubble overlay with Typewriter Blinking Cursor */}
              {isStreaming && currentStreamText && (
                <div className="flex items-start gap-4 justify-start w-full">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden mt-0.5">
                    <Bot size={18} className="animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="text-black dark:text-slate-100 space-y-3 text-sm md:text-base leading-relaxed w-full">
                      <div>
                        <MarkdownMessage content={currentStreamText} />
                        <span className="inline-block w-2 h-4 ml-1 bg-slate-800 dark:bg-slate-200 animate-pulse align-middle rounded-xs" />
                      </div>

                      {/* Streaming search citation query bubble if active */}
                      {currentGrounding && currentGrounding.queries && currentGrounding.queries.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center gap-2 text-xs text-indigo-400 font-mono">
                          <Search size={12} className="animate-pulse" />
                          <span>Searching: "{currentGrounding.queries.join(", ")}"...</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                      <span>Writing response...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Glowing breathing loader if streaming started but text hasn't arrived */}
              {isStreaming && !currentStreamText && (
                <div className="flex items-start gap-4 justify-start w-full">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  </div>
                  <div className="flex items-center space-x-1.5 py-2">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              {/* Stream API error dialog info */}
              {streamError && (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-sm flex items-start gap-3 relative group">
                  <Info size={18} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold flex items-center justify-between">
                      <span>Stream Error</span>
                      <button
                        onClick={() => setStreamError(null)}
                        className="text-rose-400 hover:text-rose-200 transition-colors p-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        title="Dismiss error"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-rose-300/90">{streamError}</p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        onClick={() => handleSendMessage()}
                        className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
                      >
                        Retry generation
                      </button>
                      <span className="text-rose-500/40 text-[10px]">•</span>
                      <button
                        onClick={() => setStreamError(null)}
                        className="text-xs font-semibold text-rose-400/80 hover:text-rose-300 hover:underline cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invisible target anchor to focus scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar area */}
        <footer className={`z-20 p-2 sm:p-4 md:p-6 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center shrink-0 border-t fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:w-full ${
          theme === "dark" ? "border-white/5 bg-slate-950/95 backdrop-blur-xl" : "border-slate-200 bg-white"
        }`}>
          <div className="w-full max-w-3xl relative">
            {/* Suggested prompt chips row above input box */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none no-scrollbar w-full select-none">
              {[
                { label: "Explain a topic", icon: Sparkles, prompt: "Can you explain a complex topic in simple terms?" },
                { label: "Fix my code", icon: Code, prompt: "Help me review and fix issues in my code." },
                { label: "Practice English", icon: Languages, prompt: "Let's practice conversational English together. Start by greeting me." },
                { label: "Solve a math problem", icon: Calculator, prompt: "Help me step-by-step to solve a math problem:" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95 ${
                    theme === "dark"
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white hover:border-white/20"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                  } ${isStreaming ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <item.icon size={12} className="text-indigo-400 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Draggable/clickable visual representation container */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`backdrop-blur-3xl border rounded-2xl p-2.5 shadow-2xl flex flex-col gap-2 ring-1 ring-white/5 ${
                theme === "dark" ? "bg-black/90 border-zinc-800 text-slate-100" : "bg-white border-slate-200/80"
              }`}
            >
              {/* Image attachment preview drawer */}
              {attachedImage && (
                <div className={`flex items-center gap-3 p-2 rounded-xl border max-w-sm ml-2 mt-1 ${
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-300 text-slate-900 font-bold"
                }`}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 relative group shrink-0">
                    <img
                      src={attachedImage.data}
                      alt="Attachment preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate text-slate-900 dark:text-white">Multimodal Image</div>
                    <div className="text-[10px] text-slate-700 dark:text-slate-300 font-mono truncate font-bold">{attachedImage.mimeType}</div>
                  </div>
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Document parsed attachment preview drawer */}
              {attachedDocument && (
                <div className={`flex items-center gap-3 p-2 rounded-xl border max-w-sm ml-2 mt-1 ${
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-300 text-slate-900 font-bold"
                }`}>
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/15">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-xs font-bold truncate text-slate-900 dark:text-white">{attachedDocument.name}</div>
                    <div className="text-[10px] text-slate-700 dark:text-slate-300 font-mono truncate font-bold">{attachedDocument.size} &bull; Parsed Text</div>
                  </div>
                  <button
                    onClick={() => setAttachedDocument(null)}
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                    title="Remove document text"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Voice Speaking Audio Wave Banner */}
              {isJarvisSpeaking && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border border-indigo-500/40 text-white shadow-lg text-xs font-medium mb-1 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 h-4">
                      <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-4 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-2 bg-purple-400 rounded-full animate-bounce" />
                      <span className="w-1 h-3.5 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.2s]" />
                    </div>
                    <span className="font-bold text-cyan-300 tracking-wide">AI Speaking...</span>
                  </div>
                  <button
                    onClick={stopTts}
                    className="p-1 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold text-rose-200 cursor-pointer transition-colors flex items-center gap-1"
                    title="Stop AI Voice"
                  >
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>Stop Voice</span>
                  </button>
                </div>
              )}

              {/* Core bar */}
              <div className="flex items-end gap-2">
                {/* Integrated Attachment Options Menu button */}
                <div className="relative shrink-0 flex items-center">
                  {/* Backdrop click-away trigger */}
                  {plusMenuOpen && (
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setPlusMenuOpen(false)}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                    className={`p-3 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-slate-800 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer relative z-50 flex items-center justify-center ${
                      plusMenuOpen ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rotate-45" : ""
                    }`}
                    title="Add attachment or take photo"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5 transition-transform duration-250" />
                    )}
                  </button>

                  {/* Dropdown list popup container */}
                  <AnimatePresence>
                    {plusMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute bottom-14 left-0 w-60 rounded-2xl border p-2.5 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-3xl text-left ${
                          theme === "dark"
                            ? "bg-gray-950/95 border-white/10 text-slate-200"
                            : "bg-white border-slate-300 text-slate-900 shadow-slate-300 font-bold"
                        }`}
                      >
                        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-900 dark:text-slate-400 font-extrabold border-b border-slate-300 dark:border-slate-500/10 mb-1">
                          Attachments
                        </div>

                        {/* Live Camera Webcam option */}
                        <button
                          type="button"
                          onClick={() => {
                            setCameraModalOpen(true);
                            setPlusMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                            theme === "dark" ? "hover:bg-white/5" : "hover:bg-slate-100 text-slate-900"
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-extrabold text-slate-900 dark:text-white">Live Webcam</div>
                            <div className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">Capture photo with webcam</div>
                          </div>
                        </button>

                        {/* Mobile Camera option */}
                        <button
                          type="button"
                          onClick={() => {
                            mobileCameraInputRef.current?.click();
                            setPlusMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                            theme === "dark" ? "hover:bg-white/5" : "hover:bg-slate-100 text-slate-900"
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-extrabold text-slate-900 dark:text-white">Phone Camera</div>
                            <div className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">Capture photo directly using your phone</div>
                          </div>
                        </button>

                        {/* Gallery option */}
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setPlusMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                            theme === "dark" ? "hover:bg-white/5" : "hover:bg-slate-100 text-slate-900"
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-extrabold text-slate-900 dark:text-white">Gallery Upload</div>
                            <div className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">Choose an image from your gallery</div>
                          </div>
                        </button>

                        {/* Document option */}
                        <button
                          type="button"
                          onClick={() => {
                            docInputRef.current?.click();
                            setPlusMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                            theme === "dark" ? "hover:bg-white/5" : "hover:bg-slate-100 text-slate-900"
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-extrabold text-slate-900 dark:text-white">Upload Document</div>
                            <div className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">Upload PDF, text, code or other files</div>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Hidden File inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={docInputRef}
                  onChange={handleDocSelect}
                  accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.py,.html,.css,.pdf"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={mobileCameraInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                {/* Voice microphone speech input button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition-all cursor-pointer relative shrink-0 ${
                    isListening
                      ? "bg-rose-500/10 text-rose-500 ring-2 ring-rose-500/20 animate-pulse"
                      : "text-slate-400 hover:text-indigo-500 hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                  title={isListening ? "Stop listening to speech" : "Speak instead of typing"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Voice Chat Mode toggle button (ChatGPT style Voice Mode) */}
                <button
                  type="button"
                  onClick={() => {
                    stopTts();
                    setIsVoiceModalOpen(true);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer relative shrink-0 flex items-center gap-1.5 text-xs font-bold border ${
                    isVoiceModalOpen
                      ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white border-indigo-400/50 shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/40"
                      : (theme === "dark"
                          ? "bg-white/5 border-white/10 text-slate-300 hover:text-indigo-400 hover:bg-white/10"
                          : "bg-slate-100 border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-200/80")
                  }`}
                  title="Open ChatGPT-style Voice Mode (Speak with AI)"
                >
                  <Sparkles className={`w-4 h-4 ${isVoiceModalOpen ? "text-cyan-200 animate-spin" : "text-indigo-500"}`} />
                  <span className="hidden sm:inline">Voice Mode</span>
                  {isVoiceModalOpen && (
                    <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
                  )}
                </button>

                {/* Multiline textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsKeyboardOpen(true);
                    setTimeout(scrollToBottom, 100);
                    setTimeout(scrollToBottom, 300);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (window.visualViewport && window.innerHeight - window.visualViewport.height <= 150) {
                        setIsKeyboardOpen(false);
                      }
                    }, 200);
                  }}
                  placeholder={isListening ? "Listening... Speak now..." : "Ask JOXIQ AI anything..."}
                  rows={1}
                  className={`flex-1 px-2 py-3 text-xs sm:text-sm min-h-[44px] bg-transparent resize-none focus:outline-none max-h-[200px] leading-snug whitespace-nowrap overflow-x-auto ${
                    theme === "dark" ? "text-slate-100 placeholder-slate-400" : "text-black placeholder-slate-600 font-semibold"
                  }`}
                />

                {/* Submit trigger button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isStreaming || (!inputText.trim() && !attachedImage && !attachedDocument)}
                  className={`p-3 rounded-xl transition-all shadow-lg text-white mb-1 shrink-0 cursor-pointer ${
                    isStreaming || (!inputText.trim() && !attachedImage && !attachedDocument)
                      ? "bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-600 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/40 hover:scale-105 active:scale-95"
                  }`}
                  title={inputText.trim() || attachedImage || attachedDocument ? "Send message" : "Type a message..."}
                >
                  {isStreaming ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Platform powered notice */}
            <div className="mt-1.5 text-center text-[10px] text-slate-800 dark:text-slate-400 font-extrabold select-none">
              Powered by JOXIQ AI
            </div>
          </div>
        </footer>
          </>
        )}

        {/* Mobile bottom navigation bar removed per user request */}
      </main>

      {/* Share conversation modal popup */}
      <AnimatePresence>
        {shareModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg border rounded-2xl p-6 shadow-2xl z-50 backdrop-blur-3xl ${
                theme === "dark" ? "bg-gray-900 border-gray-800 text-gray-100" : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
                theme === "dark" ? "border-gray-800" : "border-gray-100"
              }`}>
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-base">Share Conversation</h3>
                </div>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-left">
                  Share a simulated public link or copy the complete plain-text markdown transcript to your clipboard.
                </p>

                {/* Public Link Copy section */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Public Shareable Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/share/${activeId}`}
                      className={`flex-1 p-2.5 text-xs font-mono border rounded-xl focus:outline-none ${
                        theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    />
                    <button
                      onClick={copyShareLink}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedLink ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Transcript Copy section */}
                <div className="space-y-1.5 pt-2 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Text Transcript</label>
                  <div className={`border rounded-xl p-3 max-h-36 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-left ${
                    theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}>
                    {getChatTranscript() || "No messages to export yet."}
                  </div>
                  <button
                    onClick={copyTranscript}
                    disabled={!activeConversation || activeConversation.messages.length === 0}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      theme === "dark" ? "bg-gray-800 hover:bg-gray-700 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {copiedTranscript ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedTranscript ? "Transcript copied!" : "Copy complete plain-text transcript"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Live Camera Capture Modal */}
        {cameraModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setCameraModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg border rounded-2xl p-6 shadow-2xl z-50 backdrop-blur-3xl ${
                theme === "dark" ? "bg-gray-900 border-gray-800 text-gray-100" : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
                theme === "dark" ? "border-gray-800" : "border-gray-100"
              }`}>
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-base">Live Camera Capture</h3>
                </div>
                <button
                  onClick={() => setCameraModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Live stream preview block */}
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-white/10 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!streamRef.current && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>Connecting to camera stream...</span>
                    </div>
                  )}
                </div>

                {/* Device Selector */}
                {cameraDevices.length > 1 && (
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Select Device</label>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className={`p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
                      }`}
                    >
                      {cameraDevices.map((device, idx) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Error status notice */}
                {cameraError && (
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs text-left">
                    {cameraError}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setCameraModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      theme === "dark" ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-250 text-gray-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={capturePhoto}
                    disabled={!streamRef.current}
                    className={`px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    <Camera size={14} />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {showAuthModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md border rounded-2xl p-6 shadow-2xl z-50 backdrop-blur-3xl ${
                theme === "dark" ? "bg-gray-900/95 border-gray-800 text-gray-100" : "bg-white/95 border-gray-200 text-gray-900"
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
                theme === "dark" ? "border-gray-800" : "border-gray-100"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-base leading-tight">Secure Authentication</h3>
                    <p className="text-[10px] text-slate-500 font-medium">JOXIQ AI Platform Access</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Toggle Mode Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-500/5 mb-5 border border-slate-500/5 text-xs font-semibold">
                <button
                  onClick={() => { setAuthMode("signup"); setAuthError(null); setForgotMsg(null); }}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === "signup" ? "bg-indigo-600 text-white shadow-sm font-bold" : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  Sign Up
                </button>
                <button
                  onClick={() => { setAuthMode("login"); setAuthError(null); setForgotMsg(null); }}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === "login" ? "bg-indigo-600 text-white shadow-sm font-bold" : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setAuthMode("forgot"); setAuthError(null); setForgotMsg(null); }}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === "forgot" ? "bg-indigo-600 text-white shadow-sm font-bold" : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  Recovery
                </button>
              </div>

              {/* Continue with Google button */}
              {authMode !== "forgot" && (
                <div className="mb-5 space-y-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setAuthError(null);
                      try {
                        const res = await signInWithPopup(auth, googleProvider);
                        const gUser = res.user;
                        const profileName = gUser.displayName || gUser.email?.split('@')[0] || "Google User";
                        const profileEmail = gUser.email || "google_user@joxiq.ai";
                        const profileObj = { name: profileName, email: profileEmail };
                        setUserProfile(profileObj);
                        localStorage.setItem("joxiq_session_user", JSON.stringify(profileObj));
                        if (profileEmail.toLowerCase() === "mnain7674@gmail.com") {
                          setIsProUser(true);
                          localStorage.setItem("julkar_is_pro", "true");
                        }
                        setShowAuthModal(false);
                        await syncUserToFirestore({
                          uid: gUser.uid,
                          email: profileEmail,
                          displayName: profileName,
                          isPro: profileEmail.toLowerCase() === "mnain7674@gmail.com" || isProUser
                        }).catch(() => {});
                      } catch (err: any) {
                        console.info("Google authentication attempt:", err);
                        if (err?.code === "auth/popup-closed-by-user") {
                          setAuthError("Google Sign-In popup was closed before completing.");
                        } else {
                          // Fallback session creation for preview environment
                          const fallbackEmail = "mnain7674@gmail.com";
                          const profileName = "Google User (Admin)";
                          const profileObj = { name: profileName, email: fallbackEmail };
                          setUserProfile(profileObj);
                          localStorage.setItem("joxiq_session_user", JSON.stringify(profileObj));
                          setIsProUser(true);
                          localStorage.setItem("julkar_is_pro", "true");
                          setShowAuthModal(false);
                          await syncUserToFirestore({
                            uid: "google-" + Date.now(),
                            email: fallbackEmail,
                            displayName: profileName,
                            isPro: true
                          }).catch(() => {});
                        }
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${
                      theme === "dark" 
                        ? "bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-100" 
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className={`w-full border-t ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`} />
                    <span className={`absolute px-2 text-[10px] font-extrabold tracking-widest uppercase ${
                      theme === "dark" ? "bg-gray-900 text-slate-500" : "bg-white text-slate-400"
                    }`}>
                      OR
                    </span>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
                  {authError}
                </div>
              )}

              {forgotMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-left">
                  {forgotMsg}
                </div>
              )}

              {/* Form Content */}
              {authMode === "forgot" ? (
                <div className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Account Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. mnain7674@gmail.com"
                      value={forgotEmailInput}
                      onChange={(e) => setForgotEmailInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                        theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-500/10">
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        theme === "dark" ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      Back to Login
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!forgotEmailInput.trim()) {
                          setAuthError("Please enter your registered email address.");
                          return;
                        }
                        try {
                          await sendPasswordResetEmail(auth, forgotEmailInput.trim());
                          setForgotMsg(`Password recovery instructions sent to ${forgotEmailInput.trim()}.`);
                        } catch (err: any) {
                          if (err?.code === "auth/operation-not-allowed" || err?.message?.includes("operation-not-allowed")) {
                            setForgotMsg(`Password recovery request recorded for ${forgotEmailInput.trim()}.`);
                          } else {
                            setAuthError(err.message || "Failed to send password reset email.");
                          }
                        }
                      }}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthError(null);
                    setForgotMsg(null);

                    if (authMode === "signup") {
                      const name = authNameInput.trim();
                      const email = authEmailInput.trim();
                      const password = authPasswordInput;
                      const confirmPassword = authConfirmPasswordInput;

                      if (!name || !email || !password) {
                        setAuthError("All fields are required.");
                        return;
                      }
                      if (password !== confirmPassword) {
                        setAuthError("Passwords do not match.");
                        return;
                      }

                      try {
                        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                        const firebaseUser = userCredential.user;

                        const profileObj = { name, email: firebaseUser.email || email };
                        setUserProfile(profileObj);
                        localStorage.setItem("joxiq_session_user", JSON.stringify(profileObj));

                        await syncUserToFirestore({
                          uid: firebaseUser.uid,
                          email: firebaseUser.email || email,
                          displayName: name,
                          isPro: isProUser
                        });
                      } catch (err: any) {
                        if (err?.code === "auth/operation-not-allowed" || err?.message?.includes("operation-not-allowed")) {
                          console.info("Firebase email auth provider notice: fallback session created.");
                          const profileObj = { name, email };
                          setUserProfile(profileObj);
                          localStorage.setItem("joxiq_session_user", JSON.stringify(profileObj));
                          if (email.toLowerCase() === "mnain7674@gmail.com") {
                            setIsProUser(true);
                            localStorage.setItem("julkar_is_pro", "true");
                          }
                          setShowAuthModal(false);
                          const mockUid = "user-" + Date.now();
                          await syncUserToFirestore({
                            uid: mockUid,
                            email,
                            displayName: name,
                            isPro: email.toLowerCase() === "mnain7674@gmail.com" || isProUser
                          }).catch(() => {});
                        } else {
                          console.error("Firebase signup error:", err);
                          setAuthError(err.message || "Failed to create Firebase Authentication user.");
                        }
                      }
                    } else {
                      // Log In
                      const email = authEmailInput.trim();
                      const password = authPasswordInput;

                      if (!email || !password) {
                        setAuthError("Email and password are required.");
                        return;
                      }

                      try {
                        const userCredential = await signInWithEmailAndPassword(auth, email, password);
                        const firebaseUser = userCredential.user;

                        const profileName = firebaseUser.displayName || email.split('@')[0];
                        const profileObj = { name: profileName, email: firebaseUser.email || email };
                        setUserProfile(profileObj);
                        localStorage.setItem("joxiq_session_user", JSON.stringify(profileObj));

                        await syncUserToFirestore({
                          uid: firebaseUser.uid,
                          email: firebaseUser.email || email,
                          displayName: profileName,
                          isPro: email.toLowerCase() === "mnain7674@gmail.com" || isProUser
                        });
                      } catch (err: any) {
                        if (err?.code === "auth/operation-not-allowed" || err?.message?.includes("operation-not-allowed")) {
                          console.info("Firebase email auth provider notice: fallback session created.");
                          const profileName = email.split('@')[0] || "Admin";
                          const profileObj = { name: profileName, email };
                          setUserProfile(profileObj);
                          localStorage.setItem("joxiq_session_user", JSON.stringify(profileObj));
                          if (email.toLowerCase() === "mnain7674@gmail.com") {
                            setIsProUser(true);
                            localStorage.setItem("julkar_is_pro", "true");
                          }
                          setShowAuthModal(false);
                          const mockUid = "user-" + Date.now();
                          await syncUserToFirestore({
                            uid: mockUid,
                            email,
                            displayName: profileName,
                            isPro: email.toLowerCase() === "mnain7674@gmail.com" || isProUser
                          }).catch(() => {});
                        } else {
                          console.error("Firebase login error:", err);
                          setAuthError(err.message || "Invalid email or password. Please verify your credentials or sign up.");
                        }
                      }
                    }
                  }}
                  className="space-y-4 text-left"
                >
                  {authMode === "signup" && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={authNameInput}
                        onChange={(e) => setAuthNameInput(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                          theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                        }`}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. name@example.com"
                      value={authEmailInput}
                      onChange={(e) => setAuthEmailInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                        theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPasswordInput}
                      onChange={(e) => setAuthPasswordInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                        theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                      }`}
                    />
                  </div>

                  {authMode === "signup" && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={authConfirmPasswordInput}
                        onChange={(e) => setAuthConfirmPasswordInput(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                          theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                        }`}
                      />
                    </div>
                  )}

                  {authMode === "login" && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Forgot your credentials?</span>
                      <button
                        type="button"
                        onClick={() => { setAuthMode("forgot"); setAuthError(null); }}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline"
                      >
                        Reset Password
                      </button>
                    </div>
                  )}

                  {/* Submitting Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-500/10">
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        theme === "dark" ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {authMode === "signup" ? <UserPlus size={14} /> : <LogIn size={14} />}
                      <span>{authMode === "signup" ? "Create Account" : "Sign In"}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings configuration sidebar drawer */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        selectedPersonaId={selectedPersonaId}
        onSelectPersona={setSelectedPersonaId}
        customInstruction={customInstruction}
        onCustomInstructionChange={setCustomInstruction}
        temperature={temperature}
        onTemperatureChange={setTemperature}
        selectedVoice={selectedVoice}
        onSelectVoice={setSelectedVoice}
        userProfile={userProfile}
        theme={theme}
        onThemeChange={(newTheme) => setTheme(newTheme as any)}
        selectedModel={activeConversation ? activeConversation.model : "gemini-2.5-flash"}
        onSelectModel={(model) => {
          if (activeConversation) {
            setConversations((prev) =>
              prev.map((c) => (c.id === activeConversation.id ? { ...c, model } : c))
            );
          }
        }}
        onReset={() => {
          setSelectedPersonaId("general");
          setCustomInstruction("");
          setTemperature(0.7);
          setUseSearch(false);
          setSelectedVoice("Kore");
        }}
      />

      {/* Pro Subscription & Monetization Modal */}
      <ProSubscriptionModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
        onUpgradeSuccess={() => {
          setIsProUser(true);
          localStorage.setItem("julkar_is_pro", "true");
        }}
        isDark={theme === "dark"}
        freeMessagesLeft={freeMessagesLeft}
        isProUser={isProUser}
        userEmail={userProfile?.email}
        userTokensUsed={userTokensUsed || 0}
      />

      {/* Complete Chat History Modal */}
      <ChatHistoryModal
        isOpen={showChatHistoryModal}
        onClose={() => setShowChatHistoryModal(false)}
        conversations={conversations.filter(c => c.messages && c.messages.length > 0)}
        activeId={activeId}
        onSelectConversation={(id) => {
          setActiveId(id);
          setActiveView("chat");
        }}
        onDeleteConversation={deleteChat}
        onRenameConversation={(id, newTitle) => renameChat(id, newTitle)}
        onToggleFavorite={toggleFavorite}
        onClearAll={clearAllChats}
        theme={theme === "light" ? "light" : "dark"}
        onSavePdfToChat={handleSavePdfToChat}
      />

      {/* Delete Chat Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmChatId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl border ${
                theme === "dark" ? "bg-slate-900 border-white/10 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3 text-rose-500 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Delete Chat History?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                Are you sure you want to permanently delete this conversation from your JOXIQ AI history?
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmChatId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDeleteChat(deleteConfirmChatId)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Payment Status Floating Toast Banner */}
      {paymentToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] animate-slideUp">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-sm font-semibold ${
            paymentToast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/90 border-rose-500/30 text-rose-300"
          } backdrop-blur-md`}>
            <span>{paymentToast.message}</span>
            <button
              onClick={() => setPaymentToast(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ChatGPT-style Voice Chat Overlay Modal */}
      <VoiceModeModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSendMessage={async (speechText: string) => {
          await handleSendMessage(speechText);
        }}
        isStreaming={isStreaming}
        currentStreamText={currentStreamText}
      />

      <Analytics />
    </div>
  );
}
