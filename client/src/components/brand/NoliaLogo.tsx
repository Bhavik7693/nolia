export function NoliaLogo(props: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  const { size = 26, showWordmark = true, className } = props;

  return (
    <span className={className}>
      <span className="inline-flex items-center gap-4">
        <span className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-foreground/5 border border-foreground/10 shadow-sm shadow-foreground/10 transition-all group-hover:bg-foreground/10 group-hover:border-foreground/20">
          <svg
            className="text-foreground"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 17V7l10 10V7"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.9 8.9l6.2 6.2"
              stroke="hsl(var(--background))"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {showWordmark && (
          <span className="text-2xl font-semibold tracking-[0.14em] font-brand leading-none">NOLIA</span>
        )}
      </span>
    </span>
  );
}
