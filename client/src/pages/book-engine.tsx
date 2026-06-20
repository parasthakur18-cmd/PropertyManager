import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Users,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Wifi,
  Coffee,
  Wind,
  Tv,
  AlertCircle,
  Phone,
  Mail,
  User,
  CreditCard,
  Loader2,
  ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookableProperty {
  id: number;
  name: string;
  location: string | null;
  description: string | null;
}

interface AvailableRoom {
  roomType: string;
  roomCategory: string;
  pricePerNight: number;
  maxOccupancy: number;
  totalBeds: number;
  amenities: string[];
  roomIds: number[];
  availableRooms: number;
}

interface BookingSummary {
  token: string;
  bookingId: number;
  status: string;
  holdExpiresAt: string | null;
  propertyId: number;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: number;
  paymentLinkUrl: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(d: string, n: number) {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

function useQueryParam(name: string) {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  return params.get(name);
}

const AMENITY_ICONS: Record<string, JSX.Element> = {
  wifi: <Wifi className="h-3 w-3" />,
  "wi-fi": <Wifi className="h-3 w-3" />,
  ac: <Wind className="h-3 w-3" />,
  "air conditioning": <Wind className="h-3 w-3" />,
  tv: <Tv className="h-3 w-3" />,
  breakfast: <Coffee className="h-3 w-3" />,
};

function AmenityBadge({ name }: { name: string }) {
  const icon = AMENITY_ICONS[name.toLowerCase()];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
      {icon}
      {name}
    </span>
  );
}

// ── Hold countdown timer ──────────────────────────────────────────────────────

function HoldTimer({ expiresAt, onExpired }: { expiresAt: string; onExpired: () => void }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(diff);
      if (diff === 0) onExpired();
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isUrgent = remaining < 3 * 60 * 1000;

  if (remaining === 0) return (
    <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
      <AlertCircle className="h-4 w-4" />
      Hold expired — please search again
    </div>
  );

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
      <Clock className="h-4 w-4" />
      Room held for {mins}:{secs.toString().padStart(2, "0")}
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────

type Step = "property" | "search" | "rooms" | "checkout" | "payment" | "confirmed";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BookEngine() {
  const { toast } = useToast();
  const propertyParam = useQueryParam("property");
  const tokenParam = useQueryParam("token");

  const [step, setStep] = useState<Step>(tokenParam ? "payment" : propertyParam ? "search" : "property");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    propertyParam ? parseInt(propertyParam) : null
  );
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(addDays(today(), 1));
  const [guests, setGuests] = useState(2);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [booking, setBooking] = useState<BookingSummary | null>(null);

  // Guest form
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [holdExpired, setHoldExpired] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<BookableProperty[]>({
    queryKey: ["/api/public/book/properties"],
    enabled: step === "property",
  });

  const { data: available = [], isLoading: availLoading, error: availError, refetch: refetchAvail } = useQuery<AvailableRoom[]>({
    queryKey: ["/api/public/book/availability", selectedPropertyId, checkIn, checkOut, guests],
    queryFn: () => {
      if (!selectedPropertyId) throw new Error("No property selected");
      const params = new URLSearchParams({
        propertyId: String(selectedPropertyId),
        checkIn,
        checkOut,
        guests: String(guests),
      });
      return fetch(`/api/public/book/availability?${params}`).then(r => r.json());
    },
    enabled: step === "rooms" && !!selectedPropertyId,
    retry: false,
  });

  // Poll booking status when on payment/confirmed step
  const { data: polledBooking } = useQuery<BookingSummary>({
    queryKey: ["/api/public/book/bookings", booking?.token ?? tokenParam],
    queryFn: () => {
      const token = booking?.token ?? tokenParam;
      if (!token) throw new Error("No token");
      return fetch(`/api/public/book/bookings/${token}`).then(r => r.json());
    },
    enabled: (step === "payment" || step === "confirmed" || !!tokenParam) && !!(booking?.token ?? tokenParam),
    refetchInterval: step === "payment" ? 5000 : false,
  });

  useEffect(() => {
    if (polledBooking) {
      if (polledBooking.status === "confirmed" && step === "payment") {
        setStep("confirmed");
        setBooking(polledBooking);
      }
      if (tokenParam && !booking) {
        setBooking(polledBooking);
        if (polledBooking.status === "confirmed") setStep("confirmed");
        else setStep("payment");
      }
    }
  }, [polledBooking, step, tokenParam, booking]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createBookingMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/public/book/bookings", data).then(r => r.json()),
    onSuccess: (data: BookingSummary) => {
      setBooking(data);
      setStep("payment");
    },
    onError: (err: any) => {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    },
  });

