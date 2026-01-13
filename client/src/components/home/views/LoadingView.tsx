import { AnimatePresence, motion } from "framer-motion";

export function LoadingView(props: {
  loadingMessages: readonly { title: string; subtitle: string }[];
  loadingStep: number;
}) {
  const { loadingMessages, loadingStep } = props;

  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={loadingMessages[loadingStep].title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm font-medium text-muted-foreground tracking-[0.2em] uppercase"
            >
              {loadingMessages[loadingStep].title}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={loadingMessages[loadingStep].subtitle}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="text-[10px] text-muted-foreground/40 font-mono"
            >
              {loadingMessages[loadingStep].subtitle}
            </motion.p>
          </AnimatePresence>
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
  );
}
