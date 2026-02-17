import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, ShoppingCart, X, Plus, Minus, ChevronRight } from "lucide-react";
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

export default function CustomerMenu() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "none">("none");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const { toast } = useToast();

  // Selected item configuration
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Map<number, number>>(new Map());
  const [quantity, setQuantity] = useState(1);

  // Public fetcher (no auth headers)
  const publicFetch = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }
    return response.json();
  };

  const { data: categories, isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: ["/api/public/menu-categories"],
    queryFn: () => publicFetch("/api/public/menu-categories"),
  });

  const { data: menuItems, isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/public/menu"],
    queryFn: () => publicFetch("/api/public/menu"),
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

  // Fetch properties for café orders
  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/public/properties"],
    queryFn: () => publicFetch("/api/public/properties"),
  });

  // Order placement mutation
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
    onSuccess: () => {
      toast({
        title: "Order Placed!",
        description: "Your order has been sent to the kitchen.",
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedPropertyId(null);
      setShowCart(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredItems = menuItems
    ?.filter((item) => item.isAvailable)
    .filter((item) =>
      searchQuery
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const showAllFromSearch = searchQuery.length > 0;

  const groupedByCategory = showAllFromSearch
    ? categories
        ?.map((category) => ({
          category,
          items: filteredItems?.filter((item) => item.categoryId === category.id) || [],
        }))
        .filter(group => group.items.length > 0)
    : selectedCategoryId === "none"
      ? []
      : categories
          ?.filter((cat) => cat.id === selectedCategoryId)
          .map((category) => ({
            category,
            items: filteredItems?.filter((item) => item.categoryId === category.id) || [],
          }))
          .filter(group => group.items.length > 0);

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setSelectedVariant(null);
    setSelectedAddOns(new Map());
  };

  const calculateItemPrice = () => {
    let basePrice = 0;

    if (selectedVariant) {
      basePrice = parseFloat(selectedVariant.discountedPrice || selectedVariant.actualPrice);
    } else if (selectedItem) {
      basePrice = parseFloat(selectedItem.discountedPrice || selectedItem.actualPrice || selectedItem.price);
    }

    let addOnsTotal = 0;
    selectedAddOns.forEach((qty, addOnId) => {
      const addOn = allAddOns?.find((a) => a.id === addOnId);
      if (addOn) {
        addOnsTotal += parseFloat(addOn.addOnPrice) * qty;
      }
    });

    return (basePrice + addOnsTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const addOnsArray = Array.from(selectedAddOns.entries())
      .filter(([_, qty]) => qty > 0)
      .map(([addOnId, qty]) => {
        const addOn = allAddOns?.find((a) => a.id === addOnId)!;
        return { ...addOn, quantity: qty };
      });

    const cartItem: CartItem = {
      menuItem: selectedItem,
      quantity,
      selectedVariant: selectedVariant || undefined,
      selectedAddOns: addOnsArray,
      totalPrice: calculateItemPrice(),
    };

    setCart([...cart, cartItem]);
    setSelectedItem(null);
    setQuantity(1);
    setSelectedVariant(null);
    setSelectedAddOns(new Map());
  };

  const toggleAddOn = (addOn: MenuItemAddOn) => {
    const newMap = new Map(selectedAddOns);
    const current = newMap.get(addOn.id) || 0;
    if (current > 0) {
      newMap.delete(addOn.id);
    } else {
      newMap.set(addOn.id, 1);
    }
    setSelectedAddOns(newMap);
  };

  const updateAddOnQuantity = (addOnId: number, delta: number) => {
    const newMap = new Map(selectedAddOns);
    const current = newMap.get(addOnId) || 0;
    const newQty = Math.max(0, current + delta);
    if (newQty === 0) {
      newMap.delete(addOnId);
    } else {
      newMap.set(addOnId, newQty);
    }
    setSelectedAddOns(newMap);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const handlePlaceOrder = () => {
    // Validate inputs
    if (!customerName || !customerPhone) {
      toast({
        title: "Required Fields",
        description: "Please enter your name and phone number",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPropertyId) {
      toast({
        title: "Select Property",
        description: "Please select which property you're ordering from",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      orderType: "restaurant",
      propertyId: selectedPropertyId,
      customerName,
      customerPhone,
      items: cart.map(item => ({
        id: item.menuItem.id,
        name: item.menuItem.name,
        price: item.totalPrice / item.quantity,
        quantity: item.quantity,
      })),
      totalAmount: cartTotal.toFixed(2),
      specialInstructions: null,
    };

    orderMutation.mutate(orderData);
  };

  if (categoriesLoading || itemsLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-primary/95 backdrop-blur-sm text-primary-foreground shadow-lg">
        <div className="p-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold font-serif" data-testid="heading-customer-menu">
              Our Menu
            </h1>
            <Button
              size="icon"
              variant="secondary"
              className="relative"
              onClick={() => setShowCart(true)}
              data-testid="button-cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                  {cart.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items like Dal Makhni, Paneer and so on..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Tabs - Only tabs scroll */}
      {categories && categories.length > 0 && (
        <div className="border-b bg-background sticky top-[145px] z-10">
          <div className="overflow-x-auto overflow-y-hidden px-4 py-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            <div className="flex gap-2 w-max">
              {categories.map((category) => {
                const itemCount = filteredItems?.filter(
                  (item) => item.categoryId === category.id
                ).length || 0;
                if (itemCount === 0) return null;
                return (
                  <Badge
                    key={category.id}
                    variant={selectedCategoryId === category.id ? "default" : "outline"}
                    className="cursor-pointer hover-elevate whitespace-nowrap flex-shrink-0"
                    onClick={() => setSelectedCategoryId(
                      selectedCategoryId === category.id ? "none" : category.id
                    )}
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

      {selectedCategoryId === "none" && !searchQuery && (
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground text-lg">
            Tap a category above to browse the menu
          </p>
        </div>
      )}

      {/* Menu Items by Category */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24 space-y-6">
        {groupedByCategory?.map(({ category, items }) => {
          if (items.length === 0) return null;

          return (
            <div key={category.id}>
              {/* Category Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold" data-testid={`heading-category-${category.id}`}>
                    {category.name}
                  </h2>
                  {category.startTime && category.endTime && (
                    <p className="text-xs text-muted-foreground">
                      {category.startTime} - {category.endTime}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 gap-3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => handleSelectItem(item)}
                    data-testid={`card-item-${item.id}`}
                  >
                    <div className="flex gap-2 p-2.5">
                      {/* Item Image */}
                      <div className="flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <span className="text-2xl">
                              {item.foodType === "non-veg" ? "🔴" : "🟢"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1 mb-0.5">
                          <span className="text-xs flex-shrink-0">
                            {item.foodType === "non-veg" ? "🔴" : "🟢"}
                          </span>
                          <h3 className="font-semibold text-sm leading-tight flex-1 min-w-0">
                            {item.name}
                          </h3>
                          <Switch checked={item.isAvailable} disabled className="scale-75 flex-shrink-0" />
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          {item.hasVariants ? (
                            <span className="text-xs font-semibold text-primary">
                              See Prices
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {item.discountedPrice && (
                                <span className="text-xs text-muted-foreground line-through">
                                  ₹{item.actualPrice}
                                </span>
                              )}
                              <span className="text-sm font-bold">
                                ₹{item.discountedPrice || item.actualPrice || item.price}
                              </span>
                            </div>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Selection Sheet - Auto-shows add-ons */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selectedItem.name}</SheetTitle>
                {selectedItem.description && (
                  <p className="text-sm text-muted-foreground text-left">
                    {selectedItem.description}
                  </p>
                )}
              </SheetHeader>

              <div className="space-y-6 py-4">
                {/* Variants Selection */}
                {allVariants && allVariants.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Choose Variant *</Label>
                    <div className="space-y-2">
                      {allVariants.map((variant) => (
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
                  </div>
                )}

                {/* Add-Ons Section - Automatically visible */}
                {allAddOns && allAddOns.length > 0 && (
                  <div className="space-y-3 border border-green-500 rounded-lg p-4 bg-green-50/50">
                    <div className="text-sm text-green-700 font-medium mb-2">
                      Add-Ons Available 🎉
                      <br />
                      <span className="font-normal text-xs">
                        Customize your order with these delicious extras!
                      </span>
                    </div>
                    <div className="space-y-2">
                      {allAddOns.map((addOn) => {
                        const qty = selectedAddOns.get(addOn.id) || 0;
                        const isSelected = qty > 0;

                        return (
                          <Card
                            key={addOn.id}
                            className={`p-3 ${
                              isSelected ? "border-green-500 bg-green-50" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{addOn.addOnName}</span>
                                  <span className="text-sm font-semibold text-green-600">
                                    +₹{addOn.addOnPrice}
                                  </span>
                                </div>
                              </div>

                              {isSelected ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={() => updateAddOnQuantity(addOn.id, -1)}
                                    data-testid={`button-addon-decrease-${addOn.id}`}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="font-bold w-6 text-center">{qty}</span>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={() => updateAddOnQuantity(addOn.id, 1)}
                                    data-testid={`button-addon-increase-${addOn.id}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-500 text-green-600"
                                  onClick={() => toggleAddOn(addOn)}
                                  data-testid={`button-addon-add-${addOn.id}`}
                                >
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

                {/* Quantity Selector */}
                <div className="flex items-center justify-center gap-4 py-4">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    data-testid="button-decrease-quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQuantity(quantity + 1)}
                    data-testid="button-increase-quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <SheetFooter className="border-t pt-4">
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>₹{calculateItemPrice().toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={allVariants && allVariants.length > 0 && !selectedVariant}
                    data-testid="button-add-to-cart"
                  >
                    Add to Cart
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Cart Sheet */}
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
                    {item.selectedVariant && (
                      <p className="text-sm text-muted-foreground">
                        {item.selectedVariant.variantName}
                      </p>
                    )}
                    {item.selectedAddOns.length > 0 && (
                      <p className="text-xs text-green-600">
                        + {item.selectedAddOns.map((a) => `${a.addOnName} (${a.quantity})`).join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCart(cart.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
                {/* Property Selector */}
                <div className="space-y-2">
                  <Label htmlFor="property">Select Property *</Label>
                  <Select value={selectedPropertyId?.toString() || ""} onValueChange={(val) => setSelectedPropertyId(parseInt(val))}>
                    <SelectTrigger id="property" data-testid="select-property">
                      <SelectValue placeholder="Choose your property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties?.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Info */}
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    data-testid="input-customer-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    data-testid="input-customer-phone"
                  />
                </div>

                <div className="flex justify-between text-xl font-bold pt-2">
                  <span>Total:</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handlePlaceOrder}
                  disabled={orderMutation.isPending}
                  data-testid="button-place-order"
                >
                  {orderMutation.isPending ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Fixed Checkout Button at Bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
                <p className="text-lg font-bold">₹{cartTotal.toFixed(2)}</p>
              </div>
              <Button 
                size="lg"
                onClick={() => setShowCart(true)}
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
    </div>
  );
}
