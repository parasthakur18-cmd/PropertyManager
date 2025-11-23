import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  Building2, Calendar, Users, DollarSign, Shield, Zap, CheckCircle, 
  ArrowRight, Instagram, TrendingUp, BarChart3, MessageCircle, Lock,
  Smartphone, Globe, Briefcase, Award, Flame, Sparkles
} from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({ name: "", email: "", property: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({ type: "error", message: "Please fill in all required fields" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormStatus({ type: "success", message: "Thank you! We'll get back to you within 24 hours." });
        setFormData({ name: "", email: "", property: "", message: "" });
      } else {
        setFormStatus({ type: "error", message: "Failed to send message. Please try again." });
      }
    } catch (error) {
      setFormStatus({ type: "error", message: "Failed to send message. Please email us directly at support@hostezee.in" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Hostezee</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setLocation("/login")}
              data-testid="button-login"
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Login
            </Button>
            <Button
              onClick={() => setLocation("/signup")}
              data-testid="button-signup"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 w-fit hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors">
                <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Trusted by 500+ Properties</span>
              </div>

              <div>
                <h1 className="text-6xl md:text-7xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
                  Manage Properties
                  <span className="block bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Like Never Before
                  </span>
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  Complete property management platform for hotels, resorts, and premium lodging. Bookings, guests, finances, and operations—all in one beautiful system.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => setLocation("/signup")}
                  data-testid="button-get-started"
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-base h-13 px-8 gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation("/login")}
                  data-testid="button-demo"
                  className="border-slate-300 dark:border-slate-700 h-13 px-8 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  View Demo
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">500+</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Properties</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">50K+</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Bookings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">99.9%</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Uptime</p>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative h-96 md:h-full min-h-96 lg:min-h-80">
              <div className="relative">
                {/* Animated Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                
                {/* Card Container */}
                <div className="relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl">
                  {/* Dashboard Preview */}
                  <div className="p-8">
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dashboard</p>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Property Overview</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400"></div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total Bookings</p>
                          <p className="text-3xl font-bold text-slate-900 dark:text-white">245</p>
                          <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">↑ 12% this month</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Revenue</p>
                          <p className="text-3xl font-bold text-slate-900 dark:text-white">$48K</p>
                          <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">↑ 8% growth</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Guests</p>
                          <p className="text-3xl font-bold text-slate-900 dark:text-white">892</p>
                          <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">Active guests</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Occupancy</p>
                          <p className="text-3xl font-bold text-slate-900 dark:text-white">94%</p>
                          <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">Excellent</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Everything you need to manage your property successfully, from bookings to finances
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Calendar, title: "Smart Booking System", desc: "Airbnb-style calendar with real-time availability and drag-drop functionality", color: "from-blue-500 to-cyan-500" },
              { icon: Users, title: "Guest Management", desc: "Complete profiles, tracking, and automated WhatsApp + email notifications", color: "from-teal-500 to-green-500" },
              { icon: DollarSign, title: "Financial Hub", desc: "Billing, P&L reports, revenue tracking, and expense management", color: "from-orange-500 to-red-500" },
              { icon: Smartphone, title: "QR Self Check-in", desc: "Contactless guest check-in with email verification and ID proof upload", color: "from-pink-500 to-rose-500" },
              { icon: Globe, title: "Multi-Property", desc: "Manage unlimited properties with complete data isolation per property", color: "from-purple-500 to-pink-500" },
              { icon: BarChart3, title: "Analytics & Insights", desc: "Deep analytics on bookings, revenue, trends, and business intelligence", color: "from-green-500 to-emerald-500" },
              { icon: MessageCircle, title: "Guest Communication", desc: "Email, SMS, and WhatsApp notifications for all guest touchpoints", color: "from-cyan-500 to-blue-500" },
              { icon: Briefcase, title: "Restaurant Management", desc: "In-house restaurant, menu management, and room service integration", color: "from-amber-500 to-orange-500" },
              { icon: Shield, title: "Enterprise Security", desc: "Role-based access, audit logs, encryption, and compliance ready", color: "from-indigo-500 to-purple-500" },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity" style={{backgroundImage: `linear-gradient(to bottom right, var(--tw-from-color), var(--tw-to-color))`}}></div>
                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:shadow-xl transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 h-full">
                  <CardContent className="p-8">
                    <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-32 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Simple onboarding process to launch your property management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Sign Up", desc: "Create your account in 2 minutes", icon: Building2 },
              { step: "02", title: "Add Property", desc: "Configure your property details", icon: Building2 },
              { step: "03", title: "Create Rooms", desc: "Set up rooms and pricing rules", icon: Building2 },
              { step: "04", title: "Start Bookings", desc: "Accept bookings immediately", icon: Building2 },
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-600/10 to-cyan-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative text-center">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-3xl font-bold mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-10 -right-4 text-teal-300">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <div>
              <h2 className="text-5xl font-bold text-slate-900 dark:text-white mb-12">
                Get in Touch
              </h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 shadow-lg">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Email</h3>
                    <a href="mailto:support@hostezee.in" className="text-lg text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition">
                      support@hostezee.in
                    </a>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">We respond within 24 hours</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 shadow-lg">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Phone</h3>
                    <a href="tel:+919001949260" className="text-lg text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition">
                      +91 9001949260
                    </a>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Mon-Fri, 9 AM - 6 PM IST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-cyan-600/20 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-10 border border-slate-200 dark:border-slate-700 shadow-2xl">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
                  Send us a Message
                </h3>
                <form className="space-y-5" data-testid="contact-form">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Your name"
                      data-testid="input-contact-name"
                      className="w-full px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="your@email.com"
                      data-testid="input-contact-email"
                      className="w-full px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleFormChange}
                      placeholder="Tell us about your inquiry..."
                      rows={4}
                      data-testid="textarea-contact-message"
                      className="w-full px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
                    />
                  </div>

                  {formStatus && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${formStatus.type === "success" ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"}`}>
                      {formStatus.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    onClick={handleFormSubmit}
                    disabled={isSubmitting}
                    data-testid="button-contact-submit"
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-900 dark:to-cyan-900"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-20"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
            Transform Your Property Management
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join 500+ property managers who trust Hostezee. Start your free 14-day trial today—no credit card required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation("/signup")}
              data-testid="button-cta-signup"
              className="bg-white text-teal-600 hover:bg-slate-100 text-base h-13 px-10 font-semibold shadow-lg hover:shadow-xl transition-all gap-2"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
              className="border-white text-white hover:bg-white/10 text-base h-13 px-10 font-semibold"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
                  <Building2 className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold text-white">Hostezee</span>
              </div>
              <p className="text-sm text-slate-400">Property Management System for Hotels & Resorts</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-5">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-5">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-5">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-sm">&copy; 2025 Hostezee PMS. All rights reserved.</p>
              <div className="flex gap-6 mt-6 md:mt-0">
                <a href="https://www.instagram.com/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
