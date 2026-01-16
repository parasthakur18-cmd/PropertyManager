import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingCart, Plus, Minus, X, Check, UtensilsCrossed, Clock, Search, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  SheetTrigger,
} from "@/components/ui/sheet";

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

export default function Menu() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"room" | "restaurant">("restaurant");
  const [roomNumber, setRoomNumber] = useState("");
  const [propertyId, setPropertyId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{id: number; variantName: string; actualPrice: string; discountedPrice: string | null} | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<{ id: number; name: string; price: string; quantity: number; }[]>([]);
  const [isAddOnsSheetOpen, setIsAddOnsSheetOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  // Detect order type, property, and room from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const room = params.get("room");
    const property = params.get("property");
    
    if (type === "room" || type === "restaurant") {
      setOrderType(type);
    }
    
    // Auto-fill room number and property ID if provided in URL (from QR code)
    if (room && type === "room") {
      setRoomNumber(room);
    }
    
    if (property && type === "room") {
      setPropertyId(property);
    }
  }, []);

  const { data: menuCategories, isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: ["/api/public/menu-categories"],
  });

  const { data: menuItems, isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/public/menu"],
  });

  // Fetch variants for selected item
  const { data: variants } = useQuery<{ id: number; menuItemId: number; variantName: string; actualPrice: string; discountedPrice: string | null; }[]>({
    queryKey: [`/api/public/menu-items/${selectedItem?.id}/variants`],
    enabled: !!selectedItem,
  });

  // Fetch add-ons for selected item
  const { data: addOns } = useQuery<{ id: number; menuItemId: number; addOnName: string; addOnPrice: string; }[]>({
    queryKey: [`/api/public/menu-items/${selectedItem?.id}/add-ons`],
    enabled: !!selectedItem,
  });

  const isLoading = categoriesLoading || itemsLoading;

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("/api/public/orders", "POST", orderData);
    },
    onSuccess: () => {
      toast({
        title: "Order Placed!",
        description: "Your order has been sent to the kitchen.",
      });
      setCart([]);
      setRoomNumber("");
      setCustomerName("");
      setCustomerPhone("");
      setSpecialInstructions("");
      setIsCheckoutOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openAddOnsSheet = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedVariant(null);
    setSelectedAddOns([]);
    setIsAddOnsSheetOpen(true);
  };

  const toggleAddOn = (addOn: { id: number; addOnName: string; addOnPrice: string; }) => {
    const existing = selectedAddOns.find(a => a.id === addOn.id);
    if (existing) {
      setSelectedAddOns(selectedAddOns.filter(a => a.id !== addOn.id));
    } else {
      setSelectedAddOns([...selectedAddOns, { id: addOn.id, name: addOn.addOnName, price: addOn.addOnPrice, quantity: 1 }]);
    }
  };

  const updateAddOnQuantity = (id: number, change: number) => {
    setSelectedAddOns(prev => 
      prev.map(addOn => 
        addOn.id === id 
          ? { ...addOn, quantity: Math.max(1, addOn.quantity + change) }
          : addOn
      )
    );
  };

  const addToCartWithAddOns = () => {
    if (!selectedItem) return;
    
    // Generate unique cart ID for this combination
    const cartId = `${selectedItem.id}-${selectedVariant?.id || 'novariant'}-${Date.now()}`;
    
    const cartItem: CartItem = {
      ...selectedItem,
      cartId,
      quantity: 1,
      selectedVariant: selectedVariant,
      cartAddOns: selectedAddOns.length > 0 ? [...selectedAddOns] : undefined
    };
    
    setCart([...cart, cartItem]);
    
    toast({
      title: "Added to cart",
      description: `${selectedItem.name} added${selectedAddOns.length > 0 ? ' with add-ons' : ''}`,
    });
    
    setIsAddOnsSheetOpen(false);
    setSelectedItem(null);
    setSelectedVariant(null);
    setSelectedAddOns([]);
  };

  const addToCart = (item: MenuItem) => {
    // Check if item has variants or add-ons
    if (item.hasVariants || item.hasAddOns) {
      openAddOnsSheet(item);
    } else {
      // Directly add to cart if no variants or add-ons
      const cartId = `${item.id}-novariant-${Date.now()}`;
      setCart([...cart, { ...item, cartId, quantity: 1 }]);
      toast({
        title: "Added to cart",
        description: `${item.name} added`,
      });
    }
  };

  const updateQuantity = (cartId: string, change: number) => {
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.cartId === cartId ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
      );
      return updated.filter((item) => item.quantity > 0);
    });
  };

  const updateCartAddOnQuantity = (cartId: string, addOnId: number, change: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId && item.cartAddOns) {
          return {
            ...item,
            cartAddOns: item.cartAddOns.map((addOn) =>
              addOn.id === addOnId
                ? { ...addOn, quantity: Math.max(1, addOn.quantity + change) }
                : addOn
            ),
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter((item) => item.cartId !== cartId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      // Base price (variant or regular price)
      const basePrice = item.selectedVariant 
        ? parseFloat(item.selectedVariant.discountedPrice || item.selectedVariant.actualPrice)
        : parseFloat(item.price as string);
      
      // Add-ons total
      const addOnsTotal = item.cartAddOns
        ? item.cartAddOns.reduce((addOnSum, addOn) => 
            addOnSum + (parseFloat(addOn.price) * addOn.quantity), 0)
        : 0;
      
      // Item total = (base price * main quantity) + add-ons total
      return sum + (basePrice * item.quantity) + addOnsTotal;
    }, 0);
  };

  const handleCheckout = () => {
    if (orderType === "room" && !roomNumber) {
      toast({
        title: "Room Number Required",
        description: "Please enter your room number",
        variant: "destructive",
      });
      return;
    }
    
    if (orderType === "restaurant" && (!customerName || !customerPhone)) {
      toast({
        title: "Details Required",
        description: "Please enter your name and phone number",
        variant: "destructive",
      });
      return;
    }

    const orderData: any = {
      orderType,
      orderSource: "guest",
      items: cart.map((item) => {
        const basePrice = item.selectedVariant 
          ? parseFloat(item.selectedVariant.discountedPrice || item.selectedVariant.actualPrice)
          : parseFloat(item.price as string);
        
        const variantText = item.selectedVariant ? ` (${item.selectedVariant.variantName})` : '';
        const addOnsText = item.cartAddOns && item.cartAddOns.length > 0
          ? ` + ${item.cartAddOns.map(a => `${a.quantity}x ${a.name}`).join(', ')}`
          : '';
        
        const addOnsTotal = item.cartAddOns
          ? item.cartAddOns.reduce((sum, addOn) => 
              sum + (parseFloat(addOn.price) * addOn.quantity), 0)
          : 0;
        
        const totalPrice = (basePrice * item.quantity) + addOnsTotal;
        
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
    } else {
      orderData.customerName = customerName;
      orderData.customerPhone = customerPhone;
    }

    orderMutation.mutate(orderData);
  };

  // Helper function to get total quantity of an item in cart (across all variants)
  const getItemQuantityInCart = (itemId: number) => {
    return cart
      .filter(cartItem => cartItem.id === itemId)
      .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
  };

  // Helper function to check if item has variants or add-ons
  const isComplexItem = (item: MenuItem) => {
    return item.hasVariants || item.hasAddOns;
  };

  // Filter items by search term (name + description)
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    if (!searchTerm.trim()) return menuItems;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower))
    );
  }, [menuItems, searchTerm]);

  // Group by category using new category system
  const groupedByCategory = menuCategories
    ?.filter((cat) => selectedCategoryId === null || cat.id === selectedCategoryId)
    .map((category) => ({
      category,
      items: filteredItems?.filter((item) => item.categoryId === category.id) || [],
    }))
    .filter(group => group.items.length > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-16 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-serif flex items-center gap-2">
                <UtensilsCrossed className="h-8 w-8 text-primary" />
                {orderType === "room" ? "Room Service Menu" : "Café Menu"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {orderType === "room" ? "Order directly to your room" : "Order from our café"}
              </p>
            </div>
            <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
              <SheetTrigger asChild>
                <Button size="lg" className="relative" data-testid="button-view-cart">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Cart ({cart.length})
                  {cart.length > 0 && (
                    <Badge className="ml-2 bg-destructive text-destructive-foreground">
                      ₹{calculateTotal().toFixed(0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Your Order</SheetTitle>
                  <SheetDescription>Review and complete your order</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
                  ) : (
                    <>
                      {cart.map((item) => {
                        const basePrice = item.selectedVariant 
                          ? parseFloat(item.selectedVariant.discountedPrice || item.selectedVariant.actualPrice)
                          : parseFloat(item.price as string);
                        
                        return (
                          <div key={item.cartId} className="p-3 border rounded-lg space-y-3">
                            {/* Main Item */}
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <p className="font-medium">
                                  {item.name}
                                  {item.selectedVariant && (
                                    <span className="text-sm text-muted-foreground ml-1">
                                      ({item.selectedVariant.variantName})
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground font-mono">₹{basePrice.toFixed(2)} each</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.cartId, -1)}
                                  data-testid={`button-decrease-${item.cartId}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.cartId, 1)}
                                  data-testid={`button-increase-${item.cartId}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => removeFromCart(item.cartId)}
                                  data-testid={`button-remove-${item.cartId}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Add-ons with Independent Controls */}
                            {item.cartAddOns && item.cartAddOns.length > 0 && (
                              <div className="pl-4 border-l-2 space-y-2">
                                {item.cartAddOns.map((addOn) => (
                                  <div key={addOn.id} className="flex items-center gap-3 text-sm">
                                    <div className="flex-1">
                                      <p className="text-muted-foreground">+ {addOn.name}</p>
                                      <p className="text-xs text-muted-foreground font-mono">₹{addOn.price} each</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                        onClick={() => updateCartAddOnQuantity(item.cartId, addOn.id, -1)}
                                        data-testid={`button-decrease-addon-${item.cartId}-${addOn.id}`}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-6 text-center font-mono text-xs">{addOn.quantity}</span>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                        onClick={() => updateCartAddOnQuantity(item.cartId, addOn.id, 1)}
                                        data-testid={`button-increase-addon-${item.cartId}-${addOn.id}`}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Item Total */}
                            <div className="flex justify-between text-sm pt-2 border-t">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="font-mono font-medium">
                                ₹{(
                                  (basePrice * item.quantity) + 
                                  (item.cartAddOns?.reduce((sum, addOn) => 
                                    sum + (parseFloat(addOn.price) * addOn.quantity), 0) || 0)
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      <div className="border-t pt-4 space-y-3">
                        {orderType === "room" ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="room-number">Room Number *</Label>
                              <Input
                                id="room-number"
                                placeholder="Enter your room number"
                                value={roomNumber}
                                onChange={(e) => setRoomNumber(e.target.value)}
                                data-testid="input-room-number"
                                readOnly={!!new URLSearchParams(window.location.search).get("room")}
                                className={new URLSearchParams(window.location.search).get("room") ? "bg-muted" : ""}
                              />
                              {new URLSearchParams(window.location.search).get("room") && (
                                <p className="text-xs text-muted-foreground">Room number auto-filled from QR code</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="customer-name">Name *</Label>
                              <Input
                                id="customer-name"
                                placeholder="Enter your name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                data-testid="input-customer-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="customer-phone">Phone Number *</Label>
                              <Input
                                id="customer-phone"
                                type="tel"
                                placeholder="Enter your phone number"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                data-testid="input-customer-phone"
                              />
                            </div>
                          </>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="special-instructions">Special Instructions (Optional)</Label>
                          <Textarea
                            id="special-instructions"
                            placeholder="Any special requests or dietary requirements..."
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            data-testid="input-special-instructions"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-bold mb-4">
                          <span>Total</span>
                          <span className="font-mono">₹{calculateTotal().toFixed(2)}</span>
                        </div>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleCheckout}
                          disabled={orderMutation.isPending || (orderType === "room" ? !roomNumber : (!customerName || !customerPhone))}
                          data-testid="button-place-order"
                        >
                          <Check className="h-5 w-5 mr-2" />
                          {orderMutation.isPending ? "Placing Order..." : "Place Order"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
              aria-label="Search menu items"
              data-testid="input-search-menu"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                data-testid="button-clear-search"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Tabs - Only tabs scroll */}
      {menuCategories && menuCategories.length > 0 && (
        <div className="border-b bg-background">
          <div className="overflow-x-auto overflow-y-hidden px-4 py-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            <div className="flex gap-2 w-max">
              <Badge
                variant={selectedCategoryId === null ? "default" : "outline"}
                className="cursor-pointer hover-elevate whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedCategoryId(null)}
                data-testid="badge-category-all"
              >
                All ({filteredItems?.filter((item) => item.isAvailable).length || 0})
              </Badge>
              {menuCategories.map((category) => {
                const itemCount = filteredItems?.filter(
                  (item) => item.categoryId === category.id && item.isAvailable
                ).length || 0;
                if (itemCount === 0) return null;
                return (
                  <Badge
                    key={category.id}
                    variant={selectedCategoryId === category.id ? "default" : "outline"}
                    className="cursor-pointer hover-elevate whitespace-nowrap flex-shrink-0"
                    onClick={() => setSelectedCategoryId(category.id)}
                    data-testid={`badge-category-${category.id}`}
                  >
                    {category.name} ({itemCount})
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="container mx-auto px-4 py-6 pb-24">
        {groupedByCategory?.map(({ category, items }) => (
          <div key={category.id} className="mb-8">
            <h2 className="text-xl font-bold mb-3">{category.name}</h2>
            <div className="grid grid-cols-1 gap-3">
              {items
                .filter((item) => item.isAvailable)
                .map((item) => (
                  <Card key={item.id} className="hover-elevate" data-testid={`card-menu-item-${item.id}`}>
                    <div className="flex gap-2 p-2.5">
                      {/* Compact Image */}
                      {item.imageUrl && (
                        <div className="flex-shrink-0 w-16 h-16 overflow-hidden rounded bg-muted">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-0.5">
                          <span className="text-xs flex-shrink-0">
                            {item.foodType === "non-veg" ? "🔴" : "🟢"}
                          </span>
                          <h3 className="font-semibold text-sm leading-tight flex-1 min-w-0">{item.name}</h3>
                          <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0 h-5 flex-shrink-0">₹{item.price}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{item.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            {item.preparationTime && (
                              <p className="text-xs text-muted-foreground">
                                <Clock className="inline h-3 w-3 mr-1" />
                                {item.preparationTime}min
                              </p>
                            )}
                            {getItemQuantityInCart(item.id) > 0 && (
                              <Badge variant="default" className="font-mono text-xs px-1.5 py-0 h-5">
                                {getItemQuantityInCart(item.id)} in cart
                              </Badge>
                            )}
                          </div>
                          {isComplexItem(item) ? (
                            <Button
                              size="sm"
                              onClick={() => openAddOnsSheet(item)}
                              data-testid={`button-customize-${item.id}`}
                              className="h-7 px-2 text-xs"
                            >
                              {getItemQuantityInCart(item.id) > 0 ? "Manage" : "Customize"}
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => {
                                  const cartItem = cart.find(ci => ci.id === item.id && !ci.selectedVariant);
                                  if (cartItem) updateQuantity(cartItem.cartId, -1);
                                }}
                                disabled={getItemQuantityInCart(item.id) === 0}
                                data-testid={`button-decrease-main-${item.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center font-mono text-xs">{getItemQuantityInCart(item.id)}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => {
                                  const quantity = getItemQuantityInCart(item.id);
                                  if (quantity > 0) {
                                    const cartItem = cart.find(ci => ci.id === item.id && !ci.selectedVariant);
                                    if (cartItem) updateQuantity(cartItem.cartId, 1);
                                  } else {
                                    addToCart(item);
                                  }
                                }}
                                data-testid={`button-increase-main-${item.id}`}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}

        {(!groupedByCategory || groupedByCategory.length === 0) && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <UtensilsCrossed className="h-16 w-16 text-muted-foreground" />
              <h3 className="text-xl font-semibold">No menu items available</h3>
              <p className="text-muted-foreground">Please check back later</p>
            </div>
          </Card>
        )}
      </div>

      {/* Add-Ons Selection Sheet */}
      <Sheet open={isAddOnsSheetOpen} onOpenChange={setIsAddOnsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedItem?.name}</SheetTitle>
            <SheetDescription>
              {variants && variants.length > 0 
                ? "Choose your size and customize with add-ons"
                : "Customize your order with add-ons"
              }
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Base Item Price - shows variant price when selected, otherwise item base price */}
            <div className="flex items-center justify-between pb-4 border-b">
              <span className="font-medium">{selectedVariant ? `Price (${selectedVariant.variantName})` : 'Base Price'}</span>
              <span className="font-mono text-lg">
                ₹{selectedVariant 
                  ? (selectedVariant.discountedPrice || selectedVariant.actualPrice) 
                  : selectedItem?.price}
              </span>
            </div>

            {/* Variants Selection */}
            {variants && variants.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Choose Variant *</h3>
                {variants.map((variant) => (
                  <Card
                    key={variant.id}
                    className={`p-3 cursor-pointer hover-elevate active-elevate-2 transition-all ${
                      selectedVariant?.id === variant.id
                        ? "border-2 border-primary bg-primary/10"
                        : "border"
                    }`}
                    onClick={() => setSelectedVariant(variant)}
                    data-testid={`card-variant-${variant.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedVariant?.id === variant.id 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedVariant?.id === variant.id && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <span className="font-medium">{variant.variantName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {variant.discountedPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{variant.actualPrice}
                          </span>
                        )}
                        <span className="font-bold text-lg">
                          ₹{variant.discountedPrice || variant.actualPrice}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Add-Ons List */}
            {addOns && addOns.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Available Add-Ons</h3>
                {addOns.map((addOn) => {
                  const isSelected = selectedAddOns.find(a => a.id === addOn.id);
                  return (
                    <div 
                      key={addOn.id} 
                      className="flex items-center justify-between gap-4 p-3 border rounded-lg hover-elevate"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => toggleAddOn(addOn)}
                            className="h-4 w-4"
                            data-testid={`checkbox-addon-${addOn.id}`}
                          />
                          <div>
                            <p className="font-medium">{addOn.addOnName}</p>
                            <p className="text-sm text-muted-foreground font-mono">+₹{addOn.addOnPrice}</p>
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateAddOnQuantity(addOn.id, -1)}
                            data-testid={`button-decrease-addon-${addOn.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-mono">{isSelected.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateAddOnQuantity(addOn.id, 1)}
                            data-testid={`button-increase-addon-${addOn.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No add-ons available for this item</p>
            )}

            {/* Total Price Preview */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{selectedVariant ? `${selectedVariant.variantName}` : 'Base Price'}</span>
                <span className="font-mono">
                  ₹{selectedVariant 
                    ? (selectedVariant.discountedPrice || selectedVariant.actualPrice) 
                    : (selectedItem?.price || "0")}
                </span>
              </div>
              {selectedAddOns.length > 0 && (
                <>
                  {selectedAddOns.map(addOn => (
                    <div key={addOn.id} className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-muted-foreground">{addOn.quantity}x {addOn.name}</span>
                      <span className="font-mono">₹{(parseFloat(addOn.price) * addOn.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-mono text-lg font-semibold">
                  ₹{(() => {
                    const basePrice = selectedVariant 
                      ? parseFloat(selectedVariant.discountedPrice || selectedVariant.actualPrice)
                      : parseFloat(selectedItem?.price as string || "0");
                    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + (parseFloat(a.price) * a.quantity), 0);
                    return (basePrice + addOnsTotal).toFixed(2);
                  })()}
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button 
              className="w-full" 
              size="lg" 
              onClick={addToCartWithAddOns}
              disabled={variants && variants.length > 0 && !selectedVariant}
              data-testid="button-confirm-add-to-cart"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {variants && variants.length > 0 && !selectedVariant 
                ? "Select a variant first" 
                : "Add to Cart"
              }
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Fixed Checkout Button at Bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
                <p className="text-lg font-bold">₹{calculateTotal().toFixed(2)}</p>
              </div>
              <Button 
                size="lg"
                onClick={() => setIsCheckoutOpen(true)}
                className="flex-shrink-0"
                data-testid="button-fixed-checkout"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                View Cart
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
