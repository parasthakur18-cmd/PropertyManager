import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Minus, X, Check, Phone, Store, Hotel, ArrowRight, ArrowLeft,
  Search, XCircle, Building2, ChevronRight, UtensilsCrossed, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type MenuItem, type MenuCategory } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartAddOn { id: number; name: string; price: string; quantity: number; }

interface CartItem extends MenuItem {
  quantity: number;
  cartKey: string;
  selectedVariant?: { id: number; variantName: string; actualPrice: string; discountedPrice: string | null };
  cartAddOns?: CartAddOn[];
}

type OrderType = "room" | "restaurant" | "takeaway" | null;
type RestaurantCustomerType = "walk-in" | "in-house";

// ─── Constants ────────────────────────────────────────────────────────────────

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

function getFoodEmoji(item: { foodType?: string | null; name?: string }): string {
  const name = (item.name || "").toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (name.includes(key)) return emoji;
  }
  return item.foodType === "non-veg" ? "🍗" : "🥗";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuickOrder() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedTable = urlParams.get("table") || "";
  const preselectedProperty = urlParams.get("property") || "";
  const startStep = urlParams.get("step");
  // ── Step state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(startStep === "3" ? 3 : 1);
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [restaurantCustomerType, setRestaurantCustomerType] = useState<RestaurantCustomerType>("walk-in");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // ── Step 3 menu UI state ───────────────────────────────────────────────────
  const [menuScreen, setMenuScreen] = useState<"categories" | "items">("categories");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // ── Variants / add-ons sheet ───────────────────────────────────────────────
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const [sheetVariant, setSheetVariant] = useState<{ id: number; variantName: string; actualPrice: string; discountedPrice: string | null } | null>(null);
  const [sheetAddOns, setSheetAddOns] = useState<CartAddOn[]>([]);

  const { toast } = useToast();

  const {
    selectedPropertyId, setSelectedPropertyId,
    availableProperties, showPropertySwitcher,
  } = usePropertyFilter();

  useEffect(() => {
    if (preselectedProperty && selectedPropertyId !== parseInt(preselectedProperty)) {
      setSelectedPropertyId(parseInt(preselectedProperty));
    }
  }, [preselectedProperty, selectedPropertyId, setSelectedPropertyId]);

  useEffect(() => {
    if (startStep === "3") {
      setStep(3);
      setOrderType("restaurant");
      setRestaurantCustomerType("walk-in");
    }
  }, [startStep]);

  // ── Data queries ───────────────────────────────────────────────────────────
  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: menuCategories } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu-categories"],
  });

  const { data: roomsWithGuests, isLoading: roomsLoading, isError: roomsError } = useQuery<any[]>({
    queryKey: ["/api/rooms/checked-in-guests"],
  });

  const { data: sheetVariants } = useQuery<{ id: number; menuItemId: number; variantName: string; actualPrice: string; discountedPrice: string | null }[]>({
    queryKey: [`/api/menu-items/${sheetItem?.id}/variants`],
    enabled: !!sheetItem,
  });

  const { data: sheetAddOnOptions } = useQuery<{ id: number; menuItemId: number; addOnName: string; addOnPrice: string }[]>({
    queryKey: [`/api/menu-items/${sheetItem?.id}/add-ons`],
    enabled: !!sheetItem,
  });

  // ── Order mutation ─────────────────────────────────────────────────────────
  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("/api/orders", "POST", orderData);
    },
    onSuccess: () => {
      toast({ title: "Order Created!", description: "Order has been sent to the kitchen." });
      setStep(1);
      setOrderType(null);
      setCart([]);
      setSelectedRoom("");
      setCustomerName("");
      setCustomerPhone("");
      setSpecialInstructions("");
      setMenuScreen("categories");
      setActiveCategoryId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ── Filtered menu items ────────────────────────────────────────────────────
  const propertyMenuItems = useMemo(() => {
    if (!menuItems) return [];
    if (!selectedPropertyId) return menuItems;
    return menuItems.filter(i => i.propertyId === selectedPropertyId);
  }, [menuItems, selectedPropertyId]);

  const availableItems = useMemo(() =>
    propertyMenuItems.filter(i => i.isAvailable),
    [propertyMenuItems]
  );

  const filteredRooms = useMemo(() => {
    if (!roomsWithGuests) return [];
    if (!selectedPropertyId) return roomsWithGuests;
    return roomsWithGuests.filter(r => r.propertyId === selectedPropertyId);
  }, [roomsWithGuests, selectedPropertyId]);

  // ── Category data for grid ─────────────────────────────────────────────────
  const popularItemIds = useMemo(() => new Set(availableItems.slice(0, 6).map(i => i.id)), [availableItems]);

  const categoriesWithCount = useMemo(() => {
    if (!menuCategories) return [];
    return menuCategories
      .map((cat, idx) => ({
        cat,
        count: availableItems.filter(i => i.categoryId === cat.id).length,
        gradient: CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length],
        emoji: getCategoryEmoji(cat.name),
        photo: cat.imageUrl || getCategoryPhoto(cat.name),
      }))
      .filter(c => c.count > 0 && (!selectedPropertyId || c.cat.propertyId === selectedPropertyId));
  }, [menuCategories, availableItems, selectedPropertyId]);

  const activeCategory = menuCategories?.find(c => c.id === activeCategoryId);

  const popularItems = useMemo(() => availableItems.slice(0, 6), [availableItems]);

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
    if (!searchTerm.trim() || menuScreen !== "categories") return [];
    const q = searchTerm.toLowerCase();
    return availableItems.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  }, [availableItems, searchTerm, menuScreen]);

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

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.cartKey === cartKey ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (cartKey: string) =>
    setCart(prev => prev.filter(i => i.cartKey !== cartKey));

  const updateCartAddOnQty = (cartKey: string, addOnId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartKey !== cartKey || !item.cartAddOns) return item;
      return {
        ...item,
        cartAddOns: item.cartAddOns.map(a =>
          a.id === addOnId ? { ...a, quantity: Math.max(1, a.quantity + delta) } : a
        ),
      };
    }));
  };

  // ── Add to cart ────────────────────────────────────────────────────────────
  const openItemSheet = (item: MenuItem) => {
    setSheetItem(item);
    setSheetVariant(null);
    setSheetAddOns([]);
  };

  const addSimpleToCart = (item: MenuItem) => {
    const cartKey = `${item.id}-${Date.now()}`;
    setCart(prev => [...prev, { ...item, cartKey, quantity: 1 }]);
    toast({ title: "Added", description: item.name });
  };

  const addToCart = (item: MenuItem) => {
    if (item.hasVariants || item.hasAddOns) openItemSheet(item);
    else addSimpleToCart(item);
  };

  const confirmSheetAdd = () => {
    if (!sheetItem) return;
    const cartKey = `${sheetItem.id}-${sheetVariant?.id || "nv"}-${Date.now()}`;
    setCart(prev => [...prev, {
      ...sheetItem,
      cartKey,
      quantity: 1,
      selectedVariant: sheetVariant || undefined,
      cartAddOns: sheetAddOns.length > 0 ? [...sheetAddOns] : undefined,
    }]);
    toast({ title: "Added", description: sheetItem.name });
    setSheetItem(null);
    setSheetVariant(null);
    setSheetAddOns([]);
  };

  const toggleSheetAddOn = (addon: { id: number; addOnName: string; addOnPrice: string }) => {
    const exists = sheetAddOns.find(a => a.id === addon.id);
    if (exists) setSheetAddOns(prev => prev.filter(a => a.id !== addon.id));
    else setSheetAddOns(prev => [...prev, { id: addon.id, name: addon.addOnName, price: addon.addOnPrice, quantity: 1 }]);
  };

  const updateSheetAddOnQty = (id: number, delta: number) =>
    setSheetAddOns(prev => prev.map(a => a.id === id ? { ...a, quantity: Math.max(1, a.quantity + delta) } : a));

  const sheetTotal = useMemo(() => {
    const base = sheetVariant
      ? parseFloat(sheetVariant.discountedPrice || sheetVariant.actualPrice)
      : parseFloat(sheetItem?.price as string || "0");
    const extras = sheetAddOns.reduce((s, a) => s + parseFloat(a.price) * a.quantity, 0);
    return (base + extras).toFixed(2);
  }, [sheetVariant, sheetItem, sheetAddOns]);

  // ── Step navigation ────────────────────────────────────────────────────────
  const handleNextStep = () => {
    if (step === 1 && !orderType) {
      toast({ title: "Order Type Required", description: "Select Room Service or Restaurant", variant: "destructive" });
      return;
    }
    if (step === 2) {
      if (orderType === "room") {
        if (!filteredRooms || filteredRooms.length === 0) {
          toast({ title: "No Checked-In Guests", description: "No rooms with checked-in guests.", variant: "destructive" });
          return;
        }
        if (!selectedRoom) {
          toast({ title: "Room Required", description: "Please select a room", variant: "destructive" });
          return;
        }
      }
      if (orderType === "restaurant") {
        if (restaurantCustomerType === "walk-in" && (!customerName || !customerPhone)) {
          toast({ title: "Customer Info Required", description: "Enter name and phone", variant: "destructive" });
          return;
        }
        if (restaurantCustomerType === "in-house" && !selectedRoom) {
          toast({ title: "Room Required", description: "Select the in-house guest's room", variant: "destructive" });
          return;
        }
      }
      if (orderType === "takeaway") {
        if (!customerName || !customerPhone) {
          toast({ title: "Customer Info Required", description: "Enter name and phone for the parcel", variant: "destructive" });
          return;
        }
        // Multi-property guard: takeaway must be tagged to one property,
        // otherwise the kitchen never sees the parcel + reports lose it.
        const resolvedPropertyId = selectedPropertyId ?? (availableProperties.length === 1 ? availableProperties[0].id : null);
        if (!resolvedPropertyId) {
          toast({ title: "Property Required", description: "Pick a property at the top before placing a takeaway order.", variant: "destructive" });
          return;
        }
      }
    }
    setStep(step + 1);
  };

  // ── Order submission ───────────────────────────────────────────────────────
  const handleSubmitOrder = () => {
    if (cart.length === 0) {
      toast({ title: "Cart Empty", description: "Add items before submitting", variant: "destructive" });
      return;
    }

    const orderData: any = {
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
        return {
          id: item.id,
          name: item.name + variantText + addOnsText,
          price: ((base * item.quantity + addOnsTotal) / item.quantity).toFixed(2),
          quantity: item.quantity,
        };
      }),
      totalAmount: calculateTotal().toFixed(2),
      specialInstructions: specialInstructions || null,
      orderSource: "staff",
      orderType,
    };

    if (orderType === "room") {
      orderData.roomId = parseInt(selectedRoom);
      const roomGuest = filteredRooms.find(r => r.roomId === parseInt(selectedRoom));
      if (roomGuest) {
        orderData.propertyId = roomGuest.propertyId;
        orderData.bookingId = roomGuest.bookingId;
        orderData.customerName = roomGuest.guestName;
        orderData.customerPhone = roomGuest.guestPhone || "";
      }
    } else if (orderType === "takeaway") {
      // Takeaway is a restaurant order with orderMode="takeaway".
      // Server stores orderType="restaurant" so existing reports keep working.
      orderData.orderType = "restaurant";
      orderData.orderMode = "takeaway";
      orderData.propertyId = selectedPropertyId ?? (availableProperties.length === 1 ? availableProperties[0].id : null);
      orderData.customerName = customerName;
      orderData.customerPhone = customerPhone;
    } else if (orderType === "restaurant") {
      orderData.orderMode = "dine-in";
      if (restaurantCustomerType === "in-house") {
        orderData.roomId = parseInt(selectedRoom);
        const roomGuest = filteredRooms.find(r => r.roomId === parseInt(selectedRoom));
        if (roomGuest) {
          orderData.propertyId = roomGuest.propertyId;
          orderData.bookingId = roomGuest.bookingId;
          orderData.customerName = roomGuest.guestName;
          orderData.customerPhone = roomGuest.guestPhone || "";
        }
      } else {
        orderData.propertyId = selectedPropertyId ?? (availableProperties.length === 1 ? availableProperties[0].id : null);
        orderData.customerName = customerName;
        orderData.customerPhone = customerPhone;
      }
    }

    orderMutation.mutate(orderData);
  };

  // ── Room label ─────────────────────────────────────────────────────────────
  const selectedRoomLabel = useMemo(() => {
    if (!selectedRoom) return null;
    const r = filteredRooms.find(r => r.roomId === parseInt(selectedRoom));
    return r ? `Room ${r.roomNumber} — ${r.guestName}` : `Room ${selectedRoom}`;
  }, [selectedRoom, filteredRooms]);

  useEffect(() => {
    if (!preselectedTable || orderType !== "restaurant") return;
    setRestaurantCustomerType("walk-in");
    setSelectedRoom("");
  }, [preselectedTable, orderType]);

  if (menuLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            Quick Order
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Step {step} of 3 ·{" "}
            {step === 1 ? "Select order type" : step === 2 ? "Customer details" : "Select items"}
          </p>
        </div>
        {showPropertySwitcher && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select
              value={selectedPropertyId?.toString() ?? ""}
              onValueChange={v => {
                setSelectedPropertyId(v ? parseInt(v) : null);
                setStep(1); setOrderType(null); setCart([]);
                setSelectedRoom(""); setMenuScreen("categories"); setSearchTerm("");
              }}
            >
              <SelectTrigger className="w-52" data-testid="select-quick-order-property">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {availableProperties.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1 — Order Type (unchanged)
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader><CardTitle>Step 1: Select Order Type</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setOrderType("room")}
                  className={`p-6 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${orderType === "room" ? "border-primary bg-primary/5" : "border-border"}`}
                  data-testid="button-order-type-room"
                >
                  <Hotel className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Room Service</h3>
                  <p className="text-sm text-muted-foreground">Deliver to guest room</p>
                </button>
                <button
                  onClick={() => setOrderType("restaurant")}
                  className={`p-6 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${orderType === "restaurant" ? "border-primary bg-primary/5" : "border-border"}`}
                  data-testid="button-order-type-restaurant"
                >
                  <Store className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Restaurant / Dine-in</h3>
                  <p className="text-sm text-muted-foreground">Order for restaurant table</p>
                </button>
                <button
                  onClick={() => { setOrderType("takeaway"); setRestaurantCustomerType("walk-in"); setSelectedRoom(""); }}
                  className={`p-6 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${orderType === "takeaway" ? "border-primary bg-primary/5" : "border-border"}`}
                  data-testid="button-order-type-takeaway"
                >
                  <span className="block text-5xl mb-3">🥡</span>
                  <h3 className="font-semibold text-lg mb-2">Takeaway / Parcel</h3>
                  <p className="text-sm text-muted-foreground">Pickup order — name & phone only</p>
                </button>
              </div>
              <Button className="w-full mt-6" size="lg" onClick={handleNextStep} disabled={!orderType} data-testid="button-next-step-1">
                Next: Customer Details <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2 — Customer Details (unchanged)
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Step 2: {orderType === "room" ? "Select Room" : orderType === "takeaway" ? "Takeaway Customer" : "Customer Information"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderType === "takeaway" ? (
                <>
                  <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
                    🥡 Takeaway / parcel order — no table, no room. Just name & phone for pickup.
                  </div>
                  <div>
                    <Label htmlFor="takeaway-name">Customer Name *</Label>
                    <Input id="takeaway-name" placeholder="Enter customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} data-testid="input-takeaway-name" />
                  </div>
                  <div>
                    <Label htmlFor="takeaway-phone">Phone Number *</Label>
                    <Input id="takeaway-phone" placeholder="Enter phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} data-testid="input-takeaway-phone" />
                  </div>
                </>
              ) : orderType === "room" ? (
                <div>
                  <Label htmlFor="room-select">Room Number *</Label>
                  {roomsLoading ? <Skeleton className="h-10 w-full" />
                    : roomsError ? <div className="text-sm text-destructive p-3 border border-destructive rounded-md">Error loading rooms. Please try again.</div>
                    : filteredRooms.length === 0 ? <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">No rooms with checked-in guests for this property.</div>
                    : (
                      <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                        <SelectTrigger id="room-select" data-testid="select-quick-order-room">
                          <SelectValue placeholder="Select room with checked-in guest" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredRooms.map(room => (
                            <SelectItem key={room.roomId} value={room.roomId.toString()}>
                              Room {room.roomNumber} — {room.guestName}{room.isGroupBooking ? " 🏨 Group" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label>Customer Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { setRestaurantCustomerType("walk-in"); setSelectedRoom(""); }}
                        className={`p-4 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${restaurantCustomerType === "walk-in" ? "border-primary bg-primary/5" : "border-border"}`}
                        data-testid="button-customer-type-walkin"
                      >
                        <Store className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="font-medium text-sm">Walk-in Customer</p>
                        <p className="text-xs text-muted-foreground mt-1">Enter name & phone</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRestaurantCustomerType("in-house"); setCustomerName(""); setCustomerPhone(""); }}
                        className={`p-4 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${restaurantCustomerType === "in-house" ? "border-primary bg-primary/5" : "border-border"}`}
                        data-testid="button-customer-type-inhouse"
                      >
                        <Hotel className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="font-medium text-sm">In-House Guest</p>
                        <p className="text-xs text-muted-foreground mt-1">Link to room bill</p>
                      </button>
                    </div>
                  </div>
                  {restaurantCustomerType === "walk-in" ? (
                    <>
                      <div>
                        <Label htmlFor="customer-name">Customer Name *</Label>
                        <Input id="customer-name" placeholder="Enter customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} data-testid="input-customer-name" />
                      </div>
                      <div>
                        <Label htmlFor="customer-phone">Phone Number *</Label>
                        <Input id="customer-phone" placeholder="Enter phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} data-testid="input-customer-phone" />
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label htmlFor="inhouse-room-select">Guest's Room Number *</Label>
                      {roomsLoading ? <Skeleton className="h-10 w-full" />
                        : roomsError ? <div className="text-sm text-destructive p-3 border border-destructive rounded-md">Error loading rooms.</div>
                        : filteredRooms.length === 0 ? <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">No checked-in guests for this property.</div>
                        : (
                          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                            <SelectTrigger id="inhouse-room-select" data-testid="select-inhouse-guest-room">
                              <SelectValue placeholder="Select guest's room" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredRooms.map(room => (
                                <SelectItem key={room.roomId} value={room.roomId.toString()}>
                                  Room {room.roomNumber} — {room.guestName}{room.isGroupBooking ? " 🏨 Group" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      <p className="text-xs text-muted-foreground mt-2">Order will be added to guest's room bill</p>
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1" data-testid="button-back-step-2">
                  <ArrowLeft className="h-5 w-5 mr-2" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleNextStep}
                  disabled={orderType === "room" && (!roomsWithGuests || roomsWithGuests.length === 0 || roomsLoading)}
                  data-testid="button-next-step-2"
                >
                  Next: Select Items <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 3 — Menu (same look as customer menu)
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="pb-28">

          {/* ── Sub-header with back + context ─────────────────────────────── */}
          <div className="bg-white border rounded-2xl px-4 py-3 mb-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              {menuScreen === "items" && (
                <button
                  onClick={() => { setMenuScreen("categories"); setSearchTerm(""); }}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors mr-1"
                  data-testid="button-back-to-categories"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <div>
                <p className="font-bold text-sm text-gray-900">
                  {menuScreen === "items" && activeCategory ? activeCategory.name : "Browse Menu"}
                </p>
                {selectedRoomLabel && (
                  <p className="text-xs text-[#2BB6A8] font-semibold">{selectedRoomLabel}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="flex items-center gap-1.5 bg-[#1E3A5F] text-white px-3 py-1.5 rounded-full text-sm font-semibold"
                  data-testid="button-header-cart"
                >
                  <span className="bg-white/20 rounded-full px-1.5 text-xs font-bold">{totalItems}</span>
                  ₹{calculateTotal().toFixed(0)}
                </button>
              )}
              <Button variant="outline" size="sm" onClick={() => setStep(2)} data-testid="button-back-step-3" className="text-xs h-8">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
            </div>
          </div>

          {/* ── Categories screen ─────────────────────────────────────────── */}
          {menuScreen === "categories" && (
            <div className="space-y-4">
              {/* Search */}
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
                  <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchTerm("")}>
                    <XCircle className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Search results */}
              {searchTerm && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</p>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No items found</p>
                    </div>
                  ) : (
                    searchResults.map(item => (
                      <QOMenuItemRow key={item.id} item={item} qty={getItemQtyInCart(item.id)}
                        onAdd={() => addToCart(item)}
                        onIncrease={() => { const ci = cart.find(c => c.id === item.id); if (ci) updateQuantity(ci.cartKey, 1); else addToCart(item); }}
                        onDecrease={() => { const cis = cart.filter(c => c.id === item.id); if (cis.length) updateQuantity(cis[cis.length - 1].cartKey, -1); }}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Popular items */}
              {!searchTerm && popularItems.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-700 mb-3">⭐ Popular Items</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                    {popularItems.map(item => (
                      <QOPopularCard key={item.id} item={item} qty={getItemQtyInCart(item.id)} onAdd={() => addToCart(item)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Category grid */}
              {!searchTerm && (
                <div>
                  <h2 className="text-sm font-bold text-gray-700 mb-3">Categories</h2>
                  {categoriesWithCount.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No menu items available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categoriesWithCount.map(({ cat, count, gradient, emoji, photo }) => (
                        <button
                          key={cat.id}
                          onClick={() => { setActiveCategoryId(cat.id); setMenuScreen("items"); setVegOnly(false); }}
                          className="relative rounded-2xl overflow-hidden h-40 text-left shadow-md active:scale-95 transition-transform"
                          data-testid={`button-category-${cat.id}`}
                        >
                          {photo ? (
                            <img src={photo} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                          )}
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
              )}
            </div>
          )}

          {/* ── Items screen ──────────────────────────────────────────────── */}
          {menuScreen === "items" && (
            <div className="space-y-3">
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
              {itemsInActiveCategory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{searchTerm ? "No results" : vegOnly ? "No veg items" : "No items in this category"}</p>
                </div>
              ) : (
                itemsInActiveCategory.map(item => (
                  <QOMenuItemRow key={item.id} item={item} qty={getItemQtyInCart(item.id)}
                    isPopular={popularItemIds.has(item.id)}
                    onAdd={() => addToCart(item)}
                    onIncrease={() => { const ci = cart.find(c => c.id === item.id); if (ci) updateQuantity(ci.cartKey, 1); else addToCart(item); }}
                    onDecrease={() => { const cis = cart.filter(c => c.id === item.id); if (cis.length) updateQuantity(cis[cis.length - 1].cartKey, -1); }}
                  />
                ))
              )}
            </div>
          )}

          {/* ── Sticky cart bar ────────────────────────────────────────────── */}
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
              <div className="max-w-5xl mx-auto pointer-events-auto">
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="w-full bg-[#1E3A5F] text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-2xl active:scale-[0.98] transition-transform"
                  data-testid="button-sticky-cart"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full px-2 py-0.5 text-sm font-bold">{totalItems}</div>
                    <span className="font-semibold text-sm">View Cart</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-lg">₹{calculateTotal().toFixed(0)}</span>
                    <ChevronRight className="h-5 w-5 opacity-70" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VARIANTS / ADD-ONS SHEET
      ══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={!!sheetItem} onOpenChange={open => { if (!open) { setSheetItem(null); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left text-lg">{sheetItem?.name}</SheetTitle>
            {sheetItem?.description && (
              <SheetDescription className="text-left text-sm text-gray-500">{sheetItem.description}</SheetDescription>
            )}
          </SheetHeader>
          <div className="space-y-5 py-3">
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm text-gray-500">{sheetVariant ? `Price (${sheetVariant.variantName})` : "Base Price"}</span>
              <span className="font-bold text-lg">₹{sheetVariant ? (sheetVariant.discountedPrice || sheetVariant.actualPrice) : sheetItem?.price}</span>
            </div>

            {sheetVariants && sheetVariants.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Choose Size / Variant <span className="text-red-500">*</span></p>
                {sheetVariants.map(v => (
                  <button key={v.id} onClick={() => setSheetVariant(v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${sheetVariant?.id === v.id ? "border-[#1E3A5F] bg-[#1E3A5F]/5" : "border-gray-200 bg-white"}`}
                    data-testid={`button-variant-${v.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${sheetVariant?.id === v.id ? "border-[#1E3A5F]" : "border-gray-300"}`}>
                        {sheetVariant?.id === v.id && <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />}
                      </div>
                      <span className="font-medium text-sm">{v.variantName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {v.discountedPrice && <span className="text-xs text-gray-400 line-through">₹{v.actualPrice}</span>}
                      <span className="font-bold text-sm">₹{v.discountedPrice || v.actualPrice}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {sheetAddOnOptions && sheetAddOnOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Add-ons <span className="text-gray-400 font-normal">(optional)</span></p>
                {sheetAddOnOptions.map(addon => {
                  const sel = sheetAddOns.find(a => a.id === addon.id);
                  return (
                    <div key={addon.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${sel ? "border-[#2BB6A8] bg-[#2BB6A8]/5" : "border-gray-200 bg-white"}`}>
                      <button className="flex items-center gap-3 flex-1 text-left" onClick={() => toggleSheetAddOn(addon)} data-testid={`button-addon-${addon.id}`}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel ? "border-[#2BB6A8] bg-[#2BB6A8]" : "border-gray-300"}`}>
                          {sel && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{addon.addOnName}</p>
                          <p className="text-xs text-[#2BB6A8] font-semibold">+₹{addon.addOnPrice}</p>
                        </div>
                      </button>
                      {sel && (
                        <div className="flex items-center gap-2 ml-3">
                          <button onClick={() => updateSheetAddOnQty(addon.id, -1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                          <span className="w-5 text-center text-sm font-bold">{sel.quantity}</span>
                          <button onClick={() => updateSheetAddOnQty(addon.id, 1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{sheetVariant ? sheetVariant.variantName : "Base"}</span>
                <span className="font-medium">₹{sheetVariant ? (sheetVariant.discountedPrice || sheetVariant.actualPrice) : sheetItem?.price}</span>
              </div>
              {sheetAddOns.map(a => (
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

            <button
              onClick={confirmSheetAdd}
              disabled={!!(sheetVariants && sheetVariants.length > 0 && !sheetVariant)}
              className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${sheetVariants && sheetVariants.length > 0 && !sheetVariant ? "bg-gray-300 cursor-not-allowed" : "bg-[#1E3A5F] active:scale-95"}`}
              data-testid="button-confirm-add-to-cart"
            >
              {sheetVariants && sheetVariants.length > 0 && !sheetVariant ? "Select a variant to continue" : `Add · ₹${sheetTotal}`}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════════════
          CART SHEET
      ══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-left">Order Summary</SheetTitle>
            <SheetDescription className="text-left text-sm">Review and place order</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 py-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              <>
                {cart.map(item => {
                  const base = item.selectedVariant
                    ? parseFloat(item.selectedVariant.discountedPrice || item.selectedVariant.actualPrice)
                    : parseFloat(item.price as string);
                  const addOnsTotal = item.cartAddOns
                    ? item.cartAddOns.reduce((s, a) => s + parseFloat(a.price) * a.quantity, 0)
                    : 0;
                  return (
                    <div key={item.cartKey} className="bg-gray-50 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight">
                            {item.name}
                            {item.selectedVariant && <span className="text-gray-400 font-normal"> · {item.selectedVariant.variantName}</span>}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">₹{base.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => updateQuantity(item.cartKey, -1)} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-white" data-testid={`button-cart-dec-${item.cartKey}`}>
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartKey, 1)} className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center" data-testid={`button-cart-inc-${item.cartKey}`}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => removeFromCart(item.cartKey)} className="w-8 h-8 rounded-full border border-red-200 text-red-400 flex items-center justify-center ml-1" data-testid={`button-cart-remove-${item.cartKey}`}>
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
                                <button onClick={() => updateCartAddOnQty(item.cartKey, a.id, -1)} className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center"><Minus className="h-2.5 w-2.5" /></button>
                                <span className="w-4 text-center font-semibold">{a.quantity}</span>
                                <button onClick={() => updateCartAddOnQty(item.cartKey, a.id, 1)} className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center"><Plus className="h-2.5 w-2.5" /></button>
                                <span className="text-gray-500">₹{(parseFloat(a.price) * a.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-500 border-t pt-2">
                        <span>Item total</span>
                        <span className="font-semibold text-gray-700">₹{(base * item.quantity + addOnsTotal).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}

                <div className="space-y-3 pt-2">
                  {/* Order context */}
                  {selectedRoomLabel && (
                    <div className="bg-[#1E3A5F]/5 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-xs font-medium text-[#1E3A5F]">{selectedRoomLabel}</span>
                    </div>
                  )}
                  {orderType === "restaurant" && restaurantCustomerType === "walk-in" && (
                    <div className="bg-gray-100 rounded-xl p-3 text-xs text-gray-600">
                      <span className="font-semibold">{customerName}</span> · {customerPhone}
                    </div>
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

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold mb-4">
                    <span>Total</span>
                    <span className="text-[#1E3A5F]">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleSubmitOrder}
                    disabled={orderMutation.isPending}
                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${orderMutation.isPending ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#1E3A5F] text-white active:scale-95"}`}
                    data-testid="button-place-order"
                  >
                    {orderMutation.isPending ? "Placing Order..." : `Place Order · ₹${calculateTotal().toFixed(0)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QOMenuItemRow({ item, qty, isPopular, onAdd, onIncrease, onDecrease }: {
  item: MenuItem; qty: number; isPopular?: boolean;
  onAdd: () => void; onIncrease: () => void; onDecrease: () => void;
}) {
  const price = item.discountedPrice || item.actualPrice || item.price;
  const emoji = getFoodEmoji(item);
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm" data-testid={`card-menu-item-${item.id}`}>
      <div className="flex gap-3 p-4">
        <div className="flex-shrink-0 relative">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} loading="lazy" className="w-24 h-24 rounded-xl object-cover"
              onError={e => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                const next = el.nextElementSibling as HTMLElement;
                if (next) next.style.display = "flex";
              }} />
          ) : null}
          <div
            className="w-24 h-24 rounded-xl items-center justify-center text-3xl bg-gradient-to-br from-orange-100 to-amber-200"
            style={{ display: item.imageUrl ? "none" : "flex" }}
          >{emoji}</div>
          {isPopular && (
            <span className="absolute -top-1 -left-1 bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm leading-tight">
              ⭐ BEST
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1 mb-1">
            <span className="text-xs flex-shrink-0 mt-0.5">{item.foodType === "non-veg" ? "🔴" : "🟢"}</span>
            <p className="font-semibold text-sm leading-tight text-gray-900">{item.name}</p>
          </div>
          {item.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                {item.discountedPrice && <span className="text-xs text-gray-400 line-through">₹{item.actualPrice}</span>}
                <span className="font-bold text-sm text-gray-900">₹{price}</span>
              </div>
              {item.preparationTime && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
                  <Clock className="h-3 w-3" />{item.preparationTime} min
                </span>
              )}
            </div>
            {qty > 0 && !item.hasVariants && !item.hasAddOns ? (
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

function QOPopularCard({ item, qty, onAdd }: { item: MenuItem; qty: number; onAdd: () => void; }) {
  const price = item.discountedPrice || item.actualPrice || item.price;
  const emoji = getFoodEmoji(item);
  return (
    <div className="bg-white rounded-2xl flex-shrink-0 w-40 shadow-sm overflow-hidden" data-testid={`card-popular-${item.id}`}>
      <div className="relative">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" className="w-full h-28 object-cover"
            onError={e => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              const next = el.nextElementSibling as HTMLElement;
              if (next) next.style.display = "flex";
            }} />
        ) : null}
        <div
          className="w-full h-28 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-200 items-center justify-center text-5xl"
          style={{ display: item.imageUrl ? "none" : "flex" }}
        >{emoji}</div>
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          {item.foodType === "non-veg" ? "🔴 Non-Veg" : "🟢 Veg"}
        </span>
      </div>
      <div className="p-2.5">
        <p className="font-semibold text-xs leading-tight text-gray-900 line-clamp-2 mb-1.5">{item.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">₹{price}</span>
          <button onClick={onAdd}
            className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-transform active:scale-95 flex items-center gap-1 ${qty > 0 ? "bg-[#2BB6A8] text-white" : "bg-[#1E3A5F] text-white"}`}
            data-testid={`button-popular-add-${item.id}`}
          >
            {qty > 0 ? <><span>{qty}</span><Check className="h-3 w-3" /></> : <><Plus className="h-3 w-3" /><span>Add</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
