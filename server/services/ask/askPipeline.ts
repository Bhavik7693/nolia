import { env } from "../../config";
import { HttpError } from "../../lib/httpError";
import type { AskRequest, AskResponse } from "../../validators/ask";
import { z } from "zod";
import {
  listFreeOpenRouterModels,
  openRouterChatCompletion,
} from "../llm/openrouter";
import { braveWebSearch } from "../search/brave";
import { tavilyWebSearch } from "../search/tavily";
import { fetchPageText } from "../web/fetchPageText";

type EvidenceSource = {
  title: string;
  url: string;
  snippet: string;
  extractedText?: string;
};

type SourceCandidate = EvidenceSource & {
  score: number;
  normUrl: string;
};

type SafetyBlock = {
  reason: "self_harm" | "violence" | "weapons" | "drugs" | "hacking" | "sexual_content";
};

function detectSafetyBlock(question: string): SafetyBlock | null {
  const q = question.toLowerCase();

  if (/(suicide|kill\s+myself|self\s*harm|cut\s+myself|want\s+to\s+die)/i.test(q)) {
    return { reason: "self_harm" };
  }

  if (/(how\s+to\s+make\s+a\s+bomb|make\s+an\s+explosive|pressure\s+cooker\s+bomb)/i.test(q)) {
    return { reason: "violence" };
  }

  if (/(build\s+a\s+gun|make\s+a\s+gun|ghost\s+gun|3d\s*print\s+a\s+gun)/i.test(q)) {
    return { reason: "weapons" };
  }

  if (/(how\s+to\s+make\s+meth|cook\s+meth|make\s+cocaine|synthesize\s+fentanyl)/i.test(q)) {
    return { reason: "drugs" };
  }

  if (/(ddos|sql\s+injection|xss\b|hack\s+into|steal\s+password|phishing|malware|ransomware)/i.test(q)) {
    return { reason: "hacking" };
  }

  if (/(child\s+porn|minor\s+sex|underage\s+sex)/i.test(q)) {
    return { reason: "sexual_content" };
  }

  return null;
}

function buildSafetyRefusal(input: AskRequest, block: SafetyBlock): AskResponse {
  const start = Date.now();
  const hindi = looksHindiQuestion(input);

  const msg = hindi
    ? "Main is request me madad nahi kar sakti. Agar aap turant khatre me ho, apne area ki emergency services ya kisi trusted person se turant baat karein."
    : "I can't help with that. If you're in immediate danger, contact local emergency services or someone you trust right now.";

  const followUps = hindi
    ? [
        "Kya aap safe hain abhi?",
        "Aap kis type ki help chahte hain (support/resources)?",
        "Main aapko safe alternatives ke saath guide kar sakti hoon.",
      ]
    : [
        "Are you safe right now?",
        "What kind of help or resources are you looking for?",
        "I can offer safer alternatives or general guidance.",
      ];

  return {
    provider: "openrouter",
    model: `policy-${block.reason}`,
    answer: msg,
    citations: [],
    followUps,
    latencyMs: Date.now() - start,
  };
}

function classifyLocalClockIntent(question: string): "date" | "time" | "datetime" | null {
  const q = question.trim().toLowerCase();

  const asksDate =
    /\b(today'?s\s+date|today\s+date|date\s+today|what\s+is\s+(the\s+)?date\b|current\s+date)\b/i.test(
      q,
    ) || /\b(aaj\s+ki\s+date|aaj\s+ki\s+tarikh|aaj\s+tarikh)\b/i.test(q);

  const asksTime =
    /\b(what\s+time\s+is\s+it|time\s+now|current\s+time|time\s+right\s+now)\b/i.test(q) ||
    /\b(abhi\s+time|abhi\s+ka\s+time|abhi\s+kitna\s+baja)\b/i.test(q);

  if (asksDate && asksTime) return "datetime";
  if (asksDate) return "date";
  if (asksTime) return "time";
  return null;
}

