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

const mockAnswer = `Artificial Intelligence (AI) refers to the simulation of human intelligence by machines, particularly computer systems. These processes include learning (the acquisition of information and rules for using the information), reasoning (using rules to reach approximate or definite conclusions), and self-correction.

The current landscape is dominated by Generative AI and Large Language Models (LLMs). These systems are trained on vast datasets to recognize patterns and generate content that mimics human output. Key applications range from natural language processing and image generation to predictive analytics and autonomous systems.`;

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
    <div className="min-h-screen w-full bg-background text-foreground transition-colors duration-300 selection:bg-primary/10 relative flex flex-col items-center justify-center font-sans overflow-x-hidden">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-6 md:py-8 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setView("home")}
          >
            <div className="w-5 h-5 bg-foreground rounded-sm transition-transform group-hover:scale-110" />
            <span className="text-lg font-semibold tracking-tight">AskVerify</span>
          </motion.div>
          
          <div className="flex items-center gap-2">
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-muted rounded-full transition-colors active:scale-90"
              title="History"
            >
              <History className="w-4 h-4" />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
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
            className="fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-card border-l border-border z-[60] p-6 shadow-2xl backdrop-blur-xl bg-opacity-95"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg">Recent Queries</h3>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground p-2">
                Close
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No recent activity</p>
              ) : (
                history.map((item, i) => (
                  <div 
                    key={i} 
                    className="p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-all cursor-pointer group bg-background/50 active:scale-[0.98]" 
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
                className="absolute bottom-6 left-6 right-6 h-10 border border-border rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="w-full max-w-2xl px-6 py-20 flex flex-col justify-center min-h-screen">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 md:space-y-12"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-center leading-tight">
                Search the world's knowledge.
              </h1>

              <div className="relative group">
                <div className="relative border border-border bg-card rounded-2xl shadow-sm transition-all overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/20 hover:border-primary/10">
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
                    className="w-full min-h-[140px] md:min-h-[160px] p-6 pb-16 bg-transparent resize-none focus:outline-none text-lg leading-relaxed placeholder:text-muted-foreground/50"
                  />
                  <div className="absolute bottom-4 right-4">
                    <button
                      onClick={go}
                      disabled={!query.trim()}
                      className="h-10 md:h-11 px-6 bg-foreground text-background rounded-xl font-medium text-sm disabled:opacity-30 hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                    >
                      <Search className="w-3.5 h-3.5" />
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
              className="flex flex-col items-center justify-center space-y-6"
            >
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground tracking-wide animate-pulse">Searching...</p>
            </motion.div>
          )}

          {view === "answer" && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col h-[calc(100vh-120px)] w-full max-w-3xl mx-auto"
            >
              <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/20">
                <div className="space-y-8 pb-12">
                  <h2 className="text-2xl md:text-3xl font-medium tracking-tight leading-snug sticky top-0 bg-background/80 backdrop-blur-sm py-4 z-10">{query}</h2>

                  <div className="space-y-6">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                        {mockAnswer}
                      </p>
                    </motion.div>

                    {/* Sources Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-4 pt-8 border-t border-border/50"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        <BookOpen className="w-4 h-4" />
                        Sources
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { title: "AI Fundamentals", domain: "wikipedia.org", url: "#" },
                          { title: "Generative AI Trends", domain: "technologyreview.com", url: "#" },
                          { title: "LLM Research Paper", domain: "arxiv.org", url: "#" },
                          { title: "Deep Learning Insights", domain: "nature.com", url: "#" }
                        ].map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/30 hover:bg-muted hover:border-primary/20 transition-all group"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">{source.title}</span>
                              <span className="text-xs text-muted-foreground truncate">{source.domain}</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-border mt-auto bg-background/95 backdrop-blur-md sticky bottom-0 z-20">
                <button
                  onClick={() => setView("home")}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors order-2 sm:order-1 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  New Search
                </button>
                <div className="flex gap-2 sm:gap-4 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
                  <button
                    onClick={() => copy(mockAnswer)}
                    className="h-10 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 transition-all group active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => setView("loading")}
                    className="h-10 px-4 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 flex items-center gap-2 transition-all group active:scale-95 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 duration-500" />
                    Regenerate
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
