import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export type OnboardingStep = {
  title: string;
  description: string;
  options: string[];
  multi?: boolean;
};

export function OnboardingOverlay(props: {
  open: boolean;
  steps: OnboardingStep[];
  stepIndex: number;
  selectedInterests: string[];
  onSelectOption: (option: string) => void;
  onContinue: () => void;
}) {
  const { open, steps, stepIndex, selectedInterests, onSelectOption, onContinue } = props;

  const step = steps[stepIndex];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-xl px-6"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="max-w-lg w-full bg-card p-10 rounded-[40px] border border-border/40 shadow-2xl space-y-10"
          >
            <div className="space-y-3 text-center">
              <h3 className="text-3xl font-semibold tracking-tight leading-tight">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {step.options.map((option) => (
                <button
                  key={option}
                  onClick={() => onSelectOption(option)}
                  className={`w-full p-5 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                    step.multi && selectedInterests.includes(option)
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border/40 hover:border-primary/30 bg-background/50 text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{option}</span>
                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${
                      step.multi && selectedInterests.includes(option)
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border/20">
              <div className="flex gap-2">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-500 ${
                      i === stepIndex ? "bg-primary w-6" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              {step.multi && (
                <button
                  onClick={onContinue}
                  className="px-8 py-3 bg-foreground text-background rounded-2xl font-semibold text-sm hover:opacity-90 transition-all active:scale-95 shadow-lg"
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
