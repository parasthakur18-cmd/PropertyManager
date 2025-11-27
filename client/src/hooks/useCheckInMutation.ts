import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useCheckInMutation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}`, { status: "checked-in" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Guest Checked In", description: "Guest has been successfully checked in." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to check in guest", variant: "destructive" });
    },
  });
}

export function useCheckOutMutation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}`, { status: "checked-out" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Guest Checked Out", description: "Guest has been successfully checked out." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to check out guest", variant: "destructive" });
    },
  });
}
