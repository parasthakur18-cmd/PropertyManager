import { useState } from "react";
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
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Enquiry, MessageTemplate } from "@shared/schema";

export default function Enquiries() {
  const { toast } = useToast();
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");

  const { data: enquiries, isLoading } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  const { data: templates } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/message-templates"],
  });

  const confirmEnquiryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/enquiries/${id}/confirm`, {});
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
      toast({
        title: "Error",
        description: error.message || "Failed to confirm enquiry",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/communications", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Message Sent!",
        description: "Your message has been logged successfully. (Note: Actual SMS/WhatsApp sending requires Twilio setup)",
      });
      setIsMessageDialogOpen(false);
      setSelectedEnquiry(null);
      setSelectedTemplate("");
      setCustomMessage("");
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
      messageType: "whatsapp", // or "sms"
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
        <Link href="/new-enquiry">
          <Button data-testid="button-new-enquiry">
            <MessageSquarePlus className="h-5 w-5 mr-2" />
            New Enquiry
          </Button>
        </Link>
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
                    {enquiries.map((enquiry) => (
                      <TableRow key={enquiry.id} data-testid={`row-enquiry-${enquiry.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{enquiry.guestName}</p>
                              <p className="text-sm text-muted-foreground">
                                {enquiry.numberOfGuests} guest{enquiry.numberOfGuests > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {enquiry.guestPhone}
                            </div>
                            {enquiry.guestEmail && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {enquiry.guestEmail}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                              <p>{format(new Date(enquiry.checkInDate), "MMM d")}</p>
                              <p className="text-muted-foreground">
                                to {format(new Date(enquiry.checkOutDate), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Hotel className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Room #{enquiry.roomId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <IndianRupee className="h-4 w-4 text-muted-foreground" />
                              <div className="text-sm">
                                <p className="font-medium">₹{enquiry.priceQuoted}</p>
                                {enquiry.advanceAmount && (
                                  <p className="text-muted-foreground">
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
                        <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {enquiry.advanceAmount && enquiry.paymentStatus === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => confirmEnquiryMutation.mutate(enquiry.id)}
                                disabled={confirmEnquiryMutation.isPending}
                                data-testid={`button-confirm-enquiry-${enquiry.id}`}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Confirm Enquiry
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendMessage(enquiry)}
                              data-testid={`button-send-message-${enquiry.id}`}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Send Message
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
                  <p className="text-sm font-medium">WhatsApp/SMS Integration Available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Messages are being logged. To actually send SMS or WhatsApp messages to guests,
                    set up Twilio integration in your Replit project settings.
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
    </div>
  );
}
