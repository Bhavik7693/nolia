import { Fragment, type ReactNode } from "react";

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("#")) return true;

  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:";
  } catch {
    return false;
  }
}

function renderInline(
  text: string,
  keyPrefix: string,
  opts?: {
    onCitationClick?: (n: number) => void;
  },
): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)|\[(\d+)\]/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(
        <Fragment key={`${keyPrefix}-t-${i}`}>{text.slice(lastIndex, match.index)}</Fragment>,
      );
      i += 1;
    }

    const code = match[1];
    const bold = match[2];
    const italic = match[3];
    const linkText = match[4];
    const linkHref = match[5];
    const citation = match[6];

    if (code !== undefined) {
      out.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="px-1 py-0.5 rounded bg-foreground/5 border border-foreground/10 text-[0.95em]"
        >
          {code}
        </code>,
      );
    } else if (bold !== undefined) {
      out.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-foreground">
          {bold}
        </strong>,
      );
    } else if (italic !== undefined) {
      out.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic">
          {italic}
        </em>,
      );
    } else if (linkText !== undefined && linkHref !== undefined) {
      if (isSafeHref(linkHref)) {
        out.push(
          <a
            key={`${keyPrefix}-l-${i}`}
            href={linkHref}
            target={linkHref.startsWith("http") ? "_blank" : undefined}
            rel={linkHref.startsWith("http") ? "noreferrer" : undefined}
            className="underline decoration-foreground/30 hover:decoration-primary hover:text-primary transition-colors"
          >
            {linkText}
          </a>,
        );
      } else {
        out.push(
          <Fragment key={`${keyPrefix}-lbad-${i}`}>{`${linkText} (${linkHref})`}</Fragment>,
        );
      }
    } else if (citation !== undefined) {
      const n = Number.parseInt(citation, 10);
      if (opts?.onCitationClick && Number.isFinite(n)) {
        out.push(
          <sup key={`${keyPrefix}-s-${i}`} className="ml-0.5">
            <button
              type="button"
              onClick={() => opts.onCitationClick?.(n)}
              className="text-[10px] font-bold text-primary cursor-pointer hover:underline"
            >
              [{citation}]
            </button>
          </sup>,
        );
      } else {
        out.push(
          <sup
            key={`${keyPrefix}-s-${i}`}
            className="text-[10px] font-bold text-primary ml-0.5 cursor-help hover:underline"
          >
            [{citation}]
          </sup>,
        );
      }
    }

    i += 1;
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    out.push(<Fragment key={`${keyPrefix}-t-${i}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return out;
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang?: string; code: string };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let inCode = false;
  let codeLang: string | undefined;
  let codeLines: string[] = [];

  let paraLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paraLines.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paraLines = [];
  };

  const flushList = () => {
    if (!listType) return;
    if (listItems.length) blocks.push({ type: listType, items: listItems });
    listType = null;
    listItems = [];
  };

  const flushCode = () => {
    blocks.push({ type: "code", lang: codeLang, code: codeLines.join("\n") });
    codeLang = undefined;
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "    ");

    const fenceMatch = line.match(/^\s*```\s*(\w+)?\s*$/);
    if (fenceMatch) {
      if (!inCode) {
        flushParagraph();
        flushList();
        inCode = true;
        codeLang = fenceMatch[1];
        continue;
      }
      inCode = false;
      flushCode();
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      flushParagraph();
      const nextType: "ul" | "ol" = ulMatch ? "ul" : "ol";
      const itemText = (ulMatch ? ulMatch[1] : olMatch?.[1])?.trim() ?? "";
      if (listType && listType !== nextType) {
        flushList();
      }
      listType = nextType;
      listItems.push(itemText);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paraLines.push(line.trim());
  }

  if (inCode) {
    inCode = false;
    flushCode();
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function renderMarkdownSafe(
  md: string,
  opts?: {
    onCitationClick?: (n: number) => void;
  },
): ReactNode {
  const blocks = parseBlocks(md);

  return (
    <div className="space-y-4">
      {blocks.map((b, idx) => {
        if (b.type === "heading") {
          const level = Math.min(Math.max(b.level, 1), 6);
          const cls =
            level <= 2
              ? "text-lg sm:text-xl font-semibold tracking-tight"
              : level <= 4
                ? "text-base sm:text-lg font-semibold"
                : "text-sm font-semibold";

          if (level <= 1) {
            return (
              <h2 key={idx} className={`${cls} text-foreground`}>
                {renderInline(b.text, `h-${idx}`, opts)}
              </h2>
            );
          }

          if (level === 2) {
            return (
              <h3 key={idx} className={`${cls} text-foreground`}>
                {renderInline(b.text, `h-${idx}`, opts)}
              </h3>
            );
          }

          return (
            <h4 key={idx} className={`${cls} text-foreground`}>
              {renderInline(b.text, `h-${idx}`, opts)}
            </h4>
          );
        }

        if (b.type === "code") {
          return (
            <pre
              key={idx}
              className="text-xs sm:text-sm whitespace-pre-wrap rounded-2xl border border-border/50 bg-card/50 p-4 overflow-x-auto"
            >
              <code>{b.code}</code>
            </pre>
          );
        }

        if (b.type === "ul") {
          return (
            <ul key={idx} className="list-disc pl-6 space-y-2 text-base sm:text-lg text-foreground/90">
              {b.items.map((it, j) => (
                <li key={j} className="leading-relaxed">
                  {renderInline(it, `ul-${idx}-${j}`, opts)}
                </li>
              ))}
            </ul>
          );
        }

        if (b.type === "ol") {
          return (
            <ol key={idx} className="list-decimal pl-6 space-y-2 text-base sm:text-lg text-foreground/90">
              {b.items.map((it, j) => (
                <li key={j} className="leading-relaxed">
                  {renderInline(it, `ol-${idx}-${j}`, opts)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx} className="text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {renderInline(b.text, `p-${idx}`, opts)}
          </p>
        );
      })}
    </div>
  );
}
