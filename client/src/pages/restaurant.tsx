import { useQuery, useMutation } from "@tanstack/react-query";
import { ChefHat, Clock, CheckCircle, User, Phone, Bell, BellOff, Settings, Edit, Trash2, Plus, X, Share2, Banknote, Smartphone as SmartphoneIcon } from "lucide-react";
import { PropertyScopePicker } from "@/components/property-scope-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Order, type Property } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useEffect, useRef, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Smartphone } from "lucide-react";

// Payment dialog state type
type PaymentDialogState = { open: false } | { open: true; orderId: number; total: number; customerName: string };

const statusColors = {
  pending: "bg-amber-500 text-white",
  preparing: "bg-chart-2 text-white",
  ready: "bg-chart-5 text-white",
  delivered: "bg-muted text-muted-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

export default function Kitchen() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    playNotification, 
    isEnabled, 
    setIsEnabled,
    alarmTone,
    setAlarmTone,
    repeatCount,
    setRepeatCount,
    volume,
    setVolume
  } = useNotificationSound();
  const previousOrderCountRef = useRef<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { status: pushStatus, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications(true);
  const [activeTab, setActiveTab] = useState("active");
  const [completedSearch, setCompletedSearch] = useState("");
  const [completedDate, setCompletedDate] = useState("");
  const [editDialog, setEditDialog] = useState<{ open: boolean; order: any | null }>({
    open: false,
    order: null,
  });
  const [editedItems, setEditedItems] = useState<Array<{ name: string; quantity: number; price: string }>>([]);
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState>({ open: false });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "upi">("cash");
  const [showPopupSettings, setShowPopupSettings] = useState(false);
  const [popupForm, setPopupForm] = useState({
    isEnabled: false,
    title: "",
    message: "",
    showOrderButton: false,
    orderButtonText: "Order Now",
    openingTime: "08:00",
    closingTime: "22:00",
    preOpeningMessage: "Kitchen opens at {{OPEN_TIME}}. Please wait for {{WAIT_TIME}} minutes.",
  });

  // Global property selection — synced with dashboard via localStorage
  const {
    selectedPropertyId,
    setSelectedPropertyId,
    availableProperties,
    showPropertySwitcher,
  } = usePropertyFilter();

  // Restaurant popup settings
  const { data: popupData, isLoading: popupLoading } = useQuery<any>({
    queryKey: ["/api/restaurant-popup", selectedPropertyId],
    enabled: !!selectedPropertyId,
    queryFn: async () => {
      const res = await fetch(`/api/restaurant-popup/${selectedPropertyId}`);
      if (!res.ok) throw new Error("Failed to fetch popup settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (popupData) {
      setPopupForm({
        isEnabled: !!popupData.isEnabled,
        title: popupData.title || "",
        message: popupData.message || "",
        showOrderButton: !!popupData.showOrderButton,
        orderButtonText: popupData.orderButtonText || "Order Now",
        openingTime: popupData.openingTime || "08:00",
        closingTime: popupData.closingTime || "22:00",
        preOpeningMessage: popupData.preOpeningMessage || "Kitchen opens at {{OPEN_TIME}}. Please wait for {{WAIT_TIME}} minutes.",
      });
    }
  }, [popupData]);

  const savePopupMutation = useMutation({
    mutationFn: () => apiRequest(`/api/restaurant-popup/${selectedPropertyId}`, "PUT", popupForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant-popup", selectedPropertyId] });
      toast({ title: "Saved", description: "Popup message updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Auto-prompt push subscription when the kitchen page loads
  useEffect(() => {
    if (pushStatus === "unsubscribed") {
      // Small delay so the UI settles before asking for permission
      const t = setTimeout(() => {
        if (Notification.permission !== "denied") {
          pushSubscribe();
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [pushStatus]);

  // Build a WhatsApp share message for an order
  const shareOrderOnWhatsApp = (order: any) => {
    const items = (order.items as any[]) || [];
    const itemLines = items
      .map((i: any, idx: number) => {
        const lineTotal = (Number(i.quantity) * Number(i.price)).toFixed(0);
        return `${idx + 1}) ${i.name}: ${i.quantity} QTY x ₹${i.price} = ₹${lineTotal}`;
      })
      .join("\n");

    const location = order.roomNumber ? `ROOM ${order.roomNumber}` : (order.customerName || "Restaurant");
    const paymentStatus = order.paymentStatus === "paid" ? "Paid" : "Unpaid";

    let msg =
      `Order for ${order.customerName || "Guest"}\n` +
      (order.customerPhone ? `Phone Number: ${order.customerPhone}\n` : "") +
      `${location}\n\n` +
      `Order\n${itemLines}\n\n` +
      (order.specialInstructions ? `Customer Instruction: ${order.specialInstructions}\n\n` : "") +
      `Total Bill: ₹${order.totalAmount}\n\n` +
      `Payment Status: ${paymentStatus}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 15000, // Auto-refresh every 15 seconds to detect new orders
    staleTime: 0, // Always consider data stale so it refetches
    refetchOnWindowFocus: true, // Refetch when switching to this tab
  });
  
  const { data: menuItems } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
  });

  // Filter orders by selected property
  const filteredOrdersByProperty = useMemo(() => {
    if (!orders) return [];
    if (selectedPropertyId === null) return orders;
    return orders.filter(order => order.propertyId === selectedPropertyId);
  }, [orders, selectedPropertyId]);

  // Play notification sound when new orders arrive
  useEffect(() => {
    if (orders) {
      const pendingCount = orders.filter(o => o.status === 'pending').length;
      
      // Play sound if we have new pending orders
      // Skip only on initial load (when previousOrderCountRef is null)
      if (previousOrderCountRef.current !== null && pendingCount > previousOrderCountRef.current) {
        playNotification();
        toast({
          title: "New Order Received!",
          description: `You have ${pendingCount} pending order${pendingCount > 1 ? 's' : ''}`,
        });
      }
      
      // Always update the ref, even if count is 0
      previousOrderCountRef.current = pendingCount;
    }
  }, [orders, playNotification, toast]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentMethod }: { id: number; status: string; paymentMethod?: string }) => {
      const res = await apiRequest(`/api/orders/${id}/status`, "PATCH", { status, paymentMethod });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({
        title: "Success",
        description: "Order status updated",
      });
      if (data?.walletWarning) {
        setTimeout(() => {
          toast({ title: "Wallet not updated", description: data.walletWarning, variant: "destructive" });
        }, 500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, items }: { id: number; items: any[] }) => {
      const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      return await apiRequest(`/api/orders/${id}`, "PATCH", { items, totalAmount: totalAmount.toFixed(2) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
      setEditDialog({ open: false, order: null });
      setEditedItems([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Functions for managing edited items
  const openEditDialog = (order: any) => {
    setEditDialog({ open: true, order });
    setEditedItems(JSON.parse(JSON.stringify(order.items))); // Deep clone
  };
  
  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...editedItems];
    updated[index].quantity = quantity;
    setEditedItems(updated);
  };
  
  const removeItem = (index: number) => {
    if (editedItems.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "An order must have at least one item",
        variant: "destructive",
      });
      return;
    }
    setEditedItems(editedItems.filter((_, i) => i !== index));
  };
  
  const addNewItem = (menuItem: any) => {
    setEditedItems([...editedItems, {
      name: menuItem.name,
      quantity: 1,
      price: menuItem.price,
    }]);
  };
  
  const saveOrder = () => {
    if (!editDialog.order || editedItems.length === 0) return;
    updateOrderMutation.mutate({ id: editDialog.order.id, items: editedItems });
  };

  // Filter orders based on active tab (using filtered orders by property)
  const allActiveOrders = filteredOrdersByProperty?.filter((order) => order.status === "pending" || order.status === "preparing" || order.status === "ready") || [];
  const pendingOrders = filteredOrdersByProperty?.filter((order) => order.status === "pending") || [];
  const completedOrders = filteredOrdersByProperty?.filter((order) => order.status === "delivered") || [];
  const rejectedOrders = filteredOrdersByProperty?.filter((order) => order.status === "rejected") || [];

  // Apply search + date filters to completed orders
  const filteredCompletedOrders = useMemo(() => {
    let result = completedOrders;
    if (completedDate) {
      result = result.filter((o) => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        if (!d) return false;
        return format(d, "yyyy-MM-dd") === completedDate;
      });
    }
    if (completedSearch.trim()) {
      const q = completedSearch.toLowerCase().trim();
      result = result.filter((o) =>
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.roomNumber && String(o.roomNumber).toLowerCase().includes(q)) ||
        (o.tableNumber && String(o.tableNumber).toLowerCase().includes(q)) ||
        String(o.id).includes(q) ||
        (Array.isArray(o.items) && o.items.some((i: any) => i.name && i.name.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [completedOrders, completedSearch, completedDate]);

  // Calculate counts for badges
  const orderCounts = {
    active: allActiveOrders.length,
    pending: pendingOrders.length,
    completed: completedOrders.length,
    rejected: rejectedOrders.length,
  };
  
  // Get filtered orders based on active tab
  let filteredOrders: any[] = [];
  if (activeTab === "active") {
    filteredOrders = allActiveOrders;
  } else if (activeTab === "pending") {
    filteredOrders = pendingOrders;
  } else if (activeTab === "completed") {
    filteredOrders = filteredCompletedOrders;
  } else if (activeTab === "rejected") {
    filteredOrders = rejectedOrders;
  }
  
  // Group active orders by status for display
  const filteredPendingOrders = filteredOrders.filter((order) => order.status === "pending");
  const filteredPreparingOrders = filteredOrders.filter((order) => order.status === "preparing");
  const filteredReadyOrders = filteredOrders.filter((order) => order.status === "ready");

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  const renderOrderCard = (order: any) => {
    const items = order.items as any[];
    const orderSource = order.orderSource || "staff";
    const orderType = order.orderType;
    const customerName = order.customerName;
    const customerPhone = order.customerPhone;
    const hasCheckedInBooking = order.hasCheckedInBooking;
    const roomNumber = order.roomNumber;
    
    // Show room number for any room-type order that has a room number
    const showRoomNumber = orderType !== "restaurant" && roomNumber;
    
    return (
      <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg" data-testid={`text-order-room-${order.id}`}>
                  {orderType === "restaurant" ? (
                    customerName || "Dine-in Guest"
                  ) : showRoomNumber ? (
                    `Room ${roomNumber}${customerName ? ` - ${customerName}` : ""}`
                  ) : customerName ? (
                    customerName
                  ) : (
                    "Guest Order"
                  )}
                </CardTitle>
                <Badge variant="outline" className="text-xs" data-testid={`badge-order-source-${order.id}`}>
                  {orderSource === "guest" ? (
                    <><User className="h-3 w-3 mr-1" />Guest</>
                  ) : (
                    <><Phone className="h-3 w-3 mr-1" />Staff</>
                  )}
                </Badge>
                {orderType === "restaurant" && (
                  <Badge variant="secondary" className="text-xs">Restaurant</Badge>
                )}
              </div>
              {customerPhone && (
                <p className="text-xs text-muted-foreground mt-1">
                  📞 {customerPhone}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(order.createdAt!), "PPp")}
              </p>
            </div>
            <Badge className={statusColors[order.status as keyof typeof statusColors]} data-testid={`badge-order-status-${order.id}`}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              {items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm" data-testid={`text-order-item-${order.id}-${idx}`}>
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-mono">₹{item.price}</span>
                </div>
              ))}
            </div>
            
            {order.specialInstructions && (
              <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Special Instructions:</p>
                <p className="text-xs mt-1">{order.specialInstructions}</p>
              </div>
            )}

            <div className="pt-3 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono" data-testid={`text-order-total-${order.id}`}>₹{order.totalAmount}</span>
              </div>
              {/* Payment status for restaurant orders */}
              {orderType === "restaurant" && (order.paymentStatus === "paid" ? (
                <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle className="h-3 w-3" />
                  Paid via {order.paymentMethod === "upi" ? "UPI" : "Cash"}
                </div>
              ) : order.status === "delivered" ? (
                <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 dark:text-orange-400">
                  <Clock className="h-3 w-3" />
                  Payment pending
                </div>
              ) : null)}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => openEditDialog(order)}
                data-testid={`button-edit-order-${order.id}`}
                title="Edit order"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => shareOrderOnWhatsApp(order)}
                data-testid={`button-share-order-${order.id}`}
                title="Share on WhatsApp"
                className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              {order.status === "pending" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => updateStatusMutation.mutate({ id: order.id, status: "rejected" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid={`button-reject-order-${order.id}`}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => updateStatusMutation.mutate({ id: order.id, status: "preparing" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid={`button-start-order-${order.id}`}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Start Preparing
                  </Button>
                </>
              )}
              {order.status === "preparing" && (
                <Button
                  className="flex-1"
                  onClick={() => updateStatusMutation.mutate({ id: order.id, status: "ready" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-ready-order-${order.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Ready
                </Button>
              )}
              {order.status === "ready" && (
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (orderType === "restaurant") {
                      // Open payment dialog for walk-in/dine-in orders
                      setSelectedPaymentMethod("cash");
                      setPaymentDialog({
                        open: true,
                        orderId: order.id,
                        total: parseFloat(order.totalAmount),
                        customerName: customerName || "Dine-in Guest",
                      });
                    } else {
                      // Room orders go to booking bill — mark delivered directly
                      updateStatusMutation.mutate({ id: order.id, status: "delivered" });
                    }
                  }}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-deliver-order-${order.id}`}
                >
                  {orderType === "restaurant" ? "Collect & Close" : "Delivered"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            Kitchen Panel
          </h1>
          <p className="text-muted-foreground mt-1">Manage incoming orders and preparation</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Push Notification toggle (mobile push - works even when app is closed) */}
          {pushStatus !== "unsupported" && (
            <Button
              variant={pushStatus === "subscribed" ? "default" : "outline"}
              size="sm"
              onClick={pushStatus === "subscribed" ? pushUnsubscribe : pushSubscribe}
              disabled={pushStatus === "loading" || pushStatus === "denied"}
              data-testid="button-push-notifications"
              title={
                pushStatus === "subscribed"
                  ? "Mobile push ON — click to disable"
                  : pushStatus === "denied"
                  ? "Notifications blocked in browser settings"
                  : "Enable mobile push notifications (works even when app is closed)"
              }
              className="gap-1.5"
            >
              <Smartphone className="h-4 w-4" />
              {pushStatus === "subscribed"
                ? "Push ON"
                : pushStatus === "denied"
                ? "Blocked"
                : pushStatus === "loading"
                ? "..."
                : "Enable Push"}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-kitchen-settings"
            title="Alarm settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant={isEnabled ? "default" : "outline"}
            size="icon"
            onClick={() => setIsEnabled(!isEnabled)}
            data-testid="button-toggle-notifications"
            title={isEnabled ? "Disable notifications" : "Enable notifications"}
          >
            {isEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Property Filter */}
      {availableProperties.length > 1 && (
        <div className="mb-6">
          <PropertyScopePicker
            availableProperties={availableProperties}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
          />
        </div>
      )}

      {/* Push notification warning banner — shown when not subscribed */}
      {pushStatus === "unsubscribed" && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Bell className="h-4 w-4 shrink-0" />
            <span><strong>Push notifications are off.</strong> Enable them so you receive order alerts even when this app is closed.</span>
          </div>
          <Button size="sm" onClick={pushSubscribe} className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-0" data-testid="button-enable-push-banner">
            Enable Now
          </Button>
        </div>
      )}
      {pushStatus === "denied" && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700 px-4 py-3">
          <Bell className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            <strong>Notifications are blocked.</strong> Go to your browser settings → Site settings → Notifications → Allow for this site, then refresh.
          </span>
        </div>
      )}

      {/* Popup Message Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🍽️</span>
              <CardTitle className="text-lg">Popup Message</CardTitle>
              {popupForm.isEnabled && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Active</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                data-testid="toggle-popup-enabled"
                checked={popupForm.isEnabled}
                onCheckedChange={(v) => setPopupForm(f => ({ ...f, isEnabled: v }))}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPopupSettings(!showPopupSettings)}
                data-testid="button-popup-settings-toggle"
              >
                {showPopupSettings ? "Hide" : "Edit"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedPropertyId
              ? "Shows a branded popup to guests when they open the food ordering link."
              : "Select a property above to manage its popup message."}
          </p>
        </CardHeader>
        {showPopupSettings && selectedPropertyId && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="popup-title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="popup-title"
                data-testid="input-popup-title"
                placeholder="e.g. Today's Special"
                value={popupForm.title}
                onChange={(e) => setPopupForm(f => ({ ...f, title: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-message">Message *</Label>
              <Textarea
                id="popup-message"
                data-testid="input-popup-message"
                placeholder={`e.g. "Kitchen open 8 AM – 10 PM\nToday's Special: Fresh Siddu – Must Try! 🏔️"`}
                value={popupForm.message}
                onChange={(e) => setPopupForm(f => ({ ...f, message: e.target.value }))}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Supports line breaks. Update this daily for specials and announcements.</p>
            </div>

            {/* Kitchen Hours Section */}
            <div className="rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">⏰</span>
                <span className="font-semibold text-sm">Kitchen Hours</span>
                <span className="text-xs text-muted-foreground ml-1">(used for pre-opening popup)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="popup-opening-time">Opening Time</Label>
                  <Input
                    id="popup-opening-time"
                    data-testid="input-popup-opening-time"
                    type="time"
                    value={popupForm.openingTime}
                    onChange={(e) => setPopupForm(f => ({ ...f, openingTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="popup-closing-time">Closing Time</Label>
                  <Input
                    id="popup-closing-time"
                    data-testid="input-popup-closing-time"
                    type="time"
                    value={popupForm.closingTime}
                    onChange={(e) => setPopupForm(f => ({ ...f, closingTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="popup-pre-opening-msg">
                  Pre-opening Message
                  <span className="text-muted-foreground text-xs font-normal ml-1">(shown before opening time)</span>
                </Label>
                <Textarea
                  id="popup-pre-opening-msg"
                  data-testid="input-popup-pre-opening-msg"
                  placeholder="Kitchen opens at {{OPEN_TIME}}. Please wait for {{WAIT_TIME}} minutes."
                  value={popupForm.preOpeningMessage}
                  onChange={(e) => setPopupForm(f => ({ ...f, preOpeningMessage: e.target.value }))}
                  rows={2}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{"{{OPEN_TIME}}"}</code> and <code className="bg-muted px-1 rounded">{"{{WAIT_TIME}}"}</code> — they are replaced automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
              <Switch
                data-testid="toggle-popup-order-button"
                id="popup-order-btn"
                checked={popupForm.showOrderButton}
                onCheckedChange={(v) => setPopupForm(f => ({ ...f, showOrderButton: v }))}
              />
              <div className="flex-1">
                <Label htmlFor="popup-order-btn" className="cursor-pointer">Show "Order Now" button in popup</Label>
                <p className="text-xs text-muted-foreground">Closes the popup and scrolls to the menu</p>
              </div>
            </div>

            {popupForm.showOrderButton && (
              <div className="space-y-2">
                <Label htmlFor="popup-btn-text">Button text</Label>
                <Input
                  id="popup-btn-text"
                  data-testid="input-popup-btn-text"
                  placeholder="Order Now"
                  value={popupForm.orderButtonText}
                  onChange={(e) => setPopupForm(f => ({ ...f, orderButtonText: e.target.value }))}
                  className="max-w-xs"
                  maxLength={50}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                data-testid="btn-save-popup"
                onClick={() => savePopupMutation.mutate()}
                disabled={savePopupMutation.isPending}
              >
                {savePopupMutation.isPending ? "Saving..." : "Save Popup"}
              </Button>
              {!popupForm.isEnabled && (
                <Button
                  variant="outline"
                  data-testid="btn-save-and-enable-popup"
                  onClick={() => {
                    const updated = { ...popupForm, isEnabled: true };
                    setPopupForm(updated);
                    apiRequest(`/api/restaurant-popup/${selectedPropertyId}`, "PUT", updated)
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/restaurant-popup", selectedPropertyId] });
                        toast({ title: "Saved", description: "Popup enabled and saved" });
                      })
                      .catch((e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }));
                  }}
                  disabled={savePopupMutation.isPending || !popupForm.message.trim()}
                >
                  Save & Enable
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Alarm Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Alarm Tone</label>
                <Select value={alarmTone} onValueChange={(value: any) => setAlarmTone(value)}>
                  <SelectTrigger data-testid="select-alarm-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🚨 Urgent (Loud Alert)</SelectItem>
                    <SelectItem value="bell">🔔 Bell (Pleasant)</SelectItem>
                    <SelectItem value="chime">🎵 Chime (Soft)</SelectItem>
                    <SelectItem value="classic">⏰ Classic (Beep-Beep)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Repeat Times</label>
                <Select value={String(repeatCount)} onValueChange={(value) => setRepeatCount(Number(value))}>
                  <SelectTrigger data-testid="select-repeat-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 time</SelectItem>
                    <SelectItem value="2">2 times</SelectItem>
                    <SelectItem value="3">3 times</SelectItem>
                    <SelectItem value="4">4 times</SelectItem>
                    <SelectItem value="5">5 times</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Volume: {Math.round(volume * 100)}%</label>
                <Slider
                  value={[volume * 100]}
                  onValueChange={(values) => setVolume(values[0] / 100)}
                  min={0}
                  max={100}
                  step={10}
                  data-testid="slider-volume"
                  className="mt-2"
                />
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => playNotification()}
              data-testid="button-test-alarm"
            >
              🔊 Test Alarm
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active" data-testid="tab-active-orders">
            Active <Badge variant="secondary" className="ml-2">{orderCounts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending-orders">
            Pending <Badge variant="secondary" className="ml-2">{orderCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed-orders">
            Completed <Badge variant="secondary" className="ml-2">{orderCounts.completed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected-orders">
            Rejected <Badge variant="secondary" className="ml-2">{orderCounts.rejected}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {activeTab === "active" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold">
                    {filteredPendingOrders.length}
                  </span>
                  Pending
                </h2>
                <div className="space-y-4">
                  {filteredPendingOrders.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">No pending orders</p>
                    </Card>
                  ) : (
                    filteredPendingOrders.map(renderOrderCard)
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-2/10 text-chart-2 text-xs font-bold">
                    {filteredPreparingOrders.length}
                  </span>
                  Preparing
                </h2>
                <div className="space-y-4">
                  {filteredPreparingOrders.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">No orders in preparation</p>
                    </Card>
                  ) : (
                    filteredPreparingOrders.map(renderOrderCard)
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-5/10 text-chart-5 text-xs font-bold">
                    {filteredReadyOrders.length}
                  </span>
                  Ready
                </h2>
                <div className="space-y-4">
                  {filteredReadyOrders.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">No orders ready</p>
                    </Card>
                  ) : (
                    filteredReadyOrders.map(renderOrderCard)
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search + date filter — only shown on Completed tab */}
              {activeTab === "completed" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <Input
                      placeholder="Search by name, room, item..."
                      value={completedSearch}
                      onChange={e => setCompletedSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-completed-search"
                    />
                    {completedSearch && (
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setCompletedSearch("")}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="date"
                      value={completedDate}
                      onChange={e => setCompletedDate(e.target.value)}
                      className="w-full sm:w-44"
                      data-testid="input-completed-date"
                    />
                    {completedDate && (
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setCompletedDate("")}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {(completedSearch || completedDate) && (
                    <div className="flex items-center text-sm text-muted-foreground self-center whitespace-nowrap">
                      {filteredOrders.length} result{filteredOrders.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}

              {filteredOrders.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    {activeTab === "pending" && "No pending orders"}
                    {activeTab === "completed" && (completedSearch || completedDate ? "No orders match your filters" : "No completed orders")}
                    {activeTab === "rejected" && "No rejected orders"}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map(renderOrderCard)}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Edit Order Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, order: null })}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl" data-testid="dialog-edit-order">
          <DialogHeader>
            <DialogTitle>Edit Order #{editDialog.order?.id}</DialogTitle>
          </DialogHeader>
          
          {editDialog.order && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Order Items</Label>
                {editedItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        value={item.name}
                        disabled
                        className="bg-muted"
                        data-testid={`input-item-name-${index}`}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                        data-testid={`input-item-quantity-${index}`}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        value={`₹${item.price}`}
                        disabled
                        className="bg-muted"
                        data-testid={`input-item-price-${index}`}
                      />
                    </div>
                    {editedItems.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => removeItem(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <Label>Add New Item</Label>
                <Command className="rounded-lg border">
                  <CommandInput 
                    placeholder="Type to search menu items..." 
                    data-testid="input-search-menu"
                    className="h-11"
                  />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty>No menu items found.</CommandEmpty>
                    <CommandGroup>
                      {menuItems?.filter(item => item.isAvailable).map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.name} ${item.price}`}
                          onSelect={() => {
                            addNewItem(item);
                          }}
                          data-testid={`menu-item-${item.id}`}
                          className="cursor-pointer py-2"
                        >
                          <div className="flex justify-between w-full items-center">
                            <span>{item.name}</span>
                            <Badge variant="secondary">₹{item.price}</Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span data-testid="text-edit-total">
                    ₹{editedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, order: null })}
              disabled={updateOrderMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={saveOrder}
              disabled={updateOrderMutation.isPending || editedItems.length === 0}
              data-testid="button-save-order"
            >
              {updateOrderMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment collection dialog for restaurant walk-in orders */}
      <Dialog
        open={paymentDialog.open}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog({ open: false });
        }}
      >
        <DialogContent className="sm:max-w-sm" data-testid="dialog-payment-collection">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Collect Payment
            </DialogTitle>
          </DialogHeader>

          {paymentDialog.open && (
            <div className="space-y-5 py-2">
              <div className="rounded-lg border p-4 bg-muted/40">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{paymentDialog.customerName}</p>
                <p className="text-sm text-muted-foreground mt-2">Amount due</p>
                <p className="text-2xl font-bold text-primary">₹{paymentDialog.total.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("cash")}
                    data-testid="button-payment-cash"
                    className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 transition-colors
                      ${selectedPaymentMethod === "cash"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    <Banknote className="h-6 w-6" />
                    <span className="text-sm font-medium">Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("upi")}
                    data-testid="button-payment-upi"
                    className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 transition-colors
                      ${selectedPaymentMethod === "upi"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    <SmartphoneIcon className="h-6 w-6" />
                    <span className="text-sm font-medium">UPI</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPaymentDialog({ open: false })}
              disabled={updateStatusMutation.isPending}
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!paymentDialog.open) return;
                updateStatusMutation.mutate(
                  {
                    id: paymentDialog.orderId,
                    status: "delivered",
                    paymentMethod: selectedPaymentMethod,
                  },
                  {
                    onSuccess: () => {
                      setPaymentDialog({ open: false });
                      toast({ title: `Payment recorded — ₹${paymentDialog.total.toFixed(2)} (${selectedPaymentMethod.toUpperCase()})` });
                    },
                  }
                );
              }}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {updateStatusMutation.isPending ? "Processing..." : `Confirm ₹${paymentDialog.open ? paymentDialog.total.toFixed(2) : "0"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
