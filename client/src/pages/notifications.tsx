import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Trash2, Check, CheckCircle2, AlertCircle, Info, CreditCard, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  soundType: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  relatedType?: string;
}

const notificationTypeColors: Record<string, string> = {
  checkout_reminder: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  auto_checkout: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  approval_pending: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  payment_received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  order_ready: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  booking_confirmed: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

const notificationIcons: Record<string, any> = {
  checkout_reminder: Clock,
  auto_checkout: CheckCircle2,
  approval_pending: AlertCircle,
  payment_received: CreditCard,
  order_ready: CheckCircle2,
  booking_confirmed: Check,
};

export default function Notifications() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");

  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/notifications/${id}/read`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/notifications/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Success", description: "Notification deleted" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      for (const id of unreadIds) {
        await apiRequest(`/api/notifications/${id}/read`, "POST", {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Success", description: "All notifications marked as read" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notifications as read",
        variant: "destructive",
      });
    },
  });

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || n.type === filterType;
    const matchesRead = filterRead === "all" || (filterRead === "unread" ? !n.isRead : n.isRead);
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notification Center
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            {markAllAsReadMutation.isPending ? "Marking..." : "Mark All as Read"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-notifications"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="select-notification-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="checkout_reminder">Checkout Reminders</SelectItem>
                <SelectItem value="auto_checkout">Auto Checkouts</SelectItem>
                <SelectItem value="payment_received">Payments Received</SelectItem>
                <SelectItem value="approval_pending">Approvals Pending</SelectItem>
                <SelectItem value="order_ready">Orders Ready</SelectItem>
                <SelectItem value="booking_confirmed">Bookings Confirmed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger data-testid="select-notification-read-status">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || filterType !== "all" || filterRead !== "all"
                ? "No notifications match your filters"
                : "You're all caught up! No new notifications."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredNotifications.map((notification) => {
            const IconComponent = notificationIcons[notification.type] || Info;
            const colorClass = notificationTypeColors[notification.type] || "bg-gray-100 text-gray-800";
            
            return (
              <Card
                key={notification.id}
                className={`transition cursor-pointer ${!notification.isRead ? "border-primary/50 bg-muted/30" : ""}`}
                onClick={() => !notification.isRead && markAsReadMutation.mutate(notification.id)}
                data-testid={`card-notification-${notification.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${colorClass} mt-1`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{notification.title}</h3>
                            {!notification.isRead && (
                              <Badge variant="default" className="bg-blue-500">
                                New
                              </Badge>
                            )}
                            <Badge variant="outline" className={colorClass}>
                              {notification.type.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(notification.createdAt), "MMM d, yyyy • h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!notification.isRead && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          disabled={markAsReadMutation.isPending}
                          title="Mark as read"
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                        disabled={deleteNotificationMutation.isPending}
                        title="Delete notification"
                        data-testid={`button-delete-notification-${notification.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
