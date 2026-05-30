import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RestaurantPopup } from "@/components/restaurant-popup";
import { Search, ShoppingCart, X, Plus, Minus, ChevronRight, Clock, ArrowLeft, UtensilsCrossed, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { type MenuItem, type MenuCategory, type MenuItemVariant, type MenuItemAddOn } from "@shared/schema";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: MenuItemVariant;
  selectedAddOns: Array<MenuItemAddOn & { quantity: number }>;
  totalPrice: number;
}

const CATEGORY_GRADIENTS = [
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-lime-400 to-green-500",
];

const MEAL_SLOTS = [
  { key: "breakfast", label: "Breakfast", icon: "🍳", gradient: "from-amber-400 to-orange-500", startKey: "breakfastStart", endKey: "breakfastEnd", enabledKey: "breakfastEnabled" },
  { key: "lunch",     label: "Lunch",     icon: "🍛", gradient: "from-green-400 to-emerald-500", startKey: "lunchStart",     endKey: "lunchEnd",     enabledKey: "lunchEnabled"     },
  { key: "snacks",    label: "High Tea",  icon: "☕", gradient: "from-teal-400 to-cyan-500",    startKey: "snacksStart",    endKey: "snacksEnd",    enabledKey: "snacksEnabled"    },
  { key: "dinner",    label: "Dinner",    icon: "🍽️", gradient: "from-indigo-500 to-purple-600",startKey: "dinnerStart",    endKey: "dinnerEnd",    enabledKey: "dinnerEnabled"    },
  { key: "allDay",    label: "All Day",   icon: "🌞", gradient: "from-amber-300 to-yellow-500", startKey: "",               endKey: "",             enabledKey: "allDayEnabled"    },
] as const;

function fmtSlotTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function getSlotItems(items: MenuItem[], slotKey: string): MenuItem[] {
  const isAllDay = (i: MenuItem) => (i as any).availableAllDay === true;
  switch (slotKey) {
    case "breakfast": return items.filter(i => isAllDay(i) || i.availableBreakfast === true);
    case "lunch":     return items.filter(i => isAllDay(i) || i.availableLunch === true);
    case "snacks":    return items.filter(i => isAllDay(i) || i.availableSnacks === true);
    case "dinner":    return items.filter(i => isAllDay(i) || i.availableDinner === true);
    case "allDay":    return items.filter(i => isAllDay(i));
    default:          return items;
  }
}

function getCategoryEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes("beverage") || n.includes("coffee") || n.includes("tea")) return "☕";
  if (n.includes("breakfast")) return "🍳";
  if (n.includes("snack")) return "🥪";
  if (n.includes("dessert")) return "🍰";
  if (n.includes("soup")) return "🍲";
  return "🍽️";
}

function getFoodEmoji(item: MenuItem) {
  const n = item.name.toLowerCase();
  if (n.includes("sandwich")) return "🥪";
  if (n.includes("coffee")) return "☕";
  if (n.includes("tea")) return "🍵";
  if (n.includes("juice")) return "🧃";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("burger")) return "🍔";
  if (n.includes("chocolate") || n.includes("cake")) return "🍰";
  if (n.includes("noodle") || n.includes("chinese")) return "🍜";
  if (n.includes("rice")) return "🍚";
  return item.foodType === "non-veg" ? "🍗" : "🍛";
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

  // All Day items are always available — no time restriction ever applies
  if ((item as any).availableAllDay === true) return "";

  const slots = [
    { enabled: item.availableBreakfast === true, start: timing.breakfastStart, end: timing.breakfastEnd },
    { enabled: item.availableLunch === true,     start: timing.lunchStart,     end: timing.lunchEnd     },
    { enabled: item.availableSnacks === true,    start: timing.snacksStart,    end: timing.snacksEnd    },
    { enabled: item.availableDinner === true,    start: timing.dinnerStart,    end: timing.dinnerEnd    },
  ];

  // If no slot times configured at all, no restriction
  const hasTimesConfigured = slots.some(s => parseTime(s.start) >= 0 && parseTime(s.end) >= 0);
  if (!hasTimesConfigured) return "";

  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();

  const isActive = (s: number, e: number): boolean => {
    if (s < 0 || e < 0) return false;
    if (e === 0) return cur >= s; // midnight end
    return s <= e ? (cur >= s && cur < e) : (cur >= s || cur < e); // handles overnight
  };

  // Item is available if it's enabled for ANY currently-active slot
  for (const slot of slots) {
    if (!slot.enabled) continue;
    const s = parseTime(slot.start);
    const e = parseTime(slot.end);
    if (s < 0 || e < 0) continue; // slot not configured, skip
    if (isActive(s, e)) return ""; // available right now
  }

  // Not available — find the next slot the item IS enabled for
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

