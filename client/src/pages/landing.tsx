import { Button } from "@/components/ui/button";
import { Building2, Calendar, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "wouter";

export default function Landing() {
  const [, navigate] = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-blue-500/10">
      <div className="container mx-auto px-6 py-16">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Building2 className="h-12 w-12" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold font-serif mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Hostezee
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">
            Manage your mountain resort properties, bookings, guests, and restaurant operations from one beautiful platform
          </p>

          <div className="flex gap-4 flex-wrap justify-center">
            <Button
              size="lg"
              onClick={() => {
                window.location.href = "/api/login";
              }}
              className="text-lg px-8 py-6"
              data-testid="button-login"
            >
              Sign In to Continue
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/forgot-password")}
              className="text-lg px-8 py-6"
              data-testid="button-forgot-password"
            >
              Forgot Password?
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
            <div className="p-6 rounded-lg bg-card border border-card-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Bookings</h3>
              <p className="text-sm text-muted-foreground">
                Automated room assignments and real-time availability tracking
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-card-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Guest Management</h3>
              <p className="text-sm text-muted-foreground">
                Complete guest profiles with stay history and preferences
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-card-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Analytics & Reports</h3>
              <p className="text-sm text-muted-foreground">
                Revenue tracking and occupancy insights across all properties
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