  const payMutation = useMutation({
    mutationFn: (token: string) =>
      apiRequest("POST", `/api/public/book/bookings/${token}/pay`, {}).then(r => r.json()),
    onSuccess: (data: { paymentLinkUrl: string; advanceAmount: number }) => {
      setBooking(prev => prev ? { ...prev, paymentLinkUrl: data.paymentLinkUrl } : prev);
      window.open(data.paymentLinkUrl, "_blank");
    },
    onError: (err: any) => {
      toast({ title: "Payment initiation failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePropertySelect = useCallback((p: BookableProperty) => {
    setSelectedPropertyId(p.id);
    setStep("search");
  }, []);

  const handleSearch = useCallback(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      toast({ title: "Invalid dates", description: "Check-out must be after check-in", variant: "destructive" });
      return;
    }
    setStep("rooms");
  }, [checkIn, checkOut, toast]);

  const handleRoomSelect = useCallback((room: AvailableRoom) => {
    setSelectedRoom(room);
    setStep("checkout");
  }, []);

  const handleCheckout = useCallback(() => {
    if (!guestName.trim() || !guestPhone.trim()) {
      toast({ title: "Please fill required fields", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    if (!selectedPropertyId || !selectedRoom) return;
    createBookingMutation.mutate({
      propertyId: selectedPropertyId,
      roomType: selectedRoom.roomType,
      checkIn, checkOut,
      numberOfGuests: guests,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestEmail: guestEmail.trim() || undefined,
      specialRequests: specialRequests.trim() || undefined,
    });
  }, [guestName, guestPhone, guestEmail, specialRequests, selectedPropertyId, selectedRoom, checkIn, checkOut, guests, createBookingMutation, toast]);

  const handlePay = useCallback(() => {
    if (!booking?.token) return;
    payMutation.mutate(booking.token);
  }, [booking, payMutation]);

  const handleHoldExpired = useCallback(() => {
    setHoldExpired(true);
  }, []);

  const nights = booking?.nights ?? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  const totalAmount = booking?.totalAmount ?? (selectedRoom ? selectedRoom.pricePerNight * nights : 0);
  const advanceAmount = Math.ceil(totalAmount * 0.30);

  // ── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/hostezee_logo_transparent_1773119386285.png"
              alt="Hostezee"
              className="h-8 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-lg font-semibold text-[#1E3A5F] dark:text-white">
              Direct Booking
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Secure &amp; instant confirmation</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center gap-1 text-xs">
            {(["property", "search", "rooms", "checkout", "payment", "confirmed"] as Step[]).map((s, i) => {
              const labels: Record<Step, string> = {
                property: "Property", search: "Dates", rooms: "Rooms",
                checkout: "Details", payment: "Payment", confirmed: "Confirmed",
              };
              const idx = (["property", "search", "rooms", "checkout", "payment", "confirmed"] as Step[]).indexOf(step);
              const done = i < idx;
              const current = s === step;
              return (
                <span key={s} className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                    current ? "bg-[#1E3A5F] text-white" :
                    done ? "bg-[#2BB6A8] text-white" :
                    "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    {labels[s]}
                  </span>
                  {i < 5 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Step: Property ─────────────────────────────────────────────── */}
        {step === "property" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">Where would you like to stay?</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Select a property to see availability</p>
            </div>

            {propertiesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#2BB6A8]" />
              </div>
            ) : properties.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500">No properties available for direct booking at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map(p => (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:shadow-lg hover:border-[#2BB6A8] transition-all border-2 border-transparent group"
                    onClick={() => handlePropertySelect(p)}
                    data-testid={`property-card-${p.id}`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-[#1E3A5F] dark:text-white group-hover:text-[#2BB6A8] transition-colors">
                            {p.name}
                          </h3>
                          {p.location && (
                            <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                              <MapPin className="h-3 w-3" />
                              {p.location}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#2BB6A8] mt-0.5 transition-colors" />
                      </div>
                      {p.description && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 line-clamp-2">{p.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Search ───────────────────────────────────────────────── */}
        {step === "search" && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">Choose your dates</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Select check-in, check-out, and number of guests</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkin" className="flex items-center gap-1 text-sm font-medium mb-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Check-in
                    </Label>
                    <Input
                      id="checkin"
                      type="date"
                      value={checkIn}
                      min={today()}
                      onChange={e => {
                        setCheckIn(e.target.value);
                        if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1));
                      }}
                      data-testid="input-checkin"
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout" className="flex items-center gap-1 text-sm font-medium mb-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Check-out
                    </Label>
                    <Input
                      id="checkout"
                      type="date"
                      value={checkOut}
                      min={addDays(checkIn, 1)}
                      onChange={e => setCheckOut(e.target.value)}
                      data-testid="input-checkout"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="guests" className="flex items-center gap-1 text-sm font-medium mb-1.5">
                    <Users className="h-3.5 w-3.5" /> Guests
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setGuests(g => Math.max(1, g - 1))}
                      data-testid="button-guests-minus"
                    >−</Button>
                    <span className="w-12 text-center font-semibold text-lg" data-testid="text-guests">{guests}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setGuests(g => Math.min(20, g + 1))}
                      data-testid="button-guests-plus"
                    >+</Button>
                  </div>
                </div>

                {checkIn && checkOut && checkOut > checkIn && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                    <Clock className="h-3.5 w-3.5" />
                    {Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)} night(s) · {formatDate(checkIn)} → {formatDate(checkOut)}
                  </div>
                )}

                <Button
                  className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                  onClick={handleSearch}
                  data-testid="button-search"
                >
                  Search Availability
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-500"
                  onClick={() => setStep("property")}
                  data-testid="button-back-property"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Change property
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Step: Rooms ────────────────────────────────────────────────── */}
        {step === "rooms" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">Available Rooms</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {formatDate(checkIn)} → {formatDate(checkOut)} · {nights} night{nights !== 1 ? "s" : ""} · {guests} guest{guests !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("search")}
                data-testid="button-back-search"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Edit
              </Button>
            </div>

            {availLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#2BB6A8]" />
              </div>
            ) : availError ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">{(availError as any)?.message ?? "Failed to load availability"}</p>
                  <Button className="mt-4" variant="outline" onClick={() => refetchAvail()}>Try again</Button>
                </CardContent>
              </Card>
            ) : available.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                  <p className="font-medium text-slate-700 dark:text-slate-300">No rooms available for these dates</p>
                  <p className="text-slate-500 text-sm mt-1">Please try different dates or contact us directly.</p>
                  <Button className="mt-4" variant="outline" onClick={() => setStep("search")}>Change dates</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {available.map(room => (
                  <Card
                    key={room.roomType}
                    className="hover:shadow-lg hover:border-[#2BB6A8] transition-all border-2 border-transparent"
                    data-testid={`room-card-${room.roomType}`}
                  >
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-[#1E3A5F] dark:text-white capitalize">{room.roomType}</h3>
                          <div className="flex items-center gap-3 text-slate-500 text-sm mt-1">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {room.roomCategory === "dormitory" ? `${room.availableRooms} bed${room.availableRooms !== 1 ? "s" : ""}` : `Up to ${room.maxOccupancy}`}
                            </span>
                            {room.roomCategory === "dormitory" && (
                              <Badge variant="secondary" className="text-xs">Dormitory</Badge>
                            )}
                            {room.availableRooms <= 2 && room.roomCategory !== "dormitory" && (
                              <Badge variant="destructive" className="text-xs">Only {room.availableRooms} left!</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-[#1E3A5F] dark:text-white">
                            {formatCurrency(room.pricePerNight)}
                          </div>
                          <div className="text-xs text-slate-500">per night</div>
                        </div>
                      </div>

                      {room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {room.amenities.slice(0, 5).map(a => (
                            <AmenityBadge key={a} name={a} />
                          ))}
                        </div>
                      )}

                      <Separator className="my-3" />

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                          Total for {nights} night{nights !== 1 ? "s" : ""}:
                          <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">
                            {formatCurrency(room.pricePerNight * nights)}
                          </span>
                        </div>
                        <Button
                          className="bg-[#2BB6A8] hover:bg-[#2BB6A8]/90 text-white"
                          size="sm"
                          onClick={() => handleRoomSelect(room)}
                          data-testid={`button-select-room-${room.roomType}`}
                        >
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Checkout ─────────────────────────────────────────────── */}
        {step === "checkout" && selectedRoom && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">Your details</h1>
              <Button variant="outline" size="sm" onClick={() => setStep("rooms")} data-testid="button-back-rooms">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Booking summary sidebar */}
              <div className="lg:col-span-1">
                <Card className="bg-[#1E3A5F] text-white">
                  <CardContent className="pt-5 space-y-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wider opacity-70">Booking Summary</h3>
                    <div>
                      <div className="font-semibold capitalize">{selectedRoom.roomType}</div>
                      <div className="text-sm opacity-80 mt-0.5">{formatDate(checkIn)} → {formatDate(checkOut)}</div>
                      <div className="text-sm opacity-80">{nights} night{nights !== 1 ? "s" : ""} · {guests} guest{guests !== 1 ? "s" : ""}</div>
                    </div>
                    <Separator className="bg-white/20" />
                    <div className="flex justify-between text-sm">
                      <span className="opacity-80">Room ({nights}n)</span>
                      <span>{formatCurrency(selectedRoom.pricePerNight * nights)}</span>
                    </div>
                    <Separator className="bg-white/20" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-[#F2B705]">{formatCurrency(selectedRoom.pricePerNight * nights)}</span>
                    </div>
                    <div className="text-xs opacity-70">
                      <CreditCard className="h-3 w-3 inline mr-1" />
                      30% advance ({formatCurrency(advanceAmount)}) via Razorpay. Balance at check-in.
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Guest form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label htmlFor="guestName" className="flex items-center gap-1 text-sm font-medium mb-1.5">
                        <User className="h-3.5 w-3.5" /> Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="guestName"
                        placeholder="As on ID proof"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        data-testid="input-guest-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="guestPhone" className="flex items-center gap-1 text-sm font-medium mb-1.5">
                        <Phone className="h-3.5 w-3.5" /> Phone <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={guestPhone}
                        onChange={e => setGuestPhone(e.target.value)}
                        data-testid="input-guest-phone"
                      />
                      <p className="text-xs text-slate-500 mt-1">Payment link will be sent to this number</p>
                    </div>

                    <div>
                      <Label htmlFor="guestEmail" className="flex items-center gap-1 text-sm font-medium mb-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email (optional)
                      </Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        data-testid="input-guest-email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="specialRequests" className="text-sm font-medium mb-1.5 block">
                        Special Requests (optional)
                      </Label>
                      <textarea
                        id="specialRequests"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        rows={3}
                        placeholder="Early check-in, high floor, etc."
                        value={specialRequests}
                        onChange={e => setSpecialRequests(e.target.value)}
                        data-testid="input-special-requests"
                      />
                    </div>

                    <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      By proceeding you agree to pay a 30% advance (
                      {formatCurrency(advanceAmount)}) via Razorpay. The remaining balance
                      ({formatCurrency(totalAmount - advanceAmount)}) is due at the property at check-in.
                    </div>

                    <Button
                      className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                      onClick={handleCheckout}
                      disabled={createBookingMutation.isPending}
                      data-testid="button-confirm-booking"
                    >
                      {createBookingMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reserving…</>
                      ) : (
                        <>Confirm &amp; Pay Advance</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Payment ──────────────────────────────────────────────── */}
        {step === "payment" && booking && (
          <div className="max-w-lg mx-auto text-center">
            <div className="mb-8">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">Room Reserved!</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Complete your advance payment to confirm the booking.
              </p>
            </div>

            <Card className="mb-6 text-left">
              <CardContent className="pt-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Property</span>
                  <span className="font-medium">{polledBooking?.propertyId ?? booking.propertyId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Room</span>
                  <span className="font-medium capitalize">{booking.roomType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Dates</span>
                  <span className="font-medium">{formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Guest</span>
                  <span className="font-medium">{booking.guestName}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total amount</span>
                  <span className="font-semibold">{formatCurrency(booking.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[#2BB6A8]">
                  <span>Advance to pay now (30%)</span>
                  <span>{formatCurrency(Math.ceil(booking.totalAmount * 0.30))}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Balance at check-in</span>
                  <span>{formatCurrency(booking.totalAmount - Math.ceil(booking.totalAmount * 0.30))}</span>
                </div>
              </CardContent>
            </Card>

            {booking.holdExpiresAt && !holdExpired && (
              <div className="mb-4 flex justify-center">
                <HoldTimer expiresAt={booking.holdExpiresAt} onExpired={handleHoldExpired} />
              </div>
            )}

            {holdExpired ? (
              <div className="space-y-3">
                <div className="text-red-600 font-medium flex items-center justify-center gap-2">
                  <AlertCircle className="h-5 w-5" /> Booking hold expired
                </div>
                <Button
                  className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                  onClick={() => { setStep("search"); setBooking(null); setHoldExpired(false); }}
                >
                  Search again
                </Button>
              </div>
            ) : booking.paymentLinkUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Payment link created. Click to pay:</p>
                <Button
                  className="w-full bg-[#2BB6A8] hover:bg-[#2BB6A8]/90 text-white"
                  onClick={() => window.open(booking.paymentLinkUrl!, "_blank")}
                  data-testid="button-open-payment"
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Open Payment Link
                </Button>
                <p className="text-xs text-slate-400">
                  Booking ID: #{booking.bookingId} · This page auto-refreshes after payment.
                </p>
              </div>
            ) : (
              <Button
                className="w-full bg-[#2BB6A8] hover:bg-[#2BB6A8]/90 text-white"
                onClick={handlePay}
                disabled={payMutation.isPending}
                data-testid="button-pay-now"
              >
                {payMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating payment link…</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> Pay {formatCurrency(Math.ceil(booking.totalAmount * 0.30))} Now</>
                )}
              </Button>
            )}

            <p className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
              <span className="text-[#2BB6A8]">🔒</span> Secured by Razorpay
            </p>
          </div>
        )}

        {/* ── Step: Confirmed ────────────────────────────────────────────── */}
        {step === "confirmed" && (booking || polledBooking) && (
          <div className="max-w-lg mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">Booking Confirmed!</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Your reservation is confirmed. See you soon!
              </p>
            </div>

            {(() => {
              const b = (booking ?? polledBooking)!;
              return (
                <Card className="text-left">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5" /> Reservation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Booking ID</span>
                      <span className="font-mono font-medium">#{b.bookingId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Room</span>
                      <span className="font-medium capitalize">{b.roomType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Check-in</span>
                      <span className="font-medium">{formatDate(b.checkIn)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Check-out</span>
                      <span className="font-medium">{formatDate(b.checkOut)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Guest</span>
                      <span className="font-medium">{b.guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone</span>
                      <span className="font-medium">{b.guestPhone}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Amount</span>
                      <span className="text-[#1E3A5F] dark:text-white">{formatCurrency(b.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-green-700 dark:text-green-400 font-medium">
                      <span>Advance Paid</span>
                      <span>✓ {formatCurrency(Math.ceil(b.totalAmount * 0.30))}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Balance at check-in</span>
                      <span>{formatCurrency(b.totalAmount - Math.ceil(b.totalAmount * 0.30))}</span>
                    </div>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-400 text-xs mt-2">
                      Please carry a valid government-issued ID at check-in.
                      The property team will be in touch to share arrival details.
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            <Button
              className="mt-6 w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              onClick={() => { setStep("property"); setBooking(null); setSelectedPropertyId(null); setSelectedRoom(null); }}
              data-testid="button-book-another"
            >
              Book Another Room
            </Button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-400">
        <p>Powered by <span className="font-semibold text-[#2BB6A8]">Hostezee</span> · Secure direct booking</p>
        <p className="mt-1">For assistance, contact the property directly.</p>
      </footer>
    </div>
  );
}
