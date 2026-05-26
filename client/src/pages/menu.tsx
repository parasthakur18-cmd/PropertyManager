import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RestaurantPopup } from "@/components/restaurant-popup";
import {
  ShoppingCart, Plus, Minus, X, Check, UtensilsCrossed,
  Clock, Search, XCircle, ArrowLeft, ChevronRight, Eye, Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { apiRequest } from "@/lib/queryClient";
import { type MenuItem, type MenuCategory } from "@shared/schema";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartAddOn {
  id: number;
  name: string;
  price: string;
  quantity: number;
}

interface CartItem extends MenuItem {
  quantity: number;
  cartId: string;
  selectedVariant?: {
    id: number;
    variantName: string;
    actualPrice: string;
    discountedPrice: string | null;
  } | null;
  cartAddOns?: CartAddOn[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_GRADIENTS = [
  "from-orange-400 to-amber-500", "from-emerald-400 to-teal-500",
  "from-blue-400 to-indigo-500", "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500", "from-cyan-400 to-sky-500",
  "from-yellow-400 to-orange-500", "from-green-400 to-emerald-600",
  "from-fuchsia-400 to-pink-600", "from-sky-400 to-blue-600",
];

const CATEGORY_EMOJIS: Record<string, string> = {
  breakfast: "🌅", snack: "🍿", beverage: "☕", drink: "🥤",
  lunch: "🍱", dinner: "🍽️", chinese: "🥡", biryani: "🍚",
  pizza: "🍕", salad: "🥗", dessert: "🍰", soup: "🍵",
  starter: "🥙", "south indian": "🥘", "north indian": "🍛",
  sandwich: "🥪", pasta: "🍝", burger: "🍔", noodle: "🍜",
  juice: "🧃", coffee: "☕", tea: "🍵", shake: "🥤",
  ice: "🍦", sweet: "🍭", bread: "🥐", egg: "🍳",
};

const CATEGORY_STOCK_PHOTOS: Record<string, string> = {
  biryani:       "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=480&q=75&auto=format&fit=crop",
  rice:          "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=480&q=75&auto=format&fit=crop",
  breakfast:     "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=480&q=75&auto=format&fit=crop",
  beverage:      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=480&q=75&auto=format&fit=crop",
  drink:         "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=480&q=75&auto=format&fit=crop",
  coffee:        "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=480&q=75&auto=format&fit=crop",
  tea:           "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=480&q=75&auto=format&fit=crop",
  juice:         "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=480&q=75&auto=format&fit=crop",
  shake:         "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=480&q=75&auto=format&fit=crop",
  "main course": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=480&q=75&auto=format&fit=crop",
  curry:         "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=480&q=75&auto=format&fit=crop",
  "north indian":"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=480&q=75&auto=format&fit=crop",
  "south indian":"https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=480&q=75&auto=format&fit=crop",
  dosa:          "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=480&q=75&auto=format&fit=crop",
  snack:         "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=480&q=75&auto=format&fit=crop",
  starter:       "https://images.unsplash.com/photo-1481070414801-51fd732d7184?w=480&q=75&auto=format&fit=crop",
  appetizer:     "https://images.unsplash.com/photo-1481070414801-51fd732d7184?w=480&q=75&auto=format&fit=crop",
  dessert:       "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=480&q=75&auto=format&fit=crop",
  sweet:         "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=480&q=75&auto=format&fit=crop",
  ice:           "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=480&q=75&auto=format&fit=crop",
  soup:          "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=480&q=75&auto=format&fit=crop",
  chinese:       "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=480&q=75&auto=format&fit=crop",
  noodle:        "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=480&q=75&auto=format&fit=crop",
  pizza:         "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=480&q=75&auto=format&fit=crop",
  burger:        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=480&q=75&auto=format&fit=crop",
  sandwich:      "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=480&q=75&auto=format&fit=crop",
  salad:         "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=480&q=75&auto=format&fit=crop",
  pasta:         "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=480&q=75&auto=format&fit=crop",
  bread:         "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=480&q=75&auto=format&fit=crop",
  roti:          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=480&q=75&auto=format&fit=crop",
  egg:           "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=480&q=75&auto=format&fit=crop",
  seafood:       "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=480&q=75&auto=format&fit=crop",
  fish:          "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=480&q=75&auto=format&fit=crop",
  lunch:         "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=480&q=75&auto=format&fit=crop",
  dinner:        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=480&q=75&auto=format&fit=crop",
};

function getCategoryPhoto(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_STOCK_PHOTOS)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "🍽️";
}

const MEAL_SLOTS = [
  { key: "breakfast", label: "Breakfast", icon: "🍳", gradient: "from-amber-400 to-orange-500", startKey: "breakfastStart", endKey: "breakfastEnd", enabledKey: "breakfastEnabled" },
  { key: "lunch",     label: "Lunch",     icon: "🍛", gradient: "from-green-400 to-emerald-500", startKey: "lunchStart",     endKey: "lunchEnd",     enabledKey: "lunchEnabled"     },
  { key: "snacks",    label: "High Tea",  icon: "☕", gradient: "from-teal-400 to-cyan-500",    startKey: "snacksStart",    endKey: "snacksEnd",    enabledKey: "snacksEnabled"    },
  { key: "dinner",    label: "Dinner",    icon: "🍽️", gradient: "from-indigo-500 to-purple-600",startKey: "dinnerStart",    endKey: "dinnerEnd",    enabledKey: "dinnerEnabled"    },
  { key: "lateNight", label: "Late Night",icon: "🌙", gradient: "from-slate-600 to-gray-800",  startKey: "lateNightStart", endKey: "lateNightEnd", enabledKey: "lateNightEnabled" },
] as const;

function fmtSlotTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function getSlotItems(items: MenuItem[], slotKey: string): MenuItem[] {
  switch (slotKey) {
    case "breakfast": return items.filter(i => i.availableBreakfast !== false);
    case "lunch":     return items.filter(i => i.availableLunch !== false);
    case "snacks":    return items.filter(i => i.availableSnacks !== false);
    case "dinner":    return items.filter(i => i.availableDinner !== false);
    case "lateNight": return items.filter(i => i.availableLateNight !== false);
    default:          return items;
  }
}

function getItemTimingReason(item: MenuItem, timing: any): string {
  if (!timing) return "";
  if (timing.highLoadMode) return (item.availableHighLoad ?? false) ? "" : "Unavailable Right Now";
  const parseTime = (t: string): number => {
    if (!t) return -1;
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  };
  const slots = [
    { enabled: item.availableBreakfast ?? true, start: timing.breakfastStart, end: timing.breakfastEnd },
    { enabled: item.availableLunch ?? true, start: timing.lunchStart, end: timing.lunchEnd },
    { enabled: item.availableSnacks ?? true, start: timing.snacksStart, end: timing.snacksEnd },
    { enabled: item.availableDinner ?? true, start: timing.dinnerStart, end: timing.dinnerEnd },
    { enabled: item.availableLateNight ?? true, start: timing.lateNightStart, end: timing.lateNightEnd },
  ];
  const hasTimesConfigured = slots.some(s => parseTime(s.start) >= 0 && parseTime(s.end) >= 0);
  if (!hasTimesConfigured) return "";
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const isActive = (s: number, e: number): boolean => {
    if (s < 0 || e < 0) return false;
    if (e === 0) return cur >= s;
    return s <= e ? (cur >= s && cur < e) : (cur >= s || cur < e);
  };
  for (const slot of slots) {
    if (!slot.enabled) continue;
    const s = parseTime(slot.start);
    const e = parseTime(slot.end);
    if (s < 0 || e < 0) continue;
    if (isActive(s, e)) return "";
  }
  const fmt = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  const nextSlot = slots
    .filter(s => s.enabled && parseTime(s.start) >= 0)
    .map(s => ({ ...s, sm: parseTime(s.start) }))
    .sort((a, b) => {
      const dist = (m: number) => m > cur ? m - cur : 1440 - cur + m;
      return dist(a.sm) - dist(b.sm);
    })[0];
  return nextSlot ? `Available at ${fmt(nextSlot.start)}` : "Not available now";
}

function getFoodEmoji(item: { foodType?: string | null; name?: string }): string {
  const name = (item.name || "").toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (name.includes(key)) return emoji;
  }
  return item.foodType === "non-veg" ? "🍗" : "🥗";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Menu() {
  // Read URL params once — synchronous so queries are scoped immediately
  const urlParams = new URLSearchParams(window.location.search);
  const urlProperty = urlParams.get("property") || "";
  const urlType = urlParams.get("type");
  const urlRoom = urlParams.get("room") || "";
  const urlBookingId = urlParams.get("booking") || "";
  const isPreview = urlParams.get("preview") === "true";

  // ── State ──────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<"categories" | "items">("categories");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeMealSlot, setActiveMealSlot] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType] = useState<"room" | "restaurant">(urlType === "room" ? "room" : "restaurant");
  const [roomNumber] = useState(urlRoom);
  const [propertyId] = useState(urlProperty);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const LS_KEY = `hostezee_last_order_${urlProperty || "0"}`;
  const [lastOrder, setLastOrder] = useState<{ items: Array<{ id: number; name: string; price: number; quantity: number }> } | null>(() => {
    try { return JSON.parse(localStorage.getItem(`hostezee_last_order_${urlProperty || "0"}`) || "null"); } catch { return null; }
  });

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{
    id: number; variantName: string; actualPrice: string; discountedPrice: string | null;
  } | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<{ id: number; name: string; price: string; quantity: number; }[]>([]);
  const [isAddOnsSheetOpen, setIsAddOnsSheetOpen] = useState(false);

  const { toast } = useToast();

  // ── Popup / kitchen hours (fetched from settings) ─────────────────────────
  const { data: popupSettings } = useQuery<{
    openingTime?: string | null; closingTime?: string | null;
  } | null>({
    queryKey: [`/api/public/restaurant-popup/${urlProperty}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/restaurant-popup/${urlProperty}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!urlProperty,
    staleTime: 60_000,
  });

  // ── Meal-slot / kitchen-pause timing (new API) ────────────────────────────
  const { data: menuTiming } = useQuery<any>({
    queryKey: ["/api/public/menu-timing", urlProperty],
    queryFn: async () => {
      const res = await fetch(`/api/public/menu-timing/${urlProperty}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!urlProperty,
    refetchInterval: 60_000,
  });

  // ── Kitchen status ─────────────────────────────────────────────────────────
  const { isKitchenOpen, minutesUntilOpen, openTimeStr } = useMemo(() => {
    const parseHHMM = (str?: string | null) => {
      if (!str) return null;
      const [h, m] = str.split(":").map(Number);
      return isNaN(h) ? null : { h, m: m || 0 };
    };
    const openParsed  = parseHHMM(popupSettings?.openingTime)  ?? { h: 8,  m: 0 };
    const closeParsed = parseHHMM(popupSettings?.closingTime) ?? { h: 22, m: 0 };

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins  = openParsed.h  * 60 + openParsed.m;
    const closeMins = closeParsed.h * 60 + closeParsed.m;
    const open = nowMins >= openMins && nowMins < closeMins;

    let mins = 0;
    if (!open) {
      if (nowMins < openMins) {
        mins = openMins - nowMins;
      } else {
        mins = 24 * 60 - nowMins + openMins;
      }
    }
    const hh = openParsed.h;
    const mm = openParsed.m;
    const ampm = hh < 12 ? "AM" : "PM";
    const hDisp = hh % 12 === 0 ? 12 : hh % 12;
    const openStr = mm > 0 ? `${hDisp}:${String(mm).padStart(2,"0")} ${ampm}` : `${hDisp}:00 ${ampm}`;
    return { isKitchenOpen: open, minutesUntilOpen: mins, openTimeStr: openStr };
  }, [popupSettings]);

  const closedLabel = useMemo(() => {
    if (isKitchenOpen) return "";
    if (minutesUntilOpen < 60) return `Kitchen opens at ${openTimeStr} (in ${minutesUntilOpen} min)`;
    const h = Math.floor(minutesUntilOpen / 60);
    const m = minutesUntilOpen % 60;
    return `Kitchen opens at ${openTimeStr} (in ${h}h ${m > 0 ? `${m}m` : ""})`;
  }, [isKitchenOpen, minutesUntilOpen, openTimeStr]);

  // ── Booking session validation (room orders with per-stay link) ───────────
  const { data: bookingSession, isLoading: sessionLoading } = useQuery<{
    active: boolean; reason?: string; bookingId?: number;
  }>({
    queryKey: [`/api/public/booking-session/${urlBookingId}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/booking-session/${urlBookingId}`);
      if (!res.ok) return { active: false, reason: "error" };
      return res.json();
    },
    enabled: !!(urlBookingId && orderType === "room"),
    staleTime: 60_000,
  });

  // If session is expired, the menu is still rendered but ordering is blocked
  const sessionExpired = !!(urlBookingId && orderType === "room" && !sessionLoading && bookingSession && !bookingSession.active);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const menuCategoriesUrl = urlProperty
    ? `/api/public/menu-categories?propertyId=${urlProperty}`
    : `/api/public/menu-categories`;
  const menuItemsUrl = urlProperty
    ? `/api/public/menu?propertyId=${urlProperty}`
    : `/api/public/menu`;

  const { data: menuCategories, isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: [menuCategoriesUrl],
    queryFn: async () => {
      const res = await fetch(menuCategoriesUrl);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: menuItems, isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: [menuItemsUrl],
    queryFn: async () => {
      const res = await fetch(menuItemsUrl);
      if (!res.ok) throw new Error("Failed to fetch menu items");
      return res.json();
    },
  });

  const { data: variants } = useQuery<{
    id: number; menuItemId: number; variantName: string;
    actualPrice: string; discountedPrice: string | null;
  }[]>({
    queryKey: [`/api/public/menu-items/${selectedItem?.id}/variants`],
    queryFn: async () => {
      const res = await fetch(`/api/public/menu-items/${selectedItem!.id}/variants`);
      return res.json();
    },
    enabled: !!selectedItem,
  });

  const { data: addOns } = useQuery<{
    id: number; menuItemId: number; addOnName: string; addOnPrice: string;
  }[]>({
    queryKey: [`/api/public/menu-items/${selectedItem?.id}/add-ons`],
    queryFn: async () => {
      const res = await fetch(`/api/public/menu-items/${selectedItem!.id}/add-ons`);
      return res.json();
    },
    enabled: !!selectedItem,
  });

  // ── Order mutation ─────────────────────────────────────────────────────────
  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      if (isPreview) {
        // Preview mode: simulate network delay, don't actually save
        await new Promise(r => setTimeout(r, 600));
        return { preview: true };
      }
      return await apiRequest("/api/public/orders", "POST", orderData);
    },
    onSuccess: (_, variables: any) => {
      if (!isPreview && variables?.items?.length) {
        const savedOrder = { items: variables.items };
        try { localStorage.setItem(LS_KEY, JSON.stringify(savedOrder)); } catch {}
        setLastOrder(savedOrder);
      }
      toast({
        title: isPreview ? "Preview: Order Simulated" : "Order Placed!",
        description: isPreview
          ? "This is preview mode — no real order was created."
          : "Your order has been sent to the kitchen.",
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setSpecialInstructions("");
      setIsCheckoutOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const getItemQtyInCart = useCallback((itemId: number) =>
    cart.filter(c => c.id === itemId).reduce((s, c) => s + c.quantity, 0),
    [cart]
  );

  const calculateTotal = useCallback(() =>
    cart.reduce((sum, item) => {
      const base = item.selectedVariant
        ? parseFloat(item.selectedVariant.discountedPrice || item.selectedVariant.actualPrice)
        : parseFloat(item.price as string);
      const addOnsTotal = item.cartAddOns
        ? item.cartAddOns.reduce((s, a) => s + parseFloat(a.price) * a.quantity, 0)
        : 0;
      return sum + base * item.quantity + addOnsTotal;
    }, 0),
    [cart]
  );

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.cartId === cartId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (cartId: string) =>
    setCart(prev => prev.filter(i => i.cartId !== cartId));

  const updateCartAddOnQty = (cartId: string, addOnId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId && item.cartAddOns) {
        return {
          ...item,
          cartAddOns: item.cartAddOns.map(a =>
            a.id === addOnId ? { ...a, quantity: Math.max(1, a.quantity + delta) } : a
          ),
        };
      }
      return item;
    }));
  };

  // ── Add to cart ────────────────────────────────────────────────────────────
  const openItemSheet = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedVariant(null);
    setSelectedAddOns([]);
    setIsAddOnsSheetOpen(true);
  };

  const addSimpleToCart = (item: MenuItem) => {
    if (!isKitchenOpen) return;
    const cartId = `${item.id}-novariant-${Date.now()}`;
    setCart(prev => [...prev, { ...item, cartId, quantity: 1 }]);
    toast({ title: "Added", description: item.name });
  };

  const addToCart = (item: MenuItem) => {
    if (!isKitchenOpen) return;
    if (item.hasVariants || item.hasAddOns) openItemSheet(item);
    else addSimpleToCart(item);
  };

  const confirmAddToCart = () => {
    if (!selectedItem) return;
    const cartId = `${selectedItem.id}-${selectedVariant?.id || "nv"}-${Date.now()}`;
    setCart(prev => [...prev, {
      ...selectedItem,
      cartId,
      quantity: 1,
      selectedVariant: selectedVariant || undefined,
      cartAddOns: selectedAddOns.length > 0 ? [...selectedAddOns] : undefined,
    }]);
    toast({ title: "Added", description: selectedItem.name });
    setIsAddOnsSheetOpen(false);
    setSelectedItem(null);
    setSelectedVariant(null);
    setSelectedAddOns([]);
  };

  const toggleAddOn = (addOn: { id: number; addOnName: string; addOnPrice: string }) => {
    const exists = selectedAddOns.find(a => a.id === addOn.id);
    if (exists) setSelectedAddOns(prev => prev.filter(a => a.id !== addOn.id));
    else setSelectedAddOns(prev => [...prev, { id: addOn.id, name: addOn.addOnName, price: addOn.addOnPrice, quantity: 1 }]);
  };

  const updateAddOnQty = (id: number, delta: number) =>
    setSelectedAddOns(prev => prev.map(a => a.id === id ? { ...a, quantity: Math.max(1, a.quantity + delta) } : a));

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (orderType === "room" && !roomNumber) {
      toast({ title: "Room Required", description: "Room number is missing", variant: "destructive" });
      return;
    }
    if (orderType === "restaurant" && (!customerName || !customerPhone)) {
      toast({ title: "Details Required", description: "Enter name and phone", variant: "destructive" });
      return;
    }

    const orderData: any = {
      orderType,
      orderSource: "guest",
      items: cart.map(item => {
        const base = item.selectedVariant
          ? parseFloat(item.selectedVariant.discountedPrice || item.selectedVariant.actualPrice)
          : parseFloat(item.price as string);
        const variantText = item.selectedVariant ? ` (${item.selectedVariant.variantName})` : "";
        const addOnsText = item.cartAddOns?.length
          ? ` + ${item.cartAddOns.map(a => `${a.quantity}x ${a.name}`).join(", ")}`
          : "";
        const addOnsTotal = item.cartAddOns
          ? item.cartAddOns.reduce((s, a) => s + parseFloat(a.price) * a.quantity, 0)
          : 0;
        const totalPrice = base * item.quantity + addOnsTotal;
        return {
          id: item.id,
          name: item.name + variantText + addOnsText,
          price: (totalPrice / item.quantity).toFixed(2),
          quantity: item.quantity,
        };
      }),
      totalAmount: calculateTotal().toFixed(2),
      specialInstructions: specialInstructions || null,
    };

    if (orderType === "room") {
      orderData.roomId = roomNumber;
      orderData.propertyId = propertyId;
      if (urlBookingId) orderData.bookingId = parseInt(urlBookingId);
    } else {
      orderData.customerName = customerName;
      orderData.customerPhone = customerPhone;
    }

    orderMutation.mutate(orderData);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const isKitchenPaused = !!(menuTiming?.kitchenPaused);
  const isHighLoad = !!(menuTiming?.highLoadMode);
  const enabledSlotKeys = useMemo(() => {
    if (!menuTiming) return new Set(MEAL_SLOTS.map(s => s.key));
    return new Set(MEAL_SLOTS.filter(s => menuTiming[s.enabledKey] !== false).map(s => s.key));
  }, [menuTiming]);

  const currentSlotKey = useMemo(() => {
    if (!menuTiming) return null;
    const pt = (t: string) => { if (!t) return -1; const [h, m] = t.split(":").map(Number); return isNaN(h) || isNaN(m) ? -1 : h * 60 + m; };
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const active = (s: number, e: number) => { if (s < 0 || e < 0) return false; return s <= e ? cur >= s && cur < e : cur >= s || cur < e; };
    for (const slot of MEAL_SLOTS) {
      const s = pt((menuTiming as any)[slot.startKey] || "");
      const e = pt((menuTiming as any)[slot.endKey] || "");
      if (active(s, e)) return slot.key;
    }
    return null;
  }, [menuTiming]);

  const availableItems = useMemo(() =>
    (menuItems || []).filter(i => i.isAvailable && !(isHighLoad && !i.availableHighLoad)),
    [menuItems, isHighLoad]
  );

  const itemsPerSlot = useMemo(() => {
    const result: Record<string, MenuItem[]> = {};
    for (const slot of MEAL_SLOTS) result[slot.key] = getSlotItems(availableItems, slot.key);
    return result;
  }, [availableItems]);

  const activeMealItems = useMemo(() =>
    activeMealSlot ? itemsPerSlot[activeMealSlot] ?? [] : [],
    [activeMealSlot, itemsPerSlot]
  );

  const activeMealByCategory = useMemo(() => {
    if (!activeMealItems.length || !menuCategories) return [] as Array<{ catName: string; items: MenuItem[] }>;
    const grouped: Array<{ catName: string; items: MenuItem[] }> = [];
    for (const cat of menuCategories) {
      const catItems = activeMealItems.filter(i => i.categoryId === cat.id);
      if (catItems.length > 0) grouped.push({ catName: cat.name, items: catItems });
    }
    const uncategorized = activeMealItems.filter(i => !i.categoryId);
    if (uncategorized.length > 0) grouped.push({ catName: "Others", items: uncategorized });
    return grouped;
  }, [activeMealItems, menuCategories]);

  const popularItems = useMemo(() => availableItems.slice(0, 6), [availableItems]);

  const popularItemIds = useMemo(() => new Set(popularItems.map(i => i.id)), [popularItems]);

  const categoriesWithCount = useMemo(() =>
    (menuCategories || []).map((cat, idx) => ({
      cat,
      count: availableItems.filter(i => i.categoryId === cat.id).length,
      gradient: CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length],
      emoji: getCategoryEmoji(cat.name),
      photo: cat.imageUrl || getCategoryPhoto(cat.name),
    })).filter(c => c.count > 0),
    [menuCategories, availableItems]
  );

  const activeCategory = menuCategories?.find(c => c.id === activeCategoryId);

  const itemsInActiveCategory = useMemo(() => {
    if (!activeCategoryId) return [];
    let base = availableItems.filter(i => i.categoryId === activeCategoryId);
    if (vegOnly) base = base.filter(i => i.foodType !== "non-veg");
    if (!searchTerm.trim()) return base;
    const q = searchTerm.toLowerCase();
    return base.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  }, [availableItems, activeCategoryId, searchTerm, vegOnly]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return availableItems.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  }, [availableItems, searchTerm]);

  const isLoading = categoriesLoading || itemsLoading;

  // ─────────────────────────────────────────────────────────────────────────
  // Variant sheet price preview
  const sheetTotal = useMemo(() => {
    const base = selectedVariant
      ? parseFloat(selectedVariant.discountedPrice || selectedVariant.actualPrice)
      : parseFloat(selectedItem?.price as string || "0");
    const extras = selectedAddOns.reduce((s, a) => s + parseFloat(a.price) * a.quantity, 0);
    return (base + extras).toFixed(2);
  }, [selectedVariant, selectedItem, selectedAddOns]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Skeleton className="h-20 w-full rounded-2xl mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-28 overflow-x-hidden">

      {/* ── Preview Mode Banner ──────────────────────────────────────────── */}
      {isPreview && (
        <div className="bg-amber-400 text-amber-900 text-center py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-50">
          <Eye className="h-4 w-4 flex-shrink-0" />
          Preview Mode — Orders will not be placed
        </div>
      )}

      {/* ── Booking Session Expired Banner ───────────────────────────────── */}
      {sessionExpired && (
        <div className="bg-red-600 text-white text-center py-4 px-4 sticky top-0 z-50 shadow-lg">
          <p className="font-bold text-base">Your room session has ended</p>
          <p className="text-sm mt-1 opacity-90">
            This menu link is linked to a booking that has been checked out.
            Please contact the front desk or order directly at the restaurant counter.
          </p>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm" style={{ top: isPreview ? 36 : 0 }}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {screen === "items" && (
                <button
                  onClick={() => { setScreen("categories"); setSearchTerm(""); }}
                  className="mr-1 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  data-testid="button-back-to-categories"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="font-bold text-base leading-tight text-gray-900">
                  {screen === "items" && activeCategory
                    ? activeCategory.name
                    : orderType === "room" ? "Room Service" : "Café Menu"}
                </h1>
                {orderType === "room" && roomNumber && (
                  <p className="text-xs text-[#2BB6A8] font-semibold">Room {roomNumber}</p>
                )}
              </div>
            </div>

            {/* Cart trigger */}
            {cart.length > 0 && (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="relative flex items-center gap-1 bg-[#1E3A5F] text-white px-3 py-1.5 rounded-full text-sm font-semibold"
                data-testid="button-header-cart"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{totalItems}</span>
                <span className="text-xs opacity-80">· ₹{calculateTotal().toFixed(0)}</span>
              </button>
            )}
          </div>

          {/* Kitchen closed banner */}
          {!isKitchenOpen && (
            <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <Clock className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 font-medium">{closedLabel}</p>
            </div>
          )}

          {/* Kitchen open pill */}
          {isKitchenOpen && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-green-700 font-medium">Kitchen Open · 8 AM – 10 PM</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Categories Screen ────────────────────────────────────────────── */}
      {screen === "categories" && (
        <div className="px-4 pt-4 space-y-5">

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 rounded-xl bg-white border-gray-200"
              data-testid="input-search-menu"
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearchTerm("")}
                data-testid="button-clear-search"
              >
                <XCircle className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* ── Search results ───────────────────────────────────────────── */}
          {searchTerm ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No items found</p>
                </div>
              ) : (
                searchResults.map(item => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    qty={getItemQtyInCart(item.id)}
                    isKitchenOpen={isKitchenOpen}
                    isPopular={popularItemIds.has(item.id)}
                    timingReason={getItemTimingReason(item, menuTiming)}
                    onAdd={() => addToCart(item)}
                    onIncrease={() => {
                      const ci = cart.find(c => c.id === item.id);
                      if (ci) updateQuantity(ci.cartId, 1);
                      else addToCart(item);
                    }}
                    onDecrease={() => {
                      const cis = cart.filter(c => c.id === item.id);
                      if (cis.length) updateQuantity(cis[cis.length - 1].cartId, -1);
                    }}
                  />
                ))
              )}
            </div>
          ) : activeMealSlot ? (
            /* ── MEAL SLOT VIEW ───────────────────────────────────────── */
            <div className="space-y-4">
              {(() => {
                const slot = MEAL_SLOTS.find(s => s.key === activeMealSlot)!;
                const isActiveNow = currentSlotKey === activeMealSlot;
                const slotStart = menuTiming ? (menuTiming as any)[slot.startKey] : "";
                const slotEnd   = menuTiming ? (menuTiming as any)[slot.endKey]   : "";
                return (
                  <>
                    <button
                      onClick={() => setActiveMealSlot(null)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-[#1E3A5F]"
                      data-testid="button-back-home"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back to Menu
                    </button>
                    <div className={`rounded-2xl p-4 bg-gradient-to-r ${slot.gradient} text-white`}>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{slot.icon}</span>
                        <div className="flex-1">
                          <h2 className="text-lg font-bold leading-tight">{slot.label}</h2>
                          {slotStart && slotEnd && (
                            <p className="text-white/80 text-xs mt-0.5">{fmtSlotTime(slotStart)} – {fmtSlotTime(slotEnd)}</p>
                          )}
                        </div>
                        {isActiveNow && (
                          <span className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse inline-block" />
                            Serving Now
                          </span>
                        )}
                      </div>
                    </div>
                    {activeMealItems.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No items available for this period</p>
                      </div>
                    ) : (
                      activeMealByCategory.map(({ catName, items: catItems }) => (
                        <div key={catName} className="space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1 pt-2">{catName}</p>
                          {catItems.map(item => (
                            <MenuItemRow
                              key={item.id}
                              item={item}
                              qty={getItemQtyInCart(item.id)}
                              isKitchenOpen={isKitchenOpen}
                              isPopular={popularItemIds.has(item.id)}
                              timingReason={getItemTimingReason(item, menuTiming)}
                              onAdd={() => addToCart(item)}
                              onIncrease={() => {
                                const ci = cart.find(c => c.id === item.id);
                                if (ci) updateQuantity(ci.cartId, 1);
                                else addToCart(item);
                              }}
                              onDecrease={() => {
                                const cis = cart.filter(c => c.id === item.id);
                                if (cis.length) updateQuantity(cis[cis.length - 1].cartId, -1);
                              }}
                            />
                          ))}
                        </div>
                      ))
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            /* ── HOMEPAGE ─────────────────────────────────────────────── */
            <>
              {/* Kitchen Pause Banner */}
              {isKitchenPaused && (
                <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 to-rose-500 p-4 text-white shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">⏸</span>
                    <div>
                      <p className="font-bold text-sm leading-tight">Kitchen Temporarily Busy</p>
                      <p className="text-white/85 text-xs mt-1 leading-relaxed">We are finishing up current orders. New orders are paused — please check back in a few minutes.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* High Load Banner */}
              {isHighLoad && (
                <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-md">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 flex-shrink-0 mt-0.5 text-white" />
                    <div>
                      <p className="font-bold text-sm leading-tight">Express Menu Currently Active</p>
                      <p className="text-white/80 text-xs mt-1 leading-relaxed">To maintain fast service during peak hours, a curated selection is available.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Currently Serving Hero */}
              {currentSlotKey && isKitchenOpen && enabledSlotKeys.has(currentSlotKey) && (() => {
                const slot = MEAL_SLOTS.find(s => s.key === currentSlotKey)!;
                const heroItems = itemsPerSlot[currentSlotKey] ?? [];
                const slotEnd = menuTiming ? (menuTiming as any)[slot.endKey] : "";
                return (
                  <div className="rounded-2xl overflow-hidden bg-[#1E3A5F] text-white shadow-lg">
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Currently Serving</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-4xl leading-none">{slot.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl font-bold leading-tight">{slot.label}</h2>
                          {slotEnd && <p className="text-white/60 text-xs mt-0.5">Available till {fmtSlotTime(slotEnd)}</p>}
                        </div>
                        <button
                          onClick={() => setActiveMealSlot(currentSlotKey)}
                          className="flex-shrink-0 flex items-center gap-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                          data-testid="button-currently-serving-view"
                        >
                          View All <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      {heroItems.length > 0 && (
                        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                          {heroItems.slice(0, 5).map(item => {
                            const price = item.discountedPrice || item.actualPrice || item.price;
                            const qty = getItemQtyInCart(item.id);
                            const isBestseller = popularItemIds.has(item.id);
                            return (
                              <button
                                key={item.id}
                                onClick={() => addToCart(item)}
                                className="relative flex-shrink-0 bg-white/10 hover:bg-white/20 active:bg-white/25 rounded-xl p-2.5 text-left w-32 transition-colors"
                                data-testid={`button-hero-item-${item.id}`}
                              >
                                {isBestseller && (
                                  <span className="absolute top-1.5 left-1.5 bg-[#F2B705] text-[#1E3A5F] text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none z-10">★ TOP</span>
                                )}
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} loading="lazy"
                                    className="w-full h-18 object-cover rounded-lg mb-2" style={{ height: "4.5rem" }}
                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <div className="w-full rounded-lg bg-white/10 flex items-center justify-center text-3xl mb-2" style={{ height: "4.5rem" }}>
                                    {getFoodEmoji(item)}
                                  </div>
                                )}
                                <p className="text-xs font-semibold leading-tight line-clamp-2 mb-1">{item.name}</p>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-[#2BB6A8]">₹{price}</span>
                                  {qty > 0 && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">{qty}</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Repeat Last Order */}
              {lastOrder && lastOrder.items.length > 0 && (
                <div className="rounded-2xl border border-[#2BB6A8]/30 bg-[#2BB6A8]/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-800">🔁 Repeat Last Order</p>
                    <button
                      onClick={() => {
                        const added: string[] = [];
                        for (const o of lastOrder.items) {
                          const menuItem = availableItems.find(i => i.id === o.id || i.name.toLowerCase() === o.name.toLowerCase());
                          if (menuItem) {
                            for (let q = 0; q < o.quantity; q++) addToCart(menuItem);
                            added.push(menuItem.name);
                          }
                        }
                        if (added.length) toast({ title: "Added to cart", description: `${added.length} item${added.length !== 1 ? "s" : ""} added` });
                      }}
                      className="text-xs font-bold text-[#1E3A5F] bg-white border border-[#1E3A5F]/20 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                      data-testid="button-repeat-last-order"
                    >
                      Add All
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {lastOrder.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                  </p>
                </div>
              )}

              {/* Meal Slot Chips */}
              {menuTiming && (
                <div>
                  <h2 className="text-sm font-bold text-gray-700 mb-2">Order by Meal</h2>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {MEAL_SLOTS.filter(s => enabledSlotKeys.has(s.key)).map(slot => {
                      const isActive = currentSlotKey === slot.key;
                      return (
                        <button
                          key={slot.key}
                          onClick={() => setActiveMealSlot(slot.key)}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                            isActive
                              ? "bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                          data-testid={`button-meal-slot-${slot.key}`}
                        >
                          <span>{slot.icon}</span>
                          {slot.label}
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Popular Items */}
              {popularItems.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">⭐ Popular Items</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                    {popularItems.map(item => (
                      <PopularCard
                        key={item.id}
                        item={item}
                        qty={getItemQtyInCart(item.id)}
                        isKitchenOpen={isKitchenOpen}
                        onAdd={() => addToCart(item)}
                        onIncrease={() => {
                          const ci = cart.find(c => c.id === item.id);
                          if (ci) updateQuantity(ci.cartId, 1);
                          else addToCart(item);
                        }}
                        onDecrease={() => {
                          const cis = cart.filter(c => c.id === item.id);
                          if (cis.length) updateQuantity(cis[cis.length - 1].cartId, -1);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Category Grid */}
              <div>
                <h2 className="text-sm font-bold text-gray-700 mb-3">Browse Menu</h2>
                {categoriesWithCount.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Menu not available</p>
                    <p className="text-sm mt-1">Please check back later</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {categoriesWithCount.map(({ cat, count, gradient, emoji, photo }) => (
                      <button
                        key={cat.id}
                        onClick={() => { setActiveCategoryId(cat.id); setScreen("items"); setVegOnly(false); }}
                        className="relative rounded-2xl overflow-hidden h-40 text-left shadow-md active:scale-95 transition-transform"
                        data-testid={`button-category-${cat.id}`}
                      >
                        {photo ? (
                          <img src={photo} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : null}
                        {!photo && <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
                        <div className="relative p-4 h-full flex flex-col justify-between">
                          <div className="flex items-start justify-between">
                            <span className="text-3xl drop-shadow-sm">{emoji}</span>
                            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm leading-tight drop-shadow">{cat.name}</p>
                            <p className="text-white/80 text-xs mt-0.5">{count} item{count !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Items Screen ─────────────────────────────────────────────────── */}
      {screen === "items" && (
        <div className="px-4 pt-4 space-y-3">
          {/* Back button */}
          <button
            onClick={() => { setScreen("categories"); setSearchTerm(""); setActiveMealSlot(null); }}
            className="flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] -mb-1"
            data-testid="button-back-to-menu"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Menu
          </button>

          {/* Category search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search in ${activeCategory?.name || ""}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 rounded-xl bg-white border-gray-200"
              data-testid="input-search-category"
            />
            {searchTerm && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchTerm("")}>
                <XCircle className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Veg filter toggle */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{itemsInActiveCategory.length} item{itemsInActiveCategory.length !== 1 ? "s" : ""}</p>
            <button
              onClick={() => setVegOnly(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${vegOnly ? "bg-green-500 border-green-500 text-white" : "bg-white border-gray-200 text-gray-600"}`}
              data-testid="button-veg-filter"
            >
              <span className="text-sm">🟢</span> Veg Only
            </button>
          </div>

          {/* Items list */}
          {itemsInActiveCategory.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{searchTerm ? "No results" : vegOnly ? "No veg items in this category" : "No items in this category"}</p>
            </div>
          ) : (
            itemsInActiveCategory.map(item => (
              <MenuItemRow
                key={item.id}
                item={item}
                qty={getItemQtyInCart(item.id)}
                isKitchenOpen={isKitchenOpen}
                isPopular={popularItemIds.has(item.id)}
                timingReason={getItemTimingReason(item, menuTiming)}
                onAdd={() => addToCart(item)}
                onIncrease={() => {
                  const ci = cart.find(c => c.id === item.id);
                  if (ci) updateQuantity(ci.cartId, 1);
                  else addToCart(item);
                }}
                onDecrease={() => {
                  const cis = cart.filter(c => c.id === item.id);
                  if (cis.length) updateQuantity(cis[cis.length - 1].cartId, -1);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* ── Sticky Cart Bar ─────────────────────────────────────────────── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-[#1E3A5F] text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-2xl active:scale-98 transition-transform"
            data-testid="button-sticky-cart"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full px-2 py-0.5 text-sm font-bold">
                {totalItems}
              </div>
              <span className="font-semibold text-sm">View Cart</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-lg">₹{calculateTotal().toFixed(0)}</span>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </div>
          </button>
        </div>
      )}

      {/* ── Variants / Add-ons Sheet ──────────────────────────────────────── */}
      <Sheet open={isAddOnsSheetOpen} onOpenChange={open => { if (!open) { setIsAddOnsSheetOpen(false); setSelectedItem(null); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left text-lg">{selectedItem?.name}</SheetTitle>
            {selectedItem?.description && (
              <SheetDescription className="text-left text-sm text-gray-500">
                {selectedItem.description}
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="space-y-5 py-3">
            {/* Base price */}
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm text-gray-500">
                {selectedVariant ? `Price (${selectedVariant.variantName})` : "Base Price"}
              </span>
              <span className="font-bold text-lg">
                ₹{selectedVariant
                  ? (selectedVariant.discountedPrice || selectedVariant.actualPrice)
                  : selectedItem?.price}
              </span>
            </div>

            {/* Variants */}
            {variants && variants.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Choose Size / Variant <span className="text-red-500">*</span></p>
                <div className="space-y-2">
                  {variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                        selectedVariant?.id === v.id
                          ? "border-[#1E3A5F] bg-[#1E3A5F]/5"
                          : "border-gray-200 bg-white"
                      }`}
                      data-testid={`button-variant-${v.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedVariant?.id === v.id ? "border-[#1E3A5F]" : "border-gray-300"
                        }`}>
                          {selectedVariant?.id === v.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />
                          )}
                        </div>
                        <span className="font-medium text-sm">{v.variantName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {v.discountedPrice && (
                          <span className="text-xs text-gray-400 line-through">₹{v.actualPrice}</span>
                        )}
                        <span className="font-bold text-sm">₹{v.discountedPrice || v.actualPrice}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {addOns && addOns.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Add-ons <span className="text-gray-400 font-normal">(optional)</span></p>
                <div className="space-y-2">
                  {addOns.map(addon => {
                    const sel = selectedAddOns.find(a => a.id === addon.id);
                    return (
                      <div
                        key={addon.id}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                          sel ? "border-[#2BB6A8] bg-[#2BB6A8]/5" : "border-gray-200 bg-white"
                        }`}
                      >
                        <button
                          className="flex items-center gap-3 flex-1 text-left"
                          onClick={() => toggleAddOn(addon)}
                          data-testid={`button-addon-${addon.id}`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            sel ? "border-[#2BB6A8] bg-[#2BB6A8]" : "border-gray-300"
                          }`}>
                            {sel && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{addon.addOnName}</p>
                            <p className="text-xs text-[#2BB6A8] font-semibold">+₹{addon.addOnPrice}</p>
                          </div>
                        </button>
                        {sel && (
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => updateAddOnQty(addon.id, -1)}
                              className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center"
                              data-testid={`button-addon-dec-${addon.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold">{sel.quantity}</span>
                            <button
                              onClick={() => updateAddOnQty(addon.id, 1)}
                              className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center"
                              data-testid={`button-addon-inc-${addon.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{selectedVariant ? selectedVariant.variantName : "Base"}</span>
                <span className="font-medium">₹{selectedVariant
                  ? (selectedVariant.discountedPrice || selectedVariant.actualPrice)
                  : selectedItem?.price}</span>
              </div>
              {selectedAddOns.map(a => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">{a.quantity}× {a.name}</span>
                  <span className="font-medium">₹{(parseFloat(a.price) * a.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-[#1E3A5F]">₹{sheetTotal}</span>
              </div>
            </div>

            {/* Add to cart button */}
            <button
              onClick={confirmAddToCart}
              disabled={!!(variants && variants.length > 0 && !selectedVariant)}
              className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${
                variants && variants.length > 0 && !selectedVariant
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#1E3A5F] active:scale-95"
              }`}
              data-testid="button-confirm-add-to-cart"
            >
              {variants && variants.length > 0 && !selectedVariant
                ? "Select a variant to continue"
                : `Add · ₹${sheetTotal}`}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Checkout Sheet ────────────────────────────────────────────────── */}
      <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-left">Your Order</SheetTitle>
            <SheetDescription className="text-left text-sm">Review and place your order</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Your cart is empty</p>
                <p className="text-sm mt-1">Add items from the menu</p>
              </div>
            ) : (
              <>
                {/* Cart items */}
                {cart.map(item => {
                  const base = item.selectedVariant
                    ? parseFloat(item.selectedVariant.discountedPrice || item.selectedVariant.actualPrice)
                    : parseFloat(item.price as string);
                  const addOnsTotal = item.cartAddOns
                    ? item.cartAddOns.reduce((s, a) => s + parseFloat(a.price) * a.quantity, 0)
                    : 0;
                  return (
                    <div key={item.cartId} className="bg-gray-50 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight">
                            {item.name}
                            {item.selectedVariant && (
                              <span className="text-gray-400 font-normal"> · {item.selectedVariant.variantName}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">₹{base.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(item.cartId, -1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-white"
                            data-testid={`button-cart-dec-${item.cartId}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartId, 1)}
                            className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center"
                            data-testid={`button-cart-inc-${item.cartId}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.cartId)}
                            className="w-8 h-8 rounded-full border border-red-200 text-red-400 flex items-center justify-center ml-1"
                            data-testid={`button-cart-remove-${item.cartId}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {item.cartAddOns && item.cartAddOns.length > 0 && (
                        <div className="pl-3 border-l-2 border-[#2BB6A8]/40 space-y-1">
                          {item.cartAddOns.map(a => (
                            <div key={a.id} className="flex items-center justify-between text-xs text-gray-500">
                              <span>+ {a.name}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateCartAddOnQty(item.cartId, a.id, -1)} className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center" data-testid={`button-cart-addon-dec-${item.cartId}-${a.id}`}>
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <span className="w-4 text-center font-semibold">{a.quantity}</span>
                                <button onClick={() => updateCartAddOnQty(item.cartId, a.id, 1)} className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center" data-testid={`button-cart-addon-inc-${item.cartId}-${a.id}`}>
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                                <span className="text-gray-500">₹{(parseFloat(a.price) * a.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-500 border-t pt-2">
                        <span>Item total</span>
                        <span className="font-semibold text-gray-700">
                          ₹{(base * item.quantity + addOnsTotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Details */}
                <div className="space-y-3 pt-2">
                  {orderType === "room" ? (
                    <div className="bg-[#1E3A5F]/5 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-xs font-medium text-[#1E3A5F]">Delivering to Room {roomNumber || "—"}</span>
                      {roomNumber && <Badge variant="secondary" className="text-xs">Auto-filled</Badge>}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">Your Name *</Label>
                        <Input
                          placeholder="Enter your name"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          className="rounded-xl"
                          data-testid="input-customer-name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">Phone Number *</Label>
                        <Input
                          type="tel"
                          placeholder="Enter your phone"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          className="rounded-xl"
                          data-testid="input-customer-phone"
                        />
                      </div>
                    </>
                  )}

                  {/* Special instructions */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600">Cooking Instructions <span className="text-gray-400">(optional)</span></Label>
                    <Textarea
                      placeholder="e.g. less spicy, no onions..."
                      value={specialInstructions}
                      onChange={e => setSpecialInstructions(e.target.value)}
                      className="rounded-xl text-sm resize-none"
                      rows={2}
                      data-testid="input-special-instructions"
                    />
                  </div>
                </div>

                {/* Total + Place Order */}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold mb-4">
                    <span>Total</span>
                    <span className="text-[#1E3A5F]">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={
                      orderMutation.isPending ||
                      !isKitchenOpen ||
                      sessionExpired ||
                      (orderType === "room" ? !roomNumber : !customerName || !customerPhone)
                    }
                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                      orderMutation.isPending || !isKitchenOpen || sessionExpired ||
                      (orderType === "room" ? !roomNumber : !customerName || !customerPhone)
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-[#1E3A5F] text-white active:scale-95"
                    }`}
                    data-testid="button-place-order"
                  >
                    {sessionExpired
                      ? "Room session ended — contact front desk"
                      : orderMutation.isPending
                      ? "Placing Order..."
                      : !isKitchenOpen
                      ? closedLabel
                      : isPreview
                      ? "Place Order (Preview)"
                      : `Place Order · ₹${calculateTotal().toFixed(0)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <RestaurantPopup propertyId={propertyId || null} />
      <Toaster />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MenuItemRowProps {
  item: MenuItem;
  qty: number;
  isKitchenOpen: boolean;
  isPopular?: boolean;
  timingReason?: string;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

function MenuItemRow({ item, qty, isKitchenOpen, isPopular, timingReason, onAdd, onIncrease, onDecrease }: MenuItemRowProps) {
  const price = item.discountedPrice || item.actualPrice || item.price;
  const isTimingBlocked = !!(timingReason && timingReason !== "");
  const isDisabled = !isKitchenOpen || isTimingBlocked;
  const emoji = getFoodEmoji(item);

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-opacity ${isDisabled ? "opacity-50" : ""}`}
      data-testid={`card-menu-item-${item.id}`}
    >
      <div className="flex gap-3 p-4">
        {/* Image or gradient placeholder */}
        <div className="flex-shrink-0 relative">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              className="w-24 h-24 rounded-xl object-cover"
              onError={e => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                const next = el.nextElementSibling as HTMLElement;
                if (next) next.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`w-24 h-24 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br from-orange-100 to-amber-200 ${item.imageUrl ? "hidden" : "flex"}`}
            style={{ display: item.imageUrl ? "none" : "flex" }}
          >
            {emoji}
          </div>
          {isPopular && (
            <span className="absolute -top-1 -left-1 bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm leading-tight">
              ⭐ BEST
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1 mb-1">
            <span className="text-xs flex-shrink-0 mt-0.5">
              {item.foodType === "non-veg" ? "🔴" : "🟢"}
            </span>
            <p className="font-semibold text-sm leading-tight text-gray-900">{item.name}</p>
          </div>
          {item.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
          )}
          <div className="flex items-center justify-between gap-2 mt-auto">
            <div>
              <div className="flex items-center gap-1.5">
                {item.discountedPrice && (
                  <span className="text-xs text-gray-400 line-through">₹{item.actualPrice}</span>
                )}
                <span className="font-bold text-sm text-gray-900">₹{price}</span>
              </div>
              {item.preparationTime && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
                  <Clock className="h-3 w-3" />{item.preparationTime} min
                </span>
              )}
              {timingReason && (
                <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5 mt-0.5">
                  <Clock className="h-3 w-3" />{timingReason}
                </span>
              )}
            </div>
            {isDisabled ? (
              <span className="text-xs text-gray-400 italic">
                {!isKitchenOpen ? "Closed" : timingReason || "Unavailable"}
              </span>
            ) : qty > 0 && !item.hasVariants && !item.hasAddOns ? (
              <div className="flex items-center gap-2">
                <button onClick={onDecrease} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center" data-testid={`button-dec-${item.id}`}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center font-bold text-sm">{qty}</span>
                <button onClick={onIncrease} className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center" data-testid={`button-inc-${item.id}`}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={onAdd}
                className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform ${qty > 0 ? "bg-[#2BB6A8] text-white" : "bg-[#1E3A5F] text-white"}`}
                data-testid={`button-add-${item.id}`}
              >
                <Plus className="h-3.5 w-3.5" />
                {qty > 0 ? `${qty} added` : "ADD"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PopularCardProps {
  item: MenuItem;
  qty: number;
  isKitchenOpen: boolean;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

function PopularCard({ item, qty, isKitchenOpen, onAdd }: PopularCardProps) {
  const price = item.discountedPrice || item.actualPrice || item.price;
  const isDisabled = !isKitchenOpen;
  const emoji = getFoodEmoji(item);

  return (
    <div
      className={`bg-white rounded-2xl flex-shrink-0 w-40 shadow-sm overflow-hidden transition-opacity ${isDisabled ? "opacity-50" : ""}`}
      data-testid={`card-popular-${item.id}`}
    >
      <div className="relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="w-full h-28 object-cover"
            onError={e => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              const next = el.nextElementSibling as HTMLElement;
              if (next) next.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`w-full h-28 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-200 items-center justify-center text-5xl ${item.imageUrl ? "hidden" : "flex"}`}
          style={{ display: item.imageUrl ? "none" : "flex" }}
        >
          {emoji}
        </div>
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          {item.foodType === "non-veg" ? "🔴 Non-Veg" : "🟢 Veg"}
        </span>
      </div>
      <div className="p-2.5">
        <p className="font-semibold text-xs leading-tight text-gray-900 line-clamp-2 mb-1.5">{item.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">₹{price}</span>
          {!isDisabled && (
            <button
              onClick={onAdd}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-transform active:scale-95 flex items-center gap-1 ${qty > 0 ? "bg-[#2BB6A8] text-white" : "bg-[#1E3A5F] text-white"}`}
              data-testid={`button-popular-add-${item.id}`}
            >
              {qty > 0 ? <><span>{qty}</span><Check className="h-3 w-3" /></> : <><Plus className="h-3 w-3" /><span>Add</span></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
