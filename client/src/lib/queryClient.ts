import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse JSON error response and extract message
    let errorMessage = `${res.status}: ${text}`;
    try {
      const errorData = JSON.parse(text);
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // Not JSON or doesn't have message field, use the default formatted message
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Fetch with timeout to prevent hanging requests
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const url = queryKey.join("/") as string;
      const timeout = url.includes("/auth/") ? 3000 : 15000;
      
      const res = await fetchWithTimeout(url, { credentials: "include" }, timeout);

      // Handle redirects (stale session cookies can cause redirects to login)
      if (res.redirected) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        throw new Error("Session expired");
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Handle timeout/abort errors - treat as unauthorized for auth queries
      if (error instanceof Error && error.name === "AbortError") {
        if (unauthorizedBehavior === "returnNull") {
          console.log('[Auth] Request timeout - treating as unauthenticated');
          return null;
        }
        throw new Error("Request timed out");
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
