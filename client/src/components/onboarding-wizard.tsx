import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  BedDouble, 
  Calendar, 
  Users, 
  IndianRupee, 
  ChefHat, 
  BarChart3, 
  Bell, 
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  ArrowRight,
  MessageSquare,
  UserPlus,
  CreditCard,
  FileText,
  Clock,
  Shield,
  Smartphone,
  Rocket
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  userName?: string;
  propertyName?: string;
}

const features = [
  {
    icon: Building2,
    title: "Property Management",
    description: "Manage multiple properties from a single dashboard. Track room inventory, pricing, and availability across all your hotels.",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  {
    icon: BedDouble,
    title: "Room Management",
    description: "Add rooms with types, pricing, and amenities. Track room status (available, occupied, cleaning, maintenance) in real-time.",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
  {
    icon: Calendar,
    title: "Booking Calendar",
    description: "Visual Airbnb-style calendar showing all bookings. Drag-and-drop to modify dates. Color-coded for quick status identification.",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
  },
  {
    icon: Users,
    title: "Guest Management",
    description: "Store guest details, ID proofs, preferences, and booking history. Self-check-in via QR code. WhatsApp notifications for confirmations.",
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950",
  },
  {
    icon: IndianRupee,
    title: "Financial Tracking",
    description: "Track revenue, expenses, and profitability. Generate GST-compliant bills. Accept payments via RazorPay with WhatsApp payment links.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950",
  },
  {
    icon: ChefHat,
    title: "Restaurant & Orders",
    description: "Manage your restaurant menu, accept food orders from rooms via QR code, and track kitchen operations in real-time.",
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
  },
  {
    icon: UserPlus,
    title: "Staff Management",
    description: "Add staff members, track attendance, calculate salaries with deductions, and monitor employee performance scores.",
    color: "text-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-950",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "View occupancy rates, ADR, RevPAR, and revenue trends. Export detailed reports to Excel for accounting.",
    color: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950",
  },
];

const quickStartSteps = [
  {
    step: 1,
    title: "Add Your Rooms",
    description: "Go to Rooms → Add Room to create your room inventory with types and pricing.",
    icon: BedDouble,
    link: "/rooms",
  },
  {
    step: 2,
    title: "Create Your First Booking",
    description: "Go to Bookings → New Booking or use the Room Calendar for visual booking.",
    icon: Calendar,
    link: "/bookings",
  },
  {
    step: 3,
    title: "Configure Settings",
    description: "Set up GST, WhatsApp notifications, and payment preferences in Settings.",
    icon: Settings,
    link: "/settings",
  },
  {
    step: 4,
    title: "Explore Features",
    description: "Check out the sidebar menu to discover all available features.",
    icon: Sparkles,
    link: "/dashboard",
  },
];

export function OnboardingWizard({ isOpen, onComplete, userName, propertyName }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4; // Welcome, Features (2 pages), Quick Start

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/users/complete-onboarding", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    },
    onError: () => {
      // Still complete locally even if API fails
      onComplete();
    },
  });

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding.mutate();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding.mutate();
  };

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0" data-testid="dialog-onboarding-wizard">
        {/* Progress bar at top */}
        <div className="px-6 pt-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <button 
              onClick={handleSkip} 
              className="hover:underline"
              data-testid="button-skip-onboarding"
            >
              Skip tour
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 pb-6">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Welcome to Hostezee!</h2>
                {userName && (
                  <p className="text-xl text-muted-foreground mt-2">Hi {userName}, great to have you here!</p>
                )}
              </div>
              {propertyName && (
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  <Building2 className="w-4 h-4 mr-2" />
                  {propertyName}
                </Badge>
              )}
              <div className="max-w-2xl mx-auto space-y-4 text-left bg-muted/50 rounded-lg p-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Your Complete Property Management Solution
                </h3>
                <p className="text-muted-foreground">
                  Hostezee helps you manage your hotel or resort with ease. From room bookings to guest management, 
                  financial tracking to restaurant operations - everything you need in one place.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Unlimited Rooms</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>WhatsApp Notifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Online Payments</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>GST Compliant Bills</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Staff Management</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Analytics Dashboard</span>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground">
                Let's take a quick tour to help you get started! (Takes ~2 minutes)
              </p>
            </div>
          )}

          {/* Step 1: Features Overview (Part 1) */}
          {currentStep === 1 && (
            <div className="py-4 space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Platform Features</h2>
                <p className="text-muted-foreground">Everything you need to manage your property</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.slice(0, 4).map((feature, idx) => (
                  <Card key={idx} className={`${feature.bgColor} border-0`}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-white dark:bg-gray-800 ${feature.color}`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Features Overview (Part 2) */}
          {currentStep === 2 && (
            <div className="py-4 space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">More Powerful Features</h2>
                <p className="text-muted-foreground">Advanced tools for your business</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.slice(4, 8).map((feature, idx) => (
                  <Card key={idx} className={`${feature.bgColor} border-0`}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-white dark:bg-gray-800 ${feature.color}`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Additional highlights */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Smartphone className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">Mobile Friendly</p>
                  <p className="text-xs text-muted-foreground">Works on any device</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Shield className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">Bank-Level Security</p>
                  <p className="text-xs text-muted-foreground">Your data is safe</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <MessageSquare className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">24/7 AI Support</p>
                  <p className="text-xs text-muted-foreground">Help when you need it</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Quick Start Guide */}
          {currentStep === 3 && (
            <div className="py-4 space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Quick Start Guide</h2>
                <p className="text-muted-foreground">Follow these steps to get started</p>
              </div>
              
              <div className="space-y-4">
                {quickStartSteps.map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <step.icon className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                ))}
              </div>

              <div className="bg-primary/10 rounded-lg p-6 text-center mt-6">
                <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Look for the AI Assistant button (bottom-right corner) anytime you have questions.
                  Our support team is also available via WhatsApp.
                </p>
                <div className="flex justify-center gap-3">
                  <Badge variant="outline" className="px-3 py-1">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    AI Chat Assistant
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    <Smartphone className="w-4 h-4 mr-1" />
                    WhatsApp Support
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrev}
            disabled={currentStep === 0}
            data-testid="button-onboarding-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={completeOnboarding.isPending}
            data-testid="button-onboarding-next"
          >
            {currentStep === totalSteps - 1 ? (
              <>
                {completeOnboarding.isPending ? "Saving..." : "Get Started"}
                <Check className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
