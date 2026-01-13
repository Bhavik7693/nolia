import { AnimatePresence, motion } from "framer-motion";
import { Mic, X } from "lucide-react";

export function VoiceOverlay(props: {
  open: boolean;
  voiceText: string;
  onClose: () => void;
}) {
  const { open, voiceText, onClose } = props;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/95 backdrop-blur-2xl"
        >
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-primary rounded-full blur-3xl"
              />
              <div className="relative w-32 h-32 bg-foreground rounded-full flex items-center justify-center shadow-2xl">
                <Mic className="w-12 h-12 text-background" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-semibold">Listening...</h3>
              <p className="text-muted-foreground">Go ahead, I'm all ears</p>
              <div className="mt-4 max-w-md px-4">
                <div className="text-sm text-foreground/80 bg-foreground/5 border border-foreground/10 rounded-2xl px-4 py-3 min-h-[52px]">
                  {voiceText.trim() ? voiceText : "Speak now…"}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="mt-8 p-4 rounded-full border border-border/40 hover:bg-muted transition-all active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
