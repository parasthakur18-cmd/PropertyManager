import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, Users, DollarSign, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface PendingItems {
  cleaningRooms: number;
  pendingSalaries: number;
  pendingEnquiries: number;
  unresolvedIssues: number;
  pendingBills: number;
}

export function PendingNotifications() {
  const [showNotification, setShowNotification] = useState(false);

  const { data: pendingItems, isLoading } = useQuery<PendingItems>({
    queryKey: ["/api/pending-items"],
    refetchInterval: 60000, // Refresh every minute
  });

  useEffect(() => {
    // Show notification on app load if there are pending items
    if (pendingItems && !isLoading) {
      const total = Object.values(pendingItems).reduce((a, b) => a + b, 0);
      if (total > 0) {
        setShowNotification(true);
      }
    }
  }, [pendingItems, isLoading]);

  if (!pendingItems || isLoading || !showNotification) return null;

  const total = Object.values(pendingItems).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="fixed top-4 right-4 max-w-md z-50 max-h-80 overflow-y-auto">
      <Alert variant="destructive" className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        <AlertTitle className="text-orange-900 dark:text-orange-100">Pending Tasks ({total})</AlertTitle>
        <AlertDescription className="text-orange-800 dark:text-orange-200">
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
            onClick={() => setShowNotification(false)}
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
