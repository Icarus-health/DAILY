import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, Check, Plus, Trash2, Sparkles, 
  MapPin, Cloud, ArrowRight, Volume2, X, Headphones, RefreshCw, 
  Settings, LogIn, LogOut, CheckSquare, Square, Mail, Calendar as CalendarIcon, 
  Info, Sparkle, AlertTriangle, Eye, ArrowLeft, Mic, MicOff, Sliders, ChevronRight,
  Newspaper, SkipBack, SkipForward, Smartphone, MoreVertical, Heart, Share2, Download,
  FileText, PenTool
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { 
  loginWithGoogle, 
  logoutUser, 
  setupAuthListener, 
  fetchSettings, 
  saveSettings, 
  fetchDailyBriefs, 
  saveDailyBrief, 
  fetchTasks, 
  saveTask, 
  deleteTask, 
  isRealFirebase,
  testFirestoreConnection,
  UserSettings,
  DailyBrief,
  DbTask,
  getGoogleAccessToken,
  setGoogleAccessToken
} from "./services/firebase";

import { 
  generateBriefingOnServer, 
  generateBriefingAudio,
  fetchGoogleCalendarEvents,
  fetchGoogleGmailEmails,
  fetchGoogleTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  deleteGoogleTask,
  GoogleTask
} from "./services/api";
import AudioVisualizer from "./components/AudioVisualizer";
import PodcastCreator from "./components/PodcastCreator";

const HummingbirdLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Fine branding ring accent in background */}
    <circle cx="50" cy="50" r="45" stroke="url(#goldGrad)" strokeWidth="0.75" opacity="0.3" />
    <circle cx="50" cy="50" r="41" stroke="url(#greenGrad)" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.2" />

    {/* Long, needle-thin elegant beak */}
    <path d="M59,43 L83,26" stroke="url(#goldGrad)" strokeWidth="1.5" strokeLinecap="round" />

    {/* Elegant streamline silhouette of belly/body */}
    <path 
      d="M45,48 C51,42 58,40 60,43 C62,46 60,51 57,56 C53,62 50,72 48,82 C46,72 43,62 45,48 Z" 
      fill="url(#greenGrad)"
      fillOpacity="0.85"
    />

    {/* High-contrast golden breast & tail highlight */}
    <path 
      d="M60,43 C62,46 60,51 57,56 C53,62 50,72 48,82" 
      stroke="url(#goldGrad)" 
      strokeWidth="1.2" 
      strokeLinecap="round" 
    />

    {/* Pure green tiny corporate-style eye */}
    <circle cx="56" cy="45" r="1.2" fill="#1E6B4A" />

    {/* Dynamic sweeping wing (smooth aerodynamic crescent) */}
    <path 
      d="M47,48 C38,36 26,24 12,20 C22,25 32,36 41,47 C43,49 45,50 47,48 Z" 
      fill="url(#goldGrad)" 
    />

    {/* Secondary overlapping offset wing shadow for rich depth */}
    <path 
      d="M49,46 C42,37 32,28 20,24 C28,29 36,38 43,47 C45,49 47,48 49,46 Z" 
      fill="url(#goldGrad)" 
      fillOpacity="0.35" 
    />

    {/* Elegant dual-taper tail streamers */}
    <path 
      d="M48,82 C45,86 42,91 40,95 C41,91 43,86 48,82 Z" 
      fill="url(#goldGrad)" 
    />
    <path 
      d="M48,82 C47,87 45,92 44,96 C45,91 46,86 48,82 Z" 
      fill="url(#greenGrad)" 
    />

    {/* Premium gold starburst element */}
    <path d="M76,46 L76,50 M74,48 L78,48" stroke="url(#goldGrad)" strokeWidth="0.75" opacity="0.7" />

    <defs>
      <linearGradient id="goldGrad" x1="10" y1="10" x2="90" y2="90">
        <stop offset="0%" stopColor="#DFBA6B" />
        <stop offset="50%" stopColor="#C29A3F" />
        <stop offset="100%" stopColor="#8F6B20" />
      </linearGradient>
      
      <linearGradient id="greenGrad" x1="10" y1="10" x2="90" y2="90">
        <stop offset="0%" stopColor="#2D6A4F" />
        <stop offset="50%" stopColor="#1B4332" />
        <stop offset="100%" stopColor="#081C15" />
      </linearGradient>
    </defs>
  </svg>
);

const PREDEFINED_TOPICS = [
  "Digital Health", 
  "AI & Robotics", 
  "Health Policy", 
  "Tech Regulation", 
  "Biotechnology",
  "Medizintechnik",
  "Clinical AI",
  "Startup News"
];

const PRESET_VOICES = [
  { id: "Kore", name: "Kore (Sophisticated Male)" },
  { id: "Zephyr", name: "Zephyr (Airy / Calming)" },
  { id: "Puck", name: "Puck (Energetic / Male)" },
  { id: "Fenrir", name: "Fenrir (Standard / Low)" }
];

const COMPILING_PHASES = [
  "Analysiere Kalender-Einträge auf Relevanz...",
  "Durchsuche Gmail nach dringenden Konversationen...",
  "Frage Echtzeit-Wetterberichte für deinen Wohnort ab...",
  "Synthetisiere ausgewählte News-Themen via Gemini...",
  "Generiere deinen strukturierten Audio-Erzählungsbericht...",
  "Bereite exklusive Executive Highlights vor..."
];

