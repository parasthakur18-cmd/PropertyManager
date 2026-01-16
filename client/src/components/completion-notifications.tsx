import { Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";

interface CompletionMessage {
  id: string;
  type: "room_ready" | "cleaning_done" | "task_complete";
  message: string;
  timestamp: number;
}

const NOTIFICATION_DURATION = 5000; // 5 seconds

export function CompletionNotifications() {
  const [notifications, setNotifications] = useState<CompletionMessage[]>([]);

  useEffect(() => {
    // Listen for completion events from localStorage
    const handleStorageChange = () => {
      const event = localStorage.getItem("completion-event");
      if (event) {
        const notification = JSON.parse(event);
        setNotifications((prev) => [...prev, { ...notification, timestamp: Date.now() }]);
        localStorage.removeItem("completion-event");

        // Auto-remove after duration
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, NOTIFICATION_DURATION);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-40 max-w-md">
      {notifications.map((notification) => (
        <Alert key={notification.id} className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200 ml-2">
            {notification.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

// Helper function to trigger completion notification
export function triggerCompletionNotification(type: "room_ready" | "cleaning_done" | "task_complete", message: string) {
  const id = `${Date.now()}-${Math.random()}`;
  const event = { id, type, message };
  localStorage.setItem("completion-event", JSON.stringify(event));
  window.dispatchEvent(new Event("storage"));
}
