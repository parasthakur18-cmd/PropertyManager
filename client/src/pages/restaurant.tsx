import { useQuery, useMutation } from "@tanstack/react-query";
import { ChefHat, Clock, CheckCircle, User, Phone, Bell, BellOff, Settings, Edit, Trash2, Plus, X, Share2, Banknote, Smartphone as SmartphoneIcon, Maximize2, Minimize2, FlaskConical } from "lucide-react";
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

// Bilingual labels (English + Hindi) for kitchen-staff readability.
// Used in tabs, column headers, and status badges across the KDS.
const STATUS_LABELS: Record<string, { en: string; hi: string }> = {
  pending:   { en: "Pending",   hi: "ऑर्डर आया है" },
  preparing: { en: "Preparing", hi: "बन रहा है" },
  ready:     { en: "Ready",     hi: "तैयार है" },
  delivered: { en: "Completed", hi: "दे दिया" },
  completed: { en: "Completed", hi: "दे दिया" },
  rejected:  { en: "Rejected",  hi: "रद्द" },
};

// Consistent color system across tabs, badges, card borders, and counters.
// Background-only utility (for solid badges).
const statusColors: Record<string, string> = {
  pending:   "bg-yellow-400 text-black border-0 font-semibold",
  preparing: "bg-orange-400 text-white border-0 font-semibold",
  ready:     "bg-green-500 text-white border-0 font-semibold",
  delivered: "bg-gray-400 text-white border-0 font-semibold",
  completed: "bg-gray-400 text-white border-0 font-semibold",
  rejected:  "bg-red-500 text-white border-0 font-semibold",
};

