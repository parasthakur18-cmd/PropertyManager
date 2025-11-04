import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingCart, Plus, Minus, X, Check, UtensilsCrossed, Clock } from "lucide-react";
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

interface CartItem extends MenuItem {
  quantity: number;
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
    
    // Calculate total price including variant and add-ons
    const basePrice = selectedVariant 
      ? parseFloat(selectedVariant.discountedPrice || selectedVariant.actualPrice)
      : parseFloat(selectedItem.price as string);
      
    const addOnsTotal = selectedAddOns.reduce((sum, addOn) => 
      sum + (parseFloat(addOn.price) * addOn.quantity), 0
    );
    const totalPrice = basePrice + addOnsTotal;
    
    // Add to cart with variant and add-ons info in the item name for display
    const variantText = selectedVariant ? ` (${selectedVariant.variantName})` : '';
    const addOnsText = selectedAddOns.length > 0 
      ? ` + ${selectedAddOns.map(a => `${a.quantity}x ${a.name}`).join(', ')}`
      : '';
    
    const cartItem: CartItem = {
      ...selectedItem,
      name: selectedItem.name + variantText + addOnsText,
      price: totalPrice.toString(),
      quantity: 1
    };
    
    const existing = cart.find((i) => i.id === selectedItem.id && i.name === cartItem.name);
    if (existing) {
      setCart(cart.map((i) => (i.id === selectedItem.id && i.name === cartItem.name ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, cartItem]);
    }
    
    toast({
      title: "Added to cart",
      description: `${selectedItem.name} added${selectedAddOns.length > 0 ? ' with add-ons' : ''}`,
    });
    
    setIsAddOnsSheetOpen(false);
    setSelectedItem(null);
    setSelectedAddOns([]);
  };

  const addToCart = (item: MenuItem) => {
    // Check if item has variants or add-ons
    if (item.hasVariants || item.hasAddOns) {
      openAddOnsSheet(item);
    } else {
      // Directly add to cart if no variants or add-ons
      const existing = cart.find((i) => i.id === item.id);
      if (existing) {
        setCart(cart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)));
      } else {
        setCart([...cart, { ...item, quantity: 1 }]);
      }
      toast({
        title: "Added to cart",
        description: `${item.name} added`,
      });
    }
  };

  const updateQuantity = (id: number, change: number) => {
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
      );
      return updated.filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + parseFloat(item.price as string) * item.quantity, 0);
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
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
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

  // Group by category using new category system
  const groupedByCategory = menuCategories
    ?.filter((cat) => selectedCategoryId === null || cat.id === selectedCategoryId)
    .map((category) => ({
      category,
      items: menuItems?.filter((item) => item.categoryId === category.id) || [],
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
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">₹{item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-mono">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                              data-testid={`button-increase-${item.id}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeFromCart(item.id)}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

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
                All ({menuItems?.filter((item) => item.isAvailable).length || 0})
              </Badge>
              {menuCategories.map((category) => {
                const itemCount = menuItems?.filter(
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
                          <h3 className="font-semibold text-sm leading-tight flex-1 min-w-0">{item.name}</h3>
                          <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0 h-5 flex-shrink-0">₹{item.price}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{item.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          {item.preparationTime && (
                            <p className="text-xs text-muted-foreground">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {item.preparationTime}min
                            </p>
                          )}
                          <Button
                            size="sm"
                            onClick={() => addToCart(item)}
                            data-testid={`button-add-to-cart-${item.id}`}
                            className="h-7 px-2 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
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
            {/* Base Item Price */}
            <div className="flex items-center justify-between pb-4 border-b">
              <span className="font-medium">Base Price</span>
              <span className="font-mono text-lg">₹{selectedItem?.price}</span>
            </div>

            {/* Variants Selection */}
            {variants && variants.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Choose Variant *</h3>
                {variants.map((variant) => (
                  <Card
                    key={variant.id}
                    className={`p-3 cursor-pointer ${
                      selectedVariant?.id === variant.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setSelectedVariant(variant)}
                    data-testid={`card-variant-${variant.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{variant.variantName}</span>
                      <div className="flex items-center gap-2">
                        {variant.discountedPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{variant.actualPrice}
                          </span>
                        )}
                        <span className="font-bold">
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
                <span className="text-sm">Base Price</span>
                <span className="font-mono">₹{selectedItem?.price || "0"}</span>
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
                  ₹{selectedItem ? (
                    parseFloat(selectedItem.price as string) + 
                    selectedAddOns.reduce((sum, a) => sum + (parseFloat(a.price) * a.quantity), 0)
                  ).toFixed(2) : "0.00"}
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
