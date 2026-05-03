import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushStatus = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

export function usePushNotifications(isAuthenticated: boolean) {
  const { toast } = useToast();
  const [status, setStatus] = useState<PushStatus>("loading");
  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const subRef = useRef<PushSubscriptionJSON | null>(null);

  const isSupported = "serviceWorker" in navigator && "PushManager" in window;

  // Register service worker and check existing subscription on mount
  useEffect(() => {
    if (!isAuthenticated || !isSupported) {
      setStatus(isSupported ? "unsubscribed" : "unsupported");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        swRef.current = reg;

        const existingSub = await reg.pushManager.getSubscription();
        if (cancelled) return;

        if (existingSub) {
          subRef.current = existingSub.toJSON();
          setStatus("subscribed");
          // Re-save subscription to server in case it's a new device or the
          // server lost it. Failures here are silent because we don't want
          // to nag the user on every page load — but the subscribe() flow
          // below will surface server failures loudly.
          try { await saveToServer(existingSub.toJSON()); } catch {}
        } else if (Notification.permission === "denied") {
          setStatus("denied");
        } else {
          setStatus("unsubscribed");
        }
      } catch (err) {
        console.warn("[Push] SW registration error:", err);
        if (!cancelled) setStatus("unsubscribed");
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, isSupported]);

  const saveToServer = async (subJson: PushSubscriptionJSON) => {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subJson),
      credentials: "include",
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Server error: ${response.status}`,
      );
    }
  };

  const subscribe = useCallback(async () => {
    if (!swRef.current || !isSupported) return;
    setStatus("loading");
    try {
      const keyResp = await fetch("/api/push/vapid-public-key", { credentials: "include" });
      const { publicKey } = await keyResp.json();
      if (!publicKey) throw new Error("No VAPID public key");

      const sub = await swRef.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      subRef.current = sub.toJSON();
      await saveToServer(sub.toJSON());
      setStatus("subscribed");

      toast({
        title: "Push notifications enabled",
        description: "You'll now receive order alerts on this device even when the app is closed.",
      });
    } catch (err: any) {
      console.error("[Push] Subscribe error:", err);
      if (Notification.permission === "denied") {
        setStatus("denied");
        toast({
          title: "Notifications blocked",
          description: "Allow notifications in your browser settings and try again.",
          variant: "destructive",
        });
      } else {
        setStatus("unsubscribed");
        toast({
          title: "Failed to enable notifications",
          description: err.message,
          variant: "destructive",
        });
      }
    }
  }, [isSupported, toast]);

  const unsubscribe = useCallback(async () => {
    if (!swRef.current) return;
    try {
      const existingSub = await swRef.current.pushManager.getSubscription();
      if (existingSub) {
        const endpoint = existingSub.endpoint;
        await existingSub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
          credentials: "include",
        });
      }
      subRef.current = null;
      setStatus("unsubscribed");
      toast({ title: "Push notifications disabled" });
    } catch (err: any) {
      console.error("[Push] Unsubscribe error:", err);
    }
  }, [toast]);

  return { status, subscribe, unsubscribe, isSupported };
}
