import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, Users, DollarSign, FileText, Lightbulb, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";

interface PendingItems {
  cleaningRooms: number;
  pendingSalaries: number;
  pendingEnquiries: number;
  unresolvedIssues: number;
  pendingBills: number;
}

interface AISummary {
  cleaningRooms: { count: number; message: string };
  pendingEnquiries: { count: number; message: string };
  pendingBills: { count: number; message: string };
  overallInsight: string;
}

const SCHEDULED_HOURS = [9, 15, 21];
const AUTO_HIDE_DURATION = 3600000;

export function AIPendingNotifications() {
  const [showNotification, setShowNotification] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  const { data: pendingItems } = useQuery<PendingItems>({
    queryKey: ["/api/pending-items"],
    refetchInterval: 60000,
  });

  const { data: aiSummary, isLoading: aiLoading } = useQuery<AISummary>({
    queryKey: ["/api/pending-items/ai-summary"],
    enabled: !!pendingItems && (pendingItems.cleaningRooms > 0 || pendingItems.pendingEnquiries > 0 || pendingItems.pendingBills > 0),
    refetchInterval: 300000, // 5 minutes
  });

  const isScheduledTime = () => {
    const now = new Date();
    return SCHEDULED_HOURS.includes(now.getHours());
  };

  const getCurrentHourKey = () => {
    const now = new Date();
    return `ai-pending-notif-dismissed-${now.toDateString()}-${now.getHours()}`;
  };

  const wasDismissedThisHour = () => {
    return localStorage.getItem(getCurrentHourKey()) === "true";
  };

  const markAsDismissedThisHour = () => {
    localStorage.setItem(getCurrentHourKey(), "true");
  };

  useEffect(() => {
    if (pendingItems && aiSummary && !aiLoading) {
      const total = Object.values(pendingItems).reduce((a, b) => a + b, 0);
      if (total > 0 && isScheduledTime() && !wasDismissedThisHour()) {
        setShowNotification(true);
        const timer = setTimeout(() => setShowNotification(false), AUTO_HIDE_DURATION);
        setAutoHideTimer(timer);
      }
    }
    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
  }, [pendingItems, aiSummary, aiLoading]);

  if (!pendingItems || !showNotification) return null;

  const total = Object.values(pendingItems).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const handleDismiss = () => {
    setShowNotification(false);
    markAsDismissedThisHour();
    if (autoHideTimer) clearTimeout(autoHideTimer);
  };

  return (
    <div className="fixed top-4 right-4 max-w-md z-50 max-h-96 overflow-y-auto">
      <Alert variant="destructive" className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-orange-900 dark:text-orange-100">Pending Tasks ({total})</AlertTitle>
            <div className="text-xs text-orange-700 dark:text-orange-300">Auto-hiding in 1 hour</div>
          </div>
        </div>

        <AlertDescription className="text-orange-800 dark:text-orange-200 space-y-2">
          {/* AI Loading State */}
          {aiLoading && (
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-orange-900/30 rounded text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Getting AI insights...</span>
            </div>
          )}

          {/* Room Cleaning */}
          {pendingItems.cleaningRooms > 0 && aiSummary && (
            <div className="p-3 bg-white dark:bg-orange-900/30 rounded border border-orange-100 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{aiSummary.cleaningRooms.count} rooms pending cleaning</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{aiSummary.cleaningRooms.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* New Enquiries */}
          {pendingItems.pendingEnquiries > 0 && aiSummary && (
            <div className="p-3 bg-white dark:bg-orange-900/30 rounded border border-orange-100 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{aiSummary.pendingEnquiries.count} new enquiries</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{aiSummary.pendingEnquiries.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Bills */}
          {pendingItems.pendingBills > 0 && aiSummary && (
            <div className="p-3 bg-white dark:bg-orange-900/30 rounded border border-orange-100 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{aiSummary.pendingBills.count} pending bills</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{aiSummary.pendingBills.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Insight */}
          {aiSummary && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900 mt-2">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">{aiSummary.overallInsight}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleDismiss}
            className="text-sm underline hover:no-underline text-orange-700 dark:text-orange-300 w-full text-left pt-1"
            data-testid="button-close-ai-notification"
          >
            Dismiss
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
