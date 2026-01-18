import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";

import { FollowUpSuggestions } from "@/components/home/FollowUpSuggestions";
import { renderMarkdownSafe } from "@/components/home/Markdown";

function extractCitationNumbers(answer: string): number[] {
  const matches = answer.match(/\[(\d+)\]/g) ?? [];
  const numbers = matches
    .map((m) => Number.parseInt(m.replace(/\[|\]/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

export function AnswerView(props: {
  query: string;
  takeaways: string[];
  displayAnswer: string;
  answerForCopy: string;
  followUps: string[];
  citations: { url: string; title?: string }[];
  feedback: "up" | "down" | null;
  comment: string;
  showCommentBox: boolean;
  copied: boolean;
  onGoHome: () => void;
  onSelectFollowUp: (q: string) => void;
  onSetFeedback: (v: "up" | "down" | null) => void;
  onSetComment: (v: string) => void;
  onSetShowCommentBox: (v: boolean) => void;
  onShare: () => void;
  onCopy: (text: string) => void;
  onRetry: () => void;
}) {
  const {
    query,
    takeaways,
    displayAnswer,
    answerForCopy,
    followUps,
    citations,
    feedback,
    comment,
    showCommentBox,
    copied,
    onGoHome,
    onSelectFollowUp,
    onSetFeedback,
    onSetComment,
    onSetShowCommentBox,
    onShare,
    onCopy,
    onRetry,
  } = props;

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const citationNumbers = useMemo(
    () => extractCitationNumbers(displayAnswer),
    [displayAnswer],
  );

  const sources = useMemo(() => {
    const max = Math.min(citationNumbers.length, citations.length);
    const result: { url: string; title: string; domain: string; citationNums: number[] }[] = [];
    const byUrl = new Map<string, number>();

    for (let i = 0; i < max; i += 1) {
      const n = citationNumbers[i];
      const c = citations[i];
      if (!c?.url) continue;
      const domain = getDomain(c.url);

      const existingIdx = byUrl.get(c.url);
      if (existingIdx !== undefined) {
        result[existingIdx].citationNums.push(n);
        continue;
      }

      byUrl.set(c.url, result.length);
      result.push({
        url: c.url,
        title: c.title ?? domain,
        domain,
        citationNums: [n],
      });
    }

    for (const s of result) {
      s.citationNums = Array.from(new Set(s.citationNums)).sort((a, b) => a - b);
    }

    return result;
  }, [citationNumbers, citations]);

  const highlightTimeoutRef = useRef<number | null>(null);
  const [activeSource, setActiveSource] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const onCitationClick = (n: number) => {
    const el = document.getElementById(`source-${n}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveSource(n);

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setActiveSource(null);
    }, 2500);
  };

  return (
    <motion.div
      key="answer"
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-160px)] supports-[height:100dvh]:h-[calc(100dvh-140px)] sm:supports-[height:100dvh]:h-[calc(100dvh-160px)]"
    >
      {/* Top Fade Gradient */}
      <div className="absolute top-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />

      <div className="flex-1 overflow-y-auto pr-0 sm:pr-2 scrollbar-none">
        <div className="space-y-6 sm:space-y-8 pb-12 pt-8 sm:pt-10">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight leading-snug">{query}</h1>
          </div>

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
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                    className="flex gap-3 text-sm leading-relaxed text-foreground/80 group/item"
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground/30 shrink-0 group-hover/item:bg-primary transition-colors" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <div className="text-xs text-muted-foreground bg-card/30 border border-border/40 rounded-2xl px-4 py-3">
              NOLIA can make mistakes. For medical, legal, or financial decisions, verify with a qualified professional.
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              {renderMarkdownSafe(displayAnswer, { onCitationClick })}
            </motion.div>

            {/* Follow-up Suggestions */}
            <FollowUpSuggestions followUps={followUps} onSelect={onSelectFollowUp} />

            {/* Sources Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 sm:mt-12 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  Sources
                </div>

                {/* Feedback Mechanism */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-2">Was this helpful?</span>
                  <button
                    onClick={() => {
                      onSetFeedback("up");
                      onSetShowCommentBox(true);
                    }}
                    aria-label="Mark answer as helpful"
                    className={`p-2 rounded-lg border transition-all ${
                      feedback === "up"
                        ? "bg-primary/10 border-primary/50 text-primary"
                        : "border-border/40 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      onSetFeedback("down");
                      onSetShowCommentBox(true);
                    }}
                    aria-label="Mark answer as not helpful"
                    className={`p-2 rounded-lg border transition-all ${
                      feedback === "down"
                        ? "bg-destructive/10 border-destructive/50 text-destructive"
                        : "border-border/40 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {showCommentBox && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  <textarea
                    value={comment}
                    onChange={(e) => onSetComment(e.target.value)}
                    placeholder="Tell us more (optional)..."
                    className="w-full p-3 rounded-xl border border-border/40 bg-card/20 focus:outline-none focus:ring-1 focus:ring-primary/20 text-sm resize-none h-20"
                  />
                  <button
                    onClick={() => onSetShowCommentBox(false)}
                    className="text-xs font-medium px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Submit Feedback
                  </button>
                </motion.div>
              )}

              {sources.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-card/30 border border-border/40 rounded-2xl p-4">
                  No sources were available for this answer.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sources.map((source, idx) => (
                    <motion.a
                      key={source.url}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + idx * 0.1 }}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl border bg-card/50 transition-all group ${
                        activeSource !== null && source.citationNums.includes(activeSource)
                          ? "border-primary/40 ring-2 ring-primary/25 bg-primary/5"
                          : "border-border/50 hover:bg-muted hover:border-primary/20"
                      }`}
                    >
                      {source.citationNums.map((n) => (
                        <span key={n} id={`source-${n}`} className="absolute top-0 left-0" />
                      ))}
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="mt-0.5 shrink-0 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-1">
                          [{source.citationNums.join(",")}]
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                            {source.title}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {source.domain}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all flex-shrink-0" />
                    </motion.a>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Fade Gradient */}
      <div className="absolute bottom-20 sm:bottom-16 left-0 right-0 h-8 sm:h-12 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 pt-5 sm:pt-8 border-t border-border mt-auto bg-background/80 backdrop-blur-sm z-30">
        <button
          onClick={onGoHome}
          className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors order-2 sm:order-1 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted"
        >
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
          New Search
        </button>
        <div className="flex flex-wrap gap-3 sm:gap-6 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={onShare}
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors group"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <button
            onClick={() => onCopy(answerForCopy)}
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors group"
          >
            <div className="transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </div>
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={onRetry}
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors group"
          >
            <RefreshCw className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500" />
            Retry
          </button>
        </div>
      </div>
    </motion.div>
  );
}
