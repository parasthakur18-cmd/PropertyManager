import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bell, Trash2, Check, CheckCircle2, AlertCircle, Info, CreditCard,
  Clock, Search, CalendarCheck, UtensilsCrossed, LogIn, LogOut,
  Receipt, XCircle, ClipboardCheck, UserPlus, Store, ShieldAlert, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
  new_booking:        { label: "New Booking",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",        icon: CalendarCheck },
  new_order:          { label: "New Order",          color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",    icon: UtensilsCrossed },
  guest_checked_in:   { label: "Check-in",           color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",    icon: LogIn },
  guest_checked_out:  { label: "Check-out",          color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",       icon: LogOut },
  bill_generated:     { label: "Bill Generated",     color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", icon: Receipt },
  payment_received:   { label: "Payment Received",   color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CreditCard },
  booking_cancelled:  { label: "Booking Cancelled",  color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",           icon: XCircle },
  booking_confirmed:  { label: "Booking Confirmed",  color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",       icon: CheckCircle2 },
  task_assigned:      { label: "Task Assigned",      color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300", icon: ClipboardCheck },
  approval_pending:   { label: "Approval Pending",   color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300", icon: AlertCircle },
  approval_approved:  { label: "Approved",           color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",    icon: CheckCircle2 },
  approval_rejected:  { label: "Rejected",           color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",           icon: XCircle },
  new_user_signup:    { label: "New User",           color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",        icon: UserPlus },
  issue_reported:     { label: "Issue Reported",     color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",           icon: ShieldAlert },
  vendor_due:         { label: "Vendor Due",         color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300", icon: Store },
  checkout_reminder:  { label: "Checkout Reminder",  color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",       icon: Clock },
  auto_checkout:      { label: "Auto Checkout",      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", icon: CheckCircle2 },
  order_ready:        { label: "Order Ready",        color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",   icon: UtensilsCrossed },
  contact_enquiry:    { label: "Enquiry",            color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",           icon: FileText },
  system_alert:       { label: "System Alert",       color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",       icon: AlertCircle },
  error_reported:     { label: "Error Report",       color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",           icon: ShieldAlert },
};

const FILTER_GROUPS = [
  {
    label: "Bookings",
    types: ["new_booking", "booking_confirmed", "booking_cancelled", "checkout_reminder", "auto_checkout"],
  },
  {
    label: "Guests",
    types: ["guest_checked_in", "guest_checked_out"],
  },
  {
    label: "Orders & Food",
    types: ["new_order", "order_ready"],
  },
  {
    label: "Payments & Bills",
    types: ["payment_received", "bill_generated"],
  },
  {
    label: "Tasks & Approvals",
    types: ["task_assigned", "approval_pending", "approval_approved", "approval_rejected"],
  },
  {
    label: "Staff & System",
    types: ["new_user_signup", "vendor_due", "issue_reported", "contact_enquiry", "system_alert", "error_reported"],
  },
];

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { label: type.replace(/_/g, " "), color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: Info };
}

export default function Notifications() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/notifications/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.isRead);
      for (const n of unread) {
        await apiRequest("POST", `/api/notifications/${n.id}/read`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All marked as read" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || n.type === filterType;
    const matchesRead =
      filterRead === "all" || (filterRead === "unread" ? !n.isRead : n.isRead);
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Loading notifications…</div>;
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
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            {markAllAsReadMutation.isPending ? "Marking…" : "Mark All as Read"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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
                {FILTER_GROUPS.map(group => (
                  <div key={group.label}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.label}
                    </div>
                    {group.types.map(t => (
                      <SelectItem key={t} value={t}>
                        {getTypeMeta(t).label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
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
            <Bell className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
            <h3 className="text-lg font-semibold mb-1">No Notifications</h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery || filterType !== "all" || filterRead !== "all"
                ? "No notifications match your filters."
                : "You're all caught up!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredNotifications.map(notification => {
            const meta = getTypeMeta(notification.type);
            const IconComponent = meta.icon;

            return (
              <Card
                key={notification.id}
                className={`transition-colors cursor-pointer hover:bg-muted/20 ${
                  !notification.isRead ? "border-primary/40 bg-muted/20" : ""
                }`}
                onClick={() => !notification.isRead && markAsReadMutation.mutate(notification.id)}
                data-testid={`card-notification-${notification.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${meta.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-sm">{notification.title}</h3>
                            {!notification.isRead && (
                              <Badge variant="default" className="bg-blue-500 text-white text-xs px-1.5 py-0">
                                New
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-xs ${meta.color}`}>
                              {meta.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-snug">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(notification.createdAt), "MMM d, yyyy • h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {!notification.isRead && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={e => {
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
                        className="h-8 w-8"
                        onClick={e => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                        disabled={deleteNotificationMutation.isPending}
                        title="Delete"
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
