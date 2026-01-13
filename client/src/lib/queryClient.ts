import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    let message = text;
    let requestId: string | undefined;

    try {
      const json = JSON.parse(text) as unknown;
      if (json && typeof json === "object") {
        const maybeMessage = (json as any).message;
        const maybeRequestId = (json as any).requestId;
        if (typeof maybeMessage === "string" && maybeMessage.trim()) {
          message = maybeMessage;
        }
        if (typeof maybeRequestId === "string" && maybeRequestId.trim()) {
          requestId = maybeRequestId;
        }
      }
    } catch {
      // ignore
    }

    const headerRequestId = res.headers.get("x-request-id");
    if (!requestId && headerRequestId) {
      requestId = headerRequestId;
    }

    const retryAfterRaw = res.headers.get("retry-after");
    const retryAfterSeconds = retryAfterRaw ? Number.parseInt(retryAfterRaw, 10) : undefined;

    throw new ApiError({
      status: res.status,
      message,
      requestId,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds as number) ? retryAfterSeconds : undefined,
    });
  }
}

export class ApiError extends Error {
  status: number;
  requestId?: string;
  retryAfterSeconds?: number;

  constructor(params: { status: number; message: string; requestId?: string; retryAfterSeconds?: number }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.requestId = params.requestId;
    this.retryAfterSeconds = params.retryAfterSeconds;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { signal?: AbortSignal; headers?: HeadersInit } | undefined,
): Promise<Response> {
  const headers = new Headers();
  if (data) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.headers) {
    const extra = new Headers(options.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    signal: options?.signal,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
