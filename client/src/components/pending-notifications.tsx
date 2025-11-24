import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, Users, DollarSign, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";

interface PendingItems {
  cleaningRooms: number;
  pendingSalaries: number;
  pendingEnquiries: number;
  unresolvedIssues: number;
  pendingBills: number;
}

// Scheduled notification times: 9 AM, 3 PM, 9 PM
const SCHEDULED_HOURS = [9, 15, 21];
const AUTO_HIDE_DURATION = 3600000; // 1 hour in milliseconds

export function PendingNotifications() {
  const [showNotification, setShowNotification] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  const { data: pendingItems, isLoading } = useQuery<PendingItems>({
    queryKey: ["/api/pending-items"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Check if current time matches scheduled times
  const isScheduledTime = () => {
    const now = new Date();
    return SCHEDULED_HOURS.includes(now.getHours());
  };

  // Get storage key for tracking shown notifications
  const getStorageKey = () => {
    const now = new Date();
    const dateHour = `${now.toDateString()}-${now.getHours()}`;
    return `pending-notif-${dateHour}`;
  };

  // Check if notification was already shown this hour
  const wasShownThisHour = () => {
    const key = getStorageKey();
    return localStorage.getItem(key) === "true";
  };

  // Mark notification as shown for this hour
  const markAsShown = () => {
    const key = getStorageKey();
    localStorage.setItem(key, "true");
  };

  useEffect(() => {
    if (pendingItems && !isLoading) {
      const total = Object.values(pendingItems).reduce((a, b) => a + b, 0);
      
      if (total > 0 && isScheduledTime() && !wasShownThisHour()) {
        setShowNotification(true);
        markAsShown();

        // Auto-hide after 1 hour
        const timer = setTimeout(() => {
          setShowNotification(false);
        }, AUTO_HIDE_DURATION);

        setAutoHideTimer(timer);
      }
    }

    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [pendingItems, isLoading]);

  if (!pendingItems || isLoading || !showNotification) return null;

  const total = Object.values(pendingItems).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const handleDismiss = () => {
    setShowNotification(false);
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
    }
  };

  return (
    <div className="fixed top-4 right-4 max-w-md z-50 max-h-80 overflow-y-auto">
      <Alert variant="destructive" className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        <AlertTitle className="text-orange-900 dark:text-orange-100">Pending Tasks ({total})</AlertTitle>
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <div className="text-xs text-orange-700 dark:text-orange-300 mb-2">Auto-hiding in 1 hour</div>
          <div className="space-y-2 mt-3">
            {pendingItems.cleaningRooms > 0 && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-orange-900/30 rounded">
                <Clock className="h-4 w-4" />
                <span>{pendingItems.cleaningRooms} rooms pending cleaning</span>
              </div>
            )}
            {pendingItems.pendingSalaries > 0 && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-orange-900/30 rounded">
                <DollarSign className="h-4 w-4" />
                <span>{pendingItems.pendingSalaries} pending salary payments</span>
              </div>
            )}
            {pendingItems.pendingEnquiries > 0 && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-orange-900/30 rounded">
                <Users className="h-4 w-4" />
                <span>{pendingItems.pendingEnquiries} new enquiries</span>
              </div>
            )}
            {pendingItems.unresolvedIssues > 0 && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-orange-900/30 rounded">
                <AlertCircle className="h-4 w-4" />
                <span>{pendingItems.unresolvedIssues} unresolved issues</span>
              </div>
            )}
            {pendingItems.pendingBills > 0 && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-orange-900/30 rounded">
                <FileText className="h-4 w-4" />
                <span>{pendingItems.pendingBills} pending bills</span>
              </div>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="mt-3 text-sm underline hover:no-underline text-orange-700 dark:text-orange-300"
            data-testid="button-close-notification"
          >
            Dismiss
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
