import { AnimatePresence, motion } from "framer-motion";
import { Mic, RotateCcw, Send, TriangleAlert, X } from "lucide-react";

export type VoiceOverlayStage = "listening" | "review" | "error";
export type VoiceOverlayLanguage = "auto" | "en" | "hi";

export function VoiceOverlay(props: {
  open: boolean;
  stage: VoiceOverlayStage;
  value: string;
  error?: string | undefined;
  language: VoiceOverlayLanguage;
  onChangeValue: (v: string) => void;
  onChangeLanguage: (v: VoiceOverlayLanguage) => void;
  onCancel: () => void;
  onStop: () => void;
  onRetry: () => void;
  onSend: () => void;
}) {
  const {
    open,
    stage,
    value,
    error,
    language,
    onChangeValue,
    onChangeLanguage,
    onCancel,
    onStop,
    onRetry,
    onSend,
  } = props;

  const title =
    stage === "listening" ? "Listening…" : stage === "error" ? "Voice input failed" : "Review";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/95 backdrop-blur-2xl"
        >
          <div className="w-full max-w-lg px-4 max-h-[calc(100vh-2rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="rounded-3xl border border-border/40 bg-card/20 shadow-2xl backdrop-blur-sm p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {stage === "listening"
                      ? "Speak naturally. You can edit before sending."
                      : stage === "error"
                        ? "Check microphone permissions and try again."
                        : "Edit your transcript before sending."}
                  </p>
                </div>
                <button
                  onClick={onCancel}
                  aria-label="Close voice input"
                  className="p-2 rounded-xl border border-border/40 hover:bg-muted transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {stage === "listening" && (
                <div className="mt-8 flex flex-col items-center gap-6">
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.25, 0.6, 0.25],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 bg-primary rounded-full blur-3xl"
                    />
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-foreground rounded-full flex items-center justify-center shadow-2xl">
                      <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-background" />
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="text-sm text-foreground/80 bg-foreground/5 border border-foreground/10 rounded-2xl px-4 py-3 min-h-[52px]">
                      {value.trim() ? value : "Speak now…"}
                    </div>
                  </div>

                  <button
                    onClick={onStop}
                    className="px-5 py-3 rounded-2xl border border-border/40 hover:bg-muted transition-all active:scale-95"
                  >
                    Stop
                  </button>
                </div>
              )}

              {(stage === "review" || stage === "error") && (
                <div className="mt-6 space-y-4">
                  {stage === "error" && (
                    <div className="flex items-start gap-3 text-sm text-foreground/80 bg-destructive/5 border border-destructive/20 rounded-2xl px-4 py-3">
                      <TriangleAlert className="w-4 h-4 mt-0.5 text-destructive" />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{error || "Voice input failed"}</div>
                        <div className="text-muted-foreground">You can retry now.</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex rounded-2xl border border-border/40 bg-card/40 p-1">
                      {([
                        { k: "auto", label: "Auto" },
                        { k: "en", label: "English" },
                        { k: "hi", label: "Hindi" },
                      ] as const).map((item) => (
                        <button
                          key={item.k}
                          onClick={() => onChangeLanguage(item.k)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                            language === item.k
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={onRetry}
                      className="px-3 py-2 rounded-2xl border border-border/40 hover:bg-muted transition-all active:scale-95 flex items-center gap-2 text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retry
                    </button>
                  </div>

                  <textarea
                    value={value}
                    onChange={(e) => onChangeValue(e.target.value)}
                    placeholder="Your transcript will appear here…"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        onCancel();
                      }
                      if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    className="w-full min-h-[120px] p-4 rounded-2xl border border-border/40 bg-card/20 focus:outline-none focus:ring-1 focus:ring-foreground/10 resize-none text-base"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">Ctrl/⌘ + Enter to send</div>
                    <button
                      onClick={onSend}
                      disabled={!value.trim()}
                      className="h-12 px-6 bg-foreground text-background rounded-2xl font-medium text-sm disabled:opacity-30 hover:opacity-95 transition-all flex items-center gap-2 active:scale-[0.98]"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
