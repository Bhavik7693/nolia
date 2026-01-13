import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";

export function HistorySidebar(props: {
  open: boolean;
  history: { q: string; a: string }[];
  onClose: () => void;
  onSelectQuery: (query: string) => void;
  onClear: () => void;
}) {
  const { open, history, onClose, onSelectQuery, onClear } = props;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-card/95 border-l border-border/40 z-[60] p-6 shadow-2xl backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg">Recent Queries</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-2 text-sm font-medium"
            >
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
                  onClick={() => onSelectQuery(item.q)}
                >
                  <p className="text-sm font-semibold truncate mb-1">{item.q}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.a}</p>
                </div>
              ))
            )}
          </div>
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="absolute bottom-6 left-6 right-6 h-10 border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
