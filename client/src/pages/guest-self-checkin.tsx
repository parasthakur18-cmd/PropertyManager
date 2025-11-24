import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, Phone } from "lucide-react";
import { format } from "date-fns";

const findBookingSchema = z.object({
  phone: z.string().min(10, "Valid phone number required"),
});

const selfCheckinSchema = z.object({
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Invalid email"),
  fullName: z.string().min(1, "Name is required"),
  idProofUrl: z.string().optional(),
});

type FindBookingForm = z.infer<typeof findBookingSchema>;
type SelfCheckinForm = z.infer<typeof selfCheckinSchema>;

export default function GuestSelfCheckin() {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Find by Phone, 2: Verify Details, 3: Success
  const [bookingData, setBookingData] = useState<any>(null);
  const [fileUpload, setFileUpload] = useState<File | null>(null);

  const findForm = useForm<FindBookingForm>({
    resolver: zodResolver(findBookingSchema),
    defaultValues: { phone: "" },
  });

  const verifyForm = useForm<SelfCheckinForm>({
    resolver: zodResolver(selfCheckinSchema),
    defaultValues: {
      phone: "",
      email: "",
      fullName: "",
    },
  });

  const findBookingMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await fetch(`/api/guest-self-checkin/by-phone?phone=${encodeURIComponent(phone)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Booking not found");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      setBookingData(data);
      verifyForm.setValue("phone", data.guest?.phone || "");
      verifyForm.setValue("email", data.guest?.email || "");
      verifyForm.setValue("fullName", data.guest?.fullName || "");
      setStep(2);
      toast({ 
        title: "Booking found!", 
        description: `Welcome ${data.guest?.fullName}! Room ${data.room?.roomNumber} is ready for you.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Booking not found", 
        description: error.message || "No active booking found with this phone number", 
        variant: "destructive" 
      });
    },
  });

  const selfCheckinMutation = useMutation({
    mutationFn: async (data: SelfCheckinForm) => {
      const formData = new FormData();
      formData.append("bookingId", bookingData.id.toString());
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
      toast({ title: "Check-in successful!", description: "Welcome to our property!" });
      queryClient.invalidateQueries({ queryKey: ["/api/active-bookings"] });
    },
    onError: (error: any) => {
      toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
    },
  });

  const onFindBooking = async (data: FindBookingForm) => {
    await findBookingMutation.mutateAsync(data.phone);
  };

  const onSubmit = async (data: SelfCheckinForm) => {
    await selfCheckinMutation.mutateAsync(data);
  };

  // Step 1: Find Booking by Phone
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
            <p className="text-sm text-muted-foreground mt-2">Welcome to our property!</p>
          </CardHeader>
          <CardContent>
            <Form {...findForm}>
              <form onSubmit={findForm.handleSubmit(onFindBooking)} className="space-y-4">
                <FormField
                  control={findForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Enter your 10-digit phone number" 
                            {...field}
                            className="pl-10"
                            data-testid="input-phone-number"
                          />
                        </div>
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

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
              <p className="text-sm font-medium">How it works:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Enter the phone number used for your booking</li>
                <li>We'll find your pre-allocated room</li>
                <li>Verify your details and upload ID proof</li>
                <li>Complete check-in in seconds</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Verify Details & Upload ID
  if (step === 2 && bookingData) {
    const checkInDate = new Date(bookingData.checkInDate);
    const checkOutDate = new Date(bookingData.checkOutDate);

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Verify Your Details</CardTitle>
            <p className="text-sm text-muted-foreground mt-3">
              <span className="font-semibold block text-base mb-2">Room {bookingData.room?.roomNumber}</span>
              <span className="block">{format(checkInDate, "MMM d, yyyy")} → {format(checkOutDate, "MMM d, yyyy")}</span>
            </p>
          </CardHeader>
          <CardContent>
            <Form {...verifyForm}>
              <form onSubmit={verifyForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={verifyForm.control}
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
                  control={verifyForm.control}
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
                  control={verifyForm.control}
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
                    onClick={() => {
                      setStep(1);
                      findForm.reset();
                      setBookingData(null);
                    }}
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
  if (step === 3 && bookingData) {
    const checkOutDate = new Date(bookingData.checkOutDate);
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
                <strong>Check-out:</strong> {format(checkOutDate, "PPP")}
              </p>
              <p className="text-sm">
                <strong>Guest Name:</strong> {bookingData?.guest?.fullName}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please proceed to your room. If you need assistance, contact the front desk.
            </p>
            <Button 
              onClick={() => {
                setStep(1);
                findForm.reset();
                verifyForm.reset();
                setBookingData(null);
                setFileUpload(null);
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
