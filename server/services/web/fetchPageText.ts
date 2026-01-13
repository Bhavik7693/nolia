import { fetchWithTimeout } from "../../lib/fetchWithTimeout";
import { HttpError } from "../../lib/httpError";
import { assertSafeUrl } from "../../lib/ssrf";
import { extractTextFromHtml } from "./extractText";

async function readResponseTextWithLimit(res: Response, maxBytes: number): Promise<string> {
  // Node fetch Response supports arrayBuffer()
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > maxBytes) {
    throw new HttpError(413, "Fetched document too large");
  }
  return buf.toString("utf-8");
}

export async function fetchPageText(params: {
  url: string;
  timeoutMs: number;
  maxBytes: number;
}): Promise<string> {
  const safeUrl = await assertSafeUrl(params.url);

  const res = await fetchWithTimeout(
    safeUrl.toString(),
    {
      method: "GET",
      headers: {
        "User-Agent": "NOLIA/1.0 (+https://example.invalid)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    },
    params.timeoutMs,
  );

  if (!res.ok) {
    throw new HttpError(502, `Failed to fetch source (${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new HttpError(415, "Unsupported content type");
  }

  const html = await readResponseTextWithLimit(res, params.maxBytes);
  const text = extractTextFromHtml(html);

  return text;
}
