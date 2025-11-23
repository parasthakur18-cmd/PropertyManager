import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, QrCode } from "lucide-react";

const selfCheckinSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Valid phone required"),
  idProofUrl: z.string().optional(),
  fullName: z.string().min(1, "Name is required"),
});

type SelfCheckinForm = z.infer<typeof selfCheckinSchema>;

export default function GuestSelfCheckin() {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Find Booking, 2: Verify Details, 3: Success
  const [bookingData, setBookingData] = useState<any>(null);
  const [fileUpload, setFileUpload] = useState<File | null>(null);

  const form = useForm<SelfCheckinForm>({
    resolver: zodResolver(selfCheckinSchema),
    defaultValues: {
      bookingId: "",
      email: "",
      phone: "",
      fullName: "",
    },
  });

  const findBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/guest-self-checkin/booking/${bookingId}`);
      if (!response.ok) throw new Error("Booking not found");
      return response.json();
    },
    onSuccess: (data: any) => {
      setBookingData(data);
      form.setValue("email", data.guest?.email || "");
      form.setValue("fullName", data.guest?.fullName || "");
      form.setValue("phone", data.guest?.phone || "");
      setStep(2);
      toast({ title: "Booking found!", description: `Welcome ${data.guest?.fullName}` });
    },
    onError: (error: any) => {
      toast({ title: "Booking not found", description: error.message, variant: "destructive" });
    },
  });

  const selfCheckinMutation = useMutation({
    mutationFn: async (data: SelfCheckinForm) => {
      const formData = new FormData();
      formData.append("bookingId", data.bookingId);
      formData.append("email", data.email);
      formData.append("phone", data.phone);
      formData.append("fullName", data.fullName);
      if (fileUpload) {
        formData.append("idProof", fileUpload);
      }

      const response = await fetch("/api/guest-self-checkin", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Check-in failed");
      }

      return response.json();
    },
    onSuccess: () => {
      setStep(3);
      toast({ title: "Check-in successful!", description: "Welcome to our property" });
      queryClient.invalidateQueries({ queryKey: ["/api/active-bookings"] });
    },
    onError: (error: any) => {
      toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
    },
  });

  const onFindBooking = async () => {
    const bookingId = form.getValues("bookingId");
    await findBookingMutation.mutateAsync(bookingId);
  };

  const onSubmit = async (data: SelfCheckinForm) => {
    await selfCheckinMutation.mutateAsync(data);
  };

  // Step 1: Find Booking
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Guest Self Check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => { e.preventDefault(); onFindBooking(); }} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bookingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking ID or Booking Reference</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Scan QR code or enter booking ID" 
                          {...field}
                          data-testid="input-booking-id"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={findBookingMutation.isPending}
                  data-testid="button-find-booking"
                >
                  {findBookingMutation.isPending ? "Searching..." : "Find My Booking"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <QrCode className="h-4 w-4 inline mr-2" />
                Scan the QR code provided in your booking confirmation, or enter your booking ID manually.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Verify Details & Upload ID
  if (step === 2 && bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Complete Your Check-in</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Room: <span className="font-semibold">{bookingData.room?.roomNumber}</span> | 
              Check-out: <span className="font-semibold">{new Date(bookingData.checkOutDate).toLocaleDateString()}</span>
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} data-testid="input-guest-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Your email" {...field} data-testid="input-guest-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Your phone number" {...field} data-testid="input-guest-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>ID Proof (Photo/Scan)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFileUpload(e.target.files?.[0] || null)}
                      data-testid="input-id-proof"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload a photo of your ID proof (Passport, Aadhar, Driving License, etc.)
                  </p>
                </FormItem>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={selfCheckinMutation.isPending}
                    data-testid="button-complete-checkin"
                  >
                    {selfCheckinMutation.isPending ? "Checking in..." : "Complete Check-in"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Success
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your check-in has been completed successfully.
            </p>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Room:</strong> {bookingData?.room?.roomNumber}
              </p>
              <p className="text-sm">
                <strong>Check-out:</strong> {new Date(bookingData?.checkOutDate).toLocaleDateString()}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please proceed to your room. If you need assistance, contact the front desk.
            </p>
            <Button 
              onClick={() => {
                setStep(1);
                form.reset();
                setBookingData(null);
              }}
              className="w-full"
              data-testid="button-new-checkin"
            >
              Check in Another Guest
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
