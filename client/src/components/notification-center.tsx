import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  soundType: string;
  isRead: boolean;
  createdAt: string;
}

const playSound = (soundType: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;

    if (soundType === "critical" || soundType === "warning") {
      // High-pitched alert
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
      // Success chime
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

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (response.ok) {
          const data: Notification[] = await response.json();
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.isRead).length);

          // Play sound for new unread notifications
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
    const interval = setInterval(fetchNotifications, 5000); // Refresh every 5 seconds
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
        <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-y-auto z-50 shadow-lg">
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-background">
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
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-accent cursor-pointer transition ${
                    !notification.isRead ? "bg-muted/50" : ""
                  }`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{notification.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{notification.message}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      data-testid={`button-delete-notification-${notification.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
