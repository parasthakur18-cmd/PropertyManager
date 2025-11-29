import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Minus, X, Check, Phone, Store, Hotel, ArrowRight, ArrowLeft, Search, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type MenuItem, type Room } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

interface CartItem extends MenuItem {
  quantity: number;
}

type OrderType = "room" | "restaurant" | null;
type RestaurantCustomerType = "walk-in" | "in-house";

export default function QuickOrder() {
  const [step, setStep] = useState(1);
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [restaurantCustomerType, setRestaurantCustomerType] = useState<RestaurantCustomerType>("walk-in");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast} = useToast();

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { 
    data: roomsWithGuests, 
    isLoading: roomsLoading,
    isError: roomsError 
  } = useQuery<any[]>({
    queryKey: ["/api/rooms/checked-in-guests"],
  });

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("/api/orders", "POST", orderData);
    },
    onSuccess: () => {
      toast({
        title: "Order Created!",
        description: "Order has been sent to the kitchen.",
      });
      // Reset everything
      setStep(1);
      setOrderType(null);
      setCart([]);
      setSelectedRoom("");
      setCustomerName("");
      setCustomerPhone("");
      setSpecialInstructions("");
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addToCart = (item: MenuItem) => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      setCart(cart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
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

  // Helper to get item quantity in cart
  const getItemQuantityInCart = (itemId: number) => {
    const item = cart.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  };

  // Filter menu items by search term
  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    if (!searchTerm.trim()) return menuItems;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower))
    );
  }, [menuItems, searchTerm]);

  const handleNextStep = () => {
    if (step === 1 && !orderType) {
      toast({
        title: "Order Type Required",
        description: "Please select Room Service or Restaurant",
        variant: "destructive",
      });
      return;
    }

    if (step === 2) {
      if (orderType === "room") {
        if (!roomsWithGuests || roomsWithGuests.length === 0) {
          toast({
            title: "No Checked-In Guests",
            description: "There are no rooms with checked-in guests. Please check in a guest first.",
            variant: "destructive",
          });
          return;
        }
        if (!selectedRoom) {
          toast({
            title: "Room Required",
            description: "Please select a room number",
            variant: "destructive",
          });
          return;
        }
      }
      if (orderType === "restaurant") {
        if (restaurantCustomerType === "walk-in" && (!customerName || !customerPhone)) {
          toast({
            title: "Customer Info Required",
            description: "Please enter customer name and phone",
            variant: "destructive",
          });
          return;
        }
        if (restaurantCustomerType === "in-house" && !selectedRoom) {
          toast({
            title: "Room Required",
            description: "Please select the in-house guest's room",
            variant: "destructive",
          });
          return;
        }
      }
    }

    setStep(step + 1);
  };

  const handleSubmitOrder = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to the order",
        variant: "destructive",
      });
      return;
    }

    const orderData: any = {
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount: calculateTotal().toFixed(2),
      specialInstructions: specialInstructions || null,
      orderSource: "staff",
      orderType: orderType,
    };

    if (orderType === "room") {
      orderData.roomId = parseInt(selectedRoom);
      // Also include guest name, phone, bookingId, and propertyId for room orders
      const roomGuest = roomsWithGuests?.find(r => r.roomId === parseInt(selectedRoom));
      if (roomGuest) {
        orderData.propertyId = roomGuest.propertyId; // Get property from room
        orderData.bookingId = roomGuest.bookingId; // Link order to booking for checkout
        orderData.customerName = roomGuest.guestName;
        orderData.customerPhone = roomGuest.guestPhone || "";
      }
    } else if (orderType === "restaurant") {
      if (restaurantCustomerType === "in-house") {
        // In-house guest at café - link to their room bill
        orderData.roomId = parseInt(selectedRoom);
        const roomGuest = roomsWithGuests?.find(r => r.roomId === parseInt(selectedRoom));
        if (roomGuest) {
          orderData.propertyId = roomGuest.propertyId; // Get property from room
          orderData.bookingId = roomGuest.bookingId; // Link to booking for auto-merge to bill
          orderData.customerName = roomGuest.guestName;
          orderData.customerPhone = roomGuest.guestPhone || "";
        }
      } else {
        // Walk-in customer - no property association
        orderData.propertyId = null;
        orderData.customerName = customerName;
        orderData.customerPhone = customerPhone;
      }
    }

    orderMutation.mutate(orderData);
  };

  // Group by category (using filtered items)
  const categorizedItems = filteredMenuItems?.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (menuLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
          <Phone className="h-8 w-8 text-primary" />
          Quick Order Entry
        </h1>
        <p className="text-muted-foreground mt-1">Take orders from guests - Step {step} of 3</p>
      </div>

      {/* Step 1: Order Type Selection */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Order Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setOrderType("room")}
                  className={`p-6 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${
                    orderType === "room" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid="button-order-type-room"
                >
                  <Hotel className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Room Service</h3>
                  <p className="text-sm text-muted-foreground">Deliver to guest room</p>
                </button>

                <button
                  onClick={() => setOrderType("restaurant")}
                  className={`p-6 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${
                    orderType === "restaurant" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid="button-order-type-restaurant"
                >
                  <Store className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Restaurant/Dine-in</h3>
                  <p className="text-sm text-muted-foreground">Order for restaurant table</p>
                </button>
              </div>

              <Button
                className="w-full mt-6"
                size="lg"
                onClick={handleNextStep}
                disabled={!orderType}
                data-testid="button-next-step-1"
              >
                Next: Customer Details
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Customer Details */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                Step 2: {orderType === "room" ? "Select Room" : "Customer Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderType === "room" ? (
                <div>
                  <Label htmlFor="room-select">Room Number *</Label>
                  {roomsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : roomsError ? (
                    <div className="text-sm text-destructive p-3 border border-destructive rounded-md">
                      Error loading rooms. Please try again.
                    </div>
                  ) : roomsWithGuests && roomsWithGuests.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                      No rooms with checked-in guests available. Please check in a guest first.
                    </div>
                  ) : (
                    <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                      <SelectTrigger id="room-select" data-testid="select-quick-order-room">
                        <SelectValue placeholder="Select room with checked-in guest" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomsWithGuests?.map((room) => (
                          <SelectItem key={room.roomId} value={room.roomId.toString()}>
                            Room {room.roomNumber} - {room.guestName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <>
                  {/* Restaurant Customer Type Toggle */}
                  <div className="space-y-3">
                    <Label>Customer Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRestaurantCustomerType("walk-in");
                          setSelectedRoom("");
                        }}
                        className={`p-4 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${
                          restaurantCustomerType === "walk-in" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        data-testid="button-customer-type-walkin"
                      >
                        <Store className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="font-medium text-sm">Walk-in Customer</p>
                        <p className="text-xs text-muted-foreground mt-1">Enter name & phone</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRestaurantCustomerType("in-house");
                          setCustomerName("");
                          setCustomerPhone("");
                        }}
                        className={`p-4 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${
                          restaurantCustomerType === "in-house" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        data-testid="button-customer-type-inhouse"
                      >
                        <Hotel className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="font-medium text-sm">In-House Guest</p>
                        <p className="text-xs text-muted-foreground mt-1">Link to room bill</p>
                      </button>
                    </div>
                  </div>

                  {/* Show appropriate fields based on customer type */}
                  {restaurantCustomerType === "walk-in" ? (
                    <>
                      <div>
                        <Label htmlFor="customer-name">Customer Name *</Label>
                        <Input
                          id="customer-name"
                          placeholder="Enter customer name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          data-testid="input-customer-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customer-phone">Phone Number *</Label>
                        <Input
                          id="customer-phone"
                          placeholder="Enter phone number"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          data-testid="input-customer-phone"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label htmlFor="inhouse-room-select">Guest's Room Number *</Label>
                      {roomsLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : roomsError ? (
                        <div className="text-sm text-destructive p-3 border border-destructive rounded-md">
                          Error loading rooms. Please try again.
                        </div>
                      ) : roomsWithGuests && roomsWithGuests.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                          No checked-in guests available. Please check in a guest first.
                        </div>
                      ) : (
                        <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                          <SelectTrigger id="inhouse-room-select" data-testid="select-inhouse-guest-room">
                            <SelectValue placeholder="Select guest's room" />
                          </SelectTrigger>
                          <SelectContent>
                            {roomsWithGuests?.map((room) => (
                              <SelectItem key={room.roomId} value={room.roomId.toString()}>
                                Room {room.roomNumber} - {room.guestName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        This order will be added to the guest's room bill
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  data-testid="button-back-step-2"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleNextStep}
                  disabled={orderType === "room" && (!roomsWithGuests || roomsWithGuests.length === 0 || roomsLoading)}
                  data-testid="button-next-step-2"
                >
                  Next: Select Items
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Menu Selection */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Select Menu Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                    aria-label="Search menu items"
                    data-testid="input-quick-order-search"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                      data-testid="button-quick-order-clear-search"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {categorizedItems && Object.keys(categorizedItems).length > 0 ? (
              Object.entries(categorizedItems).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="capitalize text-lg">{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items
                        .filter((item) => item.isAvailable)
                        .map((item) => {
                          const quantity = getItemQuantityInCart(item.id);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                              data-testid={`quick-order-item-${item.id}`}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">₹{item.price}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    if (quantity > 0) {
                                      updateQuantity(item.id, -1);
                                    }
                                  }}
                                  disabled={quantity === 0}
                                  data-testid={`button-quick-decrease-${item.id}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono text-sm">{quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    if (quantity > 0) {
                                      updateQuantity(item.id, 1);
                                    } else {
                                      addToCart(item);
                                    }
                                  }}
                                  data-testid={`button-quick-increase-${item.id}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : searchTerm && menuItems ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No menu items found matching "{searchTerm}"</p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                    className="mt-4"
                    data-testid="button-clear-search-empty"
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Order Summary - Right Side */}
          <div className="space-y-4">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Details */}
                <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">{orderType}</span>
                  </div>
                  {orderType === "room" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Room:</span>
                        <span className="font-medium">
                          {roomsWithGuests?.find(r => r.roomId === parseInt(selectedRoom))?.roomNumber || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guest:</span>
                        <span className="font-medium">
                          {roomsWithGuests?.find(r => r.roomId === parseInt(selectedRoom))?.guestName || "-"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {restaurantCustomerType === "in-house" ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer:</span>
                            <span className="font-medium">In-House Guest</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Room:</span>
                            <span className="font-medium">
                              {roomsWithGuests?.find(r => r.roomId === parseInt(selectedRoom))?.roomNumber || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Guest:</span>
                            <span className="font-medium">
                              {roomsWithGuests?.find(r => r.roomId === parseInt(selectedRoom))?.guestName || "-"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer:</span>
                            <span className="font-medium">Walk-in</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-medium">{customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-medium font-mono">{customerPhone}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Cart Items */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Items ({cart.length})</p>
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No items added</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-muted-foreground">₹{item.price}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, -1)}
                              data-testid={`button-quick-decrease-${item.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-mono">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, 1)}
                              data-testid={`button-quick-increase-${item.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => removeFromCart(item.id)}
                              data-testid={`button-quick-remove-${item.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Special Instructions */}
                <div>
                  <Label htmlFor="special-instructions">Special Instructions</Label>
                  <Textarea
                    id="special-instructions"
                    placeholder="Any special requests..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={3}
                    data-testid="textarea-quick-order-instructions"
                  />
                </div>

                {/* Total & Submit */}
                {cart.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="font-mono">₹{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                    data-testid="button-back-step-3"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmitOrder}
                    disabled={orderMutation.isPending || cart.length === 0}
                    data-testid="button-submit-quick-order"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    {orderMutation.isPending ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
