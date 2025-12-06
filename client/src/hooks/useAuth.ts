import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Simple direct fetch with timeout
async function fetchUserWithTimeout(): Promise<User | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const res = await fetch("/api/auth/user", {
      credentials: "include",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (res.status === 401 || res.status === 403) {
      return null;
    }
    
    if (!res.ok) {
      return null;
    }
    
    return await res.json();
  } catch (error) {
    // Any error = not authenticated
    console.log('[Auth] Check failed, treating as unauthenticated');
    return null;
  }
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUserWithTimeout,
    retry: false,
    staleTime: Infinity,
  });

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