export default function CustomerMenu() {
  const urlProperty = new URLSearchParams(window.location.search).get("property") || "";
  const urlTable = new URLSearchParams(window.location.search).get("table") || "";
  const isTableMode = !!urlTable;
  const tableLabel = /^table\b/i.test(urlTable.trim()) ? urlTable.trim() : `Table ${urlTable.trim()}`;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "none">("none");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(urlProperty ? parseInt(urlProperty) : null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showKitchenClosedDialog, setShowKitchenClosedDialog] = useState(false);
  const [activeMealSlot, setActiveMealSlot] = useState<string | null>(null);
  const LS_KEY = `hostezee_last_order_${urlProperty || "0"}`;
  const [lastOrder, setLastOrder] = useState<{ items: Array<{ id: number; name: string; price: number; quantity: number }> } | null>(() => {
    try { return JSON.parse(localStorage.getItem(`hostezee_last_order_${urlProperty || "0"}`) || "null"); } catch { return null; }
  });
  const { toast } = useToast();


  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Map<number, number>>(new Map());
  const [quantity, setQuantity] = useState(1);

  const publicFetch = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return response.json();
  };

  const categoriesUrl = urlProperty ? `/api/public/menu-categories?propertyId=${urlProperty}` : `/api/public/menu-categories`;
  const menuUrl = urlProperty ? `/api/public/menu?propertyId=${urlProperty}` : `/api/public/menu`;

  const { data: categories, isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: [categoriesUrl],
    queryFn: () => publicFetch(categoriesUrl),
  });

  const { data: menuItems, isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: [menuUrl],
    queryFn: () => publicFetch(menuUrl),
  });

  const { data: allVariants } = useQuery<MenuItemVariant[]>({
    queryKey: selectedItem ? [`/api/public/menu-items/${selectedItem.id}/variants`] : [],
    queryFn: () => publicFetch(`/api/public/menu-items/${selectedItem!.id}/variants`),
    enabled: !!selectedItem,
  });

  const { data: allAddOns } = useQuery<MenuItemAddOn[]>({
    queryKey: selectedItem ? [`/api/public/menu-items/${selectedItem.id}/add-ons`] : [],
    queryFn: () => publicFetch(`/api/public/menu-items/${selectedItem!.id}/add-ons`),
    enabled: !!selectedItem,
  });

  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/public/properties"],
    queryFn: () => publicFetch("/api/public/properties"),
  });

  const { data: menuTiming } = useQuery<any>({
    queryKey: ["/api/public/menu-timing", selectedPropertyId],
    queryFn: () => publicFetch(`/api/public/menu-timing/${selectedPropertyId}`),
    enabled: !!selectedPropertyId,
    refetchInterval: 60000,
  });

  // Kitchen open = any configured slot is currently active; fallback to 8 AM–10 PM
  const { isKitchenOpen, kitchenStatusText } = useMemo(() => {
    const pt = (t: string) => { if (!t) return -1; const [h, m] = t.split(":").map(Number); return isNaN(h) || isNaN(m) ? -1 : h * 60 + m; };
    const fmt = (t: string) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
    const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
    const active = (s: number, e: number) => s >= 0 && e >= 0 && (e === 0 ? cur >= s : s <= e ? cur >= s && cur < e : cur >= s || cur < e);
    if (!menuTiming) {
      const open = now.getHours() >= 8 && now.getHours() < 22;
      return { isKitchenOpen: open, kitchenStatusText: open ? "Kitchen Open · 8:00 AM – 10:00 PM" : "Kitchen Closed · Opens at 8:00 AM" };
    }
    const slots = [
      { start: menuTiming.breakfastStart, end: menuTiming.breakfastEnd },
      { start: menuTiming.lunchStart, end: menuTiming.lunchEnd },
      { start: menuTiming.snacksStart, end: menuTiming.snacksEnd },
      { start: menuTiming.dinnerStart, end: menuTiming.dinnerEnd },
    ];
    const open = slots.some(s => active(pt(s.start), pt(s.end)));
    if (open) {
      const first = slots.filter(s => pt(s.start) >= 0).sort((a, b) => pt(a.start) - pt(b.start))[0];
      const last = slots.filter(s => pt(s.end) > 0).sort((a, b) => pt(b.end) - pt(a.end))[0];
      return { isKitchenOpen: true, kitchenStatusText: `Kitchen Open · ${fmt(first?.start)} – ${fmt(last?.end)}` };
    }
    const next = slots.filter(s => pt(s.start) >= 0).map(s => ({ ...s, sm: pt(s.start) }))
      .sort((a, b) => { const d = (m: number) => m > cur ? m - cur : 1440 - cur + m; return d(a.sm) - d(b.sm); })[0];
    return { isKitchenOpen: false, kitchenStatusText: next ? `Kitchen Closed · Opens at ${fmt(next.start)}` : "Kitchen Closed" };
  }, [menuTiming]);

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to place order");
      }
      return response.json();
    },
    onSuccess: (_, variables: any) => {
      const savedOrder = { items: (variables.items || []) };
      try { localStorage.setItem(LS_KEY, JSON.stringify(savedOrder)); } catch {}
      setLastOrder(savedOrder);
      toast({ title: "Order Placed!", description: "Your order has been sent to the kitchen." });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedPropertyId(null);
      setShowCart(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isHighLoad = !!(menuTiming?.highLoadMode);
  const isKitchenPaused = !!(menuTiming?.kitchenPaused);
  const enabledSlotKeys = useMemo(() => {
    if (!menuTiming) return new Set(MEAL_SLOTS.map(s => s.key));
    return new Set(MEAL_SLOTS.filter(s => menuTiming[s.enabledKey] !== false).map(s => s.key));
  }, [menuTiming]);
  const visibleItems = useMemo(() => {
    let items = (menuItems || []).filter(i => i.isAvailable);
    if (isHighLoad) {
      items = items.filter(i => !!i.availableHighLoad);
    } else if (menuTiming) {
      if (currentSlotKey) {
        // During an active meal slot: show slot items + All Day items
        items = getSlotItems(items, currentSlotKey);
      } else {
        // Between slots: show only All Day items
        items = items.filter(i => (i as any).availableAllDay === true);
      }
    }
    return items;
  }, [menuItems, isHighLoad, currentSlotKey, menuTiming]);

  const filteredItems = visibleItems.filter((item) =>
    searchQuery
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const availableItems = visibleItems;
  const popularItems = useMemo(() => availableItems.slice(0, 6), [availableItems]);
  const popularItemIds = useMemo(() => new Set(popularItems.map(i => i.id)), [popularItems]);
  const categoriesWithCount = useMemo(() => (categories || []).map((cat, idx) => ({
    cat,
    count: availableItems.filter(i => i.categoryId === cat.id).length,
    gradient: CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length],
    emoji: getCategoryEmoji(cat.name),
    photo: cat.imageUrl,
  })).filter(c => c.count > 0), [categories, availableItems]);
  const activeCategory = categories?.find(c => c.id === selectedCategoryId);

  const itemsInActiveCategory = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === "none") return [];
    let base = availableItems.filter(i => i.categoryId === selectedCategoryId);
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(i => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
  }, [availableItems, selectedCategoryId, searchQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return availableItems.filter(i => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
  }, [availableItems, searchQuery]);

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
    if (!activeMealItems.length || !categories) return [] as Array<{ catName: string; items: MenuItem[] }>;
    const grouped: Array<{ catName: string; items: MenuItem[] }> = [];
    for (const cat of categories) {
      const catItems = activeMealItems.filter(i => i.categoryId === cat.id);
      if (catItems.length > 0) grouped.push({ catName: cat.name, items: catItems });
    }
    const uncategorized = activeMealItems.filter(i => !i.categoryId);
    if (uncategorized.length > 0) grouped.push({ catName: "Others", items: uncategorized });
    return grouped;
  }, [activeMealItems, categories]);

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setSelectedVariant(null);
    setSelectedAddOns(new Map());
  };

  const calculateItemPrice = () => {
    let basePrice = 0;
    if (selectedVariant) basePrice = parseFloat(selectedVariant.discountedPrice || selectedVariant.actualPrice);
    else if (selectedItem) basePrice = parseFloat(selectedItem.discountedPrice || selectedItem.actualPrice || selectedItem.price);
    let addOnsTotal = 0;
    selectedAddOns.forEach((qty, addOnId) => {
      const addOn = allAddOns?.find((a) => a.id === addOnId);
      if (addOn) addOnsTotal += parseFloat(addOn.addOnPrice) * qty;
    });
    return (basePrice + addOnsTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const addOnsArray = Array.from(selectedAddOns.entries()).filter(([_, qty]) => qty > 0).map(([addOnId, qty]) => {
      const addOn = allAddOns?.find((a) => a.id === addOnId)!;
      return { ...addOn, quantity: qty };
    });
    setCart([...cart, { menuItem: selectedItem, quantity, selectedVariant: selectedVariant || undefined, selectedAddOns: addOnsArray, totalPrice: calculateItemPrice() }]);
    setSelectedItem(null);
    setQuantity(1);
    setSelectedVariant(null);
    setSelectedAddOns(new Map());
  };

  const updateAddOnQuantity = (addOnId: number, delta: number) => {
    const newMap = new Map(selectedAddOns);
    const current = newMap.get(addOnId) || 0;
    const newQty = Math.max(0, current + delta);
    if (newQty === 0) newMap.delete(addOnId);
    else newMap.set(addOnId, newQty);
    setSelectedAddOns(newMap);
  };

  const toggleAddOn = (addOn: MenuItemAddOn) => {
    const newMap = new Map(selectedAddOns);
    const current = newMap.get(addOn.id) || 0;
    if (current > 0) newMap.delete(addOn.id);
    else newMap.set(addOn.id, 1);
    setSelectedAddOns(newMap);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const previousOrders = useMemo(() => {
    if (!isTableMode || !urlTable) return [];
    return [];
  }, [isTableMode, urlTable]);

  const handlePlaceOrder = () => {
    if (isKitchenPaused) {
      toast({ title: "⏸ Kitchen Temporarily Busy", description: "We are preparing existing orders. Please try again shortly." });
      return;
    }
    if (!isKitchenOpen) {
      setShowKitchenClosedDialog(true);
      return;
    }
    if (!customerName || !customerPhone) {
      toast({ title: "Required Fields", description: "Please enter your name and phone number", variant: "destructive" });
      return;
    }
    if (!selectedPropertyId) {
      toast({ title: "Select Property", description: "Please select which property you're ordering from", variant: "destructive" });
      return;
    }
    orderMutation.mutate({
      orderType: "restaurant",
      propertyId: selectedPropertyId,
      customerName,
      customerPhone,
      tableNumber: urlTable || undefined,
      items: cart.map(item => ({
        id: item.menuItem.id,
        name: item.menuItem.name,
        price: item.totalPrice / item.quantity,
        quantity: item.quantity,
      })),
      totalAmount: cartTotal.toFixed(2),
      specialInstructions: null,
    });
  };

  if (categoriesLoading || itemsLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-20 w-full rounded-2xl mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-28 overflow-x-hidden">
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="font-bold text-base leading-tight text-gray-900">{isTableMode ? "Our Menu" : "Café Menu"}</h1>
                {isTableMode && <p className="text-xs text-[#2BB6A8] font-semibold">{tableLabel}</p>}
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setShowCart(true)}
                className="relative flex items-center gap-1 bg-[#1E3A5F] text-white px-3 py-1.5 rounded-full text-sm font-semibold"
                data-testid="button-header-cart"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{cart.length}</span>
                <span className="text-xs opacity-80">· ₹{cartTotal.toFixed(0)}</span>
              </button>
            )}
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search dishes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-10 rounded-xl bg-white border-gray-200" data-testid="input-search" />
          </div>
          <div className="mt-3 flex items-center justify-center">
            <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${isKitchenOpen ? "bg-green-500/20 text-green-700 border border-green-400/40" : "bg-red-500/20 text-red-600 border border-red-400/40"}`} data-testid="badge-kitchen-status">
              <Clock className="h-3.5 w-3.5" />
              {kitchenStatusText}
              <span className={`h-2 w-2 rounded-full ${isKitchenOpen ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-4 space-y-5">
        {isTableMode && previousOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Previous Orders</h2>
              <span className="text-xs text-muted-foreground">Tap to reorder</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {previousOrders.map((order) => (
                <div key={order.id} className="min-w-[220px] max-w-[220px] rounded-2xl border bg-white shadow-sm p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{order.title}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <Badge variant="secondary">Room</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {order.items.map((item) => (
                      <p key={`${order.id}-${item.id}`} className="text-xs text-gray-600 line-clamp-1">
                        {item.quantity}x {item.name}
                      </p>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold">₹{order.totalAmount.toFixed(2)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const mappedItems = order.items
                          .map((item) => {
                            const menuItem = availableItems.find((candidate) => candidate.id === item.id || candidate.name.toLowerCase() === item.name.toLowerCase());
                            return menuItem ? { menuItem, qty: item.quantity } : null;
                          })
                          .filter(Boolean) as Array<{ menuItem: MenuItem; qty: number }>;
                        if (mappedItems.length > 0) {
                          setCart((current) => [
                            ...current,
                            ...mappedItems.flatMap(({ menuItem, qty }) =>
                              Array.from({ length: qty }, () => ({
                                menuItem,
                                quantity: 1,
                                selectedVariant: undefined,
                                selectedAddOns: [],
                                totalPrice: parseFloat(menuItem.discountedPrice || menuItem.actualPrice || menuItem.price),
                              }))
                            ),
                          ]);
                          toast({ title: "Added to cart", description: "Previous items were added to your cart." });
                        }
                      }}
                      data-testid={`button-reorder-${order.id}`}
                    >
                      Reorder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {searchQuery ? (
          /* ── SEARCH RESULTS ── */
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</p>
            {searchResults.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No items found</p>
              </div>
            ) : (
              searchResults.map(item => (
                <MenuItemRow key={item.id} item={item} qty={cart.filter(c => c.menuItem.id === item.id).length} isKitchenOpen={isKitchenOpen} isPopular={popularItemIds.has(item.id)} timingReason={getItemTimingReason(item, menuTiming)} onAdd={() => handleSelectItem(item)} onIncrease={() => handleSelectItem(item)} onDecrease={() => {}} />
              ))
            )}
          </div>

        ) : activeMealSlot ? (
          /* ── INSIDE MEAL SLOT VIEW ── */
          <div className="space-y-4">
            {(() => {
              const slot = MEAL_SLOTS.find(s => s.key === activeMealSlot)!;
              const isActive = currentSlotKey === activeMealSlot;
              const slotStart = menuTiming ? (menuTiming as any)[slot.startKey] : "";
              const slotEnd   = menuTiming ? (menuTiming as any)[slot.endKey]   : "";
              return (
                <>
                  {/* Back + Header */}
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
                      {isActive && (
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
                            qty={cart.filter(c => c.menuItem.id === item.id).length}
                            isKitchenOpen={isKitchenOpen}
                            isPopular={popularItemIds.has(item.id)}
                            timingReason={getItemTimingReason(item, menuTiming)}
                            onAdd={() => handleSelectItem(item)}
                            onIncrease={() => handleSelectItem(item)}
                            onDecrease={() => {}}
                          />
                        ))}
                      </div>
                    ))
                  )}
                </>
              );
            })()}
          </div>

        ) : selectedCategoryId !== "none" ? (
          /* ── CATEGORY DETAIL VIEW ── */
          <div className="space-y-4">
            <button
              onClick={() => setSelectedCategoryId("none")}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#1E3A5F]"
              data-testid="button-back-from-category"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Menu
            </button>
            {activeCategory && (
              <div className="flex items-center gap-2 pb-1 border-b">
                <span className="text-2xl">{getCategoryEmoji(activeCategory.name)}</span>
                <h2 className="text-base font-bold text-gray-900">{activeCategory.name}</h2>
                <span className="ml-auto text-xs text-gray-400">{itemsInActiveCategory.length} items</span>
              </div>
            )}
            {itemsInActiveCategory.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No items available</p>
              </div>
            ) : (
              itemsInActiveCategory.map(item => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  qty={cart.filter(c => c.menuItem.id === item.id).length}
                  isKitchenOpen={isKitchenOpen}
                  isPopular={popularItemIds.has(item.id)}
                  timingReason={getItemTimingReason(item, menuTiming)}
                  onAdd={() => handleSelectItem(item)}
                  onIncrease={() => handleSelectItem(item)}
                  onDecrease={() => {}}
                />
              ))
            )}
          </div>

        ) : (
          /* ── NEW PREMIUM HOMEPAGE ── */
          <>
            {/* 1a. KITCHEN PAUSE BANNER */}
            {isKitchenPaused && (
              <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 to-rose-500 p-4 text-white shadow-md">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">⏸</span>
                  <div>
                    <p className="font-bold text-sm leading-tight">Kitchen Temporarily Busy</p>
                    <p className="text-white/85 text-xs mt-1 leading-relaxed">
                      We are finishing up current orders. New orders are paused — please check back in a few minutes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 1b. HIGH LOAD BANNER */}
            {isHighLoad && (
              <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-md">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 flex-shrink-0 mt-0.5 text-white" />
                  <div>
                    <p className="font-bold text-sm leading-tight">Express Menu Currently Active</p>
                    <p className="text-white/80 text-xs mt-1 leading-relaxed">
                      To maintain fast service during peak hours, a curated selection is available.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CURRENTLY SERVING HERO — only when slot is enabled */}
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
                        {slotEnd && (
                          <p className="text-white/60 text-xs mt-0.5">Available till {fmtSlotTime(slotEnd)}</p>
                        )}
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
                          const qty = cart.filter(c => c.menuItem.id === item.id).length;
                          const isBestseller = popularItemIds.has(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleSelectItem(item)}
                              className="relative flex-shrink-0 bg-white/10 hover:bg-white/20 active:bg-white/25 rounded-xl p-2.5 text-left w-32 transition-colors"
                              data-testid={`button-hero-item-${item.id}`}
                            >
                              {isBestseller && (
                                <span className="absolute top-1.5 left-1.5 bg-[#F2B705] text-[#1E3A5F] text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none z-10">★ TOP</span>
                              )}
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  loading="lazy"
                                  className="w-full h-18 object-cover rounded-lg mb-2"
                                  style={{ height: "4.5rem" }}
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
                                {qty > 0 ? (
                                  <span className="text-[10px] bg-[#2BB6A8] text-white px-1.5 py-0.5 rounded-full font-bold leading-tight">{qty}✓</span>
                                ) : item.prepTime ? (
                                  <span className="text-[9px] text-white/50">{item.prepTime}m</span>
                                ) : null}
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

            {/* 3. QUICK ACTIONS */}
            {(() => {
              const teaItems = availableItems.filter(i => {
                const n = i.name.toLowerCase();
                return n.includes("tea") || n.includes("coffee");
              });
              return (
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {lastOrder && lastOrder.items && lastOrder.items.length > 0 && (
                    <button
                      onClick={() => {
                        const mappedItems = lastOrder.items
                          .map(item => {
                            const mi = availableItems.find(m => m.id === item.id);
                            return mi ? { menuItem: mi, qty: item.quantity } : null;
                          })
                          .filter(Boolean) as Array<{ menuItem: MenuItem; qty: number }>;
                        if (mappedItems.length > 0) {
                          setCart(current => [
                            ...current,
                            ...mappedItems.flatMap(({ menuItem, qty }) =>
                              Array.from({ length: qty }, () => ({
                                menuItem,
                                quantity: 1,
                                selectedVariant: undefined,
                                selectedAddOns: [],
                                totalPrice: parseFloat(menuItem.discountedPrice || menuItem.actualPrice || menuItem.price),
                              }))
                            ),
                          ]);
                          toast({ title: "Added to cart", description: `${mappedItems.length} item${mappedItems.length !== 1 ? "s" : ""} from your last order added.` });
                        } else {
                          toast({ title: "Items unavailable", description: "None of your last order items are currently on the menu.", variant: "destructive" });
                        }
                      }}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-[#1E3A5F] text-white text-xs font-semibold px-3 py-2 rounded-full whitespace-nowrap shadow-sm"
                      data-testid="button-repeat-last-order"
                    >
                      🔁 Repeat Last Order
                    </button>
                  )}
                  {teaItems.slice(0, 2).map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-full whitespace-nowrap"
                      data-testid={`button-quick-item-${item.id}`}
                    >
                      ☕ {item.name}
                    </button>
                  ))}
                  <button
                    onClick={() => toast({ title: "📞 Reception", description: "Please dial 0 from your room phone for assistance." })}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-[#1E3A5F]/8 border border-[#1E3A5F]/15 text-[#1E3A5F] text-xs font-semibold px-3 py-2 rounded-full whitespace-nowrap"
                    data-testid="button-call-reception"
                  >
                    📞 Reception
                  </button>
                  <button
                    onClick={() => setActiveMealSlot(currentSlotKey ?? "breakfast")}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-[#2BB6A8]/10 border border-[#2BB6A8]/25 text-[#2BB6A8] text-xs font-semibold px-3 py-2 rounded-full whitespace-nowrap"
                    data-testid="button-quick-fullmenu"
                  >
                    🍽️ Full Menu
                  </button>
                </div>
              );
            })()}

            {/* 4. MEAL EXPERIENCE CARDS — filter out disabled slots */}
            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-3">Dining Experiences</h2>
              {MEAL_SLOTS.every(s => (itemsPerSlot[s.key] ?? []).length === 0 || !enabledSlotKeys.has(s.key)) ? (
                <div className="text-center py-12 text-gray-400">
                  <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No meal slots available right now</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {MEAL_SLOTS.map(slot => {
                    const slotItems = itemsPerSlot[slot.key] ?? [];
                    if (slotItems.length === 0) return null;
                    if (!enabledSlotKeys.has(slot.key)) return null;
                    const isActive = currentSlotKey === slot.key;
                    const slotStart = menuTiming ? (menuTiming as any)[slot.startKey] : "";
                    const slotEnd   = menuTiming ? (menuTiming as any)[slot.endKey]   : "";
                    return (
                      <button
                        key={slot.key}
                        onClick={() => setActiveMealSlot(slot.key)}
                        className={`relative rounded-2xl overflow-hidden h-36 text-left active:scale-95 transition-all ${isActive ? "shadow-lg ring-2 ring-white" : "shadow-sm"}`}
                        data-testid={`button-meal-slot-${slot.key}`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${slot.gradient}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                        <div className="relative p-3.5 h-full flex flex-col justify-between">
                          <div className="flex items-start justify-between">
                            <span className="text-3xl leading-none drop-shadow">{slot.icon}</span>
                            {isActive ? (
                              <span className="flex items-center gap-1 bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse inline-block" />
                                NOW
                              </span>
                            ) : (
                              <span className="bg-black/25 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {slotItems.length}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm leading-tight drop-shadow">{slot.label}</p>
                            {slotStart && slotEnd ? (
                              <p className="text-white/75 text-[10px] mt-0.5 leading-tight">
                                {fmtSlotTime(slotStart)} – {fmtSlotTime(slotEnd)}
                              </p>
                            ) : (
                              <p className="text-white/75 text-[10px] mt-0.5">{slotItems.length} item{slotItems.length !== 1 ? "s" : ""}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  }).filter(Boolean)}
                </div>
              )}
            </div>

            {/* 5. BROWSE BY CATEGORY (secondary fallback) */}
            {categoriesWithCount.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-700 mb-3">Browse by Category</h2>
                <div className="grid grid-cols-2 gap-3">
                  {categoriesWithCount.map(({ cat, count, gradient, emoji, photo }) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="relative rounded-2xl overflow-hidden h-36 text-left shadow-sm active:scale-95 transition-transform"
                      data-testid={`button-category-${cat.id}`}
                    >
                      {photo
                        ? <img src={photo} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        : <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
                      <div className="relative p-3.5 h-full flex flex-col justify-between">
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
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selectedItem.name}</SheetTitle>
                {selectedItem.description && <p className="text-sm text-muted-foreground text-left">{selectedItem.description}</p>}
              </SheetHeader>
              <div className="space-y-6 py-4">
                {allVariants && allVariants.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Choose Variant *</Label>
                    <div className="space-y-2">
                      {allVariants.map((variant) => (
                        <Card key={variant.id} className={`p-3 cursor-pointer ${selectedVariant?.id === variant.id ? "border-primary bg-primary/5" : ""}`} onClick={() => setSelectedVariant(variant)} data-testid={`card-variant-${variant.id}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{variant.variantName}</span>
                            <div className="flex items-center gap-2">
                              {variant.discountedPrice && <span className="text-sm text-muted-foreground line-through">₹{variant.actualPrice}</span>}
                              <span className="font-bold">₹{variant.discountedPrice || variant.actualPrice}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {allAddOns && allAddOns.length > 0 && (
                  <div className="space-y-3 border border-green-500 rounded-lg p-4 bg-green-50/50">
                    <div className="text-sm text-green-700 font-medium mb-2">
                      Add-Ons Available 🎉
                      <br />
                      <span className="font-normal text-xs">Customize your order with these delicious extras!</span>
                    </div>
                    <div className="space-y-2">
                      {allAddOns.map((addOn) => {
                        const qty = selectedAddOns.get(addOn.id) || 0;
                        const isSelected = qty > 0;
                        return (
                          <Card key={addOn.id} className={`p-3 ${isSelected ? "border-green-500 bg-green-50" : ""}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{addOn.addOnName}</span>
                                  <span className="text-sm font-semibold text-green-600">+₹{addOn.addOnPrice}</span>
                                </div>
                              </div>
                              {isSelected ? (
                                <div className="flex items-center gap-2">
                                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateAddOnQuantity(addOn.id, -1)} data-testid={`button-addon-decrease-${addOn.id}`}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="font-bold w-6 text-center">{qty}</span>
                                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateAddOnQuantity(addOn.id, 1)} data-testid={`button-addon-increase-${addOn.id}`}>
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" className="border-green-500 text-green-600" onClick={() => toggleAddOn(addOn)} data-testid={`button-addon-add-${addOn.id}`}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-center gap-4 py-4">
                  <Button size="icon" variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))} data-testid="button-decrease-quantity"><Minus className="h-4 w-4" /></Button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <Button size="icon" variant="outline" onClick={() => setQuantity(quantity + 1)} data-testid="button-increase-quantity"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <SheetFooter className="border-t pt-4">
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>₹{calculateItemPrice().toFixed(2)}</span>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleAddToCart} disabled={allVariants && allVariants.length > 0 && !selectedVariant} data-testid="button-add-to-cart">
                    Add to Cart
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={showCart} onOpenChange={setShowCart}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Your Order ({cart.length} items)</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {cart.map((item, index) => (
              <Card key={index} className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.menuItem.name}</h4>
                    {item.selectedVariant && <p className="text-sm text-muted-foreground">{item.selectedVariant.variantName}</p>}
                    {item.selectedAddOns.length > 0 && <p className="text-xs text-green-600">+ {item.selectedAddOns.map((a) => `${a.addOnName} (${a.quantity})`).join(", ")}</p>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setCart(cart.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                  <span className="font-bold">₹{item.totalPrice.toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>
          {cart.length > 0 && (
            <SheetFooter className="border-t pt-4">
              <div className="w-full space-y-3">
                {isTableMode ? (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <div className="font-semibold flex items-center gap-2">🍽️ Ordering for <span className="text-primary">{tableLabel}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">Your food will be served to this table.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="property">Select Property *</Label>
                    <Select value={selectedPropertyId?.toString() || ""} onValueChange={(val) => setSelectedPropertyId(parseInt(val))}>
                      <SelectTrigger id="property" data-testid="select-property"><SelectValue placeholder="Choose your property" /></SelectTrigger>
                      <SelectContent>
                        {properties?.map((property) => (<SelectItem key={property.id} value={property.id.toString()}>{property.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input id="name" placeholder="Enter your name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} data-testid="input-customer-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" type="tel" placeholder="Enter your phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} data-testid="input-customer-phone" />
                </div>
                <div className="flex justify-between text-xl font-bold pt-2"><span>Total:</span><span>₹{cartTotal.toFixed(2)}</span></div>
                {!isKitchenOpen && <p className="text-center text-sm text-red-500 font-medium flex items-center justify-center gap-1"><Clock className="h-4 w-4" />{kitchenStatusText}</p>}
                <Button className={`w-full ${!isKitchenOpen ? "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted" : ""}`} size="lg" onClick={handlePlaceOrder} disabled={orderMutation.isPending} data-testid="button-place-order">{orderMutation.isPending ? "Placing Order..." : isKitchenOpen ? "Place Order" : "Kitchen Closed"}</Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
                <p className="text-lg font-bold">₹{cartTotal.toFixed(2)}</p>
              </div>
              <Button size="lg" onClick={() => setShowCart(true)} className="flex-shrink-0" data-testid="button-fixed-checkout">
                <ShoppingCart className="h-5 w-5 mr-2" />
                View Cart
              </Button>
            </div>
          </div>
        </div>
      )}
      <RestaurantPopup propertyId={selectedPropertyId} />
    </div>
  );
}

function MenuItemRow({ item, qty, isKitchenOpen, isPopular, timingReason, onAdd, onIncrease, onDecrease }: { item: MenuItem; qty: number; isKitchenOpen: boolean; isPopular?: boolean; timingReason?: string; onAdd: () => void; onIncrease: () => void; onDecrease: () => void; }) {
  const price = item.discountedPrice || item.actualPrice || item.price;
  const isDisabled = !isKitchenOpen || !!timingReason;
  const emoji = getFoodEmoji(item);

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-opacity ${isDisabled ? "opacity-50" : ""}`} data-testid={`card-menu-item-${item.id}`}>
      <div className="flex gap-3 p-4">
        <div className="flex-shrink-0 relative">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} loading="lazy" className="w-24 h-24 rounded-xl object-cover" onError={e => { const el = e.target as HTMLImageElement; el.style.display = "none"; const next = el.nextElementSibling as HTMLElement; if (next) next.style.display = "flex"; }} />
          ) : null}
          <div className={`w-24 h-24 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br from-orange-100 to-amber-200 ${item.imageUrl ? "hidden" : "flex"}`} style={{ display: item.imageUrl ? "none" : "flex" }}>{emoji}</div>
          {isPopular && <span className="absolute -top-1 -left-1 bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm leading-tight">⭐ BEST</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1 mb-1">
            <span className="text-xs flex-shrink-0 mt-0.5">{item.foodType === "non-veg" ? "🔴" : "🟢"}</span>
            <p className="font-semibold text-sm leading-tight text-gray-900">{item.name}</p>
          </div>
          {item.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>}
          <div className="flex items-center justify-between gap-2 mt-auto">
            <div>
              <div className="flex items-center gap-1.5">
                {item.discountedPrice && <span className="text-xs text-gray-400 line-through">₹{item.actualPrice}</span>}
                <span className="font-bold text-sm text-gray-900">₹{price}</span>
              </div>
              {item.preparationTime && <span className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5"><Clock className="h-3 w-3" />{item.preparationTime} min</span>}
            </div>
            {!isKitchenOpen ? (
              <span className="text-xs text-gray-400 italic">Closed</span>
            ) : timingReason ? (
              <span className="text-xs text-orange-500 italic font-medium">{timingReason}</span>
            ) : qty > 0 && !item.hasVariants && !item.hasAddOns ? (
              <div className="flex items-center gap-2">
                <button onClick={onDecrease} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center" data-testid={`button-dec-${item.id}`}><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-5 text-center font-bold text-sm">{qty}</span>
                <button onClick={onIncrease} className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center" data-testid={`button-inc-${item.id}`}><Plus className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button onClick={onAdd} className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform ${qty > 0 ? "bg-[#2BB6A8] text-white" : "bg-[#1E3A5F] text-white"}`} data-testid={`button-add-${item.id}`}>
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

function PopularCard({ item, qty, isKitchenOpen, timingReason, onAdd }: { item: MenuItem; qty: number; isKitchenOpen: boolean; timingReason?: string; onAdd: () => void; }) {
  const price = item.discountedPrice || item.actualPrice || item.price;
  const isDisabled = !isKitchenOpen || !!timingReason;
  const emoji = getFoodEmoji(item);

  return (
    <div className={`bg-white rounded-2xl flex-shrink-0 w-40 shadow-sm overflow-hidden transition-opacity ${isDisabled ? "opacity-50" : ""}`} data-testid={`card-popular-${item.id}`}>
      <div className="relative">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" className="w-full h-28 object-cover" onError={e => { const el = e.target as HTMLImageElement; el.style.display = "none"; const next = el.nextElementSibling as HTMLElement; if (next) next.style.display = "flex"; }} />
        ) : null}
        <div className={`w-full h-28 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-200 items-center justify-center text-5xl ${item.imageUrl ? "hidden" : "flex"}`} style={{ display: item.imageUrl ? "none" : "flex" }}>{emoji}</div>
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[9px] font-bold px-1.5 py-0.5 rounded-full">{item.foodType === "non-veg" ? "🔴 Non-Veg" : "🟢 Veg"}</span>
      </div>
      <div className="p-2.5">
        <p className="font-semibold text-xs leading-tight text-gray-900 line-clamp-2 mb-1.5">{item.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">₹{price}</span>
          {isDisabled ? (
            timingReason ? <span className="text-[10px] text-orange-500 italic font-medium leading-tight text-right">{timingReason}</span> : null
          ) : (
            <button onClick={onAdd} className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-transform active:scale-95 flex items-center gap-1 ${qty > 0 ? "bg-[#2BB6A8] text-white" : "bg-[#1E3A5F] text-white"}`} data-testid={`button-popular-add-${item.id}`}>
              {qty > 0 ? <><span>{qty}</span><span>✓</span></> : <><Plus className="h-3 w-3" /><span>Add</span></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