// Soft-tint variant for column counter circles + tab triggers.
const statusTints: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  preparing: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  ready:     "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
  delivered: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
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

  // ─── PRO Notification Layer state ─────────────────────────────────────────
  // Sound preset: maps to volume/repeat/tone. Stored in localStorage.
  type SoundPreset = "silent" | "normal" | "loud";
  const SOUND_PRESETS: Record<SoundPreset, { isEnabled: boolean; volume: number; repeatCount: number; alarmTone: any }> = {
    silent: { isEnabled: false, volume: 0.5, repeatCount: 1, alarmTone: "bell" },
    normal: { isEnabled: true, volume: 0.5, repeatCount: 2, alarmTone: "bell" },
    loud:   { isEnabled: true, volume: 1.0, repeatCount: 8, alarmTone: "urgent" },
  };
  const [soundPreset, setSoundPreset] = useState<SoundPreset>(() =>
    ((typeof window !== "undefined" && (localStorage.getItem("kitchen.soundPreset") as SoundPreset)) || "loud")
  );
  const applySoundPreset = (preset: SoundPreset) => {
    const p = SOUND_PRESETS[preset];
    setIsEnabled(p.isEnabled);
    setVolume(p.volume);
    setRepeatCount(p.repeatCount);
    setAlarmTone(p.alarmTone);
    setSoundPreset(preset);
    localStorage.setItem("kitchen.soundPreset", preset);
  };
  // Apply the saved preset on first mount
  const presetAppliedRef = useRef(false);
  useEffect(() => {
    if (presetAppliedRef.current) return;
    presetAppliedRef.current = true;
    const p = SOUND_PRESETS[soundPreset];
    setIsEnabled(p.isEnabled);
    setVolume(p.volume);
    setRepeatCount(p.repeatCount);
    setAlarmTone(p.alarmTone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repeat-until-acknowledged: keeps ringing every 15s while pending orders exist.
  const [repeatUntilAck, setRepeatUntilAck] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem("kitchen.repeatUntilAck") === "true"
  );
  useEffect(() => {
    localStorage.setItem("kitchen.repeatUntilAck", String(repeatUntilAck));
  }, [repeatUntilAck]);

  // ─── Kitchen Mode (full-screen, larger UI) ────────────────────────────
  const [kitchenMode, setKitchenMode] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem("kitchen.mode") === "true"
  );
  useEffect(() => {
    localStorage.setItem("kitchen.mode", String(kitchenMode));
  }, [kitchenMode]);

  // ─── Live tick — re-renders elapsed timers every 30 seconds ────────────
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Diagnostics: VAPID configured + service worker active
  const [vapidConfigured, setVapidConfigured] = useState<boolean | null>(null);
  const [swActive, setSwActive] = useState<boolean>(false);
  const [devices, setDevices] = useState<Array<{ id: number; endpointHash: string; userAgent: string | null; createdAt: string }>>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/push/vapid-public-key", { credentials: "include" });
        const j = await r.json();
        setVapidConfigured(!!j?.publicKey);
      } catch { setVapidConfigured(false); }
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          setSwActive(!!reg?.active);
        }
      } catch { setSwActive(false); }
    })();
  }, [pushStatus]);
  useEffect(() => {
    if (!showSettings) return;
    fetch("/api/push/subscriptions", { credentials: "include" })
      .then(r => (r.ok ? r.json() : []))
      .then(d => setDevices(Array.isArray(d) ? d : []))
      .catch(() => setDevices([]));
  }, [showSettings, pushStatus]);
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
    isSuperAdmin,
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

  // Handle ?order=ID link from WhatsApp — scroll to and highlight the order
  const [highlightedOrderId, setHighlightedOrderId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("order");
    return id ? parseInt(id, 10) : null;
  });

  useEffect(() => {
    if (!highlightedOrderId || !orders) return;
    const targetOrder = orders.find(o => o.id === highlightedOrderId);
    if (!targetOrder) return;
    // Switch to the correct tab so the card is visible
    const status = targetOrder.status as string;
    if (status === "pending" || status === "preparing" || status === "ready") {
      setActiveTab("active");
    } else if (status === "delivered") {
      setActiveTab("completed");
    } else if (status === "rejected") {
      setActiveTab("rejected");
    }
    // Scroll after a short delay so the tab content renders
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-testid="card-order-${highlightedOrderId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [highlightedOrderId, orders]);
  
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
        const newCount = pendingCount - previousOrderCountRef.current;
        toast({
          title: newCount > 1 ? `${newCount} new orders received!` : "New Order Received!",
          description: `You have ${pendingCount} pending order${pendingCount > 1 ? 's' : ''}`,
        });
      }
      
      // Always update the ref, even if count is 0
      previousOrderCountRef.current = pendingCount;
    }
  }, [orders, playNotification, toast]);

  // Repeat-until-acknowledged: re-ring every 15s while pending orders exist.
  // Stops automatically as soon as staff marks the order preparing/ready/delivered.
  const pendingCountForRepeat = (orders || []).filter(o => o.status === "pending").length;
  useEffect(() => {
    if (!repeatUntilAck || !isEnabled || pendingCountForRepeat === 0) return;
    const id = setInterval(() => playNotification(), 15000);
    return () => clearInterval(id);
  }, [repeatUntilAck, isEnabled, pendingCountForRepeat, playNotification]);

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
  
  // ─── TEST ORDER MODE — kitchen verification only, no revenue impact ─────
  const [testOrderDialog, setTestOrderDialog] = useState(false);
  const [testPhone, setTestPhone] = useState<string>(() =>
    (typeof window !== "undefined" && localStorage.getItem("kitchen.testPhone")) || ""
  );
  type TestCartItem = { menuItemId?: number; name: string; price: number; quantity: number };
  const [testCart, setTestCart] = useState<TestCartItem[]>([]);
  const addTestItem = (m: any) => {
    setTestCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === m.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === m.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        { menuItemId: m.id, name: m.name, price: parseFloat(m.price), quantity: 1 },
      ];
    });
  };
  const updateTestQty = (idx: number, delta: number) => {
    setTestCart((prev) =>
      prev
        .map((it, i) => (i === idx ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0),
    );
  };
  const removeTestItem = (idx: number) =>
    setTestCart((prev) => prev.filter((_, i) => i !== idx));
  const testCartTotal = testCart.reduce((s, i) => s + i.price * i.quantity, 0);

  const sendTestOrderMutation = useMutation({
    mutationFn: async (phone: string) => {
      if (!selectedPropertyId) throw new Error("Select a property first");
      return await apiRequest("/api/orders/test", "POST", {
        propertyId: selectedPropertyId,
        testPhone: phone || undefined,
        items: testCart.length > 0
          ? testCart.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }))
          : undefined,
      });
    },
    onSuccess: (_data, phone) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (phone) localStorage.setItem("kitchen.testPhone", phone);
      setTestOrderDialog(false);
      setTestCart([]);
      toast({
        title: "🧪 Test Order Sent",
        description: phone
          ? `Watch KDS + check WhatsApp on ${phone}. Tap the link to jump straight to this order.`
          : "Watch KDS, sound, push & WhatsApp. Will NOT affect revenue.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Test order failed", description: error.message, variant: "destructive" });
    },
  });

  const clearTestOrdersMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId) throw new Error("Select a property first");
      return await apiRequest(`/api/orders/test/cleanup?propertyId=${selectedPropertyId}`, "DELETE");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Test orders cleared",
        description: `Deleted ${data?.deletedCount ?? 0} test order(s).`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Cleanup failed", description: error.message, variant: "destructive" });
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

  // ─── Live timer + SLA color helpers (read-only, no logic change) ──────
  const getElapsedMinutes = (createdAt: any): number => {
    if (!createdAt) return 0;
    const ts = typeof createdAt === "string" || typeof createdAt === "number"
      ? new Date(createdAt).getTime()
      : (createdAt instanceof Date ? createdAt.getTime() : 0);
    if (!ts) return 0;
    return Math.max(0, Math.floor((nowTs - ts) / 60000));
  };
  const formatElapsed = (mins: number) =>
    mins < 1 ? "just now" : mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  // Returns ring + badge classes by elapsed time. Only applied to active orders.
  const getSlaStyle = (mins: number, status: string) => {
    if (status !== "pending" && status !== "preparing") return null;
    if (mins < 5)  return { ring: "ring-2 ring-green-500/60",  badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" };
    if (mins < 10) return { ring: "ring-2 ring-amber-500/70",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
    return            { ring: "ring-2 ring-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-semibold animate-pulse" };
  };

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

    // Live timer + SLA color
    const elapsedMins = getElapsedMinutes(order.createdAt);
    const sla = getSlaStyle(elapsedMins, order.status);
    const isNewPending = order.status === "pending";
    
    return (
      <Card
        key={order.id}
        className={`hover-elevate transition-all duration-500 ${kitchenMode ? "text-base" : ""} ${sla?.ring || ""} ${highlightedOrderId === order.id ? "ring-2 ring-teal-500 ring-offset-2 shadow-lg" : ""} ${(order as any).isTest ? "border-2 border-dashed border-violet-500 bg-violet-50/40 dark:bg-violet-950/20" : ""}`}
        data-testid={`card-order-${order.id}`}
      >
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
                {(order as any).isTest && (
                  <Badge
                    className="text-[10px] px-2 py-0 bg-violet-600 text-white border-0"
                    data-testid={`badge-test-order-${order.id}`}
                  >
                    🧪 TEST ORDER
                  </Badge>
                )}
                {isNewPending && (
                  <Badge
                    className="text-[10px] px-1.5 py-0 bg-red-500 text-white border-0 animate-pulse"
                    data-testid={`badge-new-${order.id}`}
                  >
                    NEW
                  </Badge>
                )}
              </div>
              {customerPhone && (
                <p className={`text-muted-foreground mt-1 ${kitchenMode ? "text-sm" : "text-xs"}`}>
                  📞 {customerPhone}
                </p>
              )}
              <div className={`flex items-center gap-2 mt-1 flex-wrap ${kitchenMode ? "text-sm" : "text-xs"}`}>
                <span className="text-muted-foreground">
                  {format(new Date(order.createdAt!), "PPp")}
                </span>
                {sla && (
                  <Badge
                    className={`${sla.badge} border-0 ${kitchenMode ? "text-sm px-2 py-0.5" : "text-[10px] px-1.5 py-0"}`}
                    data-testid={`badge-elapsed-${order.id}`}
                  >
                    ⏱ {formatElapsed(elapsedMins)}
                  </Badge>
                )}
              </div>
            </div>
            <Badge
              className={`${statusColors[order.status] || "bg-muted text-foreground"} flex flex-col items-center leading-tight px-2 py-1`}
              data-testid={`badge-order-status-${order.id}`}
            >
              <span className="text-[11px] uppercase tracking-wide">
                {STATUS_LABELS[order.status]?.en || order.status}
              </span>
              <span className="text-[12px] font-bold">
                {STATUS_LABELS[order.status]?.hi || ""}
              </span>
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
                    size={kitchenMode ? "lg" : "default"}
                    onClick={() => updateStatusMutation.mutate({ id: order.id, status: "rejected" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid={`button-reject-order-${order.id}`}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className={`flex-1 ${kitchenMode ? "text-base font-semibold" : ""}`}
                    size={kitchenMode ? "lg" : "default"}
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
                  className={`flex-1 ${kitchenMode ? "text-base font-semibold" : ""}`}
                  size={kitchenMode ? "lg" : "default"}
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
                  className={`flex-1 ${kitchenMode ? "text-base font-semibold" : ""}`}
                  size={kitchenMode ? "lg" : "default"}
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
    <div className={kitchenMode
      ? "fixed inset-0 z-50 bg-background overflow-auto p-4 md:p-6"
      : "p-6 md:p-8"
    } data-testid={kitchenMode ? "kitchen-mode-on" : "kitchen-mode-off"}>
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
            <>
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
              {pushStatus === "subscribed" && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-push-test"
                  title="Send a test notification to this device"
                  className="gap-1.5"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/push/test", { method: "POST", credentials: "include" });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.success) {
                        toast({ title: "Test sent", description: data.message || "Check your device for the notification." });
                      } else {
                        toast({
                          title: "Test failed",
                          description: data.message || `HTTP ${res.status}`,
                          variant: "destructive",
                        });
                      }
                    } catch (err: any) {
                      toast({ title: "Test failed", description: err?.message || "Network error", variant: "destructive" });
                    }
                  }}
                >
                  Test
                </Button>
              )}
            </>
          )}
          <Button
            variant={kitchenMode ? "default" : "outline"}
            size="icon"
            onClick={() => setKitchenMode(!kitchenMode)}
            data-testid="button-kitchen-mode"
            title={kitchenMode ? "Exit Kitchen Mode" : "Enter full-screen Kitchen Mode"}
          >
            {kitchenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
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
          {/* Test Order Mode — does NOT affect revenue/PnL/wallet */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestOrderDialog(true)}
            disabled={!selectedPropertyId}
            data-testid="button-send-test-order"
            title="Send a TEST order to verify KDS, sound, push & WhatsApp. Will NOT affect revenue."
            className="border-violet-400 text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/30"
          >
            <FlaskConical className="h-4 w-4 mr-1" />
            Send Test Order
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Delete all test orders for this property? Real orders are not affected.")) {
                clearTestOrdersMutation.mutate();
              }
            }}
            disabled={!selectedPropertyId || clearTestOrdersMutation.isPending}
            data-testid="button-clear-test-orders"
            title="Delete all test orders for this property"
            className="text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/30"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Tests
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
            isSuperAdmin={isSuperAdmin}
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
            <CardTitle className="text-lg">Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ── Sound Mode Presets ─────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sound Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(["silent", "normal", "loud"] as const).map(p => (
                  <Button
                    key={p}
                    variant={soundPreset === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => applySoundPreset(p)}
                    data-testid={`button-sound-preset-${p}`}
                    className="capitalize"
                  >
                    {p === "silent" ? "🔇 Silent" : p === "normal" ? "🔔 Normal" : "🚨 Loud (Kitchen)"}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Loud mode rings 8 times at full volume with the urgent tone — recommended for noisy kitchens.
              </p>
            </div>

            {/* ── Repeat Until Acknowledged ──────────────────────────────── */}
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/40">
              <Switch
                checked={repeatUntilAck}
                onCheckedChange={setRepeatUntilAck}
                data-testid="toggle-repeat-until-ack"
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label className="cursor-pointer font-medium">Repeat sound until acknowledged</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Keeps ringing every 15&nbsp;seconds as long as a pending order is on screen. Stops the moment you tap Accept / Preparing / Ready.
                </p>
              </div>
            </div>

            {/* ── Diagnostics ────────────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">System Health</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { label: "VAPID keys configured", ok: vapidConfigured === true, loading: vapidConfigured === null, hint: "Server-side push key" },
                  { label: "Service worker active", ok: swActive, loading: false, hint: "Required for background push" },
                  { label: "This device subscribed", ok: pushStatus === "subscribed", loading: pushStatus === "loading", hint: pushStatus === "denied" ? "Browser blocked notifications" : "Push permission granted" },
                ].map(d => (
                  <div key={d.label} className="flex items-center gap-2 p-2 rounded border bg-background" data-testid={`diag-${d.label.replace(/\s+/g,'-').toLowerCase()}`}>
                    <span className={
                      d.loading
                        ? "h-2 w-2 rounded-full bg-amber-400 animate-pulse"
                        : d.ok
                        ? "h-2 w-2 rounded-full bg-green-500"
                        : "h-2 w-2 rounded-full bg-red-500"
                    } />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.label}</div>
                      <div className="text-muted-foreground truncate">{d.loading ? "Checking…" : d.ok ? "OK" : d.hint}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Subscribed Devices ─────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Your Subscribed Devices ({devices.length})</label>
                {pushStatus !== "subscribed" && pushStatus !== "denied" && pushStatus !== "unsupported" && (
                  <Button size="sm" variant="outline" onClick={pushSubscribe} data-testid="button-subscribe-this-device">
                    Subscribe this device
                  </Button>
                )}
              </div>
              {devices.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 border rounded bg-muted/30">
                  No devices subscribed yet. Click "Enable Push" at the top of this page on every device that should receive order alerts (phone, kitchen tablet, manager laptop, etc).
                </p>
              ) : (
                <div className="space-y-1.5">
                  {devices.map(d => {
                    const ua = d.userAgent || "";
                    const friendly = /iphone/i.test(ua) ? "📱 iPhone" : /android/i.test(ua) ? "📱 Android" : /ipad/i.test(ua) ? "📱 iPad" : /macintosh|mac os/i.test(ua) ? "💻 Mac" : /windows/i.test(ua) ? "💻 Windows" : /linux/i.test(ua) ? "💻 Linux" : "🌐 Device";
                    const browser = /edg\//i.test(ua) ? "Edge" : /chrome/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : /firefox/i.test(ua) ? "Firefox" : "Browser";
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded border bg-background text-xs" data-testid={`device-${d.id}`}>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{friendly} · {browser}</div>
                          <div className="text-muted-foreground truncate">
                            Added {d.createdAt ? format(new Date(d.createdAt), "d MMM yyyy, HH:mm") : "—"} · ID …{d.endpointHash.slice(-8)}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-medium">Active</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Advanced (existing controls) ───────────────────────────── */}
            <details className="border rounded-lg">
              <summary className="px-3 py-2 cursor-pointer text-sm font-medium hover:bg-muted/30">Advanced sound controls</summary>
              <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Select value={String(repeatCount)} onValueChange={(value) => { setRepeatCount(Number(value)); setSoundPreset("normal"); localStorage.removeItem("kitchen.soundPreset"); }}>
                  <SelectTrigger data-testid="select-repeat-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,10].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} time{n > 1 ? "s" : ""}</SelectItem>
                    ))}
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
              <div className="md:col-span-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => playNotification()}
                  data-testid="button-test-alarm"
                >
                  🔊 Test Alarm
                </Button>
              </div>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="active" data-testid="tab-active-orders" className="flex-col h-auto py-1.5">
            <span className="text-sm font-semibold">Active</span>
            <Badge variant="secondary" className="mt-0.5">{orderCounts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending-orders" className="flex-col h-auto py-1.5 data-[state=active]:bg-yellow-100 dark:data-[state=active]:bg-yellow-500/20">
            <span className="text-sm font-semibold">Pending</span>
            <span className="text-[11px] text-yellow-800 dark:text-yellow-300 font-medium leading-tight">ऑर्डर आया है</span>
            <Badge className={`${statusTints.pending} mt-0.5 border-0`}>{orderCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed-orders" className="flex-col h-auto py-1.5 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-500/20">
            <span className="text-sm font-semibold">Completed</span>
            <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium leading-tight">दे दिया</span>
            <Badge className={`${statusTints.completed} mt-0.5 border-0`}>{orderCounts.completed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected-orders" className="flex-col h-auto py-1.5 data-[state=active]:bg-red-100 dark:data-[state=active]:bg-red-500/20">
            <span className="text-sm font-semibold">Rejected</span>
            <span className="text-[11px] text-red-800 dark:text-red-300 font-medium leading-tight">रद्द</span>
            <Badge className={`${statusTints.rejected} mt-0.5 border-0`}>{orderCounts.rejected}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {activeTab === "active" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-l-4 border-yellow-400 pl-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${statusTints.pending} text-sm font-bold`}>
                    {filteredPendingOrders.length}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span>Pending</span>
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">ऑर्डर आया है</span>
                  </span>
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
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-l-4 border-orange-400 pl-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${statusTints.preparing} text-sm font-bold`}>
                    {filteredPreparingOrders.length}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span>Preparing</span>
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">बन रहा है</span>
                  </span>
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
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-l-4 border-green-500 pl-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${statusTints.ready} text-sm font-bold`}>
                    {filteredReadyOrders.length}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span>Ready</span>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">तैयार है</span>
                  </span>
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
                {editedItems.map((item, index) => {
                  const lineTotal = (parseFloat(item.price) || 0) * item.quantity;
                  return (
                    <div
                      key={index}
                      className="rounded-md border p-3 space-y-2"
                      data-testid={`row-edit-item-${index}`}
                    >
                      {/* Item name — full width, always readable */}
                      <div
                        className="text-sm font-semibold break-words leading-snug"
                        data-testid={`input-item-name-${index}`}
                      >
                        {item.name}
                      </div>

                      {/* Qty stepper + line total + delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() => updateItemQuantity(index, Math.max(1, item.quantity - 1))}
                            data-testid={`button-item-qty-down-${index}`}
                            aria-label="Decrease quantity"
                          >
                            −
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="h-9 w-14 text-center px-1"
                            data-testid={`input-item-quantity-${index}`}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            data-testid={`button-item-qty-up-${index}`}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-right">
                          <div
                            className="font-mono text-sm font-semibold"
                            data-testid={`text-item-line-total-${index}`}
                          >
                            ₹{lineTotal.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            ₹{item.price} each
                          </div>
                        </div>

                        {editedItems.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={() => removeItem(index)}
                            data-testid={`button-remove-item-${index}`}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

      {/* Test Order dialog — pick items + optional WhatsApp test number */}
      <Dialog open={testOrderDialog} onOpenChange={setTestOrderDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-test-order">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-violet-600" />
              Send Test Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Fires a dummy order through the full real-order flow — KDS card,
              sound, push and WhatsApp alerts. Items are prefixed with 🧪 (TEST)
              and the order will <b>not</b> affect revenue, P&amp;L, wallet or
              reports.
            </p>

            {/* Selected items */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Items in this test order</Label>
              {testCart.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  No items selected — a default Tea + Maggi (₹70) sample will be sent.
                </div>
              ) : (
                <div className="space-y-1 rounded-md border p-2">
                  {testCart.map((it, idx) => (
                    <div
                      key={`${it.menuItemId ?? "x"}-${idx}`}
                      className="flex items-center justify-between gap-2 text-sm"
                      data-testid={`test-cart-item-${idx}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{it.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ₹{it.price.toFixed(2)} × {it.quantity} = ₹{(it.price * it.quantity).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateTestQty(idx, -1)}
                          data-testid={`button-test-qty-down-${idx}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{it.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateTestQty(idx, +1)}
                          data-testid={`button-test-qty-up-${idx}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeTestItem(idx)}
                          data-testid={`button-test-remove-${idx}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-1.5 text-sm font-semibold">
                    <span>Total</span>
                    <span data-testid="text-test-cart-total">₹{testCartTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Menu picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add items from menu</Label>
              <Command className="rounded-lg border">
                <CommandInput
                  placeholder="Search menu items…"
                  className="h-10"
                  data-testid="input-test-menu-search"
                />
                <CommandList className="max-h-[180px]">
                  <CommandEmpty>No menu items available.</CommandEmpty>
                  <CommandGroup>
                    {menuItems
                      ?.filter((m) =>
                        m.isAvailable &&
                        (selectedPropertyId == null || m.propertyId == null || m.propertyId === selectedPropertyId),
                      )
                      .map((m) => (
                        <CommandItem
                          key={m.id}
                          value={`${m.name} ${m.price}`}
                          onSelect={() => addTestItem(m)}
                          className="cursor-pointer py-2"
                          data-testid={`test-menu-item-${m.id}`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="truncate">{m.name}</span>
                            <Badge variant="secondary">₹{m.price}</Badge>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {/* WhatsApp test number */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Send WhatsApp test to (optional)</Label>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit phone, e.g. 9876543210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                data-testid="input-test-phone"
              />
              <p className="text-xs text-muted-foreground">
                The WhatsApp will include a tap-to-open link straight to this
                order on the Kitchen page. Saved on this device for next time.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setTestOrderDialog(false)}
              data-testid="button-test-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendTestOrderMutation.mutate(testPhone.trim())}
              disabled={sendTestOrderMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
              data-testid="button-test-confirm"
            >
              {sendTestOrderMutation.isPending
                ? "Sending..."
                : testCart.length > 0
                  ? `Send Test Order (₹${testCartTotal.toFixed(2)})`
                  : "Send Test Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