function buildLocalClockAnswer(input: AskRequest): string | null {
  const intent = classifyLocalClockIntent(input.question);
  if (!intent) return null;

  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const looksHindi =
    input.language === "hi" ||
    (input.language === "auto" &&
      (/[\u0900-\u097F]/.test(input.question) || /\b(aaj|abhi|tarikh)\b/i.test(input.question)));

  const locale = looksHindi ? "hi-IN" : "en-US";
  const dateStr = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(now);
  const timeStr = new Intl.DateTimeFormat(locale, { timeStyle: "medium" }).format(now);

  if (looksHindi) {
    if (intent === "date") return `Aaj ki tareekh ${dateStr} hai (${tz} ke hisaab se).`;
    if (intent === "time") return `Abhi ka samay ${timeStr} hai (${tz} ke hisaab se).`;
    return `Abhi ${timeStr} ho rahe hain aur tareekh ${dateStr} hai (${tz} ke hisaab se).`;
  }

  if (intent === "date") return `Today's date is ${dateStr} (local time: ${tz}).`;
  if (intent === "time") return `The current time is ${timeStr} (local time: ${tz}).`;
  return `Right now it's ${timeStr} on ${dateStr} (local time: ${tz}).`;
}

function truncate(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return `${input.slice(0, maxChars)}...`;
}

