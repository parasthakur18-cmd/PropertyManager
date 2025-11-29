import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Building2, ArrowLeft, CheckCircle, X, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Pricing() {
  const [, setLocation] = useLocation();

  const hostezeFeatures = [
    { name: "Unlimited Properties", hostezee: true, competition: false, enterprise: false },
    { name: "Unlimited Bookings & Guests", hostezee: true, competition: false, enterprise: true },
    { name: "Real-Time Analytics & AI Insights", hostezee: true, competition: false, enterprise: true },
    { name: "Revenue Reports & P&L Tracking", hostezee: true, competition: false, enterprise: true },
    { name: "Staff Management & Payroll", hostezee: true, competition: false, enterprise: true },
    { name: "Restaurant & Café Operations", hostezee: true, competition: false, enterprise: false },
    { name: "AI-Powered Notifications (3-hr smart reminders)", hostezee: true, competition: false, enterprise: false },
    { name: "Airbnb-Style Visual Calendar", hostezee: true, competition: true, enterprise: true },
    { name: "Multi-User Access & Roles", hostezee: true, competition: true, enterprise: true },
    { name: "WhatsApp Notifications", hostezee: true, competition: false, enterprise: true },
    { name: "Guest Self Check-in via QR", hostezee: true, competition: false, enterprise: true },
    { name: "Split Payment System", hostezee: true, competition: false, enterprise: false },
    { name: "RazorPay Integration", hostezee: true, competition: false, enterprise: true },
    { name: "Attendance & Salary Auto-Calc", hostezee: true, competition: false, enterprise: true },
    { name: "Employee Performance Dashboard", hostezee: true, competition: false, enterprise: false },
    { name: "Feature Settings Control Panel", hostezee: true, competition: false, enterprise: false },
    { name: "Enquiry Management Workflow", hostezee: true, competition: false, enterprise: true },
    { name: "Expense & Lease Tracking", hostezee: true, competition: false, enterprise: true },
    { name: "Email Support", hostezee: true, competition: true, enterprise: true },
    { name: "Priority 24/7 Support", hostezee: true, competition: false, enterprise: true },
    { name: "Data Backup & Security", hostezee: true, competition: true, enterprise: true },
    { name: "Zero Infrastructure Cost", hostezee: true, competition: false, enterprise: false },
  ];

  const features = [
    "Unlimited Properties",
    "Unlimited Bookings & Guests",
    "AI-Powered Smart Notifications",
    "Real-Time Analytics",
    "Revenue Reports & P&L",
    "Staff Management & Auto-Payroll",
    "Restaurant Operations",
    "WhatsApp Payments & Notifications",
    "Employee Performance Tracking",
    "Room Availability Calendar",
    "Split Payment System",
    "Feature Settings Control",
    "Enquiry Management",
    "Expense & Lease Tracking",
    "Guest Self Check-in via QR",
    "Multi-User Access",
    "24/7 Priority Support",
    "Enterprise Security (ISO 27001)"
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
          <div className="max-w-3xl mx-auto mb-16">
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
                  setLocation("/onboarding");
                }}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white mb-8"
              >
                Get Started Free
              </Button>

              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p className="mb-4">Everything you need is included:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">Hostezee vs Competition</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-4 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">Feature</th>
                    <th className="text-center p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 font-bold text-slate-900 dark:text-white border border-teal-200 dark:border-teal-700">Hostezee</th>
                    <th className="text-center p-4 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">MarginEdge</th>
                    <th className="text-center p-4 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">InnQuest</th>
                  </tr>
                </thead>
                <tbody>
                  {hostezeFeatures.map((feature, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white dark:bg-slate-900/30" : "bg-slate-50 dark:bg-slate-900/50"}>
                      <td className="p-4 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white">{feature.name}</td>
                      <td className="p-4 border border-slate-200 dark:border-slate-700 text-center">
                        {feature.hostezee ? <CheckCircle className="h-6 w-6 text-teal-600 dark:text-teal-400 mx-auto" /> : <X className="h-6 w-6 text-slate-400 mx-auto" />}
                      </td>
                      <td className="p-4 border border-slate-200 dark:border-slate-700 text-center">
                        {feature.competition ? <CheckCircle className="h-6 w-6 text-slate-400 mx-auto" /> : <X className="h-6 w-6 text-slate-400 mx-auto" />}
                      </td>
                      <td className="p-4 border border-slate-200 dark:border-slate-700 text-center">
                        {feature.enterprise ? <CheckCircle className="h-6 w-6 text-slate-400 mx-auto" /> : <X className="h-6 w-6 text-slate-400 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-6 text-center">
              ✓ = Feature Available | ✗ = Not Available or Limited
            </p>
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
                setLocation("/onboarding");
              }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white mb-6"
            >
              Start Free
            </Button>
            <div className="flex gap-4 justify-center text-slate-600 dark:text-slate-400">
              <a href="https://www.facebook.com/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.twitter.com/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/company/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
