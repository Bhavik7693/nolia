import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Trash2 } from "lucide-react";
import { useRef } from "react";

export function HistorySidebar(props: {
  open: boolean;
  history: { q: string; a: string }[];
  onClose: () => void;
  onSelectQuery: (query: string) => void;
  onClear: () => void;
  onResetPersonalization: () => void;
}) {
  const { open, history, onClose, onSelectQuery, onClear, onResetPersonalization } = props;

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const swipeHandledRef = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
    swipeHandledRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (swipeHandledRef.current) return;
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    if (startX === null || startY === null) return;

    const t = e.touches[0];
    if (!t) return;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dy) > 40) return;
    if (dx > 90) {
      swipeHandledRef.current = true;
      onClose();
    }
  };

  const onTouchEnd = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    swipeHandledRef.current = false;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-card/95 border-l border-border/40 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-2xl flex flex-col"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
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
            <div className="space-y-4 overflow-y-auto pr-2 scrollbar-none flex-1">
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
            <div className="grid grid-cols-1 gap-2 mt-6">
              <button
                onClick={onResetPersonalization}
                className="h-10 border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-muted transition-colors active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Personalization
              </button>
              {history.length > 0 && (
                <button
                  onClick={onClear}
                  className="h-10 border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear History
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
