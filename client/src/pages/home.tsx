import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Copy,
  RefreshCw,
  Check,
  Search,
  Moon,
  Sun,
  History,
  Trash2,
  ExternalLink,
  BookOpen,
} from "lucide-react";

type View = "home" | "loading" | "answer";

const mockAnswer = `Artificial Intelligence (AI) [1] refers to the simulation of human intelligence by machines, particularly computer systems. These processes include learning, reasoning, and self-correction [2].

The current landscape is dominated by Generative AI and Large Language Models (LLMs) [3]. These systems are trained on vast datasets to recognize patterns and generate content that mimics human output [2]. Key applications range from natural language processing to autonomous systems.`;

const suggestions = [
  "How does Generative AI work?",
  "Latest trends in LLM research",
  "Future of AI autonomous systems",
];

const takeaways = [
  "AI mimics human intelligence through learning and reasoning.",
  "Generative AI and LLMs are the current dominant technologies.",
  "Applications include NLP, image generation, and predictive analytics.",
];

export default function Home() {
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("home");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

  const go = () => {
    if (query.trim()) {
      setView("loading");
      setTimeout(() => {
        setHistory(prev => [{ q: query, a: mockAnswer }, ...prev].slice(0, 5));
        setView("answer");
      }, 1200);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground transition-colors duration-500 selection:bg-primary/10 relative flex flex-col items-center justify-center font-sans overflow-hidden">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="contents"
        >
          {/* Header */}
          <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-xl border-b border-border/40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 md:py-6 flex items-center justify-between">
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setView("home")}
              >
                <div className="w-5 h-5 bg-foreground rounded-[4px] transition-transform group-hover:scale-110" />
                <span className="text-lg font-semibold tracking-tight">AskVerify</span>
              </motion.div>
              
              <div className="flex items-center gap-2">
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 hover:bg-muted rounded-full transition-colors active:scale-90"
                  title="History"
                >
                  <History className="w-4 h-4" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => setDark(!dark)}
                  className="p-2 hover:bg-muted rounded-full transition-colors active:scale-90"
                >
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          </nav>

          {/* History Sidebar */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-card/95 border-l border-border/40 z-[60] p-6 shadow-2xl backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-lg">Recent Queries</h3>
                  <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground p-2 text-sm font-medium">
                    Close
                  </button>
                </div>
                <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-2 scrollbar-none">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No recent activity</p>
                  ) : (
                    history.map((item, i) => (
                      <div 
                        key={i} 
                        className="p-4 rounded-2xl border border-border/40 hover:border-primary/20 transition-all cursor-pointer group bg-background/50 active:scale-[0.98]" 
                        onClick={() => { setQuery(item.q); go(); setShowHistory(false); }}
                      >
                        <p className="text-sm font-semibold truncate mb-1">{item.q}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.a}</p>
                      </div>
                    ))
                  )}
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={() => setHistory([])} 
                    className="absolute bottom-6 left-6 right-6 h-10 border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear History
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <main className="w-full max-w-2xl px-4 sm:px-6 py-20 flex flex-col justify-center min-h-screen">
            <AnimatePresence mode="wait">
              {view === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="space-y-12 md:space-y-16"
                >
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-center leading-[1.1] text-foreground">
                    Search the world's <span className="font-light italic text-muted-foreground">knowledge.</span>
                  </h1>

                  <div className="relative max-w-2xl mx-auto w-full group">
                    <div className="relative border border-border/40 bg-card/20 rounded-[32px] shadow-2xl transition-all overflow-hidden focus-within:ring-1 focus-within:ring-foreground/10 focus-within:border-foreground/20 hover:border-foreground/10 backdrop-blur-sm">
                      <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            go();
                          }
                        }}
                        placeholder="Ask anything..."
                        className="w-full min-h-[160px] md:min-h-[180px] p-6 sm:p-8 pb-20 bg-transparent resize-none focus:outline-none text-lg sm:text-xl leading-relaxed placeholder:text-muted-foreground/20 font-light tracking-tight"
                      />
                      <div className="absolute bottom-6 right-6">
                        <button
                          onClick={go}
                          disabled={!query.trim()}
                          className="h-12 md:h-14 px-8 sm:px-10 bg-foreground text-background rounded-2xl font-medium text-base disabled:opacity-20 hover:opacity-95 transition-all flex items-center gap-3 active:scale-[0.98] shadow-lg hover:shadow-xl"
                        >
                          <Search className="w-4 h-4" />
                          Search
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

          {view === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-10"
            >
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                    borderRadius: ["20%", "50%", "20%"],
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    times: [0, 0.5, 1],
                    repeat: Infinity,
                  }}
                  className="w-12 h-12 border-2 border-foreground/20 border-t-foreground shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                />
                <motion.div
                  animate={{
                    scale: [1, 0.8, 1],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                  className="absolute w-4 h-4 bg-foreground rounded-full"
                />
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm font-medium text-muted-foreground tracking-[0.2em] uppercase">
                    Analyzing Sources
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 font-mono">
                    VERIFYING CLAIMS...
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                      className="w-1 h-1 bg-foreground/40 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === "answer" && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-160px)]"
            >
              {/* Top Fade Gradient */}
              <div className="absolute top-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
              
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-none">
                <div className="space-y-6 sm:space-y-8 pb-12 pt-8 sm:pt-10">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight leading-snug">{query}</h2>
                  
                  <div className="space-y-6">
                    {/* Key Takeaways Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="p-6 rounded-3xl bg-foreground/5 border border-foreground/5 space-y-4 hover:bg-foreground/10 transition-colors cursor-default group/card"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">
                          <Check className="w-3.5 h-3.5" />
                          Key Takeaways
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover/card:opacity-100 transition-opacity">
                          Verified
                        </div>
                      </div>
                      <ul className="space-y-3">
                        {takeaways.map((item, i) => (
                          <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground/80 group/item">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground/30 shrink-0 group-hover/item:bg-primary transition-colors" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                        {mockAnswer.split(/(\[\d+\])/).map((part, i) => {
                          if (part.match(/\[\d+\]/)) {
                            return (
                              <sup key={i} className="text-[10px] font-bold text-primary ml-0.5 cursor-help hover:underline">
                                {part}
                              </sup>
                            );
                          }
                          return part;
                        })}
                      </p>
                    </motion.div>

                    {/* Follow-up Suggestions */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-wrap gap-2 pt-2"
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setQuery(s); go(); }}
                          className="text-xs sm:text-sm px-4 py-2 rounded-full border border-border/60 hover:border-primary/30 hover:bg-muted transition-all text-muted-foreground hover:text-foreground active:scale-95"
                        >
                          {s}
                        </button>
                      ))}
                    </motion.div>

                    {/* Sources Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-8 sm:mt-12 space-y-4"
                    >
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        <BookOpen className="w-4 h-4" />
                        Sources
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { title: "AI Fundamentals", domain: "wikipedia.org", url: "#" },
                          { title: "Generative AI Trends", domain: "technologyreview.com", url: "#" },
                          { title: "LLM Research Paper", domain: "arxiv.org", url: "#" }
                        ].map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/50 bg-card/50 hover:bg-muted hover:border-primary/20 transition-all group"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">{source.title}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{source.domain}</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Bottom Fade Gradient */}
              <div className="absolute bottom-20 sm:bottom-16 left-0 right-0 h-8 sm:h-12 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-border mt-auto bg-background/80 backdrop-blur-sm z-30">
                <button
                  onClick={() => setView("home")}
                  className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors order-2 sm:order-1 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted"
                >
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
                  New Search
                </button>
                <div className="flex gap-3 sm:gap-6 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
                  <button
                    onClick={() => copy(mockAnswer)}
                    className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors group"
                  >
                    <div className="transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </div>
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => setView("loading")}
                    className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors group"
                  >
                    <RefreshCw className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500" />
                    Retry
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
