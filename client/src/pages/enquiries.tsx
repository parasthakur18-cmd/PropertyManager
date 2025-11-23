import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  MessageSquarePlus,
  Phone,
  Mail,
  Calendar,
  Hotel,
  Users,
  IndianRupee,
  Send,
  CreditCard,
  Check,
  MessageSquare,
  Edit,
  X,
  Search,
  FileText,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Enquiry, MessageTemplate, Room, Property } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const editEnquirySchema = z.object({
  guestName: z.string().min(2, "Name must be at least 2 characters"),
  guestPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  guestEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  roomId: z.coerce.number().int().min(1, "Please select a room").optional(),
  numberOfGuests: z.coerce.number().int().min(1, "At least 1 guest required"),
  mealPlan: z.enum(["EP", "CP", "MAP", "AP"]),
  priceQuoted: z.coerce.number().min(0, "Price must be positive").optional(),
  advanceAmount: z.coerce.number().min(0, "Advance must be positive").nullable().optional(),
  specialRequests: z.string().optional(),
});

type EditEnquiryFormData = z.infer<typeof editEnquirySchema>;

interface EditEnquiryFormProps {
  enquiry: Enquiry;
  rooms: Room[];
  onSuccess: () => void;
  onCancel: () => void;
}

function EditEnquiryForm({ enquiry, rooms, onSuccess, onCancel }: EditEnquiryFormProps) {
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(
    enquiry.roomId ? rooms.find(r => r.id === enquiry.roomId) || null : null
  );

  const form = useForm<EditEnquiryFormData>({
    resolver: zodResolver(editEnquirySchema),
    defaultValues: {
      guestName: enquiry.guestName,
      guestPhone: enquiry.guestPhone,
      guestEmail: enquiry.guestEmail || "",
      roomId: enquiry.roomId || undefined,
      numberOfGuests: enquiry.numberOfGuests,
      mealPlan: enquiry.mealPlan || "EP",
      priceQuoted: enquiry.priceQuoted ?? undefined,
      advanceAmount: enquiry.advanceAmount ?? undefined,
      specialRequests: enquiry.specialRequests || "",
    },
  });

  // Auto-populate price quoted when room is selected
  useEffect(() => {
    if (selectedRoom?.pricePerNight) {
      const roomPrice = parseFloat(selectedRoom.pricePerNight.toString());
      form.setValue("priceQuoted", roomPrice);
      console.log("✅ Auto-filled priceQuoted:", roomPrice);
    }
  }, [selectedRoom?.id]);

  const updateEnquiryMutation = useMutation({
    mutationFn: async (data: EditEnquiryFormData) => {
      return await apiRequest(`/api/enquiries/${enquiry.id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Enquiry Updated",
        description: "The enquiry has been updated successfully.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update enquiry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditEnquiryFormData) => {
    const updateData = {
      ...data,
      bedsBooked: selectedRoom?.roomCategory === "dormitory" ? data.numberOfGuests : null,
    };
    updateEnquiryMutation.mutate(updateData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="guestName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} data-testid="input-edit-guest-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+91 9876543210" {...field} data-testid="input-edit-guest-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="guest@example.com" {...field} data-testid="input-edit-guest-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Room</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    const room = rooms.find(r => r.id === parseInt(value));
                    setSelectedRoom(room || null);
                  }}
                  value={field.value?.toString()}
                  disabled={enquiry.isGroupEnquiry}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-room">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        {room.roomNumber} - {room.roomType || room.roomCategory}
                        {room.roomCategory === "dormitory" && room.totalBeds 
                          ? ` (${room.totalBeds} beds - ₹${room.pricePerNight}/bed/night)`
                          : ` (₹${room.pricePerNight}/night)`
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {enquiry.isGroupEnquiry && (
                  <p className="text-xs text-muted-foreground">
                    Cannot change room for group enquiries
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numberOfGuests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {selectedRoom?.roomCategory === "dormitory" ? "Number of Beds" : "Number of Guests"}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max={selectedRoom?.roomCategory === "dormitory" && selectedRoom.totalBeds ? selectedRoom.totalBeds : undefined}
                    {...field} 
                    data-testid="input-edit-number-of-guests" 
                  />
                </FormControl>
                {selectedRoom?.roomCategory === "dormitory" && selectedRoom.totalBeds && (
                  <p className="text-xs text-muted-foreground">
                    Maximum {selectedRoom.totalBeds} beds available in this dormitory
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mealPlan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meal Plan</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-meal-plan">
                      <SelectValue placeholder="Select meal plan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EP">EP (Room Only)</SelectItem>
                    <SelectItem value="CP">CP (With Breakfast)</SelectItem>
                    <SelectItem value="MAP">MAP (Breakfast + Dinner)</SelectItem>
                    <SelectItem value="AP">AP (All Meals)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priceQuoted"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Quoted (₹)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} data-testid="input-edit-price-quoted" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="advanceAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Advance Amount (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-edit-advance-amount"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specialRequests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Requests</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any special requirements..."
                  {...field}
                  data-testid="input-edit-special-requests"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-edit-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={updateEnquiryMutation.isPending} data-testid="button-edit-save">
            {updateEnquiryMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Enquiries() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [messageChannel, setMessageChannel] = useState<"sms" | "whatsapp">("sms");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: enquiries, isLoading } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  const { data: templates } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/message-templates"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const confirmEnquiryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/enquiries/${id}/confirm`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({
        title: "Enquiry Confirmed",
        description: "The enquiry has been confirmed and converted to a booking successfully.",
      });
    },
    onError: (error: any) => {
      const isRoomBooked = error.message?.includes("already book") || error.message?.includes("not available");
      
      toast({
        title: isRoomBooked ? "Room Already Booked" : "Confirmation Failed",
        description: isRoomBooked 
          ? "This room is already booked for the selected dates. Please check the Room Calendar for available rooms or edit the enquiry to select a different room."
          : (error.message || "Failed to confirm enquiry. Please try again."),
        variant: "destructive",
      });
    },
  });

  const cancelEnquiryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/enquiries/${id}/status`, "PATCH", { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Enquiry Cancelled",
        description: "The enquiry has been cancelled successfully.",
      });
      setIsCancelDialogOpen(false);
      setSelectedEnquiry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel enquiry",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/communications", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Message Sent!",
        description: "Your message has been sent successfully.",
      });
      setIsMessageDialogOpen(false);
      setSelectedEnquiry(null);
      setSelectedTemplate("");
      setCustomMessage("");
      setMessageChannel("sms");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsMessageDialogOpen(true);
    setCustomMessage("");
    setSelectedTemplate("");
    setMessageChannel("sms"); // Default to SMS
  };

  const handleSubmitMessage = () => {
    if (!selectedEnquiry) return;

    const template = templates?.find(t => t.id.toString() === selectedTemplate);
    const messageContent = selectedTemplate && template
      ? template.content
          .replace("{guestName}", selectedEnquiry.guestName)
          .replace("{advanceAmount}", selectedEnquiry.advanceAmount || "0")
          .replace("{checkInDate}", format(new Date(selectedEnquiry.checkInDate), "PPP"))
          .replace("{checkOutDate}", format(new Date(selectedEnquiry.checkOutDate), "PPP"))
          .replace("{propertyName}", "Your Property") // Could fetch actual property name
          .replace("{propertyLocation}", "Property Location")
          .replace("{propertyContact}", "Property Contact")
          .replace("{roomType}", `Room #${selectedEnquiry.roomId}`)
      : customMessage;

    if (!messageContent.trim()) {
      toast({
        title: "Message Required",
        description: "Please select a template or enter a custom message",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      enquiryId: selectedEnquiry.id,
      recipientPhone: selectedEnquiry.guestPhone,
      recipientName: selectedEnquiry.guestName,
      messageType: messageChannel,
      templateId: selectedTemplate ? parseInt(selectedTemplate) : null,
      messageContent,
      status: "sent",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      new: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      messaged: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      payment_pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      paid: "bg-green-500/10 text-green-700 dark:text-green-400",
      confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
    };

    return (
      <Badge
        className={statusColors[status] || "bg-gray-500/10 text-gray-700 dark:text-gray-400"}
        data-testid={`badge-status-${status}`}
      >
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const colors: Record<string, string> = {
      pending: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      received: "bg-green-500/10 text-green-700 dark:text-green-400",
      refunded: "bg-red-500/10 text-red-700 dark:text-red-400",
    };

    return (
      <Badge
        className={colors[paymentStatus] || "bg-gray-500/10 text-gray-700 dark:text-gray-400"}
        data-testid={`badge-payment-${paymentStatus}`}
      >
        {paymentStatus.toUpperCase()}
      </Badge>
    );
  };

  // Filter enquiries based on search query
  const filteredEnquiries = enquiries?.filter((enquiry) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      enquiry.guestName.toLowerCase().includes(query) ||
      enquiry.guestPhone.toLowerCase().includes(query) ||
      (enquiry.guestEmail && enquiry.guestEmail.toLowerCase().includes(query))
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Enquiries</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track customer booking enquiries
          </p>
        </div>
        <Button onClick={() => navigate("/new-enquiry")} data-testid="button-new-enquiry">
          <MessageSquarePlus className="h-5 w-5 mr-2" />
          New Enquiry
        </Button>
      </div>

      {!enquiries || enquiries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquarePlus className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Enquiries Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start creating enquiries to track customer booking requests
            </p>
            <Link href="/new-enquiry">
              <Button>
                <MessageSquarePlus className="h-5 w-5 mr-2" />
                Create First Enquiry
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enquiries</CardTitle>
                <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enquiries.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New</CardTitle>
                <MessageSquarePlus className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enquiries.filter((e) => e.status === "new").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Pending</CardTitle>
                <CreditCard className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enquiries.filter((e) => e.paymentStatus === "pending" && e.advanceAmount).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <Hotel className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enquiries.filter((e) => e.status === "confirmed").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enquiries Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Enquiries</CardTitle>
              <CardDescription>
                View and manage all customer enquiries with payment tracking and messaging
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by guest name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-enquiries"
                  />
                </div>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Found {filteredEnquiries.length} result{filteredEnquiries.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Price/Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnquiries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "No enquiries found matching your search" : "No enquiries yet"}
                        </TableCell>
                      </TableRow>
                    ) : 
                      filteredEnquiries.map((enquiry) => (
                      <TableRow key={enquiry.id} className="h-10" data-testid={`row-enquiry-${enquiry.id}`}>
                        <TableCell className="py-1 px-2">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{enquiry.guestName}</p>
                                {enquiry.specialRequests && (
                                  <div className="group relative">
                                    <FileText className="h-3 w-3 text-amber-500 cursor-help" data-testid={`icon-special-requests-${enquiry.id}`} />
                                    <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-64 p-3 bg-popover text-popover-foreground rounded-md border shadow-md">
                                      <p className="text-xs font-semibold mb-1">Special Requests:</p>
                                      <p className="text-xs">{enquiry.specialRequests}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {enquiry.bedsBooked 
                                  ? `${enquiry.bedsBooked} bed${enquiry.bedsBooked > 1 ? "s" : ""}`
                                  : `${enquiry.numberOfGuests} guest${enquiry.numberOfGuests > 1 ? "s" : ""}`
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a 
                                href={`tel:${enquiry.guestPhone}`} 
                                className="hover:underline text-blue-600 dark:text-blue-400 text-xs"
                                data-testid={`link-call-${enquiry.id}`}
                              >
                                {enquiry.guestPhone}
                              </a>
                              <a
                                href={`https://wa.me/${enquiry.guestPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 dark:text-green-400"
                                title="WhatsApp"
                                data-testid={`link-whatsapp-${enquiry.id}`}
                              >
                                <MessageCircle className="h-3 w-3" />
                              </a>
                            </div>
                            {enquiry.guestEmail && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <a 
                                  href={`mailto:${enquiry.guestEmail}`}
                                  className="hover:underline text-blue-600 dark:text-blue-400"
                                  data-testid={`link-email-${enquiry.id}`}
                                >
                                  {enquiry.guestEmail}
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <div className="text-xs">
                              <p>{format(new Date(enquiry.checkInDate), "MMM d")}</p>
                              <p className="text-muted-foreground">
                                to {format(new Date(enquiry.checkOutDate), "MMM d")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="flex items-center gap-1">
                            <Hotel className="h-3 w-3 text-muted-foreground" />
                            {enquiry.isGroupEnquiry && enquiry.roomIds && enquiry.roomIds.length > 0 ? (
                              <span className="text-xs">
                                {enquiry.roomIds.length} Rooms (Group)
                              </span>
                            ) : enquiry.roomId ? (
                              <span className="text-xs">
                                {rooms?.find(r => r.id === enquiry.roomId)?.roomNumber || `Room #${enquiry.roomId}`}
                                {rooms?.find(r => r.id === enquiry.roomId)?.roomType && (
                                  <span className="text-muted-foreground text-xs ml-1">
                                    ({rooms.find(r => r.id === enquiry.roomId)?.roomType}
                                    {rooms.find(r => r.id === enquiry.roomId)?.roomCategory === "dormitory" && enquiry.bedsBooked 
                                      ? ` - ${enquiry.bedsBooked} bed${enquiry.bedsBooked > 1 ? 's' : ''}`
                                      : ''
                                    })
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No room</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3 text-muted-foreground" />
                              <div className="text-xs">
                                <p className="font-medium">₹{enquiry.priceQuoted || "-"}</p>
                                {enquiry.advanceAmount && (
                                  <p className="text-muted-foreground text-xs">
                                    Adv: ₹{enquiry.advanceAmount}
                                  </p>
                                )}
                              </div>
                            </div>
                            {enquiry.advanceAmount && (
                              <div>
                                {getPaymentStatusBadge(enquiry.paymentStatus || "pending")}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">{getStatusBadge(enquiry.status)}</TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="flex flex-col gap-1">
                            {enquiry.status !== "confirmed" && enquiry.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="default"
                                className="text-xs py-1 h-auto"
                                onClick={() => confirmEnquiryMutation.mutate(enquiry.id)}
                                disabled={confirmEnquiryMutation.isPending}
                                data-testid={`button-confirm-enquiry-${enquiry.id}`}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Confirm
                              </Button>
                            )}
                            {enquiry.status !== "confirmed" && enquiry.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs py-1 h-auto"
                                onClick={() => {
                                  setSelectedEnquiry(enquiry);
                                  setIsEditDialogOpen(true);
                                }}
                                data-testid={`button-edit-enquiry-${enquiry.id}`}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            {enquiry.status !== "confirmed" && enquiry.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs py-1 h-auto"
                                onClick={() => {
                                  setSelectedEnquiry(enquiry);
                                  setIsCancelDialogOpen(true);
                                }}
                                data-testid={`button-cancel-enquiry-${enquiry.id}`}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs py-1 h-auto"
                              onClick={() => handleSendMessage(enquiry)}
                              data-testid={`button-send-message-${enquiry.id}`}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Msg
                              </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Integration Notice */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">SMS/WhatsApp Integration Active</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    SMS messaging is enabled via authkey.io. To enable WhatsApp, add AUTHKEY_WHATSAPP_NUMBER 
                    to Secrets and create pre-approved templates in authkey.io dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Message to {selectedEnquiry?.guestName}</DialogTitle>
            <DialogDescription>
              Choose a template or write a custom message. Message will be sent via WhatsApp/SMS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Message Channel</Label>
              <Select value={messageChannel} onValueChange={(value: "sms" | "whatsapp") => setMessageChannel(value)}>
                <SelectTrigger data-testid="select-message-channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS (Text Message)</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              {messageChannel === "whatsapp" && (
                <p className="text-xs text-muted-foreground">
                  Note: WhatsApp requires pre-approved templates and AUTHKEY_WHATSAPP_NUMBER to be configured.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Message Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template or write custom message" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Message</SelectItem>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && selectedTemplate !== "custom" && templates && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Preview:</p>
                <p className="text-sm text-muted-foreground">
                  {templates
                    .find(t => t.id.toString() === selectedTemplate)
                    ?.content
                    .replace("{guestName}", selectedEnquiry?.guestName || "")
                    .replace("{advanceAmount}", selectedEnquiry?.advanceAmount || "0")
                    .replace("{checkInDate}", selectedEnquiry ? format(new Date(selectedEnquiry.checkInDate), "PPP") : "")
                    .replace("{checkOutDate}", selectedEnquiry ? format(new Date(selectedEnquiry.checkOutDate), "PPP") : "")
                    .replace("{propertyName}", "Your Property")
                    .replace("{propertyLocation}", "Property Location")
                    .replace("{propertyContact}", "Property Contact")
                    .replace("{roomType}", `Room #${selectedEnquiry?.roomId}`)}
                </p>
              </div>
            )}

            {(!selectedTemplate || selectedTemplate === "custom") && (
              <div className="space-y-2">
                <Label htmlFor="customMessage">Custom Message</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Type your message here..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={6}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsMessageDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitMessage}
                disabled={sendMessageMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Enquiry?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this enquiry for {selectedEnquiry?.guestName}?
              This action can be reversed by editing the enquiry status.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setSelectedEnquiry(null);
              }}
              data-testid="button-cancel-dialog-close"
            >
              Keep Enquiry
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedEnquiry && cancelEnquiryMutation.mutate(selectedEnquiry.id)}
              disabled={cancelEnquiryMutation.isPending}
              data-testid="button-cancel-dialog-confirm"
            >
              Cancel Enquiry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Enquiry</DialogTitle>
            <DialogDescription>
              Update enquiry details for {selectedEnquiry?.guestName}
            </DialogDescription>
          </DialogHeader>
          {selectedEnquiry && (
            <EditEnquiryForm
              enquiry={selectedEnquiry}
              rooms={rooms || []}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedEnquiry(null);
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedEnquiry(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
