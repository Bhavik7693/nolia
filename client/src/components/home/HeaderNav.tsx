import { motion } from "framer-motion";
import { History, Moon, Sun } from "lucide-react";
import { NoliaLogo } from "@/components/brand/NoliaLogo";

export function HeaderNav(props: {
  dark: boolean;
  onLogoClick: () => void;
  onToggleHistory: () => void;
  onToggleTheme: () => void;
}) {
  const { dark, onLogoClick, onToggleHistory, onToggleTheme } = props;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-xl border-b border-border/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 md:py-6 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 cursor-pointer group"
          onClick={onLogoClick}
        >
          <NoliaLogo />
        </motion.div>

        <div className="flex items-center gap-2">
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={onToggleHistory}
            className="p-2 hover:bg-muted rounded-full transition-colors active:scale-90"
            title="History"
            aria-label="Open history"
          >
            <History className="w-4 h-4" />
          </motion.button>
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onToggleTheme}
            className="p-2 hover:bg-muted rounded-full transition-colors active:scale-90"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
