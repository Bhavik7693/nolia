import { motion } from "framer-motion";
import { Mic, Search } from "lucide-react";
import { RefObject } from "react";

export function HomeSearchView(props: {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmit: () => void;
  isListening: boolean;
  onToggleListening: () => void;
  style: "Concise" | "Balanced" | "Detailed" | "Creative";
  onCycleStyle: () => void;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const {
    query,
    onChangeQuery,
    onSubmit,
    isListening,
    onToggleListening,
    style,
    onCycleStyle,
    textAreaRef,
  } = props;

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.3 } }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-12 md:space-y-16"
    >
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-center leading-tight">
        <span className="animate-shimmer selection:text-foreground">Search the world's </span>
        <span className="animate-shimmer font-light italic opacity-90 selection:text-foreground">knowledge.</span>
      </h1>

      <div className="relative max-w-2xl mx-auto w-full group">
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative border border-border/40 bg-card/20 rounded-[32px] shadow-2xl transition-all overflow-hidden focus-within:ring-1 focus-within:ring-foreground/10 focus-within:border-foreground/20 hover:border-foreground/10 backdrop-blur-sm"
        >
          <textarea
            ref={textAreaRef}
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Ask anything..."
            className="w-full min-h-[160px] md:min-h-[180px] p-6 sm:p-8 pb-20 bg-transparent resize-none focus:outline-none text-lg sm:text-xl leading-relaxed placeholder:text-muted-foreground/20 font-light tracking-tight"
          />
          <div className="absolute bottom-6 left-6 flex items-center gap-2">
            <button
              onClick={onToggleListening}
              className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                isListening
                  ? "bg-primary border-primary text-primary-foreground animate-pulse"
                  : "border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              onClick={onCycleStyle}
              className="h-12 px-4 rounded-2xl border border-border/40 bg-card/20 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all active:scale-95"
              title="Change answer style"
            >
              {style}
            </button>
          </div>
          <div className="absolute bottom-6 right-6">
            <button
              onClick={onSubmit}
              disabled={!query.trim()}
              className="h-12 md:h-14 px-8 sm:px-10 bg-foreground text-background rounded-2xl font-medium text-base disabled:opacity-20 hover:opacity-95 transition-all flex items-center gap-3 active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
