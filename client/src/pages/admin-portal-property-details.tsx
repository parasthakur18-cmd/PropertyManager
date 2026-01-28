import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Calendar, DollarSign, Hotel } from "lucide-react";

interface PropertyDetails {
  id: number;
  name: string;
  location: string;
  totalRooms: number;
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
}

interface Booking {
  id: number;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  roomNumber: string;
  totalAmount: number;
}

export default function AdminPortalPropertyDetails() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get property ID from URL - for now using a sample
  const propertyId = new URLSearchParams(window.location.search).get('id') || '1';

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      const [propRes, bookingsRes] = await Promise.all([
        fetch(`/api/admin-portal/property/${propertyId}`),
        fetch(`/api/admin-portal/property/${propertyId}/bookings`),
      ]);

      if (propRes.ok) {
        const data = await propRes.json();
        setProperty(data);
      }
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data);
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to load property details", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin-portal/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{property?.name || "Loading..."}</h1>
            <p className="text-xs text-slate-400">{property?.location}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Loading property details...</div>
        ) : property ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Hotel className="h-4 w-4" />
                    Total Rooms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{property.totalRooms}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-700 bg-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Total Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{property.totalBookings}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-700 bg-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Active Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{property.activeBookings}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-700 bg-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">₹{property.totalRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Bookings Table */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Property Bookings</CardTitle>
                <CardDescription className="text-slate-400">
                  All bookings for {property.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No bookings found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Guest
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Room
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Check-in
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Check-out
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="py-3 px-4 text-sm text-slate-300">{booking.guestName}</td>
                            <td className="py-3 px-4 text-sm text-slate-300">{booking.roomNumber}</td>
                            <td className="py-3 px-4 text-sm text-slate-300">
                              {new Date(booking.checkInDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-300">
                              {new Date(booking.checkOutDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <Badge
                                variant={booking.status === "checked-in" ? "default" : "outline"}
                                className="capitalize text-slate-300"
                              >
                                {booking.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold text-green-400">
                              ₹{booking.totalAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-8 text-slate-400">Property not found</div>
        )}
      </div>
    </div>
  );
}
