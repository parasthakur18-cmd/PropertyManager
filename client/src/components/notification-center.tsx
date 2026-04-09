import { useState, useEffect } from "react";
import { Bell, X, ArrowRight, BedDouble, UtensilsCrossed, CreditCard, CheckSquare, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  soundType: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number | null;
  relatedType?: string | null;
}

const playSound = (soundType: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;

    if (soundType === "critical" || soundType === "warning") {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (soundType === "payment") {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.setValueAtTime(523, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.log("Audio context not available");
  }
};

function getNotificationRoute(notification: Notification): string | null {
  const type = notification.type?.toLowerCase() ?? "";
  const relatedType = notification.relatedType?.toLowerCase() ?? "";

  if (type.includes("booking") || relatedType === "booking") return "/bookings";
  if (type.includes("active") || type.includes("checkin") || type.includes("checkout")) return "/active-bookings";
  if (type.includes("food") || type.includes("order") || relatedType === "order") return "/restaurant";
  if (type.includes("payment") || type.includes("billing") || type.includes("bill") || relatedType === "bill") return "/billing";
  if (type.includes("task") || relatedType === "task") return "/tasks";
  if (type.includes("expense") || type.includes("vendor")) return "/expenses";
  if (type.includes("guest") || relatedType === "guest") return "/guests";
  return null;
}

function getNotificationIcon(type: string) {
  const t = type?.toLowerCase() ?? "";
  if (t.includes("booking") || t.includes("checkin") || t.includes("checkout")) return <BedDouble className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
  if (t.includes("food") || t.includes("order")) return <UtensilsCrossed className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />;
  if (t.includes("payment") || t.includes("billing") || t.includes("bill")) return <CreditCard className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
  if (t.includes("task")) return <CheckSquare className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />;
  if (t.includes("expense") || t.includes("vendor")) return <Package className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />;
  return <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, navigate] = useLocation();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (response.ok) {
          const data: Notification[] = await response.json();
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.isRead).length);

          const newUnread = data.filter(n => !n.isRead);
          newUnread.forEach(notification => {
            if (notification.soundType !== "info") {
              playSound(notification.soundType);
            }
          });
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (!notifications.find(n => n.id === id)?.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      for (const notification of notifications) {
        await fetch(`/api/notifications/${notification.id}`, { method: "DELETE" });
      }
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    const route = getNotificationRoute(notification);
    if (route) {
      setIsOpen(false);
      navigate(route);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-notification-center"
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsOpen(false)}
            data-testid="notification-backdrop"
          />

          <Card className="fixed md:absolute bottom-0 md:bottom-auto right-0 md:right-2 md:top-12 w-full md:w-96 h-2/3 md:h-auto md:max-h-[480px] overflow-y-auto z-50 shadow-lg rounded-t-lg md:rounded-lg">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-background z-10">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-all-notifications"
                  >
                    Clear All
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(notification => {
                  const route = getNotificationRoute(notification);
                  const isClickable = !!route;
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 transition-colors ${
                        !notification.isRead ? "bg-muted/50" : ""
                      } ${isClickable ? "hover:bg-accent cursor-pointer" : ""}`}
                      onClick={() => isClickable && handleNotificationClick(notification)}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-sm leading-tight">{notification.title}</span>
                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{notification.message}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                            </span>
                            {isClickable && (
                              <span className="text-xs text-primary flex items-center gap-0.5 font-medium">
                                View <ArrowRight className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 -mr-1 -mt-0.5 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          data-testid={`button-delete-notification-${notification.id}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
