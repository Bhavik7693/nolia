import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { apiRequest } from "@/lib/queryClient";
import { VoiceOverlay } from "@/components/home/VoiceOverlay";
import { OnboardingOverlay } from "@/components/home/OnboardingOverlay";
import { HeaderNav } from "@/components/home/HeaderNav";
import { HistorySidebar } from "@/components/home/HistorySidebar";
import { HomeSearchView } from "@/components/home/views/HomeSearchView";
import { LoadingView } from "@/components/home/views/LoadingView";
import { AnswerView } from "@/components/home/views/AnswerView";

type SpeechRecognitionResultLike = {
  transcript: string;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

type View = "home" | "loading" | "answer";

const mockAnswer = `Artificial Intelligence (AI) [1] refers to the simulation of human intelligence by machines, particularly computer systems. These processes include learning, reasoning, and self-correction [2].

The current landscape is dominated by Generative AI and Large Language Models (LLMs) [3]. These systems are trained on vast datasets to recognize patterns and generate content that mimics human output [2]. Key applications range from natural language processing to autonomous systems.`;

const takeaways = [
  "AI mimics human intelligence through learning and reasoning.",
  "Generative AI and LLMs are the current dominant technologies.",
  "Applications include NLP, image generation, and predictive analytics.",
];

export default function Home() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("home");
  const [answer, setAnswer] = useState(mockAnswer);
  const [loadingStep, setLoadingStep] = useState(0);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [citations, setCitations] = useState<
    { url: string; title?: string }[]
  >([]);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    experience: "",
    interests: [] as string[],
    style: "Balanced",
  });
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceCancelledRef = useRef(false);
  const lastVoiceTranscriptRef = useRef("");
  const themeMqlRef = useRef<MediaQueryList | null>(null);
  const themeMqlHandlerRef = useRef<((e: MediaQueryListEvent) => void) | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const loadingMessages = [
    { title: "Analyzing Sources", subtitle: "VERIFYING CLAIMS..." },
    { title: "Searching the Web", subtitle: "GATHERING EVIDENCE..." },
    { title: "Cross-checking Facts", subtitle: "VALIDATING SOURCES..." },
    { title: "Building Answer", subtitle: "ASSEMBLING CITATIONS..." },
  ] as const;

  useEffect(() => {
    if (view !== "loading") {
      setLoadingStep(0);
      return;
    }

    const id = window.setInterval(() => {
      setLoadingStep((s) => (s + 1) % loadingMessages.length);
    }, 1400);

    return () => {
      window.clearInterval(id);
    };
  }, [view, loadingMessages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (view === "home") {
          textAreaRef.current?.focus();
        } else {
          setView("home");
          setTimeout(() => textAreaRef.current?.focus(), 100);
        }
      }
      // Go back: Escape
      if (e.key === "Escape") {
        if (view !== "home") setView("home");
        if (showHistory) setShowHistory(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, showHistory]);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowTutorial(true);
    }
  }, []);

  const onboardingSteps = [
    {
      title: "How experienced are you with AI?",
      description: "We'll tailor the answer complexity to your level.",
      options: ["Beginner", "Intermediate", "Expert"],
      key: "experience",
    },
    {
      title: "What are your main interests?",
      description: "Pick topics you'll likely ask about most.",
      options: ["Technology", "Science", "Business", "History", "Arts", "Design"],
      key: "interests",
      multi: true,
    },
    {
      title: "Preferred answer style?",
      description: "Choose how you want the information presented.",
      options: ["Concise", "Balanced", "Detailed", "Creative"],
      key: "style",
    },
  ];

  const handleOnboardingNext = (value: string) => {
    if (onboardingSteps[tutorialStep].multi) {
      const current = userPreferences.interests;
      const updated = current.includes(value) 
        ? current.filter(i => i !== value)
        : [...current, value];
      setUserPreferences({ ...userPreferences, interests: updated });
    } else {
      setUserPreferences({ ...userPreferences, [onboardingSteps[tutorialStep].key]: value });
      if (tutorialStep < onboardingSteps.length - 1) {
        setTutorialStep(tutorialStep + 1);
      } else {
        setShowTutorial(false);
        localStorage.setItem("hasSeenOnboarding", "true");
      }
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("theme", next ? "dark" : "light");

    const mql = themeMqlRef.current;
    const handler = themeMqlHandlerRef.current;
    if (mql && handler && "removeEventListener" in mql) {
      mql.removeEventListener("change", handler);
      themeMqlRef.current = null;
      themeMqlHandlerRef.current = null;
    }
  };

  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return;

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;

    const onChange = (e: MediaQueryListEvent) => {
      setDark(e.matches);
    };

    setDark(mql.matches);

    if ("addEventListener" in mql) {
      themeMqlRef.current = mql;
      themeMqlHandlerRef.current = onChange;
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    return;
  }, []);

  const deriveTakeaways = (text: string) => {
    const parts = text
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const merged = parts.join(" ");
    const sentences = merged
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const picks: string[] = [];
    for (const s of sentences) {
      const cleaned = s.replace(/\[\d+\]/g, "").trim();
      if (cleaned.length < 30) continue;
      picks.push(cleaned.length > 140 ? `${cleaned.slice(0, 140)}...` : cleaned);
      if (picks.length >= 3) break;
    }

    return picks.length > 0 ? picks : takeaways;
  };

  const sanitizeAnswerForDisplay = (text: string) => {
    let out = text.replace(/\r\n/g, "\n");

    // Keep markdown for display; only do safe cleanup (dedupe + remove trailing Sources footer).

    const sourcesIdx = out.search(/\n\s*(\*\*Sources:\*\*|Sources:)\s*/i);
    if (sourcesIdx >= 0) {
      const tail = out.slice(sourcesIdx);
      const hasUrl = /https?:\/\//i.test(tail);
      if (!hasUrl) {
        out = out.slice(0, sourcesIdx).trimEnd();
      }
    }

    const chunks: string[] = [];
    const lines = out.split("\n");
    let buf: string[] = [];
    let inFence = false;
    for (const line of lines) {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        buf.push(line);
        continue;
      }

      if (!inFence && !line.trim()) {
        const block = buf.join("\n").trim();
        if (block) chunks.push(block);
        buf = [];
        continue;
      }

      buf.push(line);
    }
    const last = buf.join("\n").trim();
    if (last) chunks.push(last);

    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const p of chunks) {
      const key = p.replace(/\s+/g, " ").trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(p);
    }

    return deduped.join("\n\n");
  };

  const stripMarkdownForTakeaways = (text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  };

  const buildFallbackFollowUps = (q: string): string[] => {
    const cleaned = q
      .replace(/[\r\n]+/g, " ")
      .replace(/[?!.]+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const topic = (cleaned.replace(/^\s*(what|who|where|when|why|how|explain|tell me|define|latest|current)\b\s*/i, "")
      .trim() || cleaned).slice(0, 80);

    const base = [
      `What are the key facts about ${topic}?`,
      `Any recent updates or news about ${topic}?`,
      `Summarize ${topic} in 5 bullet points.`,
    ];

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const s of base) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(s);
    }
    return unique.slice(0, 3);
  };

  const pageTitle = (() => {
    if (view === "answer" && query.trim()) {
      return `${query.trim()} — NOLIA`;
    }
    return "NOLIA";
  })();

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  const go = async (nextQuery?: string) => {
    const q = (nextQuery ?? query).trim();
    if (!q) return;

    setQuery(q);
    setView("loading");
    setFeedback(null);
    setComment("");
    setShowCommentBox(false);

    try {
      const res = await apiRequest("POST", "/api/ask", {
        question: q,
        style: userPreferences.style,
        mode: "verified",
        language: "auto",
        useWeb: true,
      });
      const data = (await res.json()) as {
        answer: string;
        citations: { url: string; title?: string }[];
        followUps?: string[];
      };

      setAnswer(data.answer);
      setCitations(data.citations ?? []);
      setFollowUps(
        Array.isArray(data.followUps) && data.followUps.length
          ? data.followUps
          : buildFallbackFollowUps(q),
      );
      setHistory((prev) => [{ q, a: data.answer }, ...prev].slice(0, 5));
      setView("answer");
    } catch (err) {
      console.error(err);
      toast.error("Failed to get an answer. Configure API keys and try again.");
      setView("home");
    }
  };

  const displayAnswer = sanitizeAnswerForDisplay(answer);
  const derivedTakeaways = deriveTakeaways(stripMarkdownForTakeaways(displayAnswer));

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const startListening = () => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice input is not supported in this browser");
      return;
    }

    if (isListening) return;

    voiceCancelledRef.current = false;
    lastVoiceTranscriptRef.current = "";
    setVoiceText("");

    const recognition = recognitionRef.current ?? new Ctor();
    recognitionRef.current = recognition;

    recognition.lang = window.navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (ev) => {
      const idx = ev.results.length - 1;
      const t = ev.results[idx]?.[0]?.transcript ?? "";
      lastVoiceTranscriptRef.current = t;
      setVoiceText(t);
    };

    recognition.onerror = (ev) => {
      const code = ev?.error || "";
      voiceCancelledRef.current = true;
      if (code === "not-allowed" || code === "service-not-allowed") {
        toast.error("Microphone permission denied. Please allow mic access in your browser.");
      } else {
        const msg = ev?.message || (code ? `Voice input failed: ${code}` : "Voice input failed");
        toast.error(msg);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceCancelledRef.current) return;

      const finalText = lastVoiceTranscriptRef.current.trim();
      if (!finalText) {
        toast.error("No speech detected");
        return;
      }

      setQuery(finalText);
      toast.success("Voice captured");
      void go(finalText);
    };

    try {
      setIsListening(true);
      toast.info("Listening…");
      recognition.start();
    } catch {
      setIsListening(false);
      toast.error("Unable to start voice input");
    }
  };

  const stopListening = () => {
    voiceCancelledRef.current = true;
    setIsListening(false);
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.abort();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (!r) return;
      try {
        r.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const share = async () => {
    const shareData = {
      title: 'NOLIA Answer',
      text: `Check out this answer for: "${query}"\n\n${answer}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n\nShared via NOLIA: ${shareData.url}`);
        toast.success("Share link copied to clipboard");
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground transition-colors duration-500 selection:bg-primary/10 relative flex flex-col items-center justify-center font-sans overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Voice Search Overlay */}
      <VoiceOverlay open={isListening} voiceText={voiceText} onClose={stopListening} />

      {/* Onboarding Overlay */}
      <OnboardingOverlay
        open={showTutorial}
        steps={onboardingSteps}
        stepIndex={tutorialStep}
        selectedInterests={userPreferences.interests}
        onSelectOption={handleOnboardingNext}
        onContinue={() => {
          if (tutorialStep < onboardingSteps.length - 1) {
            setTutorialStep(tutorialStep + 1);
          } else {
            setShowTutorial(false);
            localStorage.setItem("hasSeenOnboarding", "true");
          }
        }}
      />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="contents"
        >
          {/* Header */}
          <HeaderNav
            dark={dark}
            onLogoClick={() => setView("home")}
            onToggleHistory={() => setShowHistory(!showHistory)}
            onToggleTheme={toggleTheme}
          />

          {/* History Sidebar */}
          <HistorySidebar
            open={showHistory}
            history={history}
            onClose={() => setShowHistory(false)}
            onSelectQuery={(q) => {
              setQuery(q);
              void go(q);
              setShowHistory(false);
            }}
            onClear={() => setHistory([])}
          />

          <main className="w-full max-w-2xl px-4 sm:px-6 py-20 flex flex-col justify-center min-h-screen">
            <AnimatePresence mode="wait">
              {view === "home" && (
                <HomeSearchView
                  query={query}
                  onChangeQuery={setQuery}
                  onSubmit={() => void go()}
                  isListening={isListening}
                  onToggleListening={isListening ? stopListening : startListening}
                  textAreaRef={textAreaRef}
                />
              )}

              {view === "loading" && (
                <LoadingView loadingMessages={loadingMessages} loadingStep={loadingStep} />
              )}

              {view === "answer" && (
                <AnswerView
                  query={query}
                  takeaways={derivedTakeaways}
                  displayAnswer={displayAnswer}
                  answerForCopy={answer}
                  followUps={followUps}
                  citations={citations}
                  feedback={feedback}
                  comment={comment}
                  showCommentBox={showCommentBox}
                  copied={copied}
                  onGoHome={() => setView("home")}
                  onSelectFollowUp={(q) => void go(q)}
                  onSetFeedback={setFeedback}
                  onSetComment={setComment}
                  onSetShowCommentBox={setShowCommentBox}
                  onShare={share}
                  onCopy={copy}
                  onRetry={() => void go()}
                />
              )}
            </AnimatePresence>
          </main>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
