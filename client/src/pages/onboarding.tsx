import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  Building2, MapPin, Key, Users, Calendar, DollarSign, Settings, 
  CheckCircle, ArrowRight, Home, Sparkles
} from "lucide-react";
import hostezeeLogo from "@assets/Hostezee_Logo_1768292341444.jpeg";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: 1,
      title: "Add Your Property",
      description: "Create your first property listing",
      icon: Building2,
      details: [
        "Go to Properties section in the sidebar",
        "Click 'Add New Property'",
        "Enter property name, location, and contact info",
        "Select property type (Hotel, Resort, Hostel, etc.)",
        "Add business description and amenities"
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      number: 2,
      title: "Create Rooms",
      description: "Set up your room inventory",
      icon: Key,
      details: [
        "Navigate to the Rooms section",
        "Click 'Create Room'",
        "Add room number, type, and capacity",
        "Set base price and peak season pricing",
        "Add photos and room amenities",
        "Repeat for all your rooms"
      ],
      color: "from-teal-500 to-green-500"
    },
    {
      number: 3,
      title: "Configure Pricing",
      description: "Set dynamic pricing rules",
      icon: DollarSign,
      details: [
        "Go to Properties → Pricing Rules",
        "Set weekend rates vs weekday rates",
        "Add seasonal pricing (peak/off-peak)",
        "Set minimum stay requirements",
        "Configure cancellation policies",
        "Enable custom pricing for special events"
      ],
      color: "from-orange-500 to-red-500"
    },
    {
      number: 4,
      title: "Set Booking Calendar",
      description: "Go live with bookings",
      icon: Calendar,
      details: [
        "Review the Room Calendar view",
        "Check all rooms are available",
        "Block dates for maintenance if needed",
        "Set check-in and check-out times",
        "Enable guest self check-in feature",
        "Copy your booking link to share"
      ],
      color: "from-purple-500 to-pink-500"
    },
    {
      number: 5,
      title: "Add Restaurant Menu",
      description: "Set up your restaurant (optional)",
      icon: Users,
      details: [
        "Go to Menu Management",
        "Create menu categories",
        "Add menu items with prices",
        "Upload food photos",
        "Set dietary tags (veg, non-veg, etc.)",
        "Enable room service orders"
      ],
      color: "from-amber-500 to-orange-500"
    },
    {
      number: 6,
      title: "Invite Your Team",
      description: "Add staff members",
      icon: Users,
      details: [
        "Go to Users Management",
        "Click 'Add New User'",
        "Assign roles (Manager, Staff, Kitchen)",
        "Set property access permissions",
        "Team members can log in immediately",
        "Track staff attendance and salary"
      ],
      color: "from-green-500 to-emerald-500"
    },
    {
      number: 7,
      title: "Enable Notifications",
      description: "Setup guest communication",
      icon: Settings,
      details: [
        "Go to Settings → Notifications",
        "Enable WhatsApp (optional)",
        "Enable Email notifications",
        "Customize notification templates",
        "Set SMS alerts for VIP guests",
        "Guests receive booking confirmations automatically"
      ],
      color: "from-indigo-500 to-purple-500"
    },
    {
      number: 8,
      title: "You're All Set!",
      description: "Start accepting bookings",
      icon: CheckCircle,
      details: [
        "Your property is now live",
        "Guests can book from the calendar",
        "Receive booking notifications",
        "Manage guests from the dashboard",
        "Track revenue in real-time",
        "Access analytics and reports anytime"
      ],
      color: "from-green-600 to-emerald-600"
    }
  ];

  const currentStep = steps[activeStep];
  const CurrentIcon = currentStep.icon;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={hostezeeLogo} alt="Hostezee" className="h-12 w-auto object-contain" />
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            data-testid="button-back"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 w-fit mx-auto mb-6">
              <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Welcome to Hostezee</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
              Launch Your Property
              <span className="block bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                in 8 Simple Steps
              </span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Get your property live and accepting bookings within 30 minutes
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Steps List */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-3">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">Setup Steps</h3>
                {steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      idx === activeStep
                        ? "border-teal-600 bg-teal-50 dark:bg-teal-900/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700"
                    }`}
                    data-testid={`button-step-${step.number}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${step.color} text-white text-sm font-bold flex-shrink-0`}>
                        {step.number}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold truncate ${idx === activeStep ? "text-teal-600 dark:text-teal-400" : "text-slate-900 dark:text-white"}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{step.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Step Detail */}
            <div className="lg:col-span-2">
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-xl">
                <CardHeader className={`bg-gradient-to-br ${currentStep.color} text-white rounded-t-lg`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-white/20">
                        <CurrentIcon className="h-8 w-8" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold opacity-90">Step {currentStep.number} of {steps.length}</div>
                        <CardTitle className="text-3xl mt-2">{currentStep.title}</CardTitle>
                        <p className="text-white/90 mt-1">{currentStep.description}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">How to Complete This Step</h4>
                      <div className="space-y-3">
                        {currentStep.details.map((detail, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
                            <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                            <p className="text-slate-700 dark:text-slate-300">{detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Estimated Time */}
                    <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
                      <p className="text-sm">
                        <span className="font-semibold text-teal-700 dark:text-teal-400">Estimated Time:</span>
                        <span className="text-slate-700 dark:text-slate-300 ml-2">
                          {activeStep === 0 ? "3-5 minutes" : 
                           activeStep === 1 ? "5-10 minutes" : 
                           activeStep === 2 ? "5 minutes" : 
                           activeStep === 3 ? "3 minutes" : 
                           activeStep === 4 ? "5 minutes" : 
                           activeStep === 5 ? "5 minutes" : 
                           activeStep === 6 ? "3 minutes" : 
                           "You're done!"}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="flex-1"
                  data-testid="button-prev"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                  disabled={activeStep === steps.length - 1}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white gap-2"
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* CTA for Ready Users */}
              {activeStep === steps.length - 1 && (
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base h-12 gap-2 font-semibold shadow-lg"
                  data-testid="button-go-dashboard"
                >
                  Login to Get Started
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Overall Progress</h4>
              <span className="text-sm text-slate-600 dark:text-slate-400">{activeStep + 1} of {steps.length}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-600 to-cyan-600 h-full transition-all duration-300"
                style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Need Help?</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
            Our support team is here to help. Email us at support@hostezee.in or call +91 9001949260 (Mon-Fri, 9 AM - 6 PM IST)
          </p>
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="mx-auto"
          >
            Back to Home
          </Button>
        </div>
      </footer>
    </div>
  );
}
