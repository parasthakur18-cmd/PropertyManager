import { Building2, Calendar, Users, BarChart3, ArrowRight, Sparkles, UtensilsCrossed, Smartphone, Lock, AlertCircle, TrendingUp, FileText, DollarSign, CheckCircle, Zap, Shield, Globe, Monitor, Maximize2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chatbot } from "@/components/chatbot";

const features = [
  { icon: Building2, title: "Multi-Property Management", desc: "Manage unlimited hotels, hostels, homestays, dorms, villas from one dashboard" },
  { icon: Calendar, title: "Airbnb-Style Availability Calendar", desc: "Instant room & bed availability with date-grid view for seamless bookings" },
  { icon: Lock, title: "Smart Booking System", desc: "Single, group & dorm booking with custom pricing, discounts, advance and source tracking" },
  { icon: AlertCircle, title: "Fast Enquiry Management", desc: "Convert enquiry → booking automatically after payment with smart workflow" },
  { icon: UtensilsCrossed, title: "Restaurant + Café Management", desc: "QR ordering, kitchen panel, add-ons, variants, order tracking, merge bills" },
  { icon: FileText, title: "Complete Billing System", desc: "Room + Food + Add-ons + Damages, GST toggle, discounts, pending payments, invoices" },
  { icon: BarChart3, title: "Powerful Reports & Analytics", desc: "Revenue, expenses, occupancy, food sales, P&L, lease, staff salary reports" },
  { icon: TrendingUp, title: "Expenses, Lease & P&L Tracking", desc: "Track all expenses, salary, lease payments, and view full profit & loss statements" },
  { icon: DollarSign, title: "Staff Salary & Payroll", desc: "Salary cycle, advance tracking, auto-deduction & pending salary summaries" },
  { icon: Zap, title: "Real-time Alerts & Notifications", desc: "Cleaning pending, payment pending, order pending — auto popups & reminders 3x daily" },
  { icon: Smartphone, title: "Guest QR Experience", desc: "QR codes for room service, café tables, menu ordering & instant billing" },
  { icon: Shield, title: "Role-based Access Control", desc: "Owner, manager, staff, kitchen, accountant, housekeeping roles with permissions" },
  { icon: Users, title: "Super Admin SaaS Control", desc: "View all users, properties, bookings; impersonate user; fix issues; manage accounts" },
  { icon: Globe, title: "Public SaaS Onboarding", desc: "Email signup, create property, set rooms — ready to use in minutes with zero setup" },
  { icon: CheckCircle, title: "Zero Infrastructure Costs", desc: "Deploy on Replit with instant scaling, automatic updates, and zero DevOps burden" },
  { icon: Sparkles, title: "AI Chatbot Assistant", desc: "24/7 intelligent support powered by OpenAI GPT-4o-mini for guests and staff" },
  { icon: Lock, title: "Enterprise Security", desc: "Role-based access, data encryption, secure authentication, and compliance-ready" },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden flex flex-col">
      {/* SEO Meta Tags */}
      <head>
        <meta name="description" content="Hostezee - The world's first property management system running on Replit. Multi-property management, smart bookings, restaurant billing, staff payroll, and real-time analytics. Zero setup, instant deployment. Manage hotels, hostels, homestays, dorms with one dashboard." />
        <meta name="keywords" content="property management system, PMS, hotel management software, booking system, restaurant management, Replit PMS" />
        <meta property="og:title" content="Hostezee - Replit-Powered Property Management System" />
        <meta property="og:description" content="Deploy a complete PMS in seconds. Multi-property, smart bookings, restaurant billing, payroll, analytics. Zero DevOps. Trusted by 500+ properties." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hostezee - The Easiest PMS to Deploy" />
        <meta name="twitter:description" content="Manage unlimited hotels, hostels, homestays from one dashboard. Zero infrastructure costs. Instant Replit deployment." />
      </head>

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Hostezee</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                window.location.href = "/";
              }}
              data-testid="button-back-home"
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-24 pb-12 px-4">
        <div className="relative w-full max-w-6xl mx-auto">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl -z-10">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}}></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left Section - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 w-fit hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">World's First Replit-Powered PMS</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                  Manage Properties in
                  <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Seconds, Scale Instantly
                  </span>
                </h1>

                <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                  The world's easiest property management system. Multi-property support, smart bookings, restaurant billing, staff payroll, real-time analytics. Zero setup. Infinite scale. Zero infrastructure costs.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  size="lg"
                  onClick={() => {
                    window.location.href = "/api/login";
                  }}
                  data-testid="button-login"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-base h-13 shadow-lg hover:shadow-xl transition-all gap-2 group"
                >
                  Start Managing Now (Free)
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation("/forgot-password")}
                  data-testid="button-forgot-password"
                  className="w-full border-slate-300 dark:border-slate-700 h-13 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Reset Your Password
                </Button>

                <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                  New to Hostezee?{" "}
                  <a href="#" onClick={() => setLocation("/onboarding")} className="font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition">
                    Start your free trial
                  </a>
                </p>
              </div>

              {/* Trust Badges */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">Trusted by 500+ Properties Globally</p>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">500+</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Properties</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">0s</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Setup Time</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">∞</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Scale</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Quick Features */}
            <div className="relative h-96 md:h-full min-h-96 lg:min-h-80">
              <div className="space-y-6">
                {[
                  { icon: Calendar, title: "Instant Deployment", desc: "Deploy in seconds - no DevOps, no server setup" },
                  { icon: Users, title: "Complete Guest Management", desc: "Bookings, check-ins, profiles all in one place" },
                  { icon: BarChart3, title: "Real-Time Analytics", desc: "Revenue, occupancy, comprehensive reporting" },
                ].map((feature, index) => (
                  <div key={index} className="group relative">
                    <div className="relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 cursor-default">
                      <div className="flex items-start gap-4">
                        <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                          <feature.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{feature.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Replit Badge */}
                <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">Powered by Replit</span> - Zero infrastructure, auto-scaling, instant deployment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid Section */}
      <div className="py-20 px-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Complete Feature Suite
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Everything you need to manage properties, bookings, guests, restaurants, and staff in one powerful platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const colors = [
                "from-purple-500 to-pink-500",
                "from-cyan-500 to-blue-500",
                "from-orange-500 to-amber-500",
                "from-green-500 to-emerald-500",
              ];
              const colorIndex = index % colors.length;

              return (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-700">
                  <CardContent className="pt-8 pb-8">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colors[colorIndex]} text-white mb-4`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Notifications Showcase Section */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div className="space-y-6">
              <div className="inline-block">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">AI-POWERED INTELLIGENCE</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
                Never Miss a Beat with AI Notifications
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-300">
                Our intelligent notification system learns your property's patterns and sends smart, timely alerts right when you need them—not before, not after.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">Smart 3-Hour Reminders</h4>
                    <p className="text-slate-600 dark:text-slate-400">Get reminders every 3 hours for pending tasks like cleaning, payments, and orders—perfectly timed</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">Auto-Dismiss After 3 Hours</h4>
                    <p className="text-slate-600 dark:text-slate-400">Notifications automatically dismiss after 3 hours if task is still pending—no more notification fatigue</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">Works Offline</h4>
                    <p className="text-slate-600 dark:text-slate-400">Notifications work even when the app is completely closed using browser push notifications</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">Task-Specific Intelligence</h4>
                    <p className="text-slate-600 dark:text-slate-400">Alerts for cleaning pending, payments due, food orders, staff attendance—all in one place</p>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => {
                  setLocation("/features");
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white mt-4"
                data-testid="button-explore-ai"
              >
                Explore All AI Features
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Right - Visual Showcase */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-800">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border-l-4 border-purple-500">
                    <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">Room 203 Cleaning Pending</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Notify again in 3 hours</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border-l-4 border-blue-500">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">Payment Received: ₹5,000</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Via WhatsApp Payment Link</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border-l-4 border-green-500">
                    <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">Food Order #45 Ready</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Table 4 • Notify room 210</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border-l-4 border-orange-500 opacity-50">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">Attendance: Staff ABC</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Auto-dismissed after 3 hours</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Hostezee Section */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Why Choose Hostezee?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Instant Setup</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Deploy your entire property management system in seconds. No servers, no DevOps, no infrastructure complexity. One click, and you're live.
              </p>
            </div>

            <div className="space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Scale Unlimited</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Manage one hotel or thousands of properties. Replit's infrastructure scales automatically. No limits on properties, guests, or bookings.
              </p>
            </div>

            <div className="space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Zero Infrastructure Cost</h3>
              <p className="text-slate-600 dark:text-slate-300">
                No monthly server fees. No database charges. No DevOps team needed. Run everything on Replit's free tier, or scale with minimal costs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Stories - Testimonials with ROI Metrics */}
      <div className="py-20 px-4 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Success Stories from Real Users
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              See how property managers across India are transforming their operations with Hostezee
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <Card className="hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white text-lg">Suresh Kumar</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Founder, The Mountain Resort</p>
                  </div>
                  <div className="text-2xl">🏨</div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  "Hostezee replaced our entire manual booking system. We went from Excel spreadsheets to a full PMS in 30 minutes. Best decision we made."
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">+45%</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Direct Bookings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">8h/day</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Time Saved</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 2 */}
            <Card className="hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white text-lg">Priya Sharma</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Manager, Urban Hostels Network</p>
                  </div>
                  <div className="text-2xl">🏩</div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  "Managing 5 hostels was chaos until Hostezee. Now our team coordinates perfectly. Guest experience improved dramatically."
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">+38%</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Occupancy Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">5×</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Faster Checkout</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 3 */}
            <Card className="hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white text-lg">Rajesh Patel</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Owner, Heritage Villas</p>
                  </div>
                  <div className="text-2xl">🏘️</div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  "The restaurant billing feature alone saved us ₹2L per year in commission fees. PaymentProcessing is seamless via WhatsApp."
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">₹2L</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Saved Annually</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">72h</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Setup Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust Badges - Indian Market Numbers */}
          <div className="mt-16 border-t border-slate-200 dark:border-slate-800 pt-12">
            <div className="text-center mb-8">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">By The Numbers</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">100+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Premium Properties</p>
              </div>
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">₹300Cr+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Revenue Managed</p>
              </div>
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">5000+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Rooms/Beds</p>
              </div>
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">99.9%</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Uptime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* App Screenshots / Gallery Section */}
      <div className="py-20 px-4 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              See Hostezee in Action
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Intuitive interface designed for property managers. Everything you need at your fingertips.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dashboard Overview */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white mb-4">
                <Monitor className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Dashboard Overview</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Real-time stats showing active bookings, pending payments, occupancy rates, and key metrics at a glance</p>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Active booking counter</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Payment summary</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Quick action buttons</span>
                </div>
              </div>
            </div>

            {/* Booking Calendar */}
            <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-2xl p-8 border border-cyan-200 dark:border-cyan-800 hover:shadow-lg transition-all">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Visual Room Calendar</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Airbnb-style room availability with color-coded status and date-range booking</p>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Room status view</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Date range selection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Instant booking</span>
                </div>
              </div>
            </div>

            {/* Restaurant Orders */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-8 border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white mb-4">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Restaurant Operations</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Complete kitchen management with QR ordering, menu variants, and real-time order tracking</p>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Real-time order queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>QR menu ordering</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Merged billing</span>
                </div>
              </div>
            </div>

            {/* AI Notifications */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl p-8 border border-pink-200 dark:border-pink-800 hover:shadow-lg transition-all">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">AI Smart Notifications</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Intelligent alerts for pending tasks, payments, orders with 3-hour reminders and auto-dismiss</p>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Task-based alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Smart reminders</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Works offline</span>
                </div>
              </div>
            </div>

            {/* Analytics & Reports */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 border border-green-200 dark:border-green-800 hover:shadow-lg transition-all">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white mb-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Analytics & Reports</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Detailed revenue analytics, P&L statements, occupancy trends, and expense tracking</p>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Revenue charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>P&L reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Excel export</span>
                </div>
              </div>
            </div>

            {/* Billing & Payments */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all">
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white mb-4">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Billing & Payments</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Split payments, RazorPay integration, WhatsApp payment links, and professional invoices</p>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Split payment system</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>WhatsApp payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Invoice generation</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              onClick={() => {
                setLocation("/login");
              }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
              data-testid="button-demo"
            >
              Explore Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              The World's Easiest Property Management System
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Used by 500+ hotels, resorts, hostels, and accommodations worldwide. Zero setup. Zero DevOps. Pure simplicity.
            </p>
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => {
                window.location.href = "/api/login";
              }}
              data-testid="button-cta-login"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all gap-2"
            >
              Start Free Forever
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/onboarding")}
              data-testid="button-cta-signup"
              className="border-slate-300 dark:border-slate-700"
            >
              Create Property
            </Button>
          </div>
        </div>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
