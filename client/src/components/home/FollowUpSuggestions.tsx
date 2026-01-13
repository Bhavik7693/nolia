import { motion } from "framer-motion";

export function FollowUpSuggestions(props: {
  followUps: string[];
  onSelect: (q: string) => void;
}) {
  const { followUps, onSelect } = props;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2"
    >
      {followUps.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="group w-full text-left text-xs sm:text-sm px-4 py-3 rounded-2xl border border-border/60 hover:border-primary/30 hover:bg-muted transition-all text-muted-foreground hover:text-foreground active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <span className="block leading-snug line-clamp-2 group-hover:line-clamp-none">{s}</span>
        </button>
      ))}
    </motion.div>
  );
}
