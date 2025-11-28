import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, UserPlus, Phone, Mail, MapPin, Camera, Upload, X, Download, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertGuestSchema, type InsertGuest, type Guest } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Guests() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [idProofPreview, setIdProofPreview] = useState<string | null>(null);
  const [selectedGuestForId, setSelectedGuestForId] = useState<Guest | null>(null);
  const [isIdViewerOpen, setIsIdViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: guests, isLoading } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const form = useForm<InsertGuest>({
    resolver: zodResolver(insertGuestSchema),
    defaultValues: {
      fullName: "",
      email: undefined,
      phone: "",
      idProofType: undefined,
      idProofNumber: undefined,
      idProofImage: undefined,
      address: undefined,
      preferences: undefined,
    },
  });

  const handleFileCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setIdProofPreview(base64String);
        form.setValue("idProofImage", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearIdProof = () => {
    setIdProofPreview(null);
    form.setValue("idProofImage", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertGuest) => {
      return await apiRequest("/api/guests", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({
        title: "Success",
        description: "Guest added successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      clearIdProof();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertGuest) => {
    createMutation.mutate(data);
  };

  const downloadIdProof = (guest: Guest) => {
    if (!guest.idProofImage) {
      toast({
        title: "No ID Proof",
        description: "This guest has no ID proof image on file",
        variant: "destructive",
      });
      return;
    }

    const link = document.createElement("a");
    link.href = guest.idProofImage;
    link.download = `${guest.fullName}_${guest.idProofType || "ID"}_${guest.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Downloaded",
      description: `ID proof for ${guest.fullName} downloaded`,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Guests</h1>
          <p className="text-muted-foreground mt-1">Manage guest profiles and history</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-guest">
              <Plus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Guest</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-guest-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} value={field.value || ""} data-testid="input-guest-email" />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 98765 43210" {...field} data-testid="input-guest-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="idProofType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Proof Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Passport, Aadhar, etc." {...field} value={field.value || ""} data-testid="input-guest-id-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="idProofNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Proof Number</FormLabel>
                        <FormControl>
                          <Input placeholder="ID number" {...field} value={field.value || ""} data-testid="input-guest-id-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="idProofImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Proof Image (Optional)</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                            <input
                              ref={cameraInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleFileCapture}
                              className="hidden"
                              data-testid="input-guest-id-camera"
                            />
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileCapture}
                              className="hidden"
                              data-testid="input-guest-id-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => cameraInputRef.current?.click()}
                              data-testid="button-capture-id"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Capture ID
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              data-testid="button-upload-id"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload ID
                            </Button>
                            {idProofPreview && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearIdProof}
                                data-testid="button-clear-id"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear
                              </Button>
                            )}
                          </div>
                          {idProofPreview && (
                            <div className="relative rounded-lg overflow-hidden border border-border">
                              <img
                                src={idProofPreview}
                                alt="ID Proof Preview"
                                className="w-full h-auto max-h-48 object-contain bg-muted"
                                data-testid="image-id-preview"
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Full address" {...field} value={field.value || ""} data-testid="input-guest-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferences</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Guest preferences (room type, dietary, etc.)" {...field} value={field.value || ""} data-testid="input-guest-preferences" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-guest">
                    {createMutation.isPending ? "Adding..." : "Add Guest"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ID Proof Viewer Modal */}
      <Dialog open={isIdViewerOpen} onOpenChange={setIsIdViewerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ID Proof - {selectedGuestForId?.fullName}</DialogTitle>
          </DialogHeader>
          {selectedGuestForId && (
            <div className="space-y-4">
              {selectedGuestForId.idProofType && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ID Type</p>
                    <p className="text-lg font-semibold">{selectedGuestForId.idProofType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ID Number</p>
                    <p className="text-lg font-semibold">{selectedGuestForId.idProofNumber || "N/A"}</p>
                  </div>
                </div>
              )}
              {selectedGuestForId.idProofImage ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">ID Proof Image</p>
                  <img 
                    src={selectedGuestForId.idProofImage} 
                    alt="ID Proof" 
                    className="w-full rounded-md border border-border max-h-96 object-contain"
                  />
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-md">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No ID proof image on file</p>
                </div>
              )}
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsIdViewerOpen(false)}
                  data-testid="button-close-id-viewer"
                >
                  Close
                </Button>
                {selectedGuestForId.idProofImage && (
                  <Button 
                    onClick={() => {
                      downloadIdProof(selectedGuestForId);
                    }}
                    data-testid="button-download-id-proof"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!guests || guests.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserPlus className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-semibold">No guests yet</h3>
            <p className="text-muted-foreground max-w-md">
              Add your first guest to start managing bookings
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guests.map((guest) => {
            const initials = guest.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Card key={guest.id} className="hover-elevate flex flex-col" data-testid={`card-guest-${guest.id}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`text-guest-name-${guest.id}`}>{guest.fullName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-guest-stays-${guest.id}`}>
                          {guest.totalStays} {guest.totalStays === 1 ? "Stay" : "Stays"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 text-sm">
                    {guest.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate" data-testid={`text-guest-email-${guest.id}`}>{guest.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span data-testid={`text-guest-phone-${guest.id}`}>{guest.phone}</span>
                    </div>
                    {guest.address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <span className="line-clamp-2">{guest.address}</span>
                      </div>
                    )}
                    {guest.preferences && (
                      <div className="mt-3 p-2 rounded-md bg-muted">
                        <p className="text-xs font-medium mb-1">Preferences:</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{guest.preferences}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                {(guest.idProofImage || guest.idProofType) && (
                  <div className="border-t border-border p-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSelectedGuestForId(guest);
                        setIsIdViewerOpen(true);
                      }}
                      data-testid={`button-view-id-${guest.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View ID
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
