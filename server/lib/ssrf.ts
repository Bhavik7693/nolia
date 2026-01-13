import dns from "dns";
import net from "net";
import { HttpError } from "./httpError";

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
  if (normalized.startsWith("fe80")) return true; // link-local
  return false;
}

function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export async function assertSafeUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new HttpError(400, "Invalid URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new HttpError(400, "Only http/https URLs are allowed");
  }

  if (!url.hostname) {
    throw new HttpError(400, "Invalid URL hostname");
  }

  const host = url.hostname;

  if (host === "localhost" || host.endsWith(".local")) {
    throw new HttpError(400, "Unsafe URL host");
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new HttpError(400, "Unsafe URL IP");
    }
    return url;
  }

  const lookups = await dns.promises.lookup(host, { all: true });
  if (lookups.length === 0) {
    throw new HttpError(400, "Unable to resolve URL host");
  }

  for (const entry of lookups) {
    if (isPrivateIp(entry.address)) {
      throw new HttpError(400, "Unsafe URL resolved IP");
    }
  }

  return url;
}