function extractCitationNumbers(answer: string): number[] {
  const matches = answer.match(/\[(\d+)\]/g) ?? [];
  const numbers = matches
    .map((m) => Number.parseInt(m.replace(/\[|\]/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

function normalizeUrlForDedupe(raw: string): { key: string; cleanedUrl: string } | null {
  try {
    const url = new URL(raw);
    url.hash = "";

    const toDelete: string[] = [];
    url.searchParams.forEach((_, k) => {
      const key = k.toLowerCase();
      if (
        key.startsWith("utm_") ||
        key === "gclid" ||
        key === "fbclid" ||
        key === "igshid" ||
        key === "mc_cid" ||
        key === "mc_eid" ||
        key === "ref" ||
        key === "ref_src"
      ) {
        toDelete.push(k);
      }
    });
    for (const k of toDelete) url.searchParams.delete(k);

    // keep params, but ensure stable ordering
    const entries = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    url.search = "";
    for (const [k, v] of entries) url.searchParams.append(k, v);

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const search = url.search;

    // Dedup key intentionally ignores protocol to treat http/https as same.
    const key = `${host}${path}${search}`;
    const cleanedUrl = `${url.protocol}//${host}${path}${search}`;
    return { key, cleanedUrl };
  } catch {
    return null;
  }
}

function tokenizeForMatch(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .filter(
      (t) =>
        ![
          "the",
          "and",
          "for",
          "with",
          "that",
          "this",
          "what",
          "when",
          "where",
          "who",
          "why",
          "how",
          "latest",
          "current",
          "today",
          "news",
          "update",
          "updates",
          "explain",
          "define",
          "tell",
        ].includes(t),
    );
}

function scoreSource(params: {
  url: string;
  title: string;
  snippet: string;
  question: string;
  wantsFresh: boolean;
}): number {
  const norm = normalizeUrlForDedupe(params.url);
  const host = norm ? new URL(norm.cleanedUrl).hostname : "";

  let score = 0;

  if (/\.gov(\.|$)/i.test(host)) score += 6;
  else if (/\.edu(\.|$)/i.test(host)) score += 5;
  else if (/\.org(\.|$)/i.test(host)) score += 2;

  if (/wikipedia\.org$/i.test(host)) score += 3;
  if (/github\.com$/i.test(host)) score += 2;

  if (/medium\.com$|blogspot\.|wordpress\.|substack\.com$|tumblr\.|reddit\.com$|quora\.com$/i.test(host)) {
    score -= 2;
  }

  const qTokens = new Set(tokenizeForMatch(params.question));
  const hay = `${params.title} ${params.snippet}`.toLowerCase();
  let hits = 0;
  qTokens.forEach((t) => {
    if (hay.includes(t)) hits += 1;
  });
  score += Math.min(6, hits);

  if (params.wantsFresh && /\bpublished:\s*\d{4}-\d{2}-\d{2}\b/i.test(params.snippet)) {
    score += 2;
  }

  return score;
}

function buildEvidenceBlock(sources: EvidenceSource[]): string {
  if (sources.length === 0) return "";

  const lines: string[] = [];
  lines.push("SOURCES (use citations like [1], [2] that refer to these sources):");

  for (let i = 0; i < sources.length; i += 1) {
    const idx = i + 1;
    const s = sources[i];
    lines.push("");
    lines.push(`[${idx}] ${s.title}`);
    lines.push(`URL: ${s.url}`);
    if (s.snippet) {
      lines.push(`Snippet: ${truncate(s.snippet, 500)}`);
    }
    if (s.extractedText) {
      lines.push(`Extracted: ${truncate(s.extractedText, 2500)}`);
    }
  }

  return lines.join("\n");
}

function buildSystemPrompt(input: AskRequest): string {
  const style = input.style ?? "Balanced";
  const mode = input.mode ?? "verified";
  const language = input.language ?? "auto";

  return [
    "You are NOLIA, an assistant that answers accurately.",
    `Style: ${style}.`,
    `Mode: ${mode}.`,
    `Language: ${language}. If language is auto, reply in the user's language.`,
    "Output formatting: you MAY use simple Markdown for readability (short headings, bullet lists, and code blocks).",
    "Do not repeat the same answer or paragraphs. Avoid duplicated content.",
    "Do not add a 'Sources' section or 'Sources:' footer. Use only inline citations like [1], [2].",
    "If the user asks for the latest/current information, prioritize the most recent sources available and avoid guessing dates.",
    "If sources are provided, you MUST cite them using [n] and only use information supported by the sources.",
    "When sources are provided, each paragraph or bullet list item should include at least one citation [n] for factual claims.",
    "If no sources are provided, say you do not have sources to cite and avoid confident claims, exact numbers, or exact dates.",
    "If sources do not support a claim, say you could not verify it from the sources rather than guessing.",
    "If you are unsure, say so instead of guessing.",
    "Safety policy: refuse requests for self-harm, violence, weapons, illegal drugs, hacking/malware, or sexual content involving minors.",
    "For medical, legal, or financial topics: provide general info and encourage consulting a qualified professional.",
  ].join("\n");
}

const followUpsSchema = z
  .array(z.string().trim().min(1).max(140))
  .min(1)
  .max(3);

function sanitizeFollowUps(items: string[]): string[] {
  const cleaned = items
    .map((s) => s.replace(/^[-*\d.\s]+/, "").trim())
    .map((s) => s.replace(/^"|"$/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const s of cleaned) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }
  return unique.slice(0, 3);
}

function extractJsonArrayString(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    const inside = fenceMatch[1].trim();
    if (inside.startsWith("[") && inside.endsWith("]")) return inside;
  }

  const first = trimmed.indexOf("[");
  const last = trimmed.lastIndexOf("]");
  if (first >= 0 && last > first) {
    const candidate = trimmed.slice(first, last + 1).trim();
    if (candidate.startsWith("[") && candidate.endsWith("]")) return candidate;
  }

  return null;
}

function parseFollowUpsLoose(raw: string): string[] | undefined {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^```/.test(l));

  const cleaned = sanitizeFollowUps(lines);
  return cleaned.length ? cleaned : undefined;
}

function looksHindiQuestion(input: AskRequest): boolean {
  if (input.language === "hi") return true;
  if (input.language === "en") return false;
  return /[\u0900-\u097F]/.test(input.question) || /\b(aaj|abhi|kya|kaise|kyu|kyon|kab|kaha)\b/i.test(input.question);
}

function extractTopicFromQuestion(question: string): string {
  const cleaned = question
    .replace(/[\r\n]+/g, " ")
    .replace(/[?!.]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const withoutLead = cleaned.replace(
    /^\s*(what|who|where|when|why|how|explain|tell me|define|latest|current)\b\s*/i,
    "",
  );

  return withoutLead.trim() || cleaned;
}

function buildHeuristicFollowUps(input: AskRequest): string[] {
  const topic = extractTopicFromQuestion(input.question).slice(0, 80);
  const hindi = looksHindiQuestion(input);

  const items = hindi
    ? [
        `${topic} ke baare me key facts kya hain?`,
        `${topic} ke latest updates kya hain?`,
        `${topic} ka short summary 5 points me do.`,
      ]
    : [
        `What are the key facts about ${topic}?`,
        `Any recent updates or news about ${topic}?`,
        `Summarize ${topic} in 5 bullet points.`,
      ];

  return sanitizeFollowUps(items);
}

async function generateFollowUps(params: {
  apiKey: string;
  model: string;
  question: string;
  answer: string;
  language: AskRequest["language"];
}): Promise<string[] | undefined> {
  const prompt = [
    "Generate 3 short, natural follow-up questions a user might ask next.",
    "Return ONLY valid JSON as an array of strings.",
    "No markdown. No numbering.",
    "Keep each question under 90 characters.",
    "Match the user's language when possible.",
    "Make them specific to THIS question/answer (avoid generic questions like 'How does AI work?').",
    "Do not repeat the original question.",
    "",
    `User language: ${params.language ?? "auto"}`,
    `Original question: ${params.question}`,
    "Answer:",
    params.answer,
  ].join("\n");

  const raw = await openRouterChatCompletion({
    apiKey: params.apiKey,
    model: params.model,
    timeoutMs: 12_000,
    temperature: 0.5,
    maxTokens: 140,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });

  const trimmed = raw.trim();

  const jsonArrayString = extractJsonArrayString(trimmed);
  if (!jsonArrayString) {
    return parseFollowUpsLoose(trimmed);
  }

  let json: unknown;
  try {
    json = JSON.parse(jsonArrayString);
  } catch {
    return parseFollowUpsLoose(trimmed);
  }

  const parsed = followUpsSchema.safeParse(json);
  if (!parsed.success) {
    return parseFollowUpsLoose(trimmed);
  }

  const sanitized = sanitizeFollowUps(parsed.data);
  return sanitized.length ? sanitized : parseFollowUpsLoose(trimmed);
}

export async function askPipeline(input: AskRequest): Promise<AskResponse> {
  const start = Date.now();

  const localClockAnswer = buildLocalClockAnswer(input);
  if (localClockAnswer) {
    return {
      provider: "openrouter",
      model: "local-clock",
      answer: localClockAnswer,
      citations: [],
      followUps: buildHeuristicFollowUps(input),
      latencyMs: Date.now() - start,
    };
  }

  const safetyBlock = detectSafetyBlock(input.question);
  if (safetyBlock) {
    return buildSafetyRefusal(input, safetyBlock);
  }

  if (!env.OPENROUTER_API_KEY) {
    throw new HttpError(503, "OPENROUTER_API_KEY is not configured");
  }

  let model = input.model ?? env.OPENROUTER_DEFAULT_MODEL;
  if (!model) {
    const freeModels = await listFreeOpenRouterModels({ timeoutMs: 10_000 });
    model = freeModels[0];
  }

  if (!model) {
    throw new HttpError(503, "No free OpenRouter models available");
  }

  const useWeb = input.useWeb ?? true;
  const sources: EvidenceSource[] = [];

  if (useWeb) {
    const wantsFresh = /\b(latest|today|current|news|update|updates|breaking|recent|now)\b/i.test(
      input.question,
    );

    const topic = input.webTopic ?? (wantsFresh ? "news" : "general");
    const timeRange = input.webTimeRange ?? (wantsFresh ? "week" : undefined);

    const base = input.question.trim();
    const core = extractTopicFromQuestion(input.question).slice(0, 120);
    const queryCandidates = [
      base,
      core && core !== base ? core : null,
      wantsFresh ? `${core || base} latest` : null,
      input.mode === "verified" ? `${core || base} official` : null,
    ].filter((q): q is string => !!q && q.trim().length > 0);

    const queries: string[] = [];
    const seenQ = new Set<string>();
    for (const q of queryCandidates) {
      const key = q.toLowerCase();
      if (seenQ.has(key)) continue;
      seenQ.add(key);
      queries.push(q);
      if (queries.length >= 3) break;
    }

    const byNormUrl = new Map<string, SourceCandidate>();

    const upsertCandidate = (src: EvidenceSource) => {
      const norm = normalizeUrlForDedupe(src.url);
      const normKey = norm?.key ?? src.url;
      const cleanedUrl = norm?.cleanedUrl ?? src.url;
      const s: EvidenceSource = { ...src, url: cleanedUrl };
      const score = scoreSource({
        url: cleanedUrl,
        title: s.title,
        snippet: s.snippet,
        question: input.question,
        wantsFresh,
      });

      const existing = byNormUrl.get(normKey);
      if (!existing || score > existing.score) {
        byNormUrl.set(normKey, { ...s, score, normUrl: normKey });
      }
    };

    if (env.TAVILY_API_KEY) {
      try {
        const settled = await Promise.allSettled(
          queries.map((q) =>
            tavilyWebSearch({
              query: q,
              maxResults: 4,
              timeoutMs: 10_000,
              options: {
                topic,
                timeRange,
                searchDepth: input.mode === "verified" ? "basic" : "fast",
                includeRawContent: input.mode === "verified" ? "text" : false,
              },
            }),
          ),
        );

        for (const s of settled) {
          if (s.status !== "fulfilled") continue;
          const { results, rawByUrl } = s.value;
          for (const r of results) {
            if (!r.url) continue;
            upsertCandidate({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
              extractedText: rawByUrl.get(r.url),
            });
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Tavily search failed; falling back", err);
        }
      }
    }

    if (env.BRAVE_SEARCH_API_KEY) {
      try {
        const settled = await Promise.allSettled(
          queries.slice(0, 2).map((q) =>
            braveWebSearch({
              query: q,
              count: 4,
              timeoutMs: 10_000,
            }),
          ),
        );

        for (const s of settled) {
          if (s.status !== "fulfilled") continue;
          for (const r of s.value) {
            if (!r.url) continue;
            upsertCandidate({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
            });
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Brave search failed; continuing without web sources", err);
        }
      }
    }

    sources.push(
      ...Array.from(byNormUrl.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ score: _score, normUrl: _normUrl, ...rest }) => rest),
    );

    const maxFetch = 3;
    const toFetch: number[] = [];
    for (let i = 0; i < Math.min(maxFetch, sources.length); i += 1) {
      if (sources[i].extractedText) continue;
      toFetch.push(i);
    }

    if (toFetch.length) {
      const settled = await Promise.allSettled(
        toFetch.map(async (idx) => {
          const pageText = await fetchPageText({
            url: sources[idx].url,
            timeoutMs: 10_000,
            maxBytes: 1_000_000,
          });
          sources[idx].extractedText = pageText;
        }),
      );
      void settled;
    }
  }

  const evidenceBlock = buildEvidenceBlock(sources);
  const userContent = evidenceBlock
    ? `${input.question}\n\n${evidenceBlock}`
    : input.question;

  const answer = await openRouterChatCompletion({
    apiKey: env.OPENROUTER_API_KEY,
    model,
    timeoutMs: 30_000,
    temperature: input.mode === "fast" ? 0.7 : 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt(input) },
      { role: "user", content: userContent },
    ],
  });

  const latencyMs = Date.now() - start;

  const usedSourceNumbers = extractCitationNumbers(answer);
  const citations = usedSourceNumbers
    .map((n) => sources[n - 1])
    .filter((s): s is EvidenceSource => !!s)
    .map((s) => ({ url: s.url, title: s.title }));

  let followUps: string[] | undefined;
  try {
    followUps = await generateFollowUps({
      apiKey: env.OPENROUTER_API_KEY,
      model,
      question: input.question,
      answer,
      language: input.language,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Follow-up generation failed", err);
    }
  }

  const finalFollowUps = followUps && followUps.length ? followUps : buildHeuristicFollowUps(input);

  return {
    provider: "openrouter",
    model,
    answer,
    citations,
    followUps: finalFollowUps,
    latencyMs,
  };
}
