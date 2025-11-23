import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Building2, ArrowLeft, CheckCircle } from "lucide-react";

export default function Pricing() {
  const [, setLocation] = useLocation();

  const features = [
    "Unlimited Properties",
    "Unlimited Bookings & Guests",
    "Real-Time Analytics",
    "Revenue Reports",
    "Staff Management",
    "Restaurant Operations",
    "Room Availability Calendar",
    "Multi-User Access",
    "WhatsApp Notifications",
    "Guest Self Check-in",
    "Priority Email Support",
    "Data Backup & Security"
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Hostezee</h1>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")} data-testid="button-back" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="pt-24 pb-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-slate-600 dark:text-slate-400">All features included. Forever free. No credit card required.</p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-white dark:bg-slate-900/50 border-2 border-teal-500 dark:border-teal-600 rounded-2xl p-8 md:p-12 text-center">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 border border-teal-200 dark:border-teal-800 mb-6">
                <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Forever Free Plan</span>
              </div>

              <div className="mb-8">
                <div className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
                  <span className="text-3xl">₹</span>0<span className="text-3xl">/month</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-2">No hidden fees. No limits. Cancel anytime.</p>
              </div>

              <Button
                size="lg"
                onClick={() => {
                  window.location.href = "/api/login";
                }}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white mb-8"
              >
                Get Started Free
              </Button>

              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p className="mb-4">Everything you need is included:</p>
              </div>

              <div className="space-y-3 text-left">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">Frequently Asked Questions</h2>

            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Is Hostezee really free?</h3>
                <p className="text-slate-600 dark:text-slate-400">Yes! Hostezee is completely free forever. All features are included with no hidden charges, no limitations, and no credit card required.</p>
              </div>

              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">What if I have multiple properties?</h3>
                <p className="text-slate-600 dark:text-slate-400">You can manage unlimited properties on a single account. All properties get access to all features at no additional cost.</p>
              </div>

              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Is my data secure?</h3>
                <p className="text-slate-600 dark:text-slate-400">Absolutely. We use enterprise-grade encryption, ISO 27001 compliance, and SOC 2 certification to protect your data.</p>
              </div>

              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Do you offer support?</h3>
                <p className="text-slate-600 dark:text-slate-400">Yes! We provide email support, documentation, and video tutorials to help you succeed.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Join 500+ Hotels & Resorts</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Start managing your property better today—at no cost.</p>
            <Button
              size="lg"
              onClick={() => {
                window.location.href = "/api/login";
              }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
            >
              Start Free
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
