import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Auth response type that includes pending/rejected status
interface AuthResponse {
  user: User | null;
  verificationStatus?: "pending" | "rejected" | "verified";
  message?: string;
  pendingUser?: { email: string; firstName: string; lastName: string };
}

// Simple direct fetch with timeout
async function fetchUserWithTimeout(): Promise<AuthResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const res = await fetch("/api/auth/user", {
      credentials: "include",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (res.status === 401) {
      return { user: null };
    }
    
    // Handle 403 - pending or rejected users
    if (res.status === 403) {
      const data = await res.json();
      return {
        user: null,
        verificationStatus: data.verificationStatus,
        message: data.message,
        pendingUser: data.user,
      };
    }
    
    if (!res.ok) {
      return { user: null };
    }
    
    const user = await res.json();
    return { user, verificationStatus: "verified" };
  } catch (error) {
    // Any error = not authenticated
    console.log('[Auth] Check failed, treating as unauthenticated');
    return { user: null };
  }
}

export function useAuth() {
  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUserWithTimeout,
    retry: false,
    staleTime: Infinity,
  });

  return {
    user: data?.user || undefined,
    isLoading,
    isAuthenticated: !!data?.user,
    verificationStatus: data?.verificationStatus,
    pendingUser: data?.pendingUser,
    message: data?.message,
  };
}
