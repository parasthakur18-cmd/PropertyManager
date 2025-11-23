import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Building2, Calendar, Users, DollarSign, Shield, Zap, CheckCircle, ArrowRight, Mountain } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md">
              <Mountain className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">Hostezee</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/login")}
              data-testid="button-login"
              className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Login
            </Button>
            <Button
              onClick={() => setLocation("/signup")}
              data-testid="button-signup"
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Mountain Theme */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-24 md:py-32">
        {/* Mountain silhouette background */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <svg viewBox="0 0 1200 300" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,200 Q300,50 600,120 T1200,200 L1200,300 L0,300 Z" fill="currentColor" />
          </svg>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
            <span className="text-sm font-semibold text-teal-500 dark:text-teal-400">✨ Built for Mountain Resorts</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Property Management
            <span className="block bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
              Reimagined
            </span>
          </h2>

          <p className="text-xl text-slate-300 dark:text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Hostezee is the complete Property Management System designed for hotels, resorts, and premium lodging. Manage bookings, guests, finances, and operations—all in one beautiful platform.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => setLocation("/signup")}
              data-testid="button-get-started"
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-base h-12 px-8 group"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
              data-testid="button-login-hero"
              className="text-white border-white/20 hover:bg-white/10 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Login to Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-b border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-2">500+</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Active Properties</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-2">50K+</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Bookings Managed</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-2">100M+</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Revenue Tracked</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-2">99.9%</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Uptime</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Everything You Need
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Powerful features designed for modern property management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Calendar,
              title: "Booking Management",
              description: "Real-time booking calendar with visual availability. Manage single rooms, groups, and dormitory beds.",
              color: "from-blue-500 to-cyan-500"
            },
            {
              icon: Users,
              title: "Guest Management",
              description: "Complete guest profiles, contact tracking, and automatic notifications via WhatsApp & email.",
              color: "from-teal-500 to-green-500"
            },
            {
              icon: DollarSign,
              title: "Financial Tracking",
              description: "Automated billing, invoice generation, expense tracking, and P&L reports per property.",
              color: "from-orange-500 to-red-500"
            },
            {
              icon: Building2,
              title: "Multi-Property",
              description: "Manage unlimited properties with complete data isolation. Each property operates independently.",
              color: "from-purple-500 to-pink-500"
            },
            {
              icon: Zap,
              title: "Restaurant & Orders",
              description: "In-house restaurant management, menu creation, room service orders, and kitchen tracking.",
              color: "from-amber-500 to-orange-500"
            },
            {
              icon: Shield,
              title: "Enterprise Security",
              description: "Role-based access control, audit logs, secure authentication, and complete data encryption.",
              color: "from-green-500 to-emerald-500"
            }
          ].map((feature, index) => (
            <Card
              key={index}
              className="group border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white mb-3 w-fit`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-slate-900 dark:text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600 dark:text-slate-400">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">
            Simple 4-Step Onboarding
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: "1", title: "Sign Up", desc: "Create your account in seconds" },
              { num: "2", title: "Add Property", desc: "Configure your resort details" },
              { num: "3", title: "Create Rooms", desc: "Define rooms and pricing" },
              { num: "4", title: "Start Bookings", desc: "Accept bookings immediately" }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl font-bold mb-4 shadow-lg">
                    {step.num}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{step.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{step.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 -right-3 text-teal-300">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Checklist */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h3 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">
          Complete Feature Suite
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            "Real-time booking calendar with drag-drop",
            "Guest self check-in via QR codes",
            "Automated billing & invoicing",
            "WhatsApp & email notifications",
            "Revenue reports & analytics",
            "Travel agent management",
            "Room availability tracking",
            "Staff salary management",
            "Dormitory bed-level tracking",
            "Custom pricing rules",
            "Multi-user access with roles",
            "Complete audit logs",
            "Restaurant order management",
            "Expense & lease tracking",
            "Financial P&L reports",
            "Mobile-optimized interface",
          ].map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <CheckCircle className="h-5 w-5 text-teal-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700 dark:text-slate-300">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-900 dark:to-cyan-900 py-20">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 1200 300" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,100 Q300,0 600,100 T1200,100 L1200,300 L0,300 Z" fill="white" />
          </svg>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Property Management?
          </h3>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join property managers who've streamlined their operations with Hostezee. Start your free trial today—no credit card required.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/signup")}
            data-testid="button-cta-signup"
            className="bg-white text-teal-600 hover:bg-slate-100 text-base h-12 px-8 font-semibold"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                  <Mountain className="h-5 w-5" />
                </div>
                <span className="font-bold text-white">Hostezee</span>
              </div>
              <p className="text-sm">Property Management for Modern Resorts</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2025 Hostezee PMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
