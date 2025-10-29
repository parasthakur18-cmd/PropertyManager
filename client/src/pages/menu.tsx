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
import { apiRequest } from "@/lib/queryClient";
import { type MenuItem } from "@shared/schema";
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

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/public/menu"],
  });

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("POST", "/api/public/orders", orderData);
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

  const addToCart = (item: MenuItem) => {
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

  // Group by category
  const categorizedItems = menuItems?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

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
    <div className="min-h-screen bg-background">
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

      {/* Menu Items */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        {categorizedItems && Object.entries(categorizedItems).map(([category, items]) => (
          <div key={category} className="mb-12">
            <h2 className="text-2xl font-bold font-serif mb-4 capitalize">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items
                .filter((item) => item.isAvailable)
                .map((item) => (
                  <Card key={item.id} className="hover-elevate" data-testid={`card-menu-item-${item.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between gap-2">
                        <span>{item.name}</span>
                        <Badge variant="secondary" className="font-mono">₹{item.price}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                      )}
                      {item.preparationTime && (
                        <p className="text-xs text-muted-foreground mb-3">
                          <Clock className="inline h-3 w-3 mr-1" />
                          ~{item.preparationTime} min
                        </p>
                      )}
                      <Button
                        className="w-full"
                        onClick={() => addToCart(item)}
                        data-testid={`button-add-to-cart-${item.id}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}

        {(!categorizedItems || Object.keys(categorizedItems).length === 0) && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <UtensilsCrossed className="h-16 w-16 text-muted-foreground" />
              <h3 className="text-xl font-semibold">No menu items available</h3>
              <p className="text-muted-foreground">Please check back later</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