export default function App() {
  // Authentication & Profile States
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDbOnline, setIsDbOnline] = useState(false);

  // Dynamic Layout & System Settings
  const [activeLayout, setActiveLayout] = useState<"apple" | "spotify" | "google">("apple");
  const [auditLogs, setAuditLogs] = useState<Array<{ timestamp: string; note: string; source: string }>>([
    { timestamp: new Date().toLocaleTimeString("de-DE"), note: "Neue Identität 'DAILY.' geladen.", source: "System" }
  ]);
  const handleAddAuditLog = (note: string) => {
    setAuditLogs(prev => [
      { timestamp: new Date().toLocaleTimeString("de-DE"), note, source: "App-Event" },
      ...prev
    ]);
  };

  // App Navigation States
  const [viewTab, setViewTab] = useState<"dashboard" | "news" | "podcast" | "settings">("dashboard");
  const [showDetailBrief, setShowDetailBrief] = useState<DailyBrief | null>(null);

  // Users Configuration State
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Daily Tasks State
  const [todayTasks, setTodayTasks] = useState<DbTask[]>([]);
  const [googleTasks, setGoogleTasks] = useState<GoogleTask[]>([]);
  const [taskSourceTab, setTaskSourceTab] = useState<"local" | "google">("local");
  const [isFetchingGoogleTasks, setIsFetchingGoogleTasks] = useState(false);
  
  // PWA Install Prompt States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [isTaskSaving, setIsTaskSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef("");

  // Syncing States
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  // Briefs & Compilation States
  const [briefsHistory, setBriefsHistory] = useState<DailyBrief[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilingPhaseIdx, setCompilingPhaseIdx] = useState(0);
  const [systemAlert, setSystemAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Audio Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingBriefId, setIsPlayingBriefId] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const [speechRate, setSpeechRate] = useState(1.1);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [playbackCurrentSeconds, setPlaybackCurrentSeconds] = useState<number>(0);
  const [playbackDurationSeconds, setPlaybackDurationSeconds] = useState<number>(0);

  // Audio References
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Onboarding UI state
  const [onboardingStep, setOnboardingStep] = useState<"welcome" | "prefs" | "connections">("welcome");
  const [onboardLocation, setOnboardLocation] = useState("Berlin");
  const [onboardTopics, setOnboardTopics] = useState<string[]>(["Digital Health", "AI & Robotics"]);
  const [connectGoogleCal, setConnectGoogleCal] = useState(true);
  const [connectGmail, setConnectGmail] = useState(true);

  // Dynamic Data Sources Simulator Inputs
  const [customCalendar, setCustomCalendar] = useState<string>(`- 09:30 - 10:00: Status-Review mit dem Entwicklungsteam (Remote)
- 12:00 - 13:00: Mittagessen mit Dr. Becker (Zentrum für digitale Medizin)
- 14:30 - 15:15: Budgetplanung Q3 (Projekt Daily-Rebuild)`);
  const [customEmails, setCustomEmails] = useState<string>(`- Von: Marcus König (mv-koenig@digitalhealth.de) - Betreff: Partnerschaftsvertrag Entwurf V2 - Dringlichkeit: Hoch. Bitte Rückmeldung bis 16:00 Uhr.
- Von: Google Firebase Admin - Betreff: [AISTUDIO-PROJECT] Deployment erfolgreich abgeschlossen - Dringlichkeit: Mittel.
- Von: Newsletter Handelsblatt - Betreff: KI-Offensive in deutschen Mittelstandsunternehmen - Dringlichkeit: Niedrig.`);
  const [customWeather, setCustomWeather] = useState<string>(`Wetter: 18°C, teilweise bewölkt mit leichtem Wind aus Nord-Westen. Luftfeuchtigkeit bei 62%. Wahrscheinlichkeit für Regenschauer am Nachmittag liegt bei 20%. Perfekte Bedingungen für den Arbeitsweg.`);
  const [customESign, setCustomESign] = useState<string>(`- Partnervertrag Entwurf V2 - Ausstehende elektronische Signatur (HR Dept) - Frist: 16:00 Uhr
- Vertraulichkeitsvereinbarung (NDA) - Dr. Becker - Unterschrift ausstehend`);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [customTopicInput, setCustomTopicInput] = useState<string>("");
  const [customSourceInput, setCustomSourceInput] = useState<string>("");

  // Live Google News Feed states
  const [liveNewsFeed, setLiveNewsFeed] = useState<any[]>([]);
  const [isLiveNewsLoading, setIsLiveNewsLoading] = useState<boolean>(false);

  const fetchLiveNewsFeed = async (topicsToSearch: string[], sourcesToSearch: string[]) => {
    setIsLiveNewsLoading(true);
    try {
      const response = await fetch("/api/briefing/bulletins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: topicsToSearch, newsSources: sourcesToSearch })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.feed) {
          setLiveNewsFeed(data.feed);
        }
      } else {
        throw new Error(`Server returned code ${response.status}`);
      }
    } catch (err: any) {
      console.warn("Fehler beim Abrufen des Live-Newsfeeds von der API, lade resilienten lokalen News-Fallback:", err.message || err);
      // Construct rich offline-safe local articles corresponding to selected topics to prevent UI emptiness or unhandled errors
      const fallbackTopic = topicsToSearch?.[0] || "Digital Health";
      setLiveNewsFeed([
        {
          title: `Trendbericht: Strategische Neuerungen im Bereich ${fallbackTopic}`,
          link: "https://news.google.com",
          pubDate: new Date().toISOString(),
          source: "Zentraler Tech-Monitor",
          topic: fallbackTopic
        },
        {
          title: `Experten-Fokus: Warum gelungene Mensch-System-Schnittstellen das Design bestimmen`,
          link: "https://news.google.com",
          pubDate: new Date(Date.now() - 1800000).toISOString(),
          source: "Usability & Cognition Lab",
          topic: fallbackTopic
        },
        {
          title: `Bericht zur Jahrestagung: Zukünftige Synergien & disruptive Softwarearchitektur`,
          link: "https://news.google.com",
          pubDate: new Date(Date.now() - 7200000).toISOString(),
          source: "Branchen-Insider",
          topic: fallbackTopic
        }
      ]);
    } finally {
      setIsLiveNewsLoading(false);
    }
  };

  // Live Podcast Studio states
  const [podcastQuery, setPodcastQuery] = useState<string>("");
  const [generatedPodcast, setGeneratedPodcast] = useState<any | null>(null);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState<boolean>(false);
  const [activePodcastSegmentIdx, setActivePodcastSegmentIdx] = useState<number>(0);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState<boolean>(false);
  const [podcastPlaybackLineIdx, setPodcastPlaybackLineIdx] = useState<number>(-1);

  // Playback function for podcast dialogs
  const getPodcastDialogLines = (spokenText: string) => {
    if (!spokenText) return [];
    return spokenText.split("\n")
      .map((l, index) => {
        const line = l.trim();
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          // Robustly clean speaker names (removing Markdown bold/italic syntax and brackets)
          const rawSpeaker = line.substring(0, colonIdx).replace(/[\*\"'_\[\]]/g, "").trim();
          const rawText = line.substring(colonIdx + 1).replace(/^[\s\"']+|[\s\"']+$/g, "").trim();
          
          let speaker = "Sprecher";
          if (rawSpeaker.toLowerCase().includes("lukas")) {
            speaker = "Lukas";
          } else if (rawSpeaker.toLowerCase().includes("sarah")) {
            speaker = "Sarah";
          } else if (rawSpeaker) {
            // Keep any other speaker name (like "Lukas", "Sarah", or any other personalized host)
            speaker = rawSpeaker;
          }
          return { speaker, text: rawText, original: line, key: index };
        }
        return { speaker: "Sprecher", text: line, original: line, key: index };
      })
      .filter(l => l.text.length > 0);
  };

  const playPodcastLine = (lineIdx: number, lines: any[]) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    if (lineIdx < 0 || lineIdx >= lines.length) {
      setIsPodcastPlaying(false);
      setPodcastPlaybackLineIdx(-1);
      return;
    }

    const currentLine = lines[lineIdx];
    const utterance = new SpeechSynthesisUtterance(currentLine.text);
    
    // Set speech attributes
    utterance.rate = speechRate;
    
    // Voices setting
    const voices = window.speechSynthesis.getVoices();
    const deVoices = voices.filter(v => v.lang.startsWith("de"));
    
    if (deVoices.length > 0) {
      if (currentLine.speaker === "Lukas") {
        utterance.voice = deVoices.find(v => v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("mark")) || deVoices[0];
        utterance.pitch = 0.95;
      } else {
        utterance.voice = deVoices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("katja") || v.name.toLowerCase().includes("hedda")) || deVoices[1] || deVoices[0];
        utterance.pitch = 1.15;
      }
    }

    utterance.onstart = () => {
      setIsPodcastPlaying(true);
      setPodcastPlaybackLineIdx(lineIdx);
    };

    utterance.onend = () => {
      const nextIdx = lineIdx + 1;
      if (nextIdx < lines.length) {
        setPodcastPlaybackLineIdx(nextIdx);
        playPodcastLine(nextIdx, lines);
      } else {
        setIsPodcastPlaying(false);
        setPodcastPlaybackLineIdx(-1);
      }
    };

    utterance.onerror = () => {
      setIsPodcastPlaying(false);
      setPodcastPlaybackLineIdx(-1);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePodcastPlayback = (forceLineIdx?: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isPodcastPlaying && forceLineIdx === undefined) {
      window.speechSynthesis.pause();
      setIsPodcastPlaying(false);
    } else {
      if (window.speechSynthesis.paused && forceLineIdx === undefined) {
        window.speechSynthesis.resume();
        setIsPodcastPlaying(true);
      } else {
        // Start fresh
        const activeSegment = generatedPodcast?.segments?.[activePodcastSegmentIdx];
        if (!activeSegment) return;
        const lines = getPodcastDialogLines(activeSegment.spokenText);
        const targetLineIdx = forceLineIdx !== undefined ? forceLineIdx : (podcastPlaybackLineIdx >= 0 ? podcastPlaybackLineIdx : 0);
        playPodcastLine(targetLineIdx, lines);
      }
    }
  };

  const handleStopPodcastPlayback = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPodcastPlaying(false);
    setPodcastPlaybackLineIdx(-1);
  };

  // 1. Initial Authentication & Firestore Handshake
  useEffect(() => {
    // Audit Firestore connection state
    testFirestoreConnection().then(active => {
      setIsDbOnline(active);
    });

    const unsubscribe = setupAuthListener((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user) {
        // Fetch user preferences and historical briefs
        loadUserData(user.uid);
      }
    });

    return () => {
      unsubscribe();
      cleanupAudio();
    };
  }, []);

  // 1.2 PWA Install event listeners hook
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      triggerAlert("success", "Daily-PWA wurde erfolgreich installiert!");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      triggerAlert("info", "Daily-PWA ist direkt im Browser bereit. Klicke auf deine Adressleiste oder wähle 'App hinzufügen'.");
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        triggerAlert("success", "Vielen Dank für die App-Installation!");
        setDeferredPrompt(null);
      } else {
        triggerAlert("info", "Installation abgelehnt.");
      }
    } catch (err: any) {
      console.error("Installation failure:", err);
      triggerAlert("error", "Konnte Installations-Assistent nicht öffnen.");
    }
  };

  // 1b. Immersive compiling phases cycler
  useEffect(() => {
    let interval: any;
    if (isCompiling) {
      setCompilingPhaseIdx(0);
      interval = setInterval(() => {
        setCompilingPhaseIdx((prev) => (prev + 1) % COMPILING_PHASES.length);
      }, 2500);
    } else {
      setCompilingPhaseIdx(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCompiling]);

  const loadUserData = async (uid: string) => {
    setSettingsLoading(true);
    try {
      // 1. Fetch user parameters
      const userSettings = await fetchSettings(uid);
      setSettings(userSettings);
      if (userSettings.taskSource === "google") {
        setTaskSourceTab("google");
      }
      
      // Load Google News feed based on preferences
      fetchLiveNewsFeed(userSettings.topics, userSettings.newsSources);

      // 2. Fetch today's tasks list
      const todayStr = new Date().toISOString().split('T')[0];
      const tasksList = await fetchTasks(uid, todayStr);
      setTodayTasks(tasksList);

      // 3. Fetch computed list of daily briefings
      const history = await fetchDailyBriefs(uid);
      setBriefsHistory(history);
    } catch (_) {
      triggerAlert("error", "Konnte Profildaten nicht vollständig laden.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const triggerAlert = (type: "success" | "error" | "info", message: string) => {
    setSystemAlert({ type, message });
    setTimeout(() => {
      setSystemAlert(null);
    }, 5000);
  };

  // Google Authentication Trigger
  const handleAuthLogin = async () => {
    try {
      setAuthLoading(true);
      const user = await loginWithGoogle();
      if (user) {
        triggerAlert("success", `${user.displayName ? `Willkommen, ${user.displayName}` : "Erfolgreich eingeloggt!"}`);
        loadUserData(user.uid);
      }
    } catch (err: any) {
      triggerAlert("error", "Authentifizierung fehlgeschlagen: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthLogout = async () => {
    if (window.confirm("Möchten Sie sich wirklich abmelden?")) {
      cleanupAudio();
      await logoutUser();
      setCurrentUser(null);
      setSettings(null);
      setTodayTasks([]);
      setBriefsHistory([]);
      setShowDetailBrief(null);
      setOnboardingStep("welcome");
      triggerAlert("info", "Erfolgreich abgemeldet.");
    }
  };

  // Onboarding settings submit
  const handleOnboardingSubmit = async () => {
    if (!currentUser) return;
    try {
      setSettingsLoading(true);
      const initialSettings: UserSettings = {
        id: currentUser.uid,
        userId: currentUser.uid,
        topics: onboardTopics,
        location: onboardLocation,
        newsSources: [],
        emailProvider: connectGmail ? "gmail" : "internal",
        taskSource: "internal",
        includeCalendar: connectGoogleCal,
        includeEmail: connectGmail,
        includeTasks: true
      };
      await saveSettings(initialSettings);
      setSettings(initialSettings);
      
      // Auto-populate default mock tasks for the user to try
      const todayStr = new Date().toISOString().split('T')[0];
      const initialTasks = [
        { id: `${currentUser.uid}-t1`, userId: currentUser.uid, date: todayStr, title: "Dr. Becker kontaktieren bezüglich digitaler Anbindung", status: "pending" as const, priority: "high" as const },
        { id: `${currentUser.uid}-t2`, userId: currentUser.uid, date: todayStr, title: "Review Entwurf Partnerschaftsvertrag Q3", status: "pending" as const, priority: "medium" as const }
      ];

      for (const t of initialTasks) {
        await saveTask(t);
      }
      setTodayTasks(initialTasks);
      
      // Load Google News feed based on onboarding settings
      fetchLiveNewsFeed(initialSettings.topics, initialSettings.newsSources);

      triggerAlert("success", "Profil-Onboarding erfolgreich abgeschlossen!");
    } catch (e: any) {
      triggerAlert("error", "Onboarding fehlgeschlagen: " + e.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Settings modification updates
  const handleSaveSettingsUpdate = async (updated: UserSettings) => {
    setSettings(updated);
    try {
      await saveSettings(updated);
      triggerAlert("success", "Einstellungen erfolgreich aktualisiert!");
      // Reload Google News live feed using the new settings parameters
      fetchLiveNewsFeed(updated.topics, updated.newsSources);
    } catch (_) {
      triggerAlert("error", "Speichern fehlgeschlagen.");
    }
  };

  // Add custom topics
  const handleAddCustomTopic = () => {
    if (!settings || !customTopicInput.trim()) return;
    const topic = customTopicInput.trim();
    if (!settings.topics.includes(topic)) {
      const updatedTopics = [...settings.topics, topic];
      handleSaveSettingsUpdate({ ...settings, topics: updatedTopics });
    }
    setCustomTopicInput("");
  };

  // Add custom news sources
  const handleAddCustomSource = () => {
    if (!settings || !customSourceInput.trim()) return;
    const source = customSourceInput.trim();
    if (!settings.newsSources.includes(source)) {
      const updatedSources = [...settings.newsSources, source];
      handleSaveSettingsUpdate({ ...settings, newsSources: updatedSources });
    }
    setCustomSourceInput("");
  };

  // Task Management
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentUser) return;

    if (taskSourceTab === "google") {
      await handleCreateGoogleTaskItem(newTaskTitle);
      return;
    }

    setIsTaskSaving(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const item: DbTask = {
      id: `task-${Date.now()}`,
      userId: currentUser.uid,
      date: todayStr,
      title: newTaskTitle.trim(),
      status: "pending",
      priority: newTaskPriority
    };

    try {
      await saveTask(item);
      setTodayTasks(prev => [...prev, item]);
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      triggerAlert("success", "To-do hinzugefügt!");
    } catch (_) {
      triggerAlert("error", "Zufügen fehlgeschlagen.");
    } finally {
      setIsTaskSaving(false);
    }
  };

  // Web Speech API Transcription handler
  const startListening = () => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      triggerAlert("error", "Spracherkennung wird von diesem Browser nicht unterstützt.");
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognitionClass();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "de-DE";

    // Reset reference variables
    latestTranscriptRef.current = "";

    rec.onstart = () => {
      setIsListening(true);
      triggerAlert("info", "Diktat gestartet. Bitte sprich jetzt deine Aufgabe...");
    };

    rec.onresult = (event: any) => {
      let currentResult = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentResult += event.results[i][0].transcript;
      }
      if (currentResult) {
        setNewTaskTitle(currentResult);
        latestTranscriptRef.current = currentResult;
      }
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        triggerAlert("error", "Mikrofon-Zugriff verweigert. Bitte Berechtigungen prüfen.");
      } else {
        triggerAlert("error", "Fehler bei der Spracherkennung.");
      }
    };

    rec.onend = () => {
      setIsListening(false);
      const finalText = latestTranscriptRef.current.trim();
      if (finalText) {
        handleAddSpeechTask(finalText);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleAddSpeechTask = async (titleText: string) => {
    if (!titleText.trim() || !currentUser) return;

    if (taskSourceTab === "google") {
      await handleCreateGoogleTaskItem(titleText);
      return;
    }

    setIsTaskSaving(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const item: DbTask = {
      id: `task-${Date.now()}`,
      userId: currentUser.uid,
      date: todayStr,
      title: titleText.trim(),
      status: "pending",
      priority: "medium"
    };

    try {
      await saveTask(item);
      setTodayTasks(prev => [...prev, item]);
      setNewTaskTitle("");
      triggerAlert("success", `Aufgabe diktiert: "${titleText.trim()}"`);
    } catch (_) {
      triggerAlert("error", "Diktieren fehlgeschlagen.");
    } finally {
      setIsTaskSaving(false);
      latestTranscriptRef.current = "";
    }
  };

  const fetchUserGoogleTasks = async (showLoading = true) => {
    let token = getGoogleAccessToken();
    if (!token) {
      if (isRealFirebase()) {
        try {
          await loginWithGoogle();
          token = getGoogleAccessToken();
        } catch (err: any) {
          console.error("Failed to authenticate to load Google Tasks:", err);
          triggerAlert("error", "Google Tasks Anmeldung fehlgeschlagen.");
          return;
        }
      } else {
        // Safe mock Google tasks for simulation mode
        const mockGTasks: GoogleTask[] = [
          { id: "gt-1", title: "Workspace-Präsentation vorbereiten", status: "needsAction", notes: "Fokus auf neue KI Integrationen" },
          { id: "gt-2", title: "Feedback zu Q2 Berichten abgeben", status: "completed" },
          { id: "gt-3", title: "Daily-Build Pipeline testen", status: "needsAction" }
        ];
        setGoogleTasks(mockGTasks);
        return;
      }
    }

    if (!token) return;

    if (showLoading) setIsFetchingGoogleTasks(true);
    try {
      const list = await fetchGoogleTasks(token);
      setGoogleTasks(list);
    } catch (err: any) {
      console.error("Error fetching Google Tasks:", err);
      triggerAlert("error", "Konnte Google Tasks nicht laden: " + err.message);
    } finally {
      if (showLoading) setIsFetchingGoogleTasks(false);
    }
  };

  const handleCreateGoogleTaskItem = async (titleText: string) => {
    if (!titleText.trim()) return;
    setIsTaskSaving(true);

    let token = getGoogleAccessToken();
    if (!token && isRealFirebase()) {
      try {
        await loginWithGoogle();
        token = getGoogleAccessToken();
      } catch (err) {
        triggerAlert("error", "Google-Verbindung erforderlich.");
        setIsTaskSaving(false);
        return;
      }
    }

    try {
      if (token) {
        const newTask = await createGoogleTask(token, titleText.trim());
        setGoogleTasks(prev => [newTask, ...prev]);
        triggerAlert("success", `Google Task erstellt: "${titleText.trim()}"`);
      } else {
        // Safe Simulation fallback
        const simulated: GoogleTask = {
          id: `gt-sim-${Date.now()}`,
          title: titleText.trim(),
          status: "needsAction"
        };
        setGoogleTasks(prev => [simulated, ...prev]);
        triggerAlert("success", `Simulierter Google Task erstellt: "${titleText.trim()}"`);
      }
      setNewTaskTitle("");
    } catch (err: any) {
      console.error(err);
      triggerAlert("error", "Erstellung fehlgeschlagen: " + err.message);
    } finally {
      setIsTaskSaving(false);
    }
  };

  const handleToggleGoogleTaskStatusItem = async (task: GoogleTask) => {
    const isCompletedNow = task.status === "needsAction";
    
    // Optimistic state update
    setGoogleTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      status: isCompletedNow ? "completed" as const : "needsAction" as const 
    } : t));

    let token = getGoogleAccessToken();
    if (!token && isRealFirebase()) {
      try {
        await loginWithGoogle();
        token = getGoogleAccessToken();
      } catch (err) {
        triggerAlert("error", "Authentifizierung fehlgeschlagen.");
        fetchUserGoogleTasks(false);
        return;
      }
    }

    try {
      if (token) {
        await updateGoogleTaskStatus(token, task.id, isCompletedNow);
        triggerAlert("success", isCompletedNow ? "Aufgabe als erledigt markiert (Google Tasks)" : "Aufgabe als offen markiert (Google Tasks)");
      } else {
        triggerAlert("success", "Simulierter Google-Task Status aktualisiert.");
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert("error", "Statusaktualisierung fehlgeschlagen.");
      fetchUserGoogleTasks(false);
    }
  };

  const handleDeleteGoogleTaskItem = async (task: GoogleTask) => {
    const confirmed = window.confirm(
      `Möchtest du die Aufgabe "${task.title}" wirklich aus deinen Google Tasks löschen?`
    );
    if (!confirmed) return;

    // Optimistic state update
    setGoogleTasks(prev => prev.filter(t => t.id !== task.id));

    let token = getGoogleAccessToken();
    if (!token && isRealFirebase()) {
      try {
        await loginWithGoogle();
        token = getGoogleAccessToken();
      } catch (err) {
        triggerAlert("error", "Authentifizierung fehlgeschlagen.");
        fetchUserGoogleTasks(false);
        return;
      }
    }

    try {
      if (token) {
        await deleteGoogleTask(token, task.id);
        triggerAlert("success", "Google-Task erfolgreich gelöscht.");
      } else {
        triggerAlert("success", "Simulierter Google-Task entfernt.");
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert("error", "Löschen fehlgeschlagen.");
      fetchUserGoogleTasks(false);
    }
  };

  const handleToggleTaskStatus = async (task: DbTask) => {
    const updated: DbTask = {
      ...task,
      status: task.status === "completed" ? "pending" : "completed"
    };
    try {
      setTodayTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      await saveTask(updated);
    } catch (_) {
      triggerAlert("error", "Update fehlgeschlagen.");
    }
  };

  const handleDeleteTaskItem = async (task: DbTask) => {
    try {
      setTodayTasks(prev => prev.filter(t => t.id !== task.id));
      await deleteTask(task.id, task.userId, task.date);
      triggerAlert("info", "To-do entfernt.");
    } catch (_) {
      triggerAlert("error", "Löschen fehlgeschlagen.");
    }
  };

  // -----------------------------------------------------------
  // DATA DATA SOURCES SYNC (LIVE WORKSPACE GOOGLE API & SIMULATOR)
  // -----------------------------------------------------------
  const handleSyncDataSources = async () => {
    setIsSyncing(true);
    
    // Check if we can do real OAuth Google Workspace Syncing
    if (isRealFirebase()) {
      triggerAlert("info", "Kontaktiere Google Workspace API...");
      
      let token = getGoogleAccessToken();
      
      if (!token) {
        try {
          triggerAlert("info", "Führe Google-Authentifizierung durch, um Kalender & Gmail zu synchronisieren...");
          await loginWithGoogle();
          token = getGoogleAccessToken();
        } catch (authErr: any) {
          console.error("Popup Auth error during Sync Now:", authErr);
          triggerAlert("error", "Google Workspace Verbindung fehlgeschlagen: " + (authErr.message || "Verbindung abgebrochen"));
          setIsSyncing(false);
          return;
        }
      }

      if (!token) {
        triggerAlert("error", "Kein gültiges Google-Zugriffstoken verfügbar.");
        setIsSyncing(false);
        return;
      }

      try {
        triggerAlert("info", "Synchronisiere Live-Kalender, E-Mails und Google Tasks...");
        
        const [calendarResult, emailResult, tasksResult] = await Promise.all([
          fetchGoogleCalendarEvents(token),
          fetchGoogleGmailEmails(token),
          fetchGoogleTasks(token).catch(err => {
            console.error("Failed to query Google Tasks API inside Sync:", err);
            return [];
          })
        ]);
        
        setCustomCalendar(calendarResult);
        setCustomEmails(emailResult);
        setGoogleTasks(tasksResult);

        // Auto-extract contracts or NDAs mentioned in real Emails, or pull premium simulated eSign documents automatically
        let extractedEsign = "";
        const emailLines = emailResult.split("\n");
        const contractEmails = emailLines.filter(line => 
          line.toLowerCase().includes("vertrag") || 
          line.toLowerCase().includes("contract") || 
          line.toLowerCase().includes("nda") || 
          line.toLowerCase().includes("freigabe") || 
          line.toLowerCase().includes("sign") ||
          line.toLowerCase().includes("unterschrift")
        );
        
        if (contractEmails.length > 0) {
          extractedEsign = contractEmails.map(line => `- [Gmail Fund] ${line.replace("- Von: ", "").replace("- Betreff: ", " - ")}`).join("\n");
        } else {
          extractedEsign = `- Partnervertrag Entwurf V2 - Ausstehende elektronische Signatur (HR Dept) - Frist: 16:00 Uhr
- Vertraulichkeitsvereinbarung (NDA) - Dr. Becker - Unterschrift ausstehend`;
        }
        setCustomESign(extractedEsign);
        
        const now = new Date();
        const timeString = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastSyncTime(timeString);
        
        triggerAlert("success", `Google Workspace synchronisiert um ${timeString}! Echte E-Mails, Kalendertermine, Google Tasks und Verträge wurden geladen.`);
      } catch (apiErr: any) {
        console.error("Failed to query Workspace APIs:", apiErr);
        triggerAlert("error", "Fehler beim API-Abgleich: " + (apiErr.message || "Unbekannter Fehler"));
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Offline/Sandbox Mode Simulation Logic
      triggerAlert("info", "Lese demo-simulierte Konnektoren...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const alternativeCalendars = [
        `- 09:30 - 10:00: Status-Review mit dem Entwicklungsteam (Remote)
- 12:00 - 13:00: Mittagessen mit Dr. Becker (Zentrum für digitale Medizin)
- 14:30 - 15:15: Budgetplanung Q3 (Projekt Daily-Rebuild)`,
        `- 08:30 - 09:00: Daily Standup & Scrum Review
- 11:00 - 11:30: Briefing mit der Geschäftsführung (Investoren-Update)
- 15:00 - 16:35: Deep-Work Session & Architektur-Review`,
        `- 10:00 - 11:00: Kick-off Meeting zur Daily Mobile-App Integration
- 13:05 - 14:05: Webinar: Zukünftige KI-Regulierungen in der EU
- 16:00 - 17:00: 1-on-1 Feedbackgespräch mit Sarah (Lead Designer)`
      ];

      const alternativeEmails = [
        `- Von: Marcus König (mv-koenig@digitalhealth.de) - Betreff: Partnerschaftsvertrag Entwurf V2 - Dringlichkeit: Hoch. Bitte Rückmeldung bis 16:00 Uhr.
- Von: Google Firebase Admin - Betreff: [AISTUDIO-PROJECT] Deployment erfolgreich abgeschlossen - Dringlichkeit: Mittel.
- Von: Newsletter Handelsblatt - Betreff: KI-Offensive in deutschen Mittelstandsunternehmen - Dringlichkeit: Niedrig.`,
        `- Von: Dr. Becker (becker@digitale-medizin.de) - Betreff: Follow-up zu unserer Forschungsinitiative - Dringlichkeit: Hoch.
- Von: GitHub Notifications - Betreff: [PR #418] Fehlerhafte CI-Pipeline behoben - Dringlichkeit: Mittel.
- Von: Slack Alerts - Betreff: Neue Erwähnungen im Channel #daily-dev - Dringlichkeit: Niedrig.`,
        `- Von: Finanzen & Controlling - Betreff: Freigabe der Q2 Rechnungen & Reisekosten - Dringlichkeit: Mittel.
- Von: Sarah Lindner (s.lindner@daily.com) - Betreff: Review der neuen Design-Spezifikationen - Dringlichkeit: Hoch.
- Von: Amazon Web Services - Betreff: Monatlicher Nutzungsbericht & Kostenoptimierung - Dringlichkeit: Niedrig.`
      ];

      const alternativeWeathers = [
        `Wetter: 18°C, teilweise bewölkt mit leichtem Wind aus Nord-Westen. Luftfeuchtigkeit bei 62%. Wahrscheinlichkeit für Regenschauer am Nachmittag liegt bei 20%. Perfekte Bedingungen für den Arbeitsweg.`,
        `Wetter: 21°C, herrlicher Sonnenschein mit wolkenlosem Himmel. Wind weht mild aus Süd-Osten. Ideal für Aktivitäten im Freien oder das Mittagessen draußen.`,
        `Wetter: 15°C, bedeckt mit zeitweisem Nieselregen am Vormittag. Windböen am Nachmittag möglich. Vergiss deinen Regenschirm heute nicht!`
      ];

      const alternativeESigns = [
        `- Partnervertrag Entwurf V2 - Ausstehende elektronische Signatur (HR Dept) - Frist: 16:00 Uhr
- Vertraulichkeitsvereinbarung (NDA) - Dr. Becker - Unterschrift ausstehend`,
        `- NDA Vertraulichkeitsvereinbarung - Investor Pitch - Bereit für Freigabe
- Mietvertrag Gewerbeobjekt Hauptstraße - Unterschrift ausstehend - Dringend`,
        `- Auftragsverarbeitungsvertrag (AVV) v3 - eSign System - Unterschrieben
- Beratervertrag Entwurf v1 - Marcus König - Freigabe ausstehend`
      ];

      const mockGTasks: GoogleTask[] = [
        { id: "gt-1", title: "Workspace-Präsentation vorbereiten", status: "needsAction" },
        { id: "gt-2", title: "Feedback zu Q2 Berichten abgeben", status: "completed" },
        { id: "gt-3", title: "Daily-Build Pipeline testen", status: "needsAction" }
      ];

      const randomIdx = Math.floor(Math.random() * 3);
      setCustomCalendar(alternativeCalendars[randomIdx]);
      setCustomEmails(alternativeEmails[randomIdx]);
      setCustomWeather(alternativeWeathers[randomIdx]);
      setCustomESign(alternativeESigns[randomIdx]);
      setGoogleTasks(mockGTasks);

      const now = new Date();
      const timeString = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSyncTime(timeString);
      setIsSyncing(false);
      triggerAlert("success", `Demodaten erfolgreich abgeglichen um ${timeString}!`);
    }
  };

  // -----------------------------------------------------------
  // AI COMPILE ROUTINE (GEMINI CONSOLIDATION PROCESS)
  // -----------------------------------------------------------
  const handleCompileDailyBrief = async () => {
    if (!currentUser || !settings) return;
    setIsCompiling(true);
    cleanupAudio();
    setIsPlaying(false);
    setIsPlayingBriefId(null);

    const todayStr = new Date().toISOString().split('T')[0];
    triggerAlert("info", "Verarbeite Kalender, News, E-Mails und Wetter via Gemini...");

    try {
      let currentCalendarData = customCalendar;
      let currentEmailsData = customEmails;
      let currentGoogleTasks = googleTasks;
      let currentESignData = customESign;

      const token = getGoogleAccessToken();
      if (token) {
        try {
          triggerAlert("info", "Rufe Live-Daten aus deinem Google Workspace ab...");
          const [calendarResult, emailResult, tasksResult] = await Promise.all([
            fetchGoogleCalendarEvents(token),
            fetchGoogleGmailEmails(token),
            fetchGoogleTasks(token).catch(err => {
              console.warn("Google Tasks failed, returning empty", err);
              return [];
            })
          ]);
          
          currentCalendarData = calendarResult || customCalendar;
          currentEmailsData = emailResult || customEmails;
          currentGoogleTasks = tasksResult || googleTasks;
          
          setCustomCalendar(currentCalendarData);
          setCustomEmails(currentEmailsData);
          setGoogleTasks(currentGoogleTasks);

          // Auto-extract eSign from real emails
          const emailLines = currentEmailsData.split("\n");
          const contractEmails = emailLines.filter(line => 
            line.toLowerCase().includes("vertrag") || 
            line.toLowerCase().includes("contract") || 
            line.toLowerCase().includes("nda") || 
            line.toLowerCase().includes("freigabe") || 
            line.toLowerCase().includes("sign") ||
            line.toLowerCase().includes("unterschrift")
          );
          
          if (contractEmails.length > 0) {
            currentESignData = contractEmails.map(line => `- [Gmail Live] ${line.replace("- Von: ", "").replace("- Betreff: ", " - ")}`).join("\n");
            setCustomESign(currentESignData);
          } else {
            currentESignData = "Keine ausstehenden Verträge in deinen aktuellen E-Mails gefunden.";
            setCustomESign(currentESignData);
          }
        } catch (apiErr) {
          console.error("Failed to query Workspace APIs pre-compile:", apiErr);
          triggerAlert("warning", "Fehler beim Live-Abruf, verwende Simulator/Cache Daten.");
        }
      }

      const activeTasks = todayTasks.filter(t => t.status === "pending");
      const activeGoogleTasksMapped: DbTask[] = currentGoogleTasks
        .filter(gt => gt.status === "needsAction")
        .map(gt => ({
          id: gt.id,
          userId: currentUser.uid,
          date: todayStr,
          title: `[Google Tasks] ${gt.title}`,
          status: "pending",
          priority: "medium"
        }));
      
      const combinedActiveTasks = [...activeTasks, ...activeGoogleTasksMapped];

      const computedResult = await generateBriefingOnServer(
        currentUser.uid,
        todayStr,
        settings,
        combinedActiveTasks,
        currentCalendarData,
        currentEmailsData,
        undefined, // customNews (will scan predefined topics dynamically)
        customWeather,
        currentESignData
      );

      const computedBrief: DailyBrief = {
        id: `brief-${currentUser.uid}-${todayStr}`,
        userId: currentUser.uid,
        date: todayStr,
        text: computedResult.narrativeText,
        briefingTitle: computedResult.briefingTitle || "Dein Morgenbericht",
        summaryBullets: computedResult.summaryBullets,
        hasAudio: false,
        weatherContent: computedResult.weatherContent,
        newsContent: computedResult.newsContent,
        calendarContent: computedResult.calendarContent,
        emailsContent: computedResult.emailsContent,
        tasksContent: computedResult.tasksContent,
        esignContent: computedResult.esignContent
      };

      // Store generated briefing to Firestore & State
      await saveDailyBrief(computedBrief);
      setBriefsHistory(prev => {
        const filtered = prev.filter(b => b.id !== computedBrief.id);
        return [computedBrief, ...filtered];
      });

      triggerAlert("success", "Dein Daily Briefing für heute wurde generiert!");
      setShowDetailBrief(computedBrief);
    } catch (e: any) {
      console.error(e);
      triggerAlert("error", `Generierung fehlgeschlagen: ${e.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // -----------------------------------------------------------
  // AUDIO CONTROLLER & TEXT-TO-SPEECH (TTS ENGINE)
  // -----------------------------------------------------------
  const cleanupAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaybackProgress(0);
    setPlaybackCurrentSeconds(0);
    setPlaybackDurationSeconds(0);
  };

  const handleToggleAudioPlayback = async (brief: DailyBrief) => {
    if (isPlaying && isPlayingBriefId === brief.id) {
      // Pause
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
      return;
    }

    // Checking if we are continuing a paused instance of the same audio
    if (isPlayingBriefId === brief.id) {
      if (currentAudioRef.current) {
        currentAudioRef.current.play();
        setIsPlaying(true);
        return;
      }
      if (window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
        return;
      }
    }

    // Starting new playback sequence
    cleanupAudio();
    setIsPlayingBriefId(brief.id);

    // Scenario A: Check if brief already has compiled audioUrl/base64 cache
    if (brief.audioUrl) {
      playAudioUri(brief.audioUrl, brief.id);
      return;
    }

    // Scenario B: Query Gemini TTS backend dynamically
    triggerAlert("info", "Generiere Stimmsynthese (TTS) über Gemini...");
    setIsAudioLoading(true);

    try {
      const base64Audio = await generateBriefingAudio(brief.text, selectedVoice);
      const audioUri = `data:audio/mp3;base64,${base64Audio}`;
      
      // Cache base64 inside client history
      brief.audioUrl = audioUri;
      brief.hasAudio = true;
      await saveDailyBrief(brief);

      playAudioUri(audioUri, brief.id);
    } catch (err) {
      console.warn("Gemini Server TTS offline or quota hit. Falling back to native browser speech synthesis.", err);
      playLocalSpeechSynthesisFallback(brief.text, brief.id);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const playAudioUri = (uri: string, briefId: string) => {
    try {
      const audio = new Audio(uri);
      currentAudioRef.current = audio;
      audio.playbackRate = speechRate;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        setIsPlayingBriefId(null);
        setPlaybackProgress(0);
        setPlaybackCurrentSeconds(0);
        triggerAlert("success", "Briefing fertig angehört.");
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        // Fallback to local
        playLocalSpeechSynthesisFallback(showDetailBrief?.text || "", briefId);
      };

      // Realtime Audio Progress Listeners
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackCurrentSeconds(audio.currentTime);
          setPlaybackProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onloadedmetadata = () => {
        if (audio.duration) {
          setPlaybackDurationSeconds(audio.duration);
        }
      };

      audio.ondurationchange = () => {
        if (audio.duration) {
          setPlaybackDurationSeconds(audio.duration);
        }
      };

      audio.play();
    } catch (e) {
      console.error("Failed to run audio Uri:", e);
      playLocalSpeechSynthesisFallback(showDetailBrief?.text || "", briefId);
    }
  };

  const playLocalSpeechSynthesisFallback = (text: string, briefId: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      triggerAlert("error", "Echtzeit-Sprachausgabe wird in diesem Browser nicht unterstützt.");
      return;
    }

    window.speechSynthesis.cancel();
    
    // Clean string from markdown elements before speak
    const cleanText = text.replace(/[#*`\-_[\]()]/g, " ");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    
    // Set speech variables
    utterance.rate = speechRate;
    
    // Try forcing German native voice since text is localized
    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find(v => v.lang.startsWith("de")) || voices.find(v => v.lang.startsWith("en"));
    if (deVoice) {
      utterance.voice = deVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPlayingBriefId(briefId);
      setPlaybackDurationSeconds(Math.round(cleanText.length / 15));
    };

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const charIdx = event.charIndex;
        const totalLen = cleanText.length;
        setPlaybackCurrentSeconds(Math.round(charIdx / 15));
        setPlaybackProgress((charIdx / (totalLen || 1)) * 100);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPlayingBriefId(null);
      setPlaybackProgress(0);
      setPlaybackCurrentSeconds(0);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPlayingBriefId(null);
      setPlaybackProgress(0);
      setPlaybackCurrentSeconds(0);
    };

    window.speechSynthesis.speak(utterance);
    triggerAlert("info", "Verwende Offline-Gerätestimme für Vorlesen.");
  };

  const handleStopAudioReset = () => {
    cleanupAudio();
    setIsPlaying(false);
    setIsPlayingBriefId(null);
    triggerAlert("info", "Sprachausgabe abgebrochen.");
  };

  const handleSeek = (percentValue: number) => {
    if (currentAudioRef.current) {
      const duration = currentAudioRef.current.duration;
      if (duration) {
        const newTime = (percentValue / 100) * duration;
        currentAudioRef.current.currentTime = newTime;
        setPlaybackCurrentSeconds(newTime);
        setPlaybackProgress(percentValue);
      }
    } else if (isPlayingBriefId && utteranceRef.current) {
      triggerAlert("info", "Spulen ist im Offline-Fallback-Modid nicht verfügbar.");
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Helper date formatters
  const formatDateGerman = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Heute";
    return d.toLocaleDateString("de-DE", { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getDayShort = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "HEU";
    return d.toLocaleDateString("de-DE", { weekday: 'short' }).toUpperCase();
  };

  const getDayNumber = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "01";
    return d.getDate();
  };

  const renderMarkdownToHtml = (md?: string) => {
    if (!md) return "";
    let html = md;
    
    // Clean escape entities
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Header tags
    html = html.replace(/^### (.*$)/gim, '<h5 class="font-display font-medium text-black/85 text-xs uppercase tracking-wider mt-4 mb-1.5">$1</h5>');
    html = html.replace(/^## (.*$)/gim, '<h5 class="font-display font-bold text-black text-sm mt-4.5 mb-2">$1</h5>');
    html = html.replace(/^# (.*$)/gim, '<h4 class="font-serif font-black text-black text-base mt-5 mb-2">$1</h4>');
    
    // Strong tags
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-neutral-900">$1</strong>');
    
    // Italic tags
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-neutral-600 font-medium">$1</em>');
    
    // List bullet points with individual items in lists
    html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li class="ml-3.5 pl-1 list-disc text-neutral-600 leading-relaxed mb-1 hover:text-black transition-colors">$1</li>');
    
    // Newline splits
    html = html.replace(/\n/g, '<br />');
    
    return html;
  };

  // Onboarding screens selectors
  const handleToggleOnboardTopic = (topic: string) => {
    setOnboardTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const mainBgClass = activeLayout === "spotify"
    ? "min-h-screen bg-[#09090b] text-neutral-200 font-sans overflow-x-hidden relative flex flex-col selection:bg-emerald-500/20 transition-all duration-300"
    : activeLayout === "google"
      ? "min-h-screen bg-[#F1F3F4] text-neutral-800 font-sans overflow-x-hidden relative flex flex-col selection:bg-sky-200 transition-all duration-300"
      : "min-h-screen bg-[#FAF9F6] text-[#1D1C1A] font-sans overflow-x-hidden relative flex flex-col selection:bg-neutral-200 transition-all duration-300";

  const headerBgClass = activeLayout === "spotify"
    ? "border-b border-neutral-800/80 bg-[#121215]/95 sticky top-0 z-30 px-6 py-3 md:py-3.5 flex items-center justify-between backdrop-blur-md transition-all duration-305 text-white"
    : activeLayout === "google"
      ? "border-b border-neutral-200 bg-white sticky top-0 z-30 px-6 py-3 md:py-3.5 flex items-center justify-between transition-all duration-305 text-neutral-800"
      : "border-b border-neutral-200/40 bg-[#FAF9F6]/85 sticky top-0 z-30 px-6 py-3 md:py-3.5 flex items-center justify-between backdrop-blur-md transition-all duration-305 text-neutral-900";

  const navTextClass = (isActive: boolean) => {
    if (activeLayout === "spotify") {
      return isActive ? "text-[#10b981]" : "text-neutral-400 hover:text-white";
    }
    if (activeLayout === "google") {
      return isActive ? "text-sky-600" : "text-neutral-550 hover:text-neutral-900";
    }
    return isActive ? "text-neutral-950" : "text-neutral-450 hover:text-neutral-950";
  };

  const underlineColor = activeLayout === "spotify" ? "bg-[#10b981]" : activeLayout === "google" ? "bg-sky-600" : "bg-neutral-950";

  return (
    <div className={mainBgClass}>
      {activeLayout === "spotify" && (
        <style dangerouslySetInnerHTML={{ __html: `
          /* Spotify Skin Overrides */
          body {
            background-color: #09090b !important;
            color: #e4e4e7 !important;
          }
          .min-h-screen {
            background-color: #09090b !important;
          }
          .bg-white {
            background-color: #121215 !important;
            color: #e4e4e7 !important;
            border-color: #27272a !important;
          }
          .text-black, .text-neutral-905, .text-neutral-900, .text-neutral-950, .text-[#1D1C1A] {
            color: #ffffff !important;
          }
          .text-neutral-850, .text-neutral-800, .text-neutral-700, .text-neutral-600, .text-[#5C5A52] {
            color: #a1a1aa !important;
          }
          .border-neutral-200, .border-neutral-250, .border-neutral-300, .border-neutral-205, .border-neutral-100 {
            border-color: #1f1f23 !important;
          }
          .bg-[#FAF9F6], .bg-[#FAF9F5], .bg-[#F9F9F8], .bg-neutral-50, .bg-neutral-100 {
            background-color: #18181c !important;
            color: #e4e4e7 !important;
            border-color: #27272a !important;
          }
          /* Override black brand knobs with Spotify Green */
          .bg-black {
            background-color: #10b981 !important;
            color: #000000 !important;
            font-weight: 800 !important;
          }
          .border-black {
            border-color: #10b981 !important;
          }
          .hover\\:bg-neutral-900:hover, .hover\\:bg-black:hover, .hover\\:bg-neutral-800:hover {
            background-color: #059669 !important;
            color: #000000 !important;
          }
          option {
            background-color: #121215 !important;
            color: #ffffff !important;
          }
        `}} />
      )}
      {activeLayout === "google" && (
        <style dangerouslySetInnerHTML={{ __html: `
          /* Google Material Bento Skin Overrides */
          .bg-white {
            background-color: #ffffff !important;
            border-radius: 8px !important;
            border-color: #dadce0 !important;
            box-shadow: none !important;
          }
          .rounded-2xl, .rounded-3xl {
            border-radius: 8px !important;
          }
          .bg-black {
            background-color: #0284c7 !important;
            color: #ffffff !important;
          }
          .border-black {
            border-color: #0284c7 !important;
          }
          .hover\\:bg-neutral-900:hover, .hover\\:bg-black:hover, .hover\\:bg-neutral-800:hover {
            background-color: #0369a1 !important;
            color: #ffffff !important;
          }
        `}} />
      )}
      
      {/* 1. MAIN HEADER CONTAINER */}
      <header className={headerBgClass}>
        <div className="flex items-center gap-2.5">
          <HummingbirdLogo className="h-8 w-8 md:h-9 md:w-9 select-none shrink-0" />
          <div className="flex flex-col text-left">
            <h1 className={`font-sans font-black text-lg md:text-xl tracking-[0.2em] leading-none select-none uppercase transition-colors duration-300 flex items-center ${
              activeLayout === "spotify" ? "text-white" : "text-neutral-950"
            }`}>
              DAILY<span className="text-[#1E6B4A] font-light">.</span>
            </h1>
            <span className="text-[8px] font-mono tracking-widest text-neutral-400 uppercase leading-none mt-0.5 font-bold">make it simple</span>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3 md:gap-5">
            {/* Desktop Navigation Link Deck */}
            <nav className="hidden md:flex items-center gap-5">
              <button 
                onClick={() => { setViewTab("dashboard"); setShowDetailBrief(null); }}
                className={`px-1 py-1 text-xs font-mono font-bold tracking-widest uppercase transition cursor-pointer relative ${navTextClass(viewTab === "dashboard" && !showDetailBrief)}`}
              >
                Briefings
                {viewTab === "dashboard" && !showDetailBrief && (
                  <motion.div layoutId="nav-underline" className={`absolute left-0 right-0 bottom-[-15px] h-[2px] ${underlineColor}`} />
                )}
              </button>
              
              <button 
                onClick={() => { setViewTab("news"); setShowDetailBrief(null); }}
                className={`px-1 py-1 text-xs font-mono font-bold tracking-widest uppercase transition flex items-center gap-1.5 cursor-pointer relative ${navTextClass(viewTab === "news")}`}
              >
                <Newspaper className="h-3 w-3" /> News
                {viewTab === "news" && (
                  <motion.div layoutId="nav-underline" className={`absolute left-0 right-0 bottom-[-15px] h-[2px] ${underlineColor}`} />
                )}
              </button>

              <button 
                onClick={() => { setViewTab("podcast"); setShowDetailBrief(null); }}
                className={`px-1 py-1 text-xs font-mono font-bold tracking-widest uppercase transition flex items-center gap-1.5 cursor-pointer relative ${navTextClass(viewTab === "podcast")}`}
              >
                <Mic className="h-3 w-3" /> Podcast-Studio
                {viewTab === "podcast" && (
                  <motion.div layoutId="nav-underline" className={`absolute left-0 right-0 bottom-[-15px] h-[2px] ${underlineColor}`} />
                )}
              </button>
              
              <button 
                onClick={() => setViewTab("settings")}
                className={`px-1 py-1 text-xs font-mono font-bold tracking-widest uppercase transition flex items-center gap-1.5 cursor-pointer relative ${navTextClass(viewTab === "settings")}`}
              >
                <Settings className="h-3 w-3" /> Einstellungen
                {viewTab === "settings" && (
                  <motion.div layoutId="nav-underline" className={`absolute left-0 right-0 bottom-[-15px] h-[2px] ${underlineColor}`} />
                )}
              </button>
            </nav>
            
            <div className="h-5 w-[1px] hidden md:block bg-neutral-200/50" />

            <div className="flex items-center gap-2">
              <img 
                src={currentUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&q=80"} 
                className="h-7 w-7 rounded-full border border-neutral-200/80 object-cover mt-0.5" 
                alt="Profile"
              />
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className={`text-xs font-semibold ${activeLayout === "spotify" ? "text-neutral-200" : "text-neutral-850"}`}>{currentUser.displayName || "Nutzer"}</span>
                <span className="text-[9px] font-mono text-neutral-400 mt-0.5">{currentUser.email || "SrKube@gmail.com"}</span>
              </div>
            </div>

            <button 
              onClick={handleAuthLogout}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                activeLayout === "spotify" ? "text-neutral-400 hover:text-white" : "text-neutral-450 hover:text-neutral-900"
              }`}
              title="Abmelden"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* 3. FLOATING SYSTEM MESSAGES & ALERTS */}
      <AnimatePresence>
        {systemAlert && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-6 left-6 z-50 p-3.5 rounded-xl border border-neutral-200/50 bg-[#FAF9F6]/95 backdrop-blur-md text-xs shadow-md flex items-center gap-3 max-w-sm"
          >
            <div className={`h-2 w-2 rounded-full shrink-0 ${
              systemAlert.type === "success" 
                ? "bg-emerald-500 animate-pulse"
                : systemAlert.type === "error"
                  ? "bg-rose-500 animate-pulse"
                  : "bg-neutral-500"
            }`} />
            <div className="flex flex-col text-left">
              <p className="font-sans font-medium text-neutral-800 leading-snug">{systemAlert.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. WORKSPACE ROOT INTERFACES */}
      <main className="flex-1 w-full flex flex-col">
        {!currentUser ? (
          
          /* ========================================================= */
          /* ONBOARDING FLOW & GOOGLE SIGN-IN SPLASH                   */
          /* ========================================================= */
          <div className="flex-1 max-w-lg w-full mx-auto px-6 py-12 flex flex-col justify-center gap-8">
            <div className="text-center flex flex-col items-center gap-3 animate-fade-in">
              <div className="mb-2">
                <HummingbirdLogo className="h-16 w-16" />
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <h2 className="font-sans font-black text-4xl tracking-[0.2em] text-neutral-950 uppercase mb-1 flex items-center justify-center">
                  DAILY<span className="text-[#1E6B4A] font-light">.</span>
                </h2>
                <h3 className="font-serif italic font-medium text-lg text-neutral-600 tracking-tight">Dein Tag. Auf den Punkt.</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed mt-2">
                  Daily Brief fasst Nachrichten, Wetter, Termine, E-Mails und To-dos jeden Morgen elegant für dich zusammen.
                </p>
              </div>
            </div>

            {/* VISUAL COMPASS STEP TRAIL (WHEN GATED PROGRESS IS ACTIVE) */}
            {onboardingStep !== "welcome" && (
              <div className="flex items-center justify-center gap-8 py-1.5">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${onboardingStep === "prefs" ? "bg-black" : "bg-neutral-300"}`} />
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${onboardingStep === "prefs" ? "text-black font-extrabold" : "text-neutral-400"}`}>Präferenzen</span>
                </div>
                <div className="h-[1px] w-6 bg-neutral-200" />
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${onboardingStep === "connections" ? "bg-black" : "bg-neutral-300"}`} />
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${onboardingStep === "connections" ? "text-black font-extrabold" : "text-neutral-400"}`}>Kanäle</span>
                </div>
              </div>
            )}

            {onboardingStep === "welcome" && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 md:p-8 border border-neutral-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-4 text-center">
                  <h3 className="font-serif text-lg font-medium text-neutral-950">Willkommen bei Daily</h3>
                  <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider">Morgendliche Intelligenz</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button 
                    onClick={handleAuthLogin}
                    disabled={authLoading}
                    className="w-full py-3 px-4 bg-neutral-950 hover:bg-neutral-900 text-white font-mono font-bold text-xs uppercase rounded-xl tracking-wider flex items-center justify-center gap-2.5 transition duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    {authLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-4 w-4 bg-white p-0.5 rounded-full" alt="Google" />
                    )}
                    <span>Mit Google anmelden</span>
                  </button>

                  <button
                    onClick={() => {
                      const simulatedUser = {
                        uid: "simulated-user-123456",
                        displayName: "Dr. SrKube",
                        email: "SrKube@gmail.com",
                        photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80",
                        emailVerified: true
                      };
                      localStorage.setItem("daily_simulated_user", JSON.stringify(simulatedUser));
                      setCurrentUser(simulatedUser);
                      triggerAlert("success", "Sandbox Test-Profil geladen.");
                      setOnboardingStep("prefs");
                    }}
                    className="w-full py-2.5 px-4 bg-[#FAF9F6] border border-neutral-200/50 hover:bg-neutral-100 text-neutral-600 hover:text-black font-semibold text-xs rounded-xl transition text-center cursor-pointer active:scale-[0.98]"
                  >
                    In Demo-Modus fortfahren (Lokale Simulation)
                  </button>
                </div>

                <div className="bg-[#FAF9F6] p-4 rounded-xl border border-neutral-200/40 flex items-start gap-2.5 text-[11px] text-neutral-500 leading-normal text-left">
                  <Info className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <p>
                    Die App nutzt die <strong>Google Sign-In API</strong> zur Verschlüsselung deiner Einstellungen. Im Demo-Modus werden alle To-dos lokal gespeichert.
                  </p>
                </div>
              </motion.div>
            )}

            {onboardingStep === "prefs" && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 md:p-8 border border-neutral-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col gap-6"
              >
                <div className="flex flex-col gap-0.5 border-b border-neutral-100 pb-4 text-left">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-neutral-400 uppercase">SCHRITT 1 VON 2</span>
                  <h3 className="font-serif text-lg font-medium text-neutral-950">Präferenzen festlegen</h3>
                </div>

                {/* Location Picker */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400">Dein Standort (Wetterbericht)</label>
                  <div className="relative flex items-center">
                    <MapPin className="h-4 w-4 text-neutral-400 absolute left-3.5" />
                    <input 
                      type="text" 
                      value={onboardLocation}
                      onChange={(e) => setOnboardLocation(e.target.value)}
                      placeholder="z.B. Berlin, Hamburg"
                      className="w-full bg-[#FAF9F6] border border-neutral-200/50 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans focus:outline-none focus:border-neutral-950 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Topics Selection */}
                <div className="flex flex-col gap-2 text-left">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 block">Themenfelder auswählen (News)</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PREDEFINED_TOPICS.map(topic => {
                      const selected = onboardTopics.includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => handleToggleOnboardTopic(topic)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-all cursor-pointer ${
                            selected 
                              ? "bg-neutral-950 text-white font-semibold" 
                              : "bg-neutral-50 border border-neutral-200/40 hover:bg-neutral-100/70 text-neutral-600"
                          }`}
                        >
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOnboardingStep("connections")}
                  disabled={onboardTopics.length === 0}
                  className="w-full py-3 px-4 bg-neutral-950 hover:bg-neutral-900 disabled:opacity-30 tracking-widest font-mono font-bold text-xs uppercase text-white rounded-xl text-center flex items-center justify-center gap-2 transition cursor-pointer mt-2"
                >
                  <span>Anbindung einrichten</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}

            {onboardingStep === "connections" && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 md:p-8 border border-neutral-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col gap-6"
              >
                <div className="flex flex-col gap-0.5 border-b border-neutral-100 pb-4 text-left">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-neutral-400 uppercase">SCHRITT 2 VON 2</span>
                  <h3 className="font-serif text-lg font-medium text-neutral-950">Dienste anbinden</h3>
                </div>

                <p className="text-xs text-neutral-500 leading-relaxed -mt-1 text-left">
                  Aktiviere die Integrationskanäle, um Daten über Gemini in den Morgenbericht einfließen zu lassen.
                </p>

                <div className="flex flex-col gap-3">
                  
                  {/* Google Calendar Toggle */}
                  <div className="p-4 bg-[#FAF9F6] border border-neutral-200/60 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-white border border-neutral-200/60 rounded-xl flex items-center justify-center">
                        <CalendarIcon className="h-4.5 w-4.5 text-[#1a1917]" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold leading-tight">Google Calendar</span>
                        <span className="text-[9px] font-mono text-neutral-400">Verbindung über Platzhalter</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConnectGoogleCal(!connectGoogleCal)}
                      className={`w-11 h-6 rounded-full p-1 transition duration-200 ease-in-out focus:outline-none ${connectGoogleCal ? "bg-black" : "bg-neutral-200"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow transform transition duration-200 ${connectGoogleCal ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  {/* Gmail Integration Toggle */}
                  <div className="p-4 bg-[#FAF9F6] border border-neutral-200/60 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-white border border-neutral-200/60 rounded-xl flex items-center justify-center">
                        <Mail className="h-4.5 w-4.5 text-[#1a1917]" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold leading-tight">Gmail E-Mails</span>
                        <span className="text-[9px] font-mono text-[#9A9890]">E-Mail-Zusammenfassungen</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConnectGmail(!connectGmail)}
                      className={`w-11 h-6 rounded-full p-1 transition duration-200 ease-in-out focus:outline-none ${connectGmail ? "bg-black" : "bg-neutral-200"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow transform transition duration-200 ${connectGmail ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep("prefs")}
                    className="flex-1 py-3 px-3 bg-[#FAF9F6] border border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-black font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={handleOnboardingSubmit}
                    disabled={settingsLoading}
                    className="flex-[2] py-3.5 px-4 bg-black hover:bg-neutral-800 tracking-wider font-mono font-bold text-xs uppercase text-white rounded-xl text-center flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {settingsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>Einrichtung beenden</span>
                  </button>
                </div>
              </motion.div>
            )}

            <div className="text-center font-mono text-[9px] text-neutral-400 mt-6 select-none leading-relaxed uppercase tracking-[0.1em]">
              Daily Brief Premium Client • Build v1.2.0-Alpha
            </div>
          </div>

        ) : (
          <div className="flex-1 w-full flex flex-col lg:flex-row relative">
            <div className="flex-1 min-w-0 flex flex-col">
              {settingsLoading ? (
          
          /* ========================================================= */
          /* SETTINGS / LOADING SYSTEM LOADER                          */
          /* ========================================================= */
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <RefreshCw className="h-8 w-8 text-neutral-400 animate-spin" />
            <p className="text-xs text-neutral-500 font-mono mt-3 uppercase tracking-wider">Synchronisiere Profileinstellungen...</p>
          </div>

        ) : viewTab === "news" ? (
          
          /* ========================================================= */
          /* SCREEN: ECHTZEIT-NACHRICHTENSTROM (NEWS TAB)             */
          /* ========================================================= */
          <div className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col gap-6 animate-fade-in-up text-left pb-24 md:pb-12 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-neutral-200/50 pb-5">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-white border border-neutral-200 rounded-2xl shadow-sm">
                  <Newspaper className="h-5 w-5 text-neutral-800" />
                </span>
                <div className="flex flex-col">
                  <h2 className="font-serif font-black text-2xl tracking-tight text-[#1D1C1A]">Echtzeit-Nachrichtenstrom</h2>
                  <span className="text-[9px] font-mono text-[#9A9890] tracking-wider font-bold uppercase mt-1">Personalisiertes Google News Journal</span>
                </div>
              </div>
              
              <button
                onClick={() => fetchLiveNewsFeed(settings?.topics || ["Digital Health"], settings?.newsSources || [])}
                disabled={isLiveNewsLoading}
                className="p-2.5 text-neutral-450 hover:text-neutral-950 hover:bg-neutral-100/75 rounded-2xl border border-neutral-200/60 transition-all cursor-pointer disabled:opacity-40"
                title="Nachrichten aktualisieren"
              >
                <RefreshCw className={`h-4.5 w-4.5 text-neutral-600 ${isLiveNewsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Filter tags */}
            {settings && settings.topics && settings.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {settings.topics.map((topic, index) => (
                  <span 
                    key={index}
                    className="text-[9px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200/55 text-neutral-600"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* News Lists inside dedicated News Page */}
            <div className="bg-white border border-neutral-200/50 rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col gap-6">
              {isLiveNewsLoading ? (
                <div className="flex flex-col gap-6 py-6">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="flex flex-col gap-2.5 animate-pulse">
                      <div className="h-5 bg-neutral-100 rounded-md w-3/4" />
                      <div className="flex gap-2">
                        <div className="h-2.5 bg-neutral-200/60 rounded w-20" />
                        <div className="h-2.5 bg-neutral-200/40 rounded w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : liveNewsFeed.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center gap-3 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                  <span className="text-sm text-neutral-400 italic">Keine aktuellen Artikel geladen.</span>
                  <button
                    onClick={() => fetchLiveNewsFeed(settings?.topics || ["Digital Health"], settings?.newsSources || [])}
                    className="py-2 px-4 bg-neutral-900 border border-neutral-900 text-white rounded-xl text-xs font-mono font-bold tracking-wider uppercase hover:bg-neutral-800 mt-2 transition"
                  >
                    Nachrichtenstrom abrufen
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6 divide-y divide-neutral-100">
                  {liveNewsFeed.map((item, idx) => {
                    let formattedDate = "";
                    try {
                      const dateObj = new Date(item.pubDate);
                      formattedDate = dateObj.toLocaleDateString("de-DE", { 
                        day: "2-digit", 
                        month: "long", 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      });
                    } catch {
                      formattedDate = item.pubDate;
                    }

                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col gap-2 ${idx > 0 ? "pt-5" : ""} group`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-neutral-100 border border-neutral-200 text-neutral-600 font-mono px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">
                            {item.topic}
                          </span>
                          <span className="text-xs text-neutral-500 font-sans font-semibold">
                            {item.source}
                          </span>
                          <span className="text-[10px] text-neutral-450 font-mono ml-auto">
                            {formattedDate}
                          </span>
                        </div>
                        
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-neutral-900 hover:text-black font-serif font-semibold text-base leading-snug cursor-pointer group-hover:underline transition text-left"
                        >
                          {item.title}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        ) : viewTab === "podcast" ? (
          
          /* ========================================================= */
          /* SCREEN: PODCAST STUDIO                                    */
          /* ========================================================= */
          <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col gap-8 animate-fade-in-up text-left">
            <div className="flex items-center gap-3 border-b border-neutral-200/50 pb-5">
              <span className="p-2.5 bg-white border border-neutral-200 rounded-2xl shadow-sm">
                <Mic className="h-5 w-5 text-black animate-pulse" />
              </span>
              <div className="flex flex-col">
                <h2 className="font-serif font-black text-2xl tracking-tight text-[#1D1C1A]">Deep-Dive Podcast-Studio</h2>
                <span className="text-[9px] font-mono text-neutral-400 tracking-wider font-bold uppercase mt-1">Generiere anspruchsvolle KI-Diskussionen</span>
              </div>
            </div>

            {/* If no podcast has been generated yet */}
            {!generatedPodcast ? (
              <div className="w-full flex justify-center py-6">
                <PodcastCreator
                  onPodcastGenerated={(podcast) => {
                    setGeneratedPodcast(podcast);
                    setActivePodcastSegmentIdx(0);
                    setPodcastPlaybackLineIdx(-1);
                    setIsPodcastPlaying(false);
                  }}
                  isGenerating={isGeneratingPodcast}
                  setIsGenerating={setIsGeneratingPodcast}
                />
              </div>
            ) : (
              /* Podcast Dashboard after Generation */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Segments lists & Grounding Sources (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  
                  {/* Playlist Card */}
                  <div className="bg-white border border-neutral-200 shadow-[8px_8px_0px_0px_rgba(17,17,17,0.03)] rounded-3xl p-6 flex flex-col gap-6 relative">
                    
                    {/* Context Menu Trigger */}
                    <div className="absolute top-5 right-5 z-20">
                      <button
                        type="button"
                        onClick={() => setPlaylistMenuOpen(!playlistMenuOpen)}
                        className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-black transition cursor-pointer"
                        id="playlist-menu-trigger"
                        title="Optionen"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Floating Menu Overlay */}
                      {playlistMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setPlaylistMenuOpen(false)} 
                          />
                          <div className="absolute right-0 mt-1.5 w-48 bg-white border border-neutral-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-2xl p-2 flex flex-col gap-1 z-40 animate-fade-in text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setPlaylistMenuOpen(false);
                                triggerAlert("success", "Zu Favoriten hinzugefügt!");
                              }}
                              className="w-full px-3 py-2 text-xs font-sans font-medium hover:bg-neutral-50 rounded-xl transition flex items-center gap-2 text-neutral-700 hover:text-black cursor-pointer bg-transparent border-0"
                            >
                              <Heart className="h-3.5 w-3.5 text-neutral-400" />
                              <span>Zu Favoriten</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPlaylistMenuOpen(false);
                                if (navigator.share) {
                                  navigator.share({
                                    title: generatedPodcast.podcastTitle,
                                    text: generatedPodcast.narrativeText,
                                    url: window.location.href,
                                  }).catch(() => {});
                                } else {
                                  navigator.clipboard.writeText(window.location.href);
                                  triggerAlert("success", "Link in Zwischenablage kopiert!");
                                }
                              }}
                              className="w-full px-3 py-2 text-xs font-sans font-medium hover:bg-neutral-50 rounded-xl transition flex items-center gap-2 text-neutral-700 hover:text-black cursor-pointer bg-transparent border-0"
                            >
                              <Share2 className="h-3.5 w-3.5 text-neutral-400" />
                              <span>Teilen</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPlaylistMenuOpen(false);
                                triggerAlert("success", "Beitrag für die Offline-Nutzung gespeichert!");
                              }}
                              className="w-full px-3 py-2 text-xs font-sans font-medium hover:bg-neutral-50 rounded-xl transition flex items-center gap-2 text-neutral-700 hover:text-black cursor-pointer bg-transparent border-0"
                            >
                              <Download className="h-3.5 w-3.5 text-neutral-400" />
                              <span>Offline speichern</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 pr-8">
                      <span className="h-2 w-2 rounded-full bg-black animate-ping" />
                      <h3 className="font-serif font-bold text-base text-neutral-900 truncate flex-1">{generatedPodcast.podcastTitle}</h3>
                    </div>

                    <p className="text-xs text-neutral-500 leading-relaxed italic border-l-2 border-neutral-200 pl-3">
                      {generatedPodcast.narrativeText}
                    </p>

                    <div className="flex flex-col gap-2.5 mt-2">
                      <span className="text-[9px] uppercase font-mono tracking-widest font-extrabold text-[#9A9890] mb-1">Diskussionskapitel</span>
                      {generatedPodcast.segments.map((seg: any, idx: number) => {
                        const isActive = idx === activePodcastSegmentIdx;
                        return (
                          <button
                            key={seg.id || idx}
                            onClick={() => {
                              handleStopPodcastPlayback();
                              setActivePodcastSegmentIdx(idx);
                            }}
                            className={`w-full p-4 rounded-2xl text-left border flex items-center justify-between transition group cursor-pointer ${
                              isActive 
                                ? "bg-black text-white border-black" 
                                : "bg-[#F9F9F8] border-neutral-200/50 hover:bg-neutral-100 text-neutral-800"
                            }`}
                          >
                            <div className="flex flex-col gap-1 w-[80%]">
                              <span className={`text-[8px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border inline-block w-max ${
                                isActive 
                                  ? "bg-neutral-800 border-neutral-700 text-neutral-200" 
                                  : "bg-white border-neutral-200/40 text-neutral-500"
                              }`}>
                                {seg.cardType === "podcast-intro" ? "Intro" : seg.cardType === "podcast-conclusion" ? "Fazit" : `Abschnitt ${idx}`}
                              </span>
                              <span className="font-serif font-bold text-xs truncate leading-snug">{seg.title}</span>
                            </div>
                            <Play className={`h-3.5 w-3.5 transition ${isActive ? "text-white" : "text-neutral-400 group-hover:text-black group-hover:scale-110"}`} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Reset Button */}
                    <button
                      onClick={() => {
                        handleStopPodcastPlayback();
                        setGeneratedPodcast(null);
                      }}
                      className="mt-4 w-full py-3 bg-[#FAF9F5] hover:bg-neutral-100 border border-neutral-200 text-neutral-700 hover:text-black font-mono font-bold text-xs uppercase rounded-xl transition cursor-pointer text-center"
                    >
                      Neues Thema besprechen
                    </button>
                  </div>

                  {/* Grounding Sources Panel */}
                  {generatedPodcast.sources && generatedPodcast.sources.length > 0 && (
                    <div className="bg-white border border-neutral-200 shadow-[8px_8px_0px_0px_rgba(17,17,17,0.03)] rounded-3xl p-6 flex flex-col gap-3">
                      <div className="flex items-center gap-1.5 border-b border-neutral-100 pb-2.5">
                        <Newspaper className="h-4 w-4 text-[#9A9890]" />
                        <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">Recherchierte Quellen</span>
                      </div>
                      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                        {generatedPodcast.sources.map((source: any, idx: number) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-neutral-600 hover:text-black hover:underline flex items-center justify-between p-2.5 rounded-xl bg-[#F9F9F8] border border-neutral-200/55 transition"
                          >
                            <span className="truncate font-sans max-w-[90%] font-medium">{source.title}</span>
                            <ArrowRight className="h-3 w-3 flex-shrink-0 text-neutral-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Active Podcast Segment companion card & bubbles! (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  
                  {/* Companion Screen Card */}
                  {generatedPodcast.segments[activePodcastSegmentIdx] && (() => {
                    const seg = generatedPodcast.segments[activePodcastSegmentIdx];
                    const lines = getPodcastDialogLines(seg.spokenText);
                    return (
                      <div className="bg-neutral-50/70 border border-neutral-200 shadow-[8px_8px_0px_0px_rgba(17,17,17,0.02)] rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden pb-24">
                        
                        {/* Apple Bento Grid Container */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          
                          {/* Bento Box 1: Playing Now Meta Core (Primary display with Cover art & Title) */}
                          <div className="md:col-span-7 bg-white border border-neutral-200/70 p-5 rounded-2xl flex flex-col justify-center gap-4 shadow-xs">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                {/* Stylish Cover Art */}
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#1E6B4A] to-neutral-900 flex flex-col items-center justify-center text-white relative shadow-sm overflow-hidden select-none shrink-0 border border-neutral-200">
                                  <span className="text-white font-sans font-black text-xs tracking-[0.1em] text-center px-1">DAILY</span>
                                  <span className="text-[7px] font-mono tracking-widest text-[#DFBA6B] uppercase font-bold leading-none mt-1">studio</span>
                                  {isPodcastPlaying && (
                                    <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse border border-neutral-900" />
                                  )}
                                </div>
                                
                                <div className="flex flex-col min-w-0 text-left">
                                  <span className="text-[9px] uppercase font-mono tracking-widest font-extrabold text-[#1E6B4A]">
                                    Täglicher Deep-Dive
                                  </span>
                                  <h4 className="font-serif text-base font-bold text-neutral-900 truncate leading-snug mt-0.5">
                                    {seg.title}
                                  </h4>
                                  <span className="text-[10px] text-neutral-400 truncate mt-0.5">
                                    Lukas & Sarah • KI Diskussionsrunde
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bento Box 2: Spectrogram & Audio Pulse */}
                          <div className="md:col-span-5 bg-white border border-neutral-200/70 p-4 rounded-2xl flex flex-col justify-center items-center shadow-xs">
                            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-extrabold mb-2.5">
                              Audio Waveform
                            </span>
                            <div className="w-full bg-[#FAF9F5]/40 border border-neutral-150/70 rounded-xl p-3 flex-1 flex items-center justify-center">
                              <AudioVisualizer isPlaying={isPodcastPlaying} isInterrupting={false} />
                            </div>
                          </div>

                          {/* Bento Box 3: Transcripts & Dialogue Bubbles (Interactive List) */}
                          <div className="md:col-span-7 bg-white border border-neutral-200/70 p-5 rounded-2xl flex flex-col gap-3 shadow-xs">
                            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-bold leading-none mb-1">
                              Sprech-Mitschrift (Anklicken zum Abspielen)
                            </span>
                            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scroll-smooth py-2 bg-[#F9F9F8] rounded-xl p-4 border border-neutral-150/50">
                              {lines.map((line, idx) => {
                                const isLukas = line.speaker === "Lukas";
                                const isHighlighted = idx === podcastPlaybackLineIdx;

                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleTogglePodcastPlayback(idx)}
                                    className={`text-left p-3.5 rounded-2xl border transition duration-150 relative flex gap-3 cursor-pointer group w-[85%] ${
                                      isLukas ? "mr-auto" : "ml-auto flex-row-reverse"
                                    } ${
                                      isHighlighted 
                                        ? "bg-black text-white border-black shadow-md scale-[1.01] ring-2 ring-[#1E6B4A]/20" 
                                        : "bg-white border-neutral-200/50 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-800"
                                    }`}
                                  >
                                    <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center font-serif text-xs font-bold leading-none select-none ${
                                      isHighlighted 
                                        ? "bg-neutral-800 text-white" 
                                        : isLukas ? "bg-emerald-50 text-[#1E6B4A] border border-emerald-150" : "bg-purple-50 text-purple-700 border border-purple-200"
                                    }`}>
                                      {line.speaker[0]}
                                    </div>

                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                      <span className={`text-[9px] uppercase font-mono font-black ${
                                        isHighlighted 
                                          ? "text-neutral-400" 
                                          : isLukas ? "text-[#1E6B4A]" : "text-purple-600"
                                      } ${isLukas ? "text-left" : "text-right"}`}>
                                        {line.speaker}
                                      </span>
                                      <p className="text-xs leading-relaxed font-sans mt-0.5 font-semibold">
                                        {line.text}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Bento Box 4: Visual Fact Companion Editorial */}
                          <div className="md:col-span-5 bg-[#FAF5ED] border border-neutral-200/60 p-5 rounded-2xl flex flex-col justify-between shadow-xs text-neutral-800 min-h-[220px]">
                            <div>
                              <span className="text-[9.5px] uppercase font-mono tracking-widest font-extrabold text-[#9A9890] block mb-3 border-b border-neutral-200/30 pb-2">
                                Begleitende Infografik / Key Facts
                              </span>
                              <div className="text-xs leading-relaxed font-sans prose prose-neutral max-w-none">
                                <span className="whitespace-pre-line text-neutral-700 font-semibold">{seg.visualContent}</span>
                              </div>
                            </div>
                            <div className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider text-right mt-4 italic">
                              Studio Visual Board
                            </div>
                          </div>

                        </div>

                        {/* Bento Box 5: Glassmorphic Floating Pill Controls (Bottom Absolute Container) */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-25 max-w-2xl w-[calc(100%-2rem)] bg-white/80 backdrop-blur-md border border-neutral-200/90 rounded-2xl md:rounded-full px-5 py-3 md:py-2.5 shadow-[0_12px_35px_-5px_rgba(0,0,0,0.12),0_8px_16px_-6px_rgba(0,0,0,0.12)] select-none">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-center">
                            
                            {/* Playback Scrubber grouped inside the glassmorphic pill */}
                            <div className="col-span-1 md:col-span-7 flex flex-col gap-1 min-w-0">
                              {(() => {
                                const currentLine = podcastPlaybackLineIdx >= 0 ? podcastPlaybackLineIdx + 1 : 0;
                                const totalLines = lines.length;
                                const progressPercent = totalLines > 0 ? (currentLine / totalLines) * 100 : 0;
                                const activeLineStr = String(currentLine).padStart(2, "0");
                                const totalLinesStr = String(totalLines).padStart(2, "0");

                                return (
                                  <div className="flex flex-col gap-1.5">
                                    {/* Progress track */}
                                    <div 
                                      className="relative w-full h-1 bg-neutral-250 rounded-full group cursor-pointer transition hover:h-1.5"
                                      onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const clickX = e.clientX - rect.left;
                                        const ratio = clickX / rect.width;
                                        const targetIndex = Math.min(
                                          lines.length - 1,
                                          Math.max(0, Math.floor(ratio * lines.length))
                                        );
                                        handleTogglePodcastPlayback(targetIndex);
                                      }}
                                    >
                                      <div 
                                        className="absolute top-0 left-0 h-full bg-[#1E6B4A] rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                      <div 
                                        className="absolute top-1/2 -ml-1.5 h-3 w-3 rounded-full bg-white border border-[#1E6B4A] shadow-xs transform -translate-y-1/2 transition-all duration-300 group-hover:scale-110"
                                        style={{ left: `${progressPercent}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between font-mono text-[8.5px] font-extrabold text-[#7C7A70] leading-none select-none">
                                      <span className="flex items-center gap-1.5">
                                        <span className={`h-1.5 w-1.5 rounded-full ${isPodcastPlaying ? "bg-emerald-500 animate-pulse" : "bg-neutral-300"}`} />
                                        SATZ {activeLineStr} VON {totalLinesStr}
                                      </span>
                                      <span className="text-[#1E6B4A]/95 uppercase tracking-wide font-black">{Math.round(progressPercent)}% GEHÖRT</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Control Actions & Speed Column */}
                            <div className="col-span-1 md:col-span-5 flex items-center justify-between md:justify-end gap-3 shrink-0">
                              <div className="flex items-center gap-2">
                                {/* Skip Back */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (lines.length === 0) return;
                                    const targetIdx = Math.max(0, podcastPlaybackLineIdx - 1);
                                    handleTogglePodcastPlayback(targetIdx);
                                  }}
                                  disabled={lines.length === 0}
                                  className="h-8 w-8 rounded-full text-neutral-500 hover:text-neutral-900 bg-neutral-50/50 hover:bg-neutral-100 border border-neutral-200 disabled:opacity-30 transition cursor-pointer flex items-center justify-center shadow-xs active:scale-95"
                                  title="Vorheriger Satz"
                                >
                                  <SkipBack className="h-3.5 w-3.5" />
                                </button>

                                {/* Play / Pause */}
                                <button
                                  type="button"
                                  onClick={() => handleTogglePodcastPlayback()}
                                  className={`h-10 w-10 flex items-center justify-center rounded-full text-white cursor-pointer transition shadow hover:scale-105 active:scale-95 duration-150 ${
                                    isPodcastPlaying ? "bg-[#1E6B4A]" : "bg-neutral-900 hover:bg-neutral-800"
                                  }`}
                                  title={isPodcastPlaying ? "Pausieren" : "Abspielen"}
                                >
                                  {isPodcastPlaying ? (
                                    <Pause className="h-4 w-4 text-white" />
                                  ) : (
                                    <Play className="h-4 w-4 text-white ml-0.5" />
                                  )}
                                </button>

                                {/* Skip Forward */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (lines.length === 0) return;
                                    const targetIdx = podcastPlaybackLineIdx >= 0 ? podcastPlaybackLineIdx + 1 : 0;
                                    if (targetIdx < lines.length) {
                                      handleTogglePodcastPlayback(targetIdx);
                                    }
                                  }}
                                  disabled={lines.length === 0 || podcastPlaybackLineIdx === lines.length - 1}
                                  className="h-8 w-8 rounded-full text-neutral-500 hover:text-neutral-900 bg-neutral-50/50 hover:bg-neutral-100 border border-neutral-200 disabled:opacity-30 transition cursor-pointer flex items-center justify-center shadow-xs active:scale-95"
                                  title="Nächster Satz"
                                >
                                  <SkipForward className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Interactive Speed */}
                              <button
                                type="button"
                                onClick={() => {
                                  const rates = [0.8, 1.0, 1.2, 1.4];
                                  const currentPos = rates.indexOf(speechRate);
                                  const nextPos = currentPos === -1 ? 1 : (currentPos + 1) % rates.length;
                                  setSpeechRate(rates[nextPos]);
                                  triggerAlert("info", `Wiedergabetempo auf ${rates[nextPos]}x eingestellt`);
                                }}
                                className="h-7 px-2.5 font-mono text-[9px] font-extrabold bg-[#FAF9F6]/80 hover:bg-[#FAF9F6] text-neutral-600 border border-neutral-200 rounded-full transition cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
                                title="Tempo"
                              >
                                <Volume2 className="h-3 w-3 text-neutral-400" />
                                <span>{speechRate}x</span>
                              </button>
                            </div>

                          </div>
                        </div>

                      </div>
                    );
                  })()}

                </div>

              </div>
            )}
          </div>

        ) : viewTab === "settings" ? (
          
          /* ========================================================= */
          /* SCREEN: SYSTEM SETTINGS                                   */
          /* ========================================================= */
          <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col gap-8 animate-fade-in-up text-left">
            <div className="flex items-center gap-3 border-b border-neutral-200/50 pb-5">
              <span className="p-2.5 bg-white border border-neutral-200 rounded-2xl shadow-sm">
                <Settings className="h-5 w-5 text-black animate-spin-slow" />
              </span>
              <div className="flex flex-col">
                <h2 className="font-serif font-black text-2xl tracking-tight text-[#1D1C1A]">Systemeinstellungen</h2>
                <span className="text-[9px] font-mono text-neutral-400 tracking-wider font-bold uppercase mt-1">Briefing Konfiguration</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Core Parameters */}
              <div className="bg-white border border-neutral-200/70 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
                <h3 className="font-serif font-bold text-base text-black border-b border-neutral-100 pb-2">Basisdaten</h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">Primärer Standort (Wetter)</label>
                  <input 
                    type="text" 
                    value={settings?.location || ""}
                    onChange={(e) => settings && handleSaveSettingsUpdate({ ...settings, location: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-neutral-200 rounded-xl p-3 text-xs font-bold text-[#1D1C1A] focus:outline-none focus:border-black transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">E-Mail-Anbieter</label>
                  <select
                    value={settings?.emailProvider || "gmail"}
                    onChange={(e) => settings && handleSaveSettingsUpdate({ ...settings, emailProvider: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-neutral-200 rounded-xl p-3 text-xs font-bold text-black focus:outline-none focus:border-black transition"
                  >
                    <option value="gmail">Google Mail (Gmail - Sandbox Demo)</option>
                    <option value="outlook">Outlook Mail (Mockup)</option>
                    <option value="internal">Lokaler Posteingang</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">Standard Aufgabenquelle</label>
                  <select
                    value={settings?.taskSource || "internal"}
                    onChange={(e) => {
                      if (settings) {
                        handleSaveSettingsUpdate({ ...settings, taskSource: e.target.value });
                        setTaskSourceTab(e.target.value === "google" ? "google" : "local");
                      }
                    }}
                    className="w-full bg-[#FAF9F6] border border-neutral-200 rounded-xl p-3 text-xs font-bold text-black focus:outline-none focus:border-black transition"
                  >
                    <option value="internal">Lokaler Speicher (Firestore)</option>
                    <option value="google">Google Tasks (Live API)</option>
                  </select>
                </div>
              </div>

              {/* Box 2: Switches */}
              <div className="bg-white border border-neutral-200/70 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
                <h3 className="font-serif font-bold text-base text-black border-b border-neutral-100 pb-2">Integrationsstatus</h3>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between py-1">
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-neutral-800">Kalender einbeziehen</span>
                      <span className="text-[9px] font-mono text-neutral-400">Termine für den heutigen Brief</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => settings && handleSaveSettingsUpdate({ ...settings, includeCalendar: !settings.includeCalendar })}
                      className={`w-11 h-6 rounded-full p-1 transition duration-205 ease-in-out cursor-pointer ${settings?.includeCalendar ? "bg-black" : "bg-neutral-200"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform transition duration-205 ${settings?.includeCalendar ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1 border-t border-neutral-100 pt-3">
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-neutral-800">E-Mails einbeziehen</span>
                      <span className="text-[9px] font-mono text-neutral-400">Dringende E-Mails via Gemini filtern</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => settings && handleSaveSettingsUpdate({ ...settings, includeEmail: !settings.includeEmail })}
                      className={`w-11 h-6 rounded-full p-1 transition duration-205 ease-in-out cursor-pointer ${settings?.includeEmail ? "bg-black" : "bg-neutral-200"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform transition duration-205 ${settings?.includeEmail ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1 border-t border-neutral-100 pt-3">
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-neutral-800">Tasks einbeziehen</span>
                      <span className="text-[9px] font-mono text-neutral-400">Aktive To-dos zu der Liste hinzufügen</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => settings && handleSaveSettingsUpdate({ ...settings, includeTasks: !settings.includeTasks })}
                      className={`w-11 h-6 rounded-full p-1 transition duration-250 ease-in-out cursor-pointer ${settings?.includeTasks ? "bg-black" : "bg-neutral-200"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform transition duration-205 ${settings?.includeTasks ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  {/* Manual Data Sync Component */}
                  <div className="border-t border-neutral-100/80 pt-4 mt-2 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col text-left flex-1">
                        <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                          <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-neutral-900" : "text-neutral-500"}`} />
                          Jetzt synchronisieren
                        </span>
                        <p className="text-[9px] font-mono leading-normal text-neutral-400 mt-0.5">
                          {lastSyncTime 
                            ? `Automatischer Datenabgleich aktiv. Zuletzt synchronisiert um: ${lastSyncTime}` 
                            : "Manuelles Abfragen und Laden aktualisierter Kalender- & E-Mail-Daten auslösen."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncDataSources}
                        disabled={isSyncing}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                          isSyncing
                            ? "bg-neutral-100 text-neutral-400 border border-neutral-200"
                            : "bg-black text-white hover:bg-neutral-800 border border-black shadow-sm"
                        }`}
                      >
                        {isSyncing ? "LOADING..." : "SYNC NOW"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2.5: Google Workspace Integration Status */}
            <div className="bg-white border border-neutral-200/70 rounded-3xl p-6 flex flex-col gap-4 text-left shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-neutral-150 border border-neutral-200 rounded-xl">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-4 w-4" alt="Google" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-serif font-bold text-base text-black">Google Workspace Live-Kanal</span>
                    <p className="text-[9px] font-mono text-neutral-400 capitalize tracking-wider mt-0.5">Google Kalender & Gmail Konnektor</p>
                  </div>
                </div>
                {getGoogleAccessToken() ? (
                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[9px] font-black uppercase rounded-full">Connected</span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[9px] font-black uppercase rounded-full">Simulated Demo</span>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col text-left max-w-md">
                  <span className="text-xs font-bold text-neutral-800">
                    {getGoogleAccessToken() 
                      ? `Aktiviert für ${currentUser?.email || "deinen Account"}` 
                      : "Verbindung mit Google herstellen"}
                  </span>
                  <p className="text-[11px] leading-relaxed text-[#5C5A52] mt-1">
                    {getGoogleAccessToken() 
                      ? "Dein Daily-Briefing wird jetzt mit echten Einträgen aus deinem persönlichen Google-Kalender und den neuesten E-Mails aus deinem Gmail-Posteingang gefüttert."
                      : "Durch die Verbindung mit Google liest Daily deine realen Termine und E-Mails aus, um ein absolut präzises, personalisiertes Audio-Briefing zu erstellen."}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      triggerAlert("info", "Öffne sicheren Google Login-Auszug...");
                      const user = await loginWithGoogle();
                      if (user) {
                        triggerAlert("success", "Google-Konto erfolgreich verbunden! Daten werden jetzt synchronisiert.");
                        // Fetch real data immediately
                        await handleSyncDataSources();
                      }
                    } catch (err: any) {
                      triggerAlert("error", "Authentifizierung fehlgeschlagen: " + (err.message || "Abgebrochen"));
                    }
                  }}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                    getGoogleAccessToken()
                      ? "bg-[#FAF9F6] text-[#1D1C1A] hover:bg-neutral-150 border border-neutral-300 shadow-sm"
                      : "bg-[#1D1C1A] text-white hover:bg-black border border-[#1D1C1A] shadow-sm"
                  }`}
                >
                  {getGoogleAccessToken() ? "Konto wechseln" : "Google verbinden"}
                </button>
              </div>
            </div>

            {/* Box 2.6: Progressive Web App (PWA) Install Info */}
            <div className="bg-white border border-neutral-200/70 rounded-3xl p-6 flex flex-col gap-4 text-left shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-neutral-150 border border-neutral-200 rounded-xl">
                    <Smartphone className="h-4 w-4 text-neutral-800" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-serif font-bold text-base text-black">Companion App Download</span>
                    <p className="text-[9px] font-mono text-neutral-400 capitalize tracking-wider mt-0.5">Progressive Web App (PWA) Status</p>
                  </div>
                </div>
                {isAppInstalled ? (
                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[9px] font-black uppercase rounded-full">Installiert</span>
                ) : deferredPrompt ? (
                  <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[9px] font-black uppercase rounded-full">Ready to install</span>
                ) : (
                  <span className="px-2 py-0.5 bg-neutral-50 border border-neutral-200 text-neutral-500 font-mono text-[9px] font-black uppercase rounded-full">Im Browser geladen</span>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex flex-col text-left max-w-md">
                  <span className="text-xs font-bold text-neutral-800">
                    {isAppInstalled 
                      ? "Daily ist bereits auf deinem Gerät installiert!" 
                      : "Als Desktop- oder Mobile-App hinzufügen"}
                  </span>
                  <p className="text-[11px] leading-relaxed text-[#5C5A52] mt-1">
                    {isAppInstalled 
                      ? "Du kannst diese App direkt im Vollbildmodus starten wie eine native Mobil- oder Desktop-App – ganz ohne Adressleiste und mit voller Performance."
                      : "Installiere Daily auf deinem Startbildschirm (Homescreen), um die App jederzeit wie eine eigenständige Software aus deinem Dock oder Launcher zu starten."}
                  </p>
                  
                  {!isAppInstalled && !deferredPrompt && (
                    <div className="mt-2 text-[10px] text-neutral-400 bg-[#FAF9F6] p-2.5 rounded-xl border border-neutral-150 flex flex-col gap-1 leading-normal font-sans">
                      <strong className="text-neutral-700 font-semibold">💡 So installierst du manuell auf deinem Gerät:</strong>
                      <span>• <strong className="text-neutral-700">iOS (Safari):</strong> Klicke unten auf das <strong className="text-neutral-700">Teilen-Symbol (Box mit Pfeil nach oben)</strong> und wähle <strong className="text-neutral-700">„Zum Home-Bildschirm“</strong>.</span>
                      <span>• <strong className="text-neutral-700">Android (Chrome):</strong> Klicke auf die <strong className="text-neutral-700">drei Punkte oben rechts</strong> und wähle <strong className="text-neutral-700">„App installieren“</strong>.</span>
                      <span>• <strong className="text-neutral-700">Desktop (Mac/PC):</strong> Such nach dem Installations-Symbol rechts in deiner Chrome/Edge Browser-Adressleiste.</span>
                    </div>
                  )}
                </div>
                
                {!isAppInstalled && (
                  <button
                    type="button"
                    onClick={handleInstallPWA}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                      deferredPrompt
                        ? "bg-black text-white hover:bg-neutral-800 border border-black shadow-sm"
                        : "bg-[#FAF9F6] text-[#1D1C1A] hover:bg-neutral-150 border border-neutral-300 shadow-sm"
                    }`}
                  >
                    {deferredPrompt ? "JETZT INSTALLIEREN" : "ANLEITUNG ZEIGEN"}
                  </button>
                )}
              </div>
            </div>

            {/* Box 3: Topics management */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 flex flex-col gap-4 text-left">
              <h3 className="font-serif font-bold text-base text-black border-b border-neutral-100 pb-2">Themenfelder bearbeiten</h3>
              <p className="text-xs text-neutral-500 max-w-lg leading-relaxed -mt-1">
                Wähle die Schlagwörter aus oder füge eigene hinzu, um den News-Fokus deines morgendlichen Berichts zu kalibrieren.
              </p>

              <div className="flex flex-wrap gap-2 mt-2">
                {PREDEFINED_TOPICS.map(topic => {
                  const selected = settings?.topics.includes(topic) || false;
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        if (!settings) return;
                        const updatedTopics = selected 
                          ? settings.topics.filter(t => t !== topic) 
                          : [...settings.topics, topic];
                        handleSaveSettingsUpdate({ ...settings, topics: updatedTopics });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
                        selected 
                          ? "bg-black text-white font-black" 
                          : "bg-[#FAF5ED] border border-neutral-200/50 hover:bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic list of custom topics */}
              {settings && settings.topics.filter(t => !PREDEFINED_TOPICS.includes(t)).length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">Eigene Schlagworte ({settings.topics.filter(t => !PREDEFINED_TOPICS.includes(t)).length})</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {settings.topics.filter(t => !PREDEFINED_TOPICS.includes(t)).map(topic => (
                      <span
                        key={topic}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-full text-xs font-semibold tracking-wide"
                      >
                        {topic}
                        <button
                          type="button"
                          onClick={() => {
                            const updatedTopics = settings.topics.filter(t => t !== topic);
                            handleSaveSettingsUpdate({ ...settings, topics: updatedTopics });
                          }}
                          className="hover:bg-neutral-800 text-neutral-350 hover:text-white rounded-full p-0.5 transition cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Input for custom topic */}
              <div className="flex flex-col gap-1.5 mt-3 pt-4 border-t border-neutral-150/50">
                <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">Eigenes Thema hinzufügen</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="z.B. Quantencomputer, Aktienmarkt, Klimawandel, Fussball..."
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTopic();
                      }
                    }}
                    className="flex-1 bg-[#FAF9F6] border border-neutral-200 rounded-xl p-3 text-xs font-bold text-[#1D1C1A] focus:outline-none focus:border-black transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTopic}
                    className="px-4 py-2 bg-[#1D1C1A] hover:bg-black text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            {/* Box 3.5: News Sources management */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 flex flex-col gap-4 text-left shadow-sm">
              <h3 className="font-serif font-bold text-base text-black border-b border-neutral-100 pb-2">Bevorzugte News-Quellen</h3>
              <p className="text-xs text-neutral-500 max-w-lg leading-relaxed -mt-1">
                Gib an, von welchen Medien, Journals oder Publikationen Gemini bevorzugt Nachrichten suchen soll (z. B. Spiegel, heise online, Bloomberg, Nature, Golem, NYTimes).
              </p>

              {/* Aktuelle Quellen als dismissible tags */}
              <div className="flex flex-wrap gap-2 mt-2">
                {settings?.newsSources && settings.newsSources.length > 0 ? (
                  settings.newsSources.map(source => (
                    <span
                      key={source}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5ED] border border-neutral-250 rounded-full text-xs font-semibold tracking-wide text-neutral-800"
                    >
                      {source}
                      <button
                        type="button"
                        onClick={() => {
                          if (!settings) return;
                          const updatedSources = settings.newsSources.filter(s => s !== source);
                          handleSaveSettingsUpdate({ ...settings, newsSources: updatedSources });
                        }}
                        className="hover:bg-neutral-200 text-neutral-500 hover:text-black rounded-full p-0.5 transition cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-mono text-neutral-400 italic">Keine spezifischen Nachrichtenquellen hinterlegt (sucht allgemein über das Web).</span>
                )}
              </div>

              {/* Hinzufügen-Formular */}
              <div className="flex flex-col gap-1.5 mt-3 pt-4 border-t border-neutral-150/50">
                <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">Eigene News-Quelle hinzufügen</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="z.B. Spiegel Online, techcrunch.com, heise.de..."
                    value={customSourceInput}
                    onChange={(e) => setCustomSourceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSource();
                      }
                    }}
                    className="flex-1 bg-[#FAF9F6] border border-neutral-200 rounded-xl p-3 text-xs font-bold text-[#1D1C1A] focus:outline-none focus:border-black transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSource}
                    className="px-4 py-2 bg-[#1D1C1A] hover:bg-black text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            {/* Box 4: TTS Config */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 flex flex-col gap-5 text-left">
              <h3 className="font-serif font-bold text-base text-black border-b border-neutral-100 pb-2">Stimme & Wiedergabe</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">Erzählstimme (Gemini Premium TTS)</label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="bg-[#FAF9F5] border border-neutral-200 rounded-xl p-3 text-xs font-bold text-black focus:outline-none"
                  >
                    {PRESET_VOICES.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#9A9890]">Geschwindigkeit ({speechRate}x Rate)</label>
                  <div className="flex items-center gap-3 h-full mt-1.5">
                    <input 
                      type="range"
                      min="0.8"
                      max="1.5"
                      step="0.05"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="flex-1 accent-black h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setViewTab("dashboard")}
                className="py-3 px-6 bg-black text-white font-mono font-bold text-xs uppercase rounded-xl border border-black transition hover:bg-neutral-800"
              >
                Zurück zum Dashboard
              </button>
            </div>
          </div>

        ) : (
          
          /* ========================================================= */
          /* SCREEN: DASHBOARD / CORES OVERVIEW                        */
          /* ========================================================= */
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left animate-fade-in-up">
            {/* 4a. Left Col: 7-Day History Sidebar (3 cols on Desktop) */}
            <section className="lg:col-span-3 flex flex-col gap-6 order-2 lg:order-1">
              
              <div className="bg-white border border-neutral-200/50 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col gap-4 order-2 lg:order-1">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 font-bold">Verlauf</span>
                  <Headphones className="h-4 w-4 text-neutral-400" />
                </div>

                {/* Retrospective Calendar View looking back 7 days */}
                <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  {briefsHistory.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center gap-1">
                      <span className="text-xs text-neutral-400 italic">Noch keine Briefs.</span>
                      <p className="text-[10.5px] text-neutral-400 max-w-[160px] leading-relaxed mx-auto mt-1">
                        Bereite deine Tagesdaten vor und klicke auf "Zusammenfassen".
                      </p>
                    </div>
                  ) : (
                    briefsHistory.map(brief => {
                      const isSelected = showDetailBrief?.id === brief.id;
                      const hasBriefAudio = brief.hasAudio || false;
                      return (
                        <div
                          key={brief.id}
                          onClick={() => setShowDetailBrief(brief)}
                          className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                            isSelected 
                              ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                              : "bg-[#FAF9F5]/40 hover:bg-neutral-100/50 text-neutral-800 border-neutral-200/40"
                          }`}
                        >
                          <div className={`h-9 w-9 rounded-lg flex flex-col items-center justify-center font-mono shrink-0 ${isSelected ? 'bg-neutral-800 text-white' : 'bg-white border border-neutral-200/60 text-neutral-800'}`}>
                            <span className="text-[8px] uppercase leading-none font-bold">{getDayShort(brief.date)}</span>
                            <span className="text-xs font-bold mt-0.5 leading-none">{getDayNumber(brief.date)}</span>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                            <span className="text-xs font-serif italic truncate font-semibold leading-tight">{brief.briefingTitle || "Daily Briefing"}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-mono leading-none ${isSelected ? 'text-neutral-400' : 'text-neutral-400'}`}>
                                {brief.date}
                              </span>
                              {hasBriefAudio && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Audio vorhanden" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Box: Manual Todo priorities which drives the compilation */}
              <div className="bg-white border border-neutral-200/50 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col gap-4 order-1 lg:order-2">
                
                {/* Source Selection Tabs */}
                <div className="flex border-b border-neutral-100/60 pb-1">
                  <button 
                    type="button"
                    onClick={() => setTaskSourceTab("local")} 
                    className={`flex-1 pb-2 text-center text-[10px] font-mono uppercase tracking-widest font-bold border-b-2 transition cursor-pointer ${taskSourceTab === "local" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-700"}`}
                  >
                    📌 Lokal ({todayTasks.length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setTaskSourceTab("google"); fetchUserGoogleTasks(true); }} 
                    className={`flex-1 pb-2 text-center text-[10px] font-mono uppercase tracking-widest font-bold border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${taskSourceTab === "google" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-700"}`}
                  >
                    <svg className="h-3 w-3 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
                    </svg>
                    Google ({googleTasks.length})
                  </button>
                </div>

                {/* Local Tasks Header Info */}
                {taskSourceTab === "local" ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-400 font-bold">Lokaler Fokus</span>
                      <span className="text-[8px] tracking-wider text-neutral-400 font-mono font-medium lowercase">Manuelle Todos</span>
                    </div>

                    {todayTasks.length > 0 && (
                      <div className="flex flex-col gap-1 text-[9px] text-neutral-400 font-mono pb-1">
                        <div className="flex justify-between items-center">
                          <span className="tracking-wider">ERLEDIGT</span>
                          <span className="font-bold text-neutral-800">
                            {todayTasks.filter(t => t.status === "completed").length} von {todayTasks.length} ({Math.round((todayTasks.filter(t => t.status === "completed").length / todayTasks.length) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 h-[2px] rounded-full overflow-hidden">
                          <div 
                            className="bg-neutral-950 h-full transition-all duration-300" 
                            style={{ width: `${Math.round((todayTasks.filter(t => t.status === "completed").length / todayTasks.length) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-400 font-bold flex items-center gap-1">
                        Google Tasks
                      </span>
                      <button 
                        type="button" 
                        onClick={() => fetchUserGoogleTasks(true)} 
                        className="p-1 px-2.5 rounded text-[8px] font-mono font-bold uppercase border border-neutral-200/50 hover:bg-neutral-50 flex items-center gap-1 cursor-pointer transition"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${isFetchingGoogleTasks ? "animate-spin text-neutral-950" : "text-neutral-500"}`} />
                        Aktualisieren
                      </button>
                    </div>

                    {googleTasks.length > 0 && (
                      <div className="flex flex-col gap-1 text-[9px] text-neutral-400 font-mono pb-1">
                        <div className="flex justify-between items-center">
                          <span className="tracking-wider flex items-center gap-1">
                            {isFetchingGoogleTasks ? "lädt..." : "SYNCHRONISIERT"}
                          </span>
                          <span className="font-bold text-neutral-800">
                            {googleTasks.filter(t => t.status === "completed").length} von {googleTasks.length} ({Math.round((googleTasks.filter(t => t.status === "completed").length / googleTasks.length) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 h-[2px] rounded-full overflow-hidden">
                          <div 
                            className="bg-neutral-950 h-full transition-all duration-300" 
                            style={{ width: `${Math.round((googleTasks.filter(t => t.status === "completed").length / googleTasks.length) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Form layout: Create action */}
                <form onSubmit={handleAddTask} className="flex gap-1.5 relative">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder={
                      isListening 
                        ? "Höre zu..." 
                        : taskSourceTab === "google" 
                          ? "In Google Tasks erstellen..." 
                          : "Neue lokale Aufgabe..."
                    }
                    className={`w-full bg-[#FAF9F5] py-2 pl-3 pr-16 rounded-xl border text-xs focus:outline-none focus:border-neutral-400 focus:bg-white transition ${
                      isListening ? "border-red-300 bg-red-50/10 text-red-950" : "border-neutral-200/60 text-neutral-800"
                    }`}
                  />
                  
                  {/* Microphone Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Stoppen" : "Aufsprechen"}
                    className={`absolute right-7 top-[4px] p-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                      isListening 
                        ? "bg-red-500 text-white animate-pulse hover:bg-red-650" 
                        : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="h-3 w-3" />
                    ) : (
                      <Mic className="h-3 w-3" />
                    )}
                  </button>

                  <button 
                    disabled={isTaskSaving || !newTaskTitle.trim()}
                    type="submit"
                    className="absolute right-1 top-[4px] p-1.5 bg-neutral-950 hover:bg-neutral-900 disabled:opacity-20 text-white rounded-lg cursor-pointer transition-all duration-150"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </form>

                {/* Rendering Filters and priorities ONLY for local tasks */}
                {taskSourceTab === "local" ? (
                  <>
                    {/* Priority Selection for new task */}
                    <div className="flex items-center gap-2 text-[10px] pb-1 border-b border-neutral-100/40">
                      <span className="text-neutral-400 font-mono font-medium lowercase">Priorität:</span>
                      <div className="flex gap-1.5">
                        {(["high", "medium", "low"] as const).map((p) => {
                          const isActive = newTaskPriority === p;
                          const label = { high: "Hoch", medium: "Mittel", low: "Gering" }[p];
                          const activeStyles = {
                            high: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
                            medium: "bg-amber-50 text-amber-700 border-amber-200 font-bold",
                            low: "bg-blue-50 text-blue-700 border-blue-200 font-bold",
                          };
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setNewTaskPriority(p)}
                              className={`px-2 py-0.5 rounded text-[9px] border transition cursor-pointer font-mono ${
                                isActive 
                                  ? activeStyles[p]
                                  : "bg-neutral-50/50 text-neutral-450 border-neutral-200/40 hover:bg-neutral-100"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Filter section for list of tasks */}
                    <div className="flex items-center justify-between gap-1 py-1 border-b border-neutral-100/50">
                      <span className="text-[9px] font-mono font-bold text-neutral-400 tracking-wider">FILTER:</span>
                      <div className="flex gap-1">
                        {(["all", "high", "medium", "low"] as const).map((filterVal) => {
                          const isActive = taskPriorityFilter === filterVal;
                          const label = { all: "Alle", high: "Hoch", medium: "Mittel", low: "Gering" }[filterVal];
                          const activeColors = {
                            all: "bg-neutral-900 border-neutral-900 text-white font-bold",
                            high: "bg-rose-600 border-rose-600 text-white font-bold",
                            medium: "bg-amber-600 border-amber-600 text-white font-bold",
                            low: "bg-blue-600 border-blue-600 text-white font-bold",
                          };
                          return (
                            <button
                              key={filterVal}
                              type="button"
                              onClick={() => setTaskPriorityFilter(filterVal)}
                              className={`px-2 py-0.5 rounded-lg border text-[9px] font-mono transition cursor-pointer ${
                                isActive 
                                  ? activeColors[filterVal] 
                                  : "bg-white border-neutral-200/50 text-neutral-500 hover:bg-neutral-50"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Local list container */}
                    <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin mt-1">
                      {todayTasks.length === 0 ? (
                        <span className="text-[11px] text-neutral-400 italic text-center py-4">Keine offenen Aufgaben.</span>
                      ) : todayTasks.filter(t => taskPriorityFilter === "all" || t.priority === taskPriorityFilter).length === 0 ? (
                        <span className="text-[11px] text-neutral-400 italic text-center py-4">Keine Aufgaben mit dieser Priorität.</span>
                      ) : (
                        todayTasks
                          .filter(t => taskPriorityFilter === "all" || t.priority === taskPriorityFilter)
                          .map(task => {
                            const isCompleted = task.status === "completed";
                            const priorityColors = {
                              high: "bg-rose-50 border-rose-100 text-rose-700",
                              medium: "bg-amber-50 border-amber-100 text-amber-700",
                              low: "bg-blue-50 border-blue-105 text-blue-700",
                            };
                            const priorityLabels = {
                              high: "hoch",
                              medium: "mittel",
                              low: "gering",
                            };
                            return (
                              <div 
                                key={task.id} 
                                className="flex items-start justify-between p-2 hover:bg-neutral-50 rounded-xl group transition-all"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskStatus(task)}
                                  className="flex items-start gap-2 text-left flex-1 cursor-pointer"
                                >
                                  <span className="mt-0.5 text-neutral-450 hover:text-neutral-900">
                                    {isCompleted ? (
                                      <CheckSquare className="h-3.5 w-3.5 text-neutral-900" />
                                    ) : (
                                      <Square className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                  <span className={`text-xs ${isCompleted ? 'line-through text-neutral-400' : 'text-neutral-700 font-medium'}`}>
                                    {task.title}
                                  </span>
                                </button>
                                
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  <span className={`text-[8px] font-mono px-1 rounded border leading-relaxed uppercase font-semibold ${priorityColors[task.priority || 'medium']}`}>
                                    {priorityLabels[task.priority || 'medium']}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTaskItem(task)}
                                    className="p-1 text-neutral-400 hover:text-red-650 opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Google tasks list container */}
                    <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin mt-1">
                      {isFetchingGoogleTasks && googleTasks.length === 0 ? (
                        <div className="flex items-center justify-center p-6 gap-2 text-neutral-400 text-xs">
                          <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
                          <span>Google Tasks werden geladen...</span>
                        </div>
                      ) : googleTasks.length === 0 ? (
                        <span className="text-[11px] text-neutral-400 italic text-center py-4">Keine Google Tasks gefunden.</span>
                      ) : (
                        googleTasks.map(task => {
                          const isCompleted = task.status === "completed";
                          return (
                            <div 
                              key={task.id} 
                              className="flex items-start justify-between p-2 hover:bg-neutral-50 rounded-xl group transition-all"
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleGoogleTaskStatusItem(task)}
                                        className="flex items-start gap-2 text-left flex-1 cursor-pointer"
                              >
                                <span className="mt-0.5 text-neutral-450 hover:text-neutral-900">
                                  {isCompleted ? (
                                    <CheckSquare className="h-3.5 w-3.5 text-neutral-900" />
                                  ) : (
                                    <Square className="h-3.5 w-3.5" />
                                  )}
                                </span>
                                <span className={`text-xs ${isCompleted ? 'line-through text-neutral-400' : 'text-neutral-700 font-medium'}`}>
                                  {task.title}
                                </span>
                              </button>
                              
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGoogleTaskItem(task)}
                                  className="p-1 text-neutral-400 hover:text-red-650 opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
                
              </div>
            </section>

            {/* 4b. Right Col: Main Center Summary Card OR Expanded View (9 cols on Desktop) */}
            <section className="lg:col-span-9 flex flex-col gap-6 order-1 lg:order-2">
              {!showDetailBrief ? (
                <>
                  {/* SUBVIEW A: EMPTY ACTION PANEL / CUSTOM BUILD STAGE */}
                  <div className="flex-1 flex flex-col p-6 md:p-8 bg-white border border-neutral-200/50 rounded-2xl gap-6 shadow-[0_4px_24px_rgba(0,0,0,0.01)] min-h-[460px]">
                  
                  {/* Compilation Loading overlay */}
                  {isCompiling ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 gap-5 animate-pulse">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-t border-neutral-950 animate-spin" />
                        <Headphones className="h-4 w-4 text-neutral-950 animate-bounce" />
                      </div>
                      
                      <div className="flex flex-col items-center gap-1 max-w-sm text-center">
                        <span className="text-[9px] font-mono font-bold tracking-widest text-neutral-450 uppercase">Synthese aktiv</span>
                        <h4 className="font-serif italic font-medium text-lg text-neutral-900 transition-all duration-300">
                          {COMPILING_PHASES[compilingPhaseIdx]}
                        </h4>
                        <p className="text-[10.5px] text-neutral-450 mt-1 leading-relaxed">
                          Wir konsolidieren Kalender, Postfächer und deine Wunschthemen in einen eleganten Erzählbericht...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Standard Welcome message */}
                      <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4 md:flex-row md:justify-between border-b border-neutral-100 pb-5">
                        <div className="flex-1 flex flex-col gap-0.5 text-left">
                          <span className="text-[9px] font-mono tracking-widest uppercase text-neutral-400 font-bold">Kuration</span>
                          <h3 className="font-serif text-xl font-medium text-neutral-950 tracking-tight mt-1.5">Morgenbericht erstellen</h3>
                          <p className="text-xs text-neutral-500 max-w-md leading-relaxed mt-1">
                            Verbinde dich fiktiv mit deinen Datenkanälen. Gemini liest und analysiert deine Daten in Echtzeit, um ein exzellentes Audio-Journal zu verfassen.
                          </p>
                        </div>

                        <div className="flex flex-shrink-0 gap-3">
                          <button
                            onClick={() => setShowSimulator(!showSimulator)}
                            className={`px-3.5 py-2 rounded-xl border text-[11px] font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                              showSimulator 
                                ? "bg-neutral-950 text-white border-neutral-950" 
                                : "bg-neutral-50 hover:bg-neutral-100/70 text-[#1D1C1A] border-neutral-200/50"
                            }`}
                          >
                            <Settings className="h-3.5 w-3.5" />
                            {showSimulator ? "Simulator ausblenden" : "Quellen anpassen"}
                          </button>
                        </div>
                      </div>

                      {/* Simulator Fields container */}
                      {showSimulator && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#FAF9F6]/80 border border-neutral-200/40 p-4 md:p-5 rounded-xl text-left"
                        >
                          <div className="md:col-span-2 border-b border-neutral-200/40 pb-2 flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold tracking-widest">Datenquellen konfigurieren</span>
                            <span className="text-[9px] font-mono text-neutral-400 font-medium">Simulator</span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5 text-neutral-400" />
                              Google Kalender Agenda (Simuliert)
                            </label>
                            <textarea
                              rows={3}
                              value={customCalendar}
                              onChange={(e) => setCustomCalendar(e.target.value)}
                              className="w-full bg-white border border-neutral-200/50 rounded-xl p-3 text-[11px] font-mono text-neutral-800 focus:outline-none focus:border-neutral-400 focus:bg-white transition leading-relaxed resize-none"
                              placeholder="Trage hier deine morgendlichen fiktiven Meetings ein..."
                            />
                          </div>

                          <div className="flex flex-col gap-1.5 font-sans">
                            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 text-neutral-400" />
                              Gmail Posteingang (Simuliert)
                            </label>
                            <textarea
                              rows={3}
                              value={customEmails}
                              onChange={(e) => setCustomEmails(e.target.value)}
                              className="w-full bg-white border border-neutral-200/50 rounded-xl p-3 text-[11px] font-mono text-neutral-800 focus:outline-none focus:border-neutral-400 focus:bg-white transition leading-relaxed resize-none"
                              placeholder="Füge hier dringende Emails hinzu..."
                            />
                          </div>

                          <div className="md:col-span-2 flex flex-col gap-1.5 mt-1 border-t border-neutral-200/20 pt-3">
                            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 flex items-center gap-1">
                              <Cloud className="h-3.5 w-3.5 text-neutral-400" />
                              Wetterbericht-Vorlage (Simuliert)
                            </label>
                            <input
                              type="text"
                              value={customWeather}
                              onChange={(e) => setCustomWeather(e.target.value)}
                              className="w-full bg-white border border-neutral-200/50 rounded-xl px-3 py-2 text-[11px] font-mono text-neutral-800 focus:outline-none focus:border-neutral-400 focus:bg-white transition"
                              placeholder="z.B. Wetter in Berlin: 18 Grad..."
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Generate / Action trigger box */}
                      <div className="flex-1 flex flex-col items-center justify-center py-6 gap-5">
                        <div className="p-3 bg-neutral-50 border border-neutral-200/40 rounded-full text-center">
                          <Headphones className="h-6 w-6 text-neutral-700 animate-pulse" />
                        </div>
                        
                        <div className="flex flex-col gap-1 max-w-sm text-center">
                          <h4 className="font-serif font-medium text-lg text-neutral-900">Synthetisiere deine Morgenchronik</h4>
                          <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                            Analysiert deine Termine, blendet E-Mails ein und verfasst exquisite Tagesgedanken mit dem exklusiven Erzähler KORE.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm mt-3">
                          <button
                            onClick={handleCompileDailyBrief}
                            className="flex-1 py-3 px-5 bg-neutral-950 hover:bg-neutral-900 font-mono font-bold tracking-widest text-white text-xs uppercase rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            <Play className="h-3.5 w-3.5 text-white fill-white" />
                            <span>Morgenbericht erstellen</span>
                          </button>
                          
                          {briefsHistory.length > 0 && (
                            <button
                              onClick={() => setShowDetailBrief(briefsHistory[0])}
                              className="py-3 px-5 bg-neutral-50 border border-neutral-200/50 hover:bg-neutral-100 text-neutral-800 text-xs font-mono font-bold tracking-widest uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Eye className="h-4 w-4" /> Letzter Bericht
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Live Google News Feed Card */}
                {settings && (
                  <div className="bg-white border border-neutral-200/50 rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col gap-5 text-left transition-all duration-300">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] uppercase font-mono tracking-widest text-[#9A9890] font-bold">Personalisiertes Google News Journal</span>
                        </div>
                        <h4 className="font-serif text-lg font-medium text-neutral-900 tracking-tight mt-1">Echtzeit-Nachrichtenstrom</h4>
                      </div>
                      
                      <button
                        onClick={() => fetchLiveNewsFeed(settings.topics, settings.newsSources)}
                        disabled={isLiveNewsLoading}
                        title="Nachrichten aktualisieren"
                        className="p-2 text-neutral-450 hover:text-neutral-950 hover:bg-neutral-100/70 rounded-xl border border-neutral-200/50 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <RefreshCw className={`h-4 w-4 text-neutral-600 ${isLiveNewsLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    {isLiveNewsLoading ? (
                      <div className="flex flex-col gap-3.5 py-4">
                        {[1, 2, 3, 4].map((idx) => (
                          <div key={idx} className="flex flex-col gap-2 animate-pulse">
                            <div className="h-4 bg-neutral-100 rounded-md w-3/4" />
                            <div className="flex gap-2">
                              <div className="h-2 bg-neutral-55 rounded w-16" />
                              <div className="h-2 bg-neutral-55 rounded w-24" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : liveNewsFeed.length === 0 ? (
                      <div className="py-8 text-center flex flex-col items-center gap-1.5 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200/40">
                        <span className="text-xs text-neutral-400 italic">Keine aktuellen Artikel geladen.</span>
                        <button
                          onClick={() => fetchLiveNewsFeed(settings.topics, settings.newsSources)}
                          className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-neutral-600 hover:text-black mt-1"
                        >
                          Jetzt suchen &amp; laden
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                        {liveNewsFeed.map((item, idx) => {
                          let formattedDate = "";
                          try {
                            const dateObj = new Date(item.pubDate);
                            formattedDate = dateObj.toLocaleDateString("de-DE", { 
                              day: "2-digit", 
                              month: "short", 
                              hour: "2-digit", 
                              minute: "2-digit" 
                            });
                          } catch {
                            formattedDate = item.pubDate;
                          }

                          return (
                            <div 
                              key={idx} 
                              className="flex flex-col gap-1.5 pb-3 border-b border-neutral-100/60 last:border-b-0 last:pb-0 group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] bg-neutral-50 border border-neutral-200/40 text-neutral-500 font-mono px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">
                                  {item.topic}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-sans font-medium">
                                  {item.source}
                                </span>
                                <span className="text-[9px] text-neutral-400 font-mono ml-auto">
                                  {formattedDate}
                                </span>
                              </div>
                              
                              <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-neutral-800 hover:text-neutral-950 font-serif font-medium text-sm leading-snug cursor-pointer group-hover:underline transition-all"
                              >
                                {item.title}
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                </>
              ) : (

                /* SUBVIEW B: DETAILED DOCUMENT DECK */
                <div className="grid grid-cols-1 gap-6 animate-fade-in">
                  
                  {/* Top quick-back bar */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowDetailBrief(null)}
                      className="text-xs text-neutral-500 hover:text-black flex items-center gap-1.5 cursor-pointer font-bold font-mono tracking-widest uppercase transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" /> zurück zu briefings
                    </button>

                    <span className="text-[9px] font-mono text-neutral-400 tracking-wider">
                      Generiert über Gemini 2.5
                    </span>
                  </div>

                  {/* 1. Centered Morning Highlight Card representing the user spec center piece */}
                  <div className="bg-white border border-neutral-200/50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 justify-between shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
                    <div className="flex-1 flex flex-col gap-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono uppercase text-neutral-450 font-bold tracking-widest leading-none">
                          Tages-Journal Preview
                        </span>
                        <span className="text-xs font-mono text-neutral-400">• {formatDateGerman(showDetailBrief.date)}</span>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <h3 className="font-serif italic font-medium text-2xl text-neutral-900 tracking-tight">
                          {showDetailBrief.briefingTitle || "Dein Morgenbericht"}
                        </h3>
                        <p className="text-xs text-neutral-450 leading-relaxed font-serif italic mt-0.5">
                          "Guten Morgen {currentUser.displayName || "Nutzer"}. Hier ist deine kompakte, intelligente Übersicht für heute."
                        </p>
                      </div>

                      {/* Summary bullets (Exactly 3) required by the target design */}
                      <div className="flex flex-col gap-2 mt-2 border-t border-neutral-100 pt-4">
                        <span className="text-[9px] font-mono uppercase text-neutral-455 tracking-widest font-bold pb-1">Das Wichtigste heute:</span>
                        {showDetailBrief.summaryBullets?.map((bullet, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-neutral-700 leading-normal">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-neutral-900 shrink-0" />
                            <p className="font-medium text-neutral-750">{bullet}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Integrated audio triggers inside the main highlights preview */}
                    <div className="flex flex-col items-center gap-3.5 p-5 bg-neutral-50/70 rounded-xl border border-neutral-200/40 w-full md:w-60 shrink-0">
                      <button 
                        onClick={() => handleToggleAudioPlayback(showDetailBrief)}
                        disabled={isAudioLoading}
                        className="h-12 w-12 rounded-full flex items-center justify-center bg-neutral-950 text-white hover:bg-neutral-900 transition shadow-sm shrink-0 cursor-pointer disabled:opacity-40"
                        title="Vorlesen starten"
                      >
                        {isAudioLoading ? (
                          <RefreshCw className="h-5 w-5 animate-spin text-white" />
                        ) : isPlaying && isPlayingBriefId === showDetailBrief.id ? (
                          <Pause className="h-5 w-5 text-white" />
                        ) : (
                          <Play className="h-5 w-5 ml-0.5 text-white" />
                        )}
                      </button>

                      <div className="flex flex-col text-center">
                        <span className="text-[9px] uppercase font-mono tracking-widest font-bold text-neutral-800">JOURNAL ANHÖREN</span>
                        <span className="text-[9px] font-mono text-neutral-400 mt-1">{selectedVoice} • {speechRate}x</span>
                      </div>

                      {isPlaying && isPlayingBriefId === showDetailBrief.id && (
                        <div className="w-full mt-1.5">
                          <AudioVisualizer isPlaying={isPlaying} isInterrupting={false} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Structured Sections Breakdown: block display widgets for Wetter, News, Termine, Emails, Aufgaben */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Wetter Widget */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                      className="bg-white border border-neutral-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.01)] text-left"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                        <h4 className="font-serif italic font-medium text-sm text-neutral-900 flex items-center gap-1.5">
                          <Cloud className="h-4 w-4 text-neutral-500" /> Wettervorhersage
                        </h4>
                        <span className="text-[8px] bg-neutral-50 border border-neutral-200/40 text-neutral-500 font-mono px-2 py-0.5 rounded font-bold uppercase">{settings?.location}</span>
                      </div>
                      <div className="text-xs text-neutral-600 leading-relaxed font-sans">
                        <div className="text-xs leading-normal font-sans" dangerouslySetInnerHTML={{ __html: showDetailBrief.weatherContent || "Keine Wetterdaten für heute." }} />
                      </div>
                    </motion.div>
 
                    {/* Kalendertermine Widget */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                      className="bg-white border border-neutral-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.01)] text-left"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                        <h4 className="font-serif italic font-medium text-sm text-neutral-900 flex items-center gap-1.5">
                          <CalendarIcon className="h-4 w-4 text-neutral-500" /> Kalender Agenda
                        </h4>
                        <span className="text-[8px] bg-neutral-50 border border-neutral-200/40 text-neutral-500 font-mono px-2 py-0.5 rounded font-bold uppercase">Google Calendar</span>
                      </div>
                      <div className="text-xs text-neutral-600 leading-relaxed">
                        {settings?.includeCalendar ? (
                          <div className="text-xs leading-normal font-sans" dangerouslySetInnerHTML={{ __html: showDetailBrief.calendarContent || "Keine Kalenderdaten bereitgestellt." }} />
                        ) : (
                          <span className="text-neutral-400 italic">Terminabgleich deaktiviert in Einstellungen.</span>
                        )}
                      </div>
                    </motion.div>
 
                    {/* Nachrichten / Topics Widget */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                      className="bg-white border border-neutral-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.01)] md:col-span-2 text-left"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                        <h4 className="font-serif italic font-medium text-sm text-neutral-900 flex items-center gap-1.5">
                          <Newspaper className="h-4 w-4 text-neutral-500" /> Medien &amp; Themen
                        </h4>
                        <div className="flex gap-1.5">
                          {settings?.topics.slice(0, 5).map(t => (
                            <span key={t} className="text-[8px] bg-neutral-50 border border-neutral-200/40 text-neutral-500 font-mono px-1.5 py-0.5 rounded uppercase font-bold">{t}</span>
                          ))}
                          {settings?.topics && settings.topics.length > 5 && (
                            <span className="text-[8px] bg-neutral-50 border border-neutral-200/40 text-neutral-500 font-mono px-1.5 py-0.5 rounded uppercase font-bold">+{settings.topics.length - 5}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-neutral-650 leading-relaxed py-1 border-l border-neutral-250 pl-3">
                        <div className="text-xs leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: showDetailBrief.newsContent || "Keine Nachrichten für heute." }} />
                      </div>
                    </motion.div>
 
                    {/* Wichtige E-Mails Widget */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
                      className="bg-white border border-neutral-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.01)] text-left"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                        <h4 className="font-serif italic font-medium text-sm text-neutral-900 flex items-center gap-1.5">
                          <Mail className="h-4 w-4 text-neutral-500" /> Dringende E-Mails
                        </h4>
                        <span className="text-[8px] bg-neutral-50 border border-neutral-200/40 text-neutral-500 font-mono px-2 py-0.5 rounded font-bold uppercase">Gmail Inbox</span>
                      </div>
                      <div className="text-xs text-neutral-600 leading-relaxed">
                        {settings?.includeEmail ? (
                          <div className="text-xs leading-normal font-sans" dangerouslySetInnerHTML={{ __html: showDetailBrief.emailsContent || "Keine relevanten ungelesenen E-Mails." }} />
                        ) : (
                          <span className="text-neutral-400 italic">E-Mail-Filter deaktiviert in Einstellungen.</span>
                        )}
                      </div>
                    </motion.div>
 
                    {/* Aufgaben Widget */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
                      className="bg-white border border-neutral-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.01)] text-left"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                        <h4 className="font-serif italic font-medium text-sm text-neutral-900 flex items-center gap-1.5">
                          <CheckSquare className="h-4 w-4 text-neutral-500" /> To-dos heute
                        </h4>
                        <span className="text-[8px] bg-neutral-50 border border-neutral-200/40 text-neutral-500 font-mono px-2 py-0.5 rounded font-bold uppercase">Aufgaben</span>
                      </div>
                      <div className="text-xs text-neutral-650 leading-relaxed">
                        {settings?.includeTasks ? (
                          <div className="text-xs leading-normal font-sans" dangerouslySetInnerHTML={{ __html: showDetailBrief.tasksContent || "Keine Aufgaben für heute registriert." }} />
                        ) : (
                          <span className="text-neutral-400 italic">Aufgaben-Zusammenfassung deaktiviert.</span>
                        )}
                      </div>
                    </motion.div>

                    {/* eSign & Verträge Agenda Widget */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
                      className="bg-white border border-neutral-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.01)] text-left"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                        <h4 className="font-serif italic font-medium text-sm text-neutral-900 flex items-center gap-1.5">
                          <PenTool className="h-4 w-4 text-neutral-500" /> eSign &amp; Verträge
                        </h4>
                        <span className="text-[8px] bg-neutral-50 border border-neutral-200/40 text-neutral-500 font-mono px-2 py-0.5 rounded font-bold uppercase">Signatur-Status</span>
                      </div>
                      <div className="text-xs text-neutral-600 leading-relaxed flex flex-col gap-3">
                        <div className="text-xs leading-normal font-sans" dangerouslySetInnerHTML={{ __html: showDetailBrief.esignContent || "Keine ausstehenden Verträge zur Unterschrift." }} />
                        
                        {showDetailBrief.esignContent && !showDetailBrief.esignContent.includes("Keine") && !showDetailBrief.esignContent.includes("unterzeichnet") && (
                          <button 
                            onClick={() => {
                              triggerAlert("success", "Unterschriftenmappe erfolgreich geladen! Alle Dokumente wurden per eSign freigegeben.");
                              setShowDetailBrief(prev => prev ? {
                                ...prev,
                                esignContent: "### ✍️ eSign Dokumentensignaturen (Simuliert)\n\n* **Partnerschaftsvertrag Entwurf V2** - ✅ Elektronisch unterzeichnet\n* **Vertraulichkeitsvereinbarung (NDA)** - ✅ Elektronisch unterzeichnet\n\n*Status: Alle eSign Unterschriften erfolgreich geleistet.*"
                              } : null);
                            }}
                            className="mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-neutral-900 text-white rounded-lg text-[10px] font-medium font-mono hover:bg-neutral-800 transition active:scale-95 text-center cursor-pointer"
                          >
                            <PenTool className="h-3 w-3" /> Ausstehende jetzt signieren
                          </button>
                        )}
                      </div>
                    </motion.div>
 
                  </div>

                  {/* 3. Immersive narrative block reading card strictly as a reading deck */}
                  <div className="bg-white border border-neutral-200/50 rounded-2xl p-6 md:p-8 flex flex-col gap-4 text-left">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                      <span className="text-[9px] font-mono uppercase text-neutral-400 tracking-widest font-bold flex items-center gap-1.5">
                        <Volume2 className="h-4 w-4" /> Volles Manuskript
                      </span>
                      {isPlaying && isPlayingBriefId === showDetailBrief.id && (
                        <button 
                          onClick={handleStopAudioReset}
                          className="text-[9px] bg-neutral-50 border border-rose-250 text-rose-605 group-hover:text-rose-700 hover:bg-rose-100 px-2 flex items-center gap-0.5 cursor-pointer transition font-mono uppercase font-bold"
                        >
                          STOPP
                        </button>
                      )}
                    </div>
                    <div className="font-serif text-[13.5px] leading-relaxed text-neutral-800 space-y-4 max-w-2xl mt-2 select-text antialiased">
                      <p className="whitespace-pre-line">{showDetailBrief.text}</p>
                    </div>
                  </div>

                </div>
              )}

            </section>
          </div>
        )}
      </div>

          </div>
        )}
      </main>

      {/* 5. IMMERSIVE PERSISTENT FOOTER AUDIO CONTROL BAR - Capsule style */}
      <AnimatePresence>
        {isPlayingBriefId && showDetailBrief && (
          <motion.footer 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-[76px] md:bottom-5 left-4 right-4 z-40 bg-[#1D1C1A] text-white p-4 flex flex-col md:flex-row items-center gap-4 justify-between max-w-4xl mx-auto rounded-2xl shadow-xl border border-neutral-800"
          >
            <div className="flex items-center gap-4 w-full md:w-auto text-left">
              <button
                onClick={() => handleToggleAudioPlayback(showDetailBrief)}
                className={`h-9 w-9 rounded-full bg-white hover:bg-neutral-100 text-black flex items-center justify-center cursor-pointer transition shadow-md shrink-0 ${isPlaying ? 'animate-pulse' : ''}`}
                title={isPlaying ? "Pausieren" : "Abspielen"}
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 text-black" />
                ) : (
                  <Play className="h-3.5 w-3.5 ml-0.5 text-black" />
                )}
              </button>
              <button
                onClick={handleStopAudioReset}
                className="h-7 w-7 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white rounded-full flex items-center justify-center cursor-pointer transition"
                title="Wiedergabe stoppen"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              
              <div className="flex flex-col min-w-0 max-w-[150px] md:max-w-[200px]">
                <span className="text-[8px] font-mono uppercase text-neutral-400 tracking-wider font-semibold leading-none">WIRD VORGELESEN</span>
                <span className="text-xs font-serif italic truncate text-neutral-200 mt-1 leading-none">{showDetailBrief.briefingTitle || "Morgenübersicht"}</span>
              </div>
            </div>

            {/* Progress Bar & Seek section */}
            <div className="flex-1 w-full max-w-md flex items-center gap-3 px-2">
              <span className="text-[10px] font-mono text-neutral-400 select-none min-w-[32px] text-right">
                {formatTime(playbackCurrentSeconds)}
              </span>
              <div className="relative flex-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={playbackProgress}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white transition-all outline-none focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #ffffff ${playbackProgress}%, #27272a ${playbackProgress}%)`
                  }}
                  title="Audio positionieren"
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-400 select-none min-w-[32px]">
                {formatTime(playbackDurationSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="h-6 w-[1px] bg-neutral-800 hidden md:block" />
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                <span>Stimme:</span>
                <span className="font-semibold text-neutral-200">{selectedVoice} ({speechRate}x)</span>
              </div>
              <div className="w-24 md:w-32 animate-fade-in">
                <AudioVisualizer isPlaying={isPlaying} isInterrupting={false} />
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* 6. MOBILE BOTTOM NAVIGATION TAB BAR */}
      {currentUser && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/60 py-3 px-3 flex items-center justify-around shadow-lg">
          <button 
            onClick={() => { setViewTab("dashboard"); setShowDetailBrief(null); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${viewTab === "dashboard" && !showDetailBrief ? "text-neutral-950 font-bold" : "text-neutral-400"}`}
          >
            <Headphones className="h-4.5 w-4.5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">Briefings</span>
          </button>
          
          <button 
            onClick={() => { setViewTab("news"); setShowDetailBrief(null); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors relative ${viewTab === "news" ? "text-neutral-950 font-bold" : "text-neutral-400"}`}
          >
            <div className="relative">
              <Newspaper className="h-4.5 w-4.5" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider">News</span>
          </button>

          <button 
            onClick={() => { setViewTab("podcast"); setShowDetailBrief(null); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${viewTab === "podcast" ? "text-neutral-950 font-bold" : "text-neutral-400"}`}
          >
            <Mic className="h-4.5 w-4.5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">Podcast</span>
          </button>

          <button 
            onClick={() => { setViewTab("settings"); setShowDetailBrief(null); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${viewTab === "settings" ? "text-neutral-950 font-bold" : "text-neutral-400"}`}
          >
            <Settings className="h-4.5 w-4.5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">Setup</span>
          </button>
        </div>
      )}

    </div>
  );
}
